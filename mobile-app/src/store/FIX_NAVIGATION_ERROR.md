# Fix React Navigation 'HomeTab' Error

**Status:** In Progress

## Completed Analysis:
- [x] No 'HomeTab' route exists (actual: MainTabs > Home)
- [x] Confirmed JoinHousehold → Login → MainTabs/Home flow
- [x] Plan approved by user

## Steps:
- [x] 1. Create NavigationService.ts with navigationRef access & safe navigate/reset ✅
- [ ] 2. Update authSlice.ts: ensure postLoginRedirect uses {tab: 'Home'}
- [ ] 3. Update LoginScreen.tsx: handle inviteCode param, dispatch setPostLoginRedirect('Home')
- [ ] 4. Update RootNavigator.tsx: fix postLoginRedirect navigation for nested tabs
- [ ] 5. Update JoinHouseholdScreen.tsx: set redirect context before Login
- [ ] 6. Test: QR scan → Login → Home (no crash)
- [ ] 7. Update all TODOs & attempt_completion

**Test command:** `cd mobile-app && npx expo start -c --web`
