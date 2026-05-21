# QR-First Guest Flow & Temp User Creation
Status: ✅ Frontend Planned | 🔄 Backend Pending

## Goals
- Remove manual invite code inputs from Login/SignUp
- QR scan → Backend creates temp/guest user → Auto-login → Join household
- Regular users can login/signup without code

## Frontend Steps (BLACKBOXAI)
1. [x] Create this TODO
2. [ ] Edit LoginScreen.tsx: Remove inviteCode field/validation/QR hints
3. [ ] Edit SignUpScreen.tsx: Remove optional inviteCode field/logic
4. [ ] Edit JoinHouseholdScreen.tsx: Success → Call new `authApi.joinWithQR(code)`
5. [ ] Add to auth/api.ts: `joinWithQR(code: string)` → POST /auth/join-qr
6. [ ] Update householdApi.ensureGuestJoin() if needed
7. [ ] Test QR → temp user → household access

## Backend Steps (Manual)
1. Add `/auth/join-qr` endpoint (AuthController):
   - Extract householdId from QR code
   - Create temp user (email: temp-uuid@guest.com, is_guest=true)
   - Generate JWT token
   - Add user to household as guest
   - Return LoginResponse
2. Update HouseholdService.joinHousehold() for guests
3. Test endpoint

## Success Criteria
- QR scan → Instant household access (no manual login)
- Regular login/signup works (no code required)
- Clipboard error fixed as side-effect (remove unused import)

## Commands to Test
```bash
cd mobile-app
npx expo start --clear
```

