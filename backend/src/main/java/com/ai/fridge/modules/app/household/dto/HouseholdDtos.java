package com.ai.fridge.modules.app.household.dto;

import java.util.List;

public class HouseholdDtos {

  public record AcceptInviteRequest(String code) {}

  public record HouseholdInfoDto(String id, String name, int maxMembers) {}

  public record HouseholdMemberDto(
      String id, String name, String email, String role, String joinedAt, boolean isOnline) {}

  public record InviteDto(String code, int expiresInHours, boolean expired, String link) {}

  public record HouseholdOverviewDto(
      HouseholdInfoDto household,
      List<HouseholdMemberDto> members,
      String currentUserId,
      InviteDto invite) {}
}
