package com.ai.fridge.modules.app.auth;

import com.ai.fridge.modules.app.auth.dto.AuthDtos;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.HexFormat;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AuthService {

  private final JdbcTemplate jdbcTemplate;
  private final TokenService tokenService;
  private final PasswordEncoder passwordEncoder;
  private final GoogleIdentityService googleIdentityService;
  private final PasswordResetMailService passwordResetMailService;

  private static final Logger log = LoggerFactory.getLogger(AuthService.class);

  public AuthService(
      JdbcTemplate jdbcTemplate,
      TokenService tokenService,
      PasswordEncoder passwordEncoder,
      GoogleIdentityService googleIdentityService,
      PasswordResetMailService passwordResetMailService) {
    this.jdbcTemplate = jdbcTemplate;
    this.tokenService = tokenService;
    this.passwordEncoder = passwordEncoder;
    this.googleIdentityService = googleIdentityService;
    this.passwordResetMailService = passwordResetMailService;
  }

  @Transactional
  public AuthDtos.LoginResponse login(String email, String password) {
    String normalizedEmail = normalizeEmail(email);
    UserRecord user = findUserByEmail(normalizedEmail);
    if (user == null) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password");
    }

    if (user.passwordHash() == null || !passwordEncoder.matches(password, user.passwordHash())) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password");
    }

    touchLastLogin(user.id());
    ensureOwnerHousehold(user.id());
    return issueTokens(user.id());
  }

  @Transactional
  public AuthDtos.LoginResponse loginWithGoogle(String idToken) {
    GoogleIdentityService.GoogleUser googleUser = googleIdentityService.verifyIdToken(idToken);
    UserRecord user = findUserByGoogleSub(googleUser.sub());

    if (user == null) {
      user = findUserByEmail(googleUser.email());
      if (user == null) {
        Long createdId =
            createUser(
                googleUser.email(),
                googleUser.name() == null || googleUser.name().isBlank()
                    ? buildDefaultName(googleUser.email())
                    : googleUser.name(),
                null,
                googleUser.sub(),
                googleUser.emailVerified(),
                false);
        user = getUserRecord(createdId);
      } else {
        jdbcTemplate.update(
            "UPDATE \"user\" SET google_sub = ?, email_verified = ?, updated_at = ? WHERE id = ?",
            googleUser.sub(),
            googleUser.emailVerified(),
            LocalDateTime.now(),
            user.id());
      }
    }

    touchLastLogin(user.id());
    ensureOwnerHousehold(user.id());
    return issueTokens(user.id());
  }

  @Transactional
  public AuthDtos.LoginResponse register(String email, String password, String name) {
    String normalizedEmail = normalizeEmail(email);
    UserRecord existingUser = findUserByEmail(normalizedEmail);
    if (existingUser != null) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already exists");
    }

    if (password == null || password.length() < 8) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "Password must have at least 8 characters");
    }

    String displayName =
        (name == null || name.isBlank()) ? buildDefaultName(normalizedEmail) : name.trim();
    String hashedPassword = passwordEncoder.encode(password);
    Long userId = createUser(normalizedEmail, displayName, hashedPassword, null, true, false);

    ensureOwnerHousehold(userId);
    touchLastLogin(userId);
    return issueTokens(userId);
  }

  @Transactional
  public AuthDtos.LoginResponse refresh(String token) {
    Long userId = tokenService.parseUserId(token, "refresh");
    if (userId == null) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid refresh token");
    }

    String refreshHash = hashToken(token);
    Integer validTokenCount =
        jdbcTemplate.queryForObject(
            """
                SELECT COUNT(*)
                FROM auth_refresh_token
                WHERE token_hash = ?
                  AND user_id = ?
                  AND revoked_at IS NULL
                  AND expires_at > ?
                """,
            Integer.class,
            refreshHash,
            userId,
            LocalDateTime.now());

    if (validTokenCount == null || validTokenCount == 0) {
      throw new ResponseStatusException(
          HttpStatus.UNAUTHORIZED, "Refresh token revoked or expired");
    }

    jdbcTemplate.update(
        "UPDATE auth_refresh_token SET revoked_at = ? WHERE token_hash = ?",
        LocalDateTime.now(),
        refreshHash);

    return issueTokens(userId);
  }

  @Transactional
  public AuthDtos.ForgotPasswordResponse forgotPassword(String email) {
    String normalizedEmail = normalizeEmail(email);
    UserRecord user = findUserByEmail(normalizedEmail);
    if (user == null) {
      return new AuthDtos.ForgotPasswordResponse(normalizedEmail, true, 300);
    }

    String otpCode = String.valueOf(100000 + ThreadLocalRandom.current().nextInt(900000));
    LocalDateTime expiresAt = LocalDateTime.now().plusMinutes(5);

    jdbcTemplate.update(
        "UPDATE password_reset_otp SET consumed_at = ? WHERE user_id = ? AND consumed_at IS NULL",
        LocalDateTime.now(),
        user.id());

    jdbcTemplate.update(
        """
            INSERT INTO password_reset_otp (user_id, otp_code, expires_at, created_at)
            VALUES (?, ?, ?, ?)
            """,
        user.id(),
        otpCode,
        expiresAt,
        LocalDateTime.now());

    try {
      passwordResetMailService.sendForgotPasswordOtp(normalizedEmail, otpCode, 300);
    } catch (Exception mailException) {
      throw new ResponseStatusException(
          HttpStatus.INTERNAL_SERVER_ERROR,
          "Không thể gửi email OTP lúc này. Vui lòng thử lại sau.");
    }

    return new AuthDtos.ForgotPasswordResponse(normalizedEmail, true, 300);
  }

  public AuthDtos.VerifyOtpResponse verifyResetOtp(String email, String otpCode) {
    String normalizedEmail = normalizeEmail(email);
    UserRecord user = findUserByEmail(normalizedEmail);
    if (user == null) {
      return new AuthDtos.VerifyOtpResponse(normalizedEmail, false);
    }

    Integer count =
        jdbcTemplate.queryForObject(
            """
                SELECT COUNT(*)
                FROM password_reset_otp
                WHERE user_id = ?
                  AND otp_code = ?
                  AND consumed_at IS NULL
                  AND expires_at > ?
                """,
            Integer.class,
            user.id(),
            otpCode,
            LocalDateTime.now());

    return new AuthDtos.VerifyOtpResponse(normalizedEmail, count != null && count > 0);
  }

  @Transactional
  public void resetPassword(String email, String otpCode, String newPassword) {
    if (newPassword == null || newPassword.length() < 8) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "Password must have at least 8 characters");
    }

    String normalizedEmail = normalizeEmail(email);
    UserRecord user = findUserByEmail(normalizedEmail);
    if (user == null) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid OTP");
    }

    Integer updated =
        jdbcTemplate.update(
            """
                UPDATE password_reset_otp
                SET consumed_at = ?
                WHERE user_id = ?
                  AND otp_code = ?
                  AND consumed_at IS NULL
                  AND expires_at > ?
                """,
            LocalDateTime.now(),
            user.id(),
            otpCode,
            LocalDateTime.now());

    if (updated == 0) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid OTP");
    }

    jdbcTemplate.update(
        "UPDATE \"user\" SET password_hash = ?, updated_at = ? WHERE id = ?",
        passwordEncoder.encode(newPassword),
        LocalDateTime.now(),
        user.id());

    jdbcTemplate.update(
        "UPDATE auth_refresh_token SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL",
        LocalDateTime.now(),
        user.id());
  }

  public AuthDtos.UserDto getUserByToken(String authorizationHeader) {
    Long userId = requireUserIdFromAuthorizationHeader(authorizationHeader);
    return getUserDto(userId);
  }

  @Transactional
  public AuthDtos.UserDto updateCurrentUserName(String authorizationHeader, String name) {
    AuthDtos.UserDto user = getUserByToken(authorizationHeader);
    String nextName = (name == null || name.isBlank()) ? user.name() : name.trim();
    jdbcTemplate.update(
        "UPDATE \"user\" SET fullname = ?, updated_at = ? WHERE id = ?",
        nextName,
        LocalDateTime.now(),
        Long.valueOf(user.id()));
    return getUserDto(Long.valueOf(user.id()));
  }

  public Long extractUserIdFromAuthorizationHeader(String authorizationHeader) {
    if (authorizationHeader == null || authorizationHeader.isBlank()) {
      return null;
    }
    String token =
        authorizationHeader.startsWith("Bearer ")
            ? authorizationHeader.substring(7)
            : authorizationHeader;
    return tokenService.parseUserId(token, "access");
  }

  public Long requireUserIdFromAuthorizationHeader(String authorizationHeader) {
    Long userId = extractUserIdFromAuthorizationHeader(authorizationHeader);
    if (userId == null) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Missing or invalid access token");
    }
    return userId;
  }

  private String normalizeEmail(String email) {
    if (email == null || email.isBlank()) {
      return "demo@fridge.ai";
    }
    return email.trim().toLowerCase();
  }

  private String buildDefaultName(String email) {
    int splitIndex = email.indexOf('@');
    if (splitIndex <= 0) {
      return "Người dùng";
    }
    return email.substring(0, splitIndex);
  }

    private Long createUser(
      String email, String fullname, String passwordHash, String googleSub, boolean emailVerified, boolean isGuest) {
    Long userId =
        jdbcTemplate.queryForObject(
            """
      INSERT INTO \"user\" (google_oauth_token, email, fullname, password_hash, google_sub, email_verified, is_guest, created_at, updated_at, profile_id)
      VALUES (NULL, ?, ?, ?, ?, ?, ?, ?, ?, NULL)
                RETURNING id
                """,
            Long.class,
            email,
            fullname,
            passwordHash,
            googleSub,
            emailVerified,
            isGuest,
            LocalDateTime.now(),
            LocalDateTime.now());

    // create household and inventory for new user only if not guest
    if (!isGuest) {
      ensureOwnerHousehold(userId);
    }
    return userId;
  }

  private AuthDtos.UserDto getUserDto(Long userId) {
    // Lấy inventoryId đầu tiên của household user (nếu có)
    final Long[] inventoryIdHolder = new Long[1];
    inventoryIdHolder[0] = null;
    try {
      Long householdId =
          jdbcTemplate.queryForObject(
              "SELECT household_id FROM household_member WHERE user_id = ? ORDER BY id ASC LIMIT 1",
              Long.class,
              userId);
      if (householdId != null) {
        inventoryIdHolder[0] =
            jdbcTemplate.queryForObject(
                "SELECT id FROM inventory WHERE household_id = ? ORDER BY id ASC LIMIT 1",
                Long.class,
                householdId);
      }
    } catch (Exception ignore) {
      // ignore
    }
    return jdbcTemplate.queryForObject(
        """
            SELECT u.id, u.email, u.fullname, COALESCE(hm.household_id, 0) as household_id
            FROM "user" u
            LEFT JOIN household_member hm ON u.id = hm.user_id
            WHERE u.id = ?
            """,
        (rs, rowNum) ->
            new AuthDtos.UserDto(
                String.valueOf(rs.getLong("id")),
                rs.getString("email"),
                rs.getString("fullname"),
                String.valueOf(rs.getLong("household_id"))),
        userId);
  }

  private UserRecord getUserRecord(Long userId) {
    return jdbcTemplate.queryForObject(
        "SELECT id, email, fullname, password_hash FROM \"user\" WHERE id = ?",
        (rs, rowNum) ->
            new UserRecord(
                rs.getLong("id"),
                rs.getString("email"),
                rs.getString("fullname"),
                rs.getString("password_hash")),
        userId);
  }

  private UserRecord findUserByEmail(String email) {
    var users =
        jdbcTemplate.query(
            "SELECT id, email, fullname, password_hash FROM \"user\" WHERE lower(email) = lower(?) LIMIT 1",
            (rs, rowNum) ->
                new UserRecord(
                    rs.getLong("id"),
                    rs.getString("email"),
                    rs.getString("fullname"),
                    rs.getString("password_hash")),
            email);
    return users.isEmpty() ? null : users.get(0);
  }

  private UserRecord findUserByGoogleSub(String googleSub) {
    var users =
        jdbcTemplate.query(
            "SELECT id, email, fullname, password_hash FROM \"user\" WHERE google_sub = ? LIMIT 1",
            (rs, rowNum) ->
                new UserRecord(
                    rs.getLong("id"),
                    rs.getString("email"),
                    rs.getString("fullname"),
                    rs.getString("password_hash")),
            googleSub);
    return users.isEmpty() ? null : users.get(0);
  }

  private void touchLastLogin(Long userId) {
    jdbcTemplate.update(
        "UPDATE \"user\" SET last_login_at = ?, updated_at = ? WHERE id = ?",
        LocalDateTime.now(),
        LocalDateTime.now(),
        userId);
  }

  private AuthDtos.LoginResponse issueTokens(Long userId) {
    AuthDtos.UserDto userDto = getUserDto(userId);
    String accessToken = tokenService.generateAccessToken(userId, userDto.email());
    String refreshToken = tokenService.generateRefreshToken(userId, userDto.email());
    LocalDateTime refreshExpiresAt =
        LocalDateTime.ofInstant(tokenService.parseExpiration(refreshToken), ZoneOffset.UTC);

    jdbcTemplate.update(
        """
            INSERT INTO auth_refresh_token (user_id, token_hash, issued_at, expires_at)
            VALUES (?, ?, ?, ?)
            """,
        userId,
        hashToken(refreshToken),
        LocalDateTime.now(),
        refreshExpiresAt);

    // Add invite code for household user
    String inviteCode = null;
    try {
      Long householdId =
          jdbcTemplate.queryForObject(
              "SELECT household_id FROM household_member WHERE user_id = ? ORDER BY id ASC LIMIT 1",
              Long.class,
              userId);
      if (householdId != null) {
        List<String> invites =
            jdbcTemplate.query(
                "SELECT code FROM household_invite WHERE household_id = ? AND is_active = true ORDER BY created_at DESC LIMIT 1",
                (rs, rowNum) -> rs.getString("code"),
                householdId);
        inviteCode = invites.isEmpty() ? null : invites.get(0);
      }
    } catch (Exception ignore) {
      // ignore
    }

    return new AuthDtos.LoginResponse(accessToken, refreshToken, userDto, inviteCode);
  }

  private String hashToken(String token) {
    try {
      MessageDigest digest = MessageDigest.getInstance("SHA-256");
      byte[] hash = digest.digest(token.getBytes(StandardCharsets.UTF_8));
      return HexFormat.of().formatHex(hash);
    } catch (Exception exception) {
      throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Cannot hash token");
    }
  }

  private record UserRecord(Long id, String email, String name, String passwordHash) {}

  private void ensureOwnerHousehold(Long userId) {
    Long roleId = ensureOwnerRole();
    Long householdId = findHouseholdForUser(userId);

    if (householdId == null) {
      householdId =
          jdbcTemplate.queryForObject(
              "INSERT INTO household (name, created_at) VALUES (?, ?) RETURNING id",
              Long.class,
              "Bếp nhà " + userId,
              LocalDateTime.now());
    }

    Integer memberCount =
        jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM household_member WHERE user_id = ? AND household_id = ?",
            Integer.class,
            userId,
            householdId);

    if (memberCount == null || memberCount == 0) {
      jdbcTemplate.update(
          "INSERT INTO household_member (user_id, household_id, role_id) VALUES (?, ?, ?)",
          userId,
          householdId,
          roleId);
    }

    Integer inventoryCount =
        jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM inventory WHERE household_id = ?", Integer.class, householdId);

    if (inventoryCount == null || inventoryCount == 0) {
      jdbcTemplate.update("INSERT INTO inventory (household_id) VALUES (?)", householdId);
    }
  }

  private Long ensureOwnerRole() {
    var ids =
        jdbcTemplate.query(
            "SELECT id FROM \"role\" WHERE lower(name) = 'owner' LIMIT 1",
            (rs, rowNum) -> rs.getLong("id"));

    if (!ids.isEmpty()) {
      return ids.get(0);
    }

    return jdbcTemplate.queryForObject(
        "INSERT INTO \"role\" (name) VALUES ('owner') RETURNING id", Long.class);
  }

  private Long findHouseholdForUser(Long userId) {
    var ids =
        jdbcTemplate.query(
            "SELECT household_id FROM household_member WHERE user_id = ? ORDER BY id ASC LIMIT 1",
            (rs, rowNum) -> rs.getLong("household_id"),
            userId);
    return ids.isEmpty() ? null : ids.get(0);
  }

  @Transactional
  public AuthDtos.LoginResponse joinFromQr(String inviteCode) {
    log.info("AuthService.joinFromQr called with inviteCode={}", inviteCode);

    if (inviteCode == null || inviteCode.trim().isEmpty()) {
      log.warn("joinFromQr called with null/empty inviteCode");
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "inviteCode is required");
    }

    String normalizedCode = inviteCode.trim().replaceAll("\\s+", "");
    log.debug("Searching household_invite for normalizedCode='{}'", normalizedCode);

    // Safe query - use query instead of queryForObject to avoid EmptyResultDataAccessException
    List<Long> householdIds =
        jdbcTemplate.query(
            """
        SELECT household_id FROM household_invite
        WHERE code LIKE ? AND is_active = true AND expires_at > NOW()
        ORDER BY created_at DESC LIMIT 1
        """,
            (rs, rowNum) -> rs.getLong("household_id"),
            "%" + normalizedCode + "%");

    if (householdIds.isEmpty()) {
      log.warn("No active household invite found for code='{}'", normalizedCode);
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "Mã QR không hợp lệ hoặc đã hết hạn");
    }

    Long householdId = householdIds.get(0);
    log.debug("Found householdId={} for inviteCode='{}'", householdId, normalizedCode);

    // Validate household exists
    Integer householdCheck =
        jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM household WHERE id = ?", Integer.class, householdId);
    if (householdCheck == null || householdCheck == 0) {
      log.error("household_id={} from invite doesn't exist in household table", householdId);
      throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Invalid household data");
    }

    // 🔧 FIX: Find existing guest user by email pattern BEFORE creating new (no duplicate!)
    String uuid = UUID.randomUUID().toString().replaceAll("-", "").substring(0, 8);
    String tempEmail = "guest_" + uuid + "@fridge.ai";
    String tempName = "Khách mời " + uuid;

    UserRecord existingUser = findUserByEmail(tempEmail);
    Long userId;

    if (existingUser != null) {
      // Reuse existing guest user - no duplicate!
      log.debug(
          "Reusing existing guest userId={} for household={}", existingUser.id(), householdId);
      userId = existingUser.id();
      // Ensure membership (idempotent)
      Long guestRoleId = getOrCreateRoleId("guest");
      Integer memberCount =
          jdbcTemplate.queryForObject(
              "SELECT COUNT(*) FROM household_member WHERE user_id = ? AND household_id = ?",
              Integer.class,
              userId,
              householdId);
      if (memberCount == null || memberCount == 0) {
        jdbcTemplate.update(
            "INSERT INTO household_member (user_id, household_id, role_id) VALUES (?, ?, ?)",
            userId,
            householdId,
            guestRoleId);
      }
    } else {
      // Create new guest user (first time only)
      userId = createUser(tempEmail, tempName, null, null, true, true);
      log.debug("Created NEW temp GUEST userId={} for household={}", userId, householdId);

      // Add user to household as member
      Long memberRoleId = getOrCreateRoleId("member");
      jdbcTemplate.update(
          "INSERT INTO household_member (user_id, household_id, role_id) VALUES (?, ?, ?)",
          userId,
          householdId,
          memberRoleId);
    }

    // Setup user profile and login
    ensureUserProfile(userId);
    touchLastLogin(userId);

    log.info("joinFromQr success: userId={}, householdId={}", userId, householdId);
    return issueTokens(userId);
  }

  private Long getOrCreateRoleId(String roleName) {
    try {
      return jdbcTemplate.queryForObject(
          "SELECT id FROM \"role\" WHERE lower(name) = ? LIMIT 1",
          Long.class,
          roleName.toLowerCase());
    } catch (Exception e) {
      log.info("Role '{}' not found, creating", roleName);
      return jdbcTemplate.queryForObject(
          "INSERT INTO \"role\" (name) VALUES (?) RETURNING id", Long.class, roleName);
    }
  }

  private void ensureUserProfile(Long userId) {
    // Create user_preference if not exists
    Integer profileCount =
        jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM user_preference WHERE user_id = ?", Integer.class, userId);
    if (profileCount == null || profileCount == 0) {
      jdbcTemplate.update(
          "INSERT INTO user_preference (user_id, cooking_skill_level, allergies, diets, tastes) VALUES (?, NULL, NULL, NULL, NULL)",
          userId);
    }

    // Update user profile_id
    jdbcTemplate.update(
        "UPDATE \"user\" SET profile_id = (SELECT id FROM user_preference WHERE user_id = ?) WHERE id = ?",
        userId,
        userId);
  }
}
