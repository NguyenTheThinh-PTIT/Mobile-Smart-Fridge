package com.ai.fridge.modules.app.household;

import com.ai.fridge.modules.app.auth.AuthService;
import com.ai.fridge.modules.app.auth.dto.AuthDtos;
import com.ai.fridge.modules.app.household.dto.HouseholdDtos;
import java.sql.Timestamp;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.Random;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class HouseholdService {

  private static final int MAX_MEMBERS = 6;
  private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("dd/MM/yyyy");

  private final JdbcTemplate jdbcTemplate;
  private final AuthService authService;
  private final HouseholdRealtimePublisher realtimePublisher;

  public HouseholdService(
      JdbcTemplate jdbcTemplate,
      AuthService authService,
      HouseholdRealtimePublisher realtimePublisher) {
    this.jdbcTemplate = jdbcTemplate;
    this.authService = authService;
    this.realtimePublisher = realtimePublisher;
  }

  public HouseholdDtos.HouseholdOverviewDto getOverview(String authorizationHeader) {
    AuthDtos.UserDto currentUser = authService.getUserByToken(authorizationHeader);
    Long userId = Long.valueOf(currentUser.id());
    Long householdId = resolveHouseholdId(userId);

    HouseholdDtos.HouseholdInfoDto household =
        jdbcTemplate.queryForObject(
            "SELECT id, name FROM household WHERE id = ?",
            (rs, rowNum) ->
                new HouseholdDtos.HouseholdInfoDto(
                    String.valueOf(rs.getLong("id")), rs.getString("name"), MAX_MEMBERS),
            householdId);

    List<HouseholdDtos.HouseholdMemberDto> members =
        jdbcTemplate.query(
            """
                SELECT hm.user_id,
                       u.fullname,
                       u.email,
                       r.name AS role_name,
                       h.created_at
                FROM household_member hm
                JOIN "user" u ON u.id = hm.user_id
                JOIN "role" r ON r.id = hm.role_id
                JOIN household h ON h.id = hm.household_id
                WHERE hm.household_id = ?
                ORDER BY hm.id ASC
                """,
            (rs, rowNum) -> {
              Long memberId = rs.getLong("user_id");
              String role = toMobileRole(rs.getString("role_name"));
              Timestamp createdAt = rs.getTimestamp("created_at");
              String joinedAt =
                  createdAt == null
                      ? DATE_FORMAT.format(LocalDateTime.now())
                      : DATE_FORMAT.format(createdAt.toLocalDateTime());
              return new HouseholdDtos.HouseholdMemberDto(
                  String.valueOf(memberId),
                  rs.getString("fullname"),
                  rs.getString("email"),
                  role,
                  joinedAt,
                  memberId.equals(userId));
            },
            householdId);

    HouseholdDtos.InviteDto invite = getCurrentInvite(householdId, userId);

    return new HouseholdDtos.HouseholdOverviewDto(
        household, members, String.valueOf(userId), invite);
  }

  @Transactional
  public HouseholdDtos.InviteDto regenerateInvite(String authorizationHeader) {
    AuthDtos.UserDto currentUser = authService.getUserByToken(authorizationHeader);
    Long userId = Long.valueOf(currentUser.id());
    Long householdId = resolveHouseholdId(userId);
    ensureOwner(userId, householdId);
    deactivateOldInvites(householdId);
    HouseholdDtos.InviteDto invite = createInvite(householdId, userId);
    publishHouseholdEvent(
        householdId,
        userId,
        "INVITE_REGENERATED",
        Map.of("code", invite.code(), "expiresInHours", invite.expiresInHours()));
    return invite;
  }

  @Transactional
  public HouseholdDtos.HouseholdOverviewDto acceptInvite(String authorizationHeader, String code) {
    AuthDtos.UserDto currentUser = authService.getUserByToken(authorizationHeader);
    Long userId = Long.valueOf(currentUser.id());

    HouseholdInvite invite = findActiveInvite(code);
    if (invite == null) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invite code invalid or expired");
    }

    Long existingHouseholdId = findHouseholdIdByUser(userId);
    if (existingHouseholdId != null && existingHouseholdId.equals(invite.householdId())) {
      return getOverview(authorizationHeader);
    }

    if (existingHouseholdId != null && isOwner(userId, existingHouseholdId)) {
      throw new ResponseStatusException(
          HttpStatus.FORBIDDEN, "Owner must transfer ownership before joining another household");
    }

    Long memberRoleId = ensureRole("member");

    if (existingHouseholdId != null) {
      jdbcTemplate.update("DELETE FROM household_member WHERE user_id = ?", userId);
    }

    Integer memberExists =
        jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM household_member WHERE household_id = ? AND user_id = ?",
            Integer.class,
            invite.householdId(),
            userId);

    if (memberExists == null || memberExists == 0) {
      jdbcTemplate.update(
          "INSERT INTO household_member (user_id, household_id, role_id) VALUES (?, ?, ?)",
          userId,
          invite.householdId(),
          memberRoleId);
    }

    ensureUserProfile(userId);

    publishHouseholdEvent(
        invite.householdId(),
        userId,
        "MEMBER_JOINED",
        Map.of("memberId", userId, "inviteCode", invite.code()));

    return getOverview(authorizationHeader);
  }

  @Transactional
  public void transferOwnership(String authorizationHeader, Long targetMemberId) {
    AuthDtos.UserDto currentUser = authService.getUserByToken(authorizationHeader);
    Long currentUserId = Long.valueOf(currentUser.id());
    Long householdId = resolveHouseholdId(currentUserId);
    ensureOwner(currentUserId, householdId);
    ensureMemberInHousehold(targetMemberId, householdId);

    if (targetMemberId.equals(currentUserId)) {
      return;
    }

    Long ownerRoleId = ensureRole("owner");
    Long memberRoleId = ensureRole("member");

    jdbcTemplate.update(
        "UPDATE household_member SET role_id = ? WHERE household_id = ? AND user_id = ?",
        memberRoleId,
        householdId,
        currentUserId);

    jdbcTemplate.update(
        "UPDATE household_member SET role_id = ? WHERE household_id = ? AND user_id = ?",
        ownerRoleId,
        householdId,
        targetMemberId);

    publishHouseholdEvent(
        householdId,
        currentUserId,
        "OWNERSHIP_TRANSFERRED",
        Map.of("from", currentUserId, "to", targetMemberId));
  }

  @Transactional
  public void removeMember(String authorizationHeader, Long targetMemberId) {
    AuthDtos.UserDto currentUser = authService.getUserByToken(authorizationHeader);
    Long currentUserId = Long.valueOf(currentUser.id());
    Long householdId = resolveHouseholdId(currentUserId);
    ensureOwner(currentUserId, householdId);

    if (targetMemberId.equals(currentUserId)) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Owner cannot remove self");
    }

    jdbcTemplate.update(
        "DELETE FROM household_member WHERE household_id = ? AND user_id = ?",
        householdId,
        targetMemberId);

    cleanupUserProfileIfNoHousehold(targetMemberId);

    publishHouseholdEvent(
        householdId, currentUserId, "MEMBER_REMOVED", Map.of("memberId", targetMemberId));
  }

  @Transactional
  public void leaveHousehold(String authorizationHeader) {
    AuthDtos.UserDto currentUser = authService.getUserByToken(authorizationHeader);
    Long currentUserId = Long.valueOf(currentUser.id());
    Long householdId = resolveHouseholdId(currentUserId);

    if (isOwner(currentUserId, householdId)) {
      throw new ResponseStatusException(
          HttpStatus.FORBIDDEN, "Owner must transfer ownership first");
    }

    jdbcTemplate.update(
        "DELETE FROM household_member WHERE household_id = ? AND user_id = ?",
        householdId,
        currentUserId);

    cleanupUserProfileIfNoHousehold(currentUserId);

    publishHouseholdEvent(
        householdId, currentUserId, "MEMBER_LEFT", Map.of("memberId", currentUserId));
  }

  private Long resolveHouseholdId(Long userId) {
    Long householdId = findHouseholdIdByUser(userId);
    if (householdId != null) {
      return householdId;
    }

    throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Household not found for user");
  }

  private Long findHouseholdIdByUser(Long userId) {
    List<Long> ids =
        jdbcTemplate.query(
            "SELECT household_id FROM household_member WHERE user_id = ? ORDER BY id ASC LIMIT 1",
            (rs, rowNum) -> rs.getLong("household_id"),
            userId);

    return ids.isEmpty() ? null : ids.get(0);
  }

  private void ensureOwner(Long userId, Long householdId) {
    if (!isOwner(userId, householdId)) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only owner can manage members");
    }
  }

  private boolean isOwner(Long userId, Long householdId) {
    Integer count =
        jdbcTemplate.queryForObject(
            """
                SELECT COUNT(*)
                FROM household_member hm
                JOIN "role" r ON r.id = hm.role_id
                WHERE hm.household_id = ? AND hm.user_id = ? AND lower(r.name) = 'owner'
                """,
            Integer.class,
            householdId,
            userId);
    return count != null && count > 0;
  }

  private void ensureMemberInHousehold(Long memberId, Long householdId) {
    Integer count =
        jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM household_member WHERE household_id = ? AND user_id = ?",
            Integer.class,
            householdId,
            memberId);
    if (count == null || count == 0) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Member not found in household");
    }
  }

  private Long ensureRole(String roleName) {
    List<Long> ids =
        jdbcTemplate.query(
            "SELECT id FROM \"role\" WHERE lower(name) = lower(?) LIMIT 1",
            (rs, rowNum) -> rs.getLong("id"),
            roleName);

    if (!ids.isEmpty()) {
      return ids.get(0);
    }

    return jdbcTemplate.queryForObject(
        "INSERT INTO \"role\" (name) VALUES (?) RETURNING id", Long.class, roleName.toLowerCase());
  }

  private HouseholdDtos.InviteDto getCurrentInvite(Long householdId, Long userId) {
    List<HouseholdDtos.InviteDto> invites =
        jdbcTemplate.query(
            """
                SELECT code, invite_link, expires_at, is_active
                FROM household_invite
                WHERE household_id = ?
                ORDER BY created_at DESC
                LIMIT 1
                """,
            (rs, rowNum) -> {
              String code = rs.getString("code").replaceAll("\\s", "");
              LocalDateTime expiresAt = rs.getTimestamp("expires_at").toLocalDateTime();
              boolean active = rs.getBoolean("is_active");
              String displayCode = code.substring(0, 3) + " " + code.substring(3);
              return mapInvite(displayCode, rs.getString("invite_link"), expiresAt, active);
            },
            householdId);

    if (!invites.isEmpty()) {
      return invites.get(0);
    }

    return createInvite(householdId, userId);
  }

  private void deactivateOldInvites(Long householdId) {
    jdbcTemplate.update(
        "UPDATE household_invite SET is_active = false WHERE household_id = ? AND is_active = true",
        householdId);
  }

  private HouseholdDtos.InviteDto createInvite(Long householdId, Long userId) {
    String inviteCode = String.valueOf(100000 + new Random().nextInt(900000));
    String compactCode = inviteCode.replaceAll("\\s", "");
    String displayCode = inviteCode.substring(0, 3) + " " + inviteCode.substring(3);
    String link = "https://fridge.app/invite/" + compactCode;
    LocalDateTime expiresAt = LocalDateTime.now().plusHours(24);

    jdbcTemplate.update(
        """
                INSERT INTO household_invite (household_id, code, invite_link, expires_at, is_active, created_by, created_at)
                VALUES (?, ?, ?, ?, true, ?, ?)
                """,
        householdId,
        compactCode,
        link,
        Timestamp.valueOf(expiresAt),
        userId,
        Timestamp.valueOf(LocalDateTime.now()));

    return mapInvite(displayCode, link, expiresAt, true);
  }

  private HouseholdInvite findActiveInvite(String code) {
    if (code == null || code.isBlank()) {
      return null;
    }

    String normalizedCode = code.trim().replaceAll("\\s+", " ");

    List<HouseholdInvite> invites =
        jdbcTemplate.query(
            """
                SELECT household_id, code, expires_at, is_active
                FROM household_invite
                WHERE code = ?
                ORDER BY created_at DESC
                LIMIT 1
                """,
            (rs, rowNum) ->
                new HouseholdInvite(
                    rs.getLong("household_id"),
                    rs.getString("code"),
                    rs.getTimestamp("expires_at").toLocalDateTime(),
                    rs.getBoolean("is_active")),
            normalizedCode);

    if (invites.isEmpty()) {
      return null;
    }

    HouseholdInvite invite = invites.get(0);
    if (!invite.active() || !invite.expiresAt().isAfter(LocalDateTime.now())) {
      return null;
    }

    return invite;
  }

  private void publishHouseholdEvent(
      Long householdId, Long actorId, String eventType, Map<String, Object> payload) {
    jdbcTemplate.update(
        "INSERT INTO household_event (household_id, event_type, payload, created_by, created_at) VALUES (?, ?, ?, ?, ?)",
        householdId,
        eventType,
        payload.toString(),
        actorId,
        LocalDateTime.now());

    realtimePublisher.publishEvent(householdId, eventType, payload);
  }

  private HouseholdDtos.InviteDto mapInvite(
      String code, String link, LocalDateTime expiresAt, boolean isActive) {
    Duration remaining = Duration.between(LocalDateTime.now(), expiresAt);
    int hours = (int) Math.max(0, Math.ceil(remaining.toMinutes() / 60.0));
    boolean expired = !isActive || remaining.isNegative() || remaining.isZero();
    return new HouseholdDtos.InviteDto(code, hours, expired, link);
  }

  private String toMobileRole(String roleName) {
    if (roleName == null) {
      return "MEMBER";
    }
    return "owner".equalsIgnoreCase(roleName) ? "OWNER" : "MEMBER";
  }

  private void ensureUserProfile(Long userId) {
    List<Long> profileIds =
        jdbcTemplate.query(
            "SELECT profile_id FROM \"user\" WHERE id = ? AND profile_id IS NOT NULL LIMIT 1",
            (rs, rowNum) -> rs.getLong("profile_id"),
            userId);

    if (!profileIds.isEmpty()) {
      return;
    }

    Long profileId =
        jdbcTemplate.queryForObject(
            """
                INSERT INTO user_preference (user_id, cooking_skill_level, allergies, diets, tastes)
                VALUES (?, NULL, NULL, NULL, NULL)
                RETURNING id
                """,
            Long.class,
            userId);

    jdbcTemplate.update(
        "UPDATE \"user\" SET profile_id = ?, updated_at = ? WHERE id = ?",
        profileId,
        LocalDateTime.now(),
        userId);
  }

  private void cleanupUserProfileIfNoHousehold(Long userId) {
    Integer householdMemberships =
        jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM household_member WHERE user_id = ?", Integer.class, userId);

    if (householdMemberships != null && householdMemberships > 0) {
      return;
    }

    List<Long> profileIds =
        jdbcTemplate.query(
            "SELECT profile_id FROM \"user\" WHERE id = ? AND profile_id IS NOT NULL LIMIT 1",
            (rs, rowNum) -> rs.getLong("profile_id"),
            userId);

    if (profileIds.isEmpty()) {
      return;
    }

    Long profileId = profileIds.get(0);
    jdbcTemplate.update(
        "UPDATE \"user\" SET profile_id = NULL, updated_at = ? WHERE id = ?",
        LocalDateTime.now(),
        userId);
    jdbcTemplate.update(
        "DELETE FROM user_preference WHERE id = ? AND user_id = ?", profileId, userId);
  }

  private record HouseholdInvite(
      Long householdId, String code, LocalDateTime expiresAt, boolean active) {}
}
