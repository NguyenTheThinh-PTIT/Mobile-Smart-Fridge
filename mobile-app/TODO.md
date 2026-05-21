# Guest Permission Fix - Implementation TODO

Status: Approved plan ✅

## Steps:
- [x] 1. Create DB migration V9__add_guest_support.sql (user.is_guest + GUEST role)
- [ ] 2. Update AuthService.java (joinFromQr: set is_guest=true, use GUEST role)
- [ ] 3. Update HouseholdService.java (requireOwner() on invite ops)
- [ ] 4. Update InventoryService.java (requireNotGuest() on create/update/delete item)
- [ ] 5. Update mobile-app/src/features/account/types.ts (isGuestUser logic)
- [ ] 6. Apply migration, rebuild backend, test guest restrictions

Current: DB migration created. Next: Update AuthService.java
- [ ] 2. Update AuthService.java (joinFromQr: set is_guest=true, use GUEST role)
- [ ] 3. Update HouseholdService.java (requireOwner() on invite ops)
- [ ] 4. Update InventoryService.java (requireNotGuest() on create/update/delete item)
- [ ] 5. Update mobile-app/src/features/account/types.ts (isGuestUser logic)
- [ ] 6. Apply migration, rebuild backend, test guest restrictions

Current: Starting DB migration...
