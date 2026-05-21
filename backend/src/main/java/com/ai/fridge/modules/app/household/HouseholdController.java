package com.ai.fridge.modules.app.household;

import com.ai.fridge.common.base.ApiEnvelope;
import com.ai.fridge.modules.app.household.dto.HouseholdDtos;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/household")
public class HouseholdController {

  private final HouseholdService householdService;

  public HouseholdController(HouseholdService householdService) {
    this.householdService = householdService;
  }

  @GetMapping("/overview")
  public ApiEnvelope<HouseholdDtos.HouseholdOverviewDto> getOverview(
      @RequestHeader(value = "Authorization", required = false) String authorization) {
    return ApiEnvelope.success(householdService.getOverview(authorization));
  }

  @PostMapping("/invite/regenerate")
  public ApiEnvelope<HouseholdDtos.InviteDto> regenerateInvite(
      @RequestHeader(value = "Authorization", required = false) String authorization) {
    return ApiEnvelope.success(householdService.regenerateInvite(authorization));
  }

  @PostMapping("/invite/accept")
  public ApiEnvelope<HouseholdDtos.HouseholdOverviewDto> acceptInvite(
      @RequestHeader(value = "Authorization", required = false) String authorization,
      @RequestBody HouseholdDtos.AcceptInviteRequest request) {
    return ApiEnvelope.success(householdService.acceptInvite(authorization, request.code()));
  }

  @PostMapping("/members/{memberId}/transfer-owner")
  public ApiEnvelope<Void> transferOwnership(
      @RequestHeader(value = "Authorization", required = false) String authorization,
      @PathVariable Long memberId) {
    householdService.transferOwnership(authorization, memberId);
    return ApiEnvelope.success(null);
  }

  @DeleteMapping("/members/{memberId}")
  public ApiEnvelope<Void> removeMember(
      @RequestHeader(value = "Authorization", required = false) String authorization,
      @PathVariable Long memberId) {
    householdService.removeMember(authorization, memberId);
    return ApiEnvelope.success(null);
  }

  @PostMapping("/leave")
  public ApiEnvelope<Void> leaveHousehold(
      @RequestHeader(value = "Authorization", required = false) String authorization) {
    householdService.leaveHousehold(authorization);
    return ApiEnvelope.success(null);
  }
}
