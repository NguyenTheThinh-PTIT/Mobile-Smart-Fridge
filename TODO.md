# PostgreSQL User Registration Fix - Progress Tracker

## ✅ COMPLETED
- [x] Analyzed error: Missing `is_guest` column causing transaction abort
- [x] Reviewed migrations V1-V20: Confirmed column never added
- [x] Created & approved plan for V21 migration
- [x] Created `V21__add_is_guest_to_user.sql` ✅

## ⏳ NEXT STEPS
- [ ] **Apply migration**: Restart Spring Boot backend (Flyway auto-runs V21)
- [ ] **Verify column**: Run DB check command
- [ ] **Test registration**: POST /api/auth/register should succeed
- [ ] **Test guest QR**: joinFromQr with is_guest=true works without household auto-create
- [ ] **Mark complete** when all tests pass

## Commands to Run

**1. Apply & Verify (after backend restart):**
```
# Check if column added
docker exec -it $(docker ps -q -f name=postgres) psql -d fridge -c "
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'user' AND column_name = 'is_guest';
"
```

**2. Test Registration:**
```bash
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com", 
    "password": "password123!", 
    "name": "Test User"
  }'
```

**3. Check new user (is_guest=false):**
```
docker exec -it postgres psql -d fridge -c "
SELECT id, email, fullname, is_guest FROM \"user\" WHERE email = 'testuser@example.com';
"
```

## Backend Logs to Watch
Look for:
```
✅ Successfully applied: V21__add_is_guest_to_user.sql
```

Copy/paste backend startup logs + test results here for next steps.

