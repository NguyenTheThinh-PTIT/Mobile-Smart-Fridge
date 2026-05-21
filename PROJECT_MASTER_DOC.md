# Project Master Documentation - Fridge AI

Version: 1.0  
Last Updated: 2026-04-07

## 1. Project Summary
Fridge AI là monorepo gồm 3 khối chính:
- Backend API: Spring Boot (Java 17) xử lý nghiệp vụ cốt lõi.
- Mobile App: React Native (TypeScript) cho người dùng cuối.
- AI Service: FastAPI (Python) cho gợi ý món ăn và truy vấn ngữ nghĩa.

Mục tiêu sản phẩm:
- Quản lý thực phẩm trong tủ lạnh theo household.
- Theo dõi hạn dùng và hỗ trợ lập kế hoạch bữa ăn.
- Gợi ý công thức và món ăn theo tồn kho thực tế.
- Hỗ trợ multi-user và cập nhật realtime theo household.

## 2. Repository Layout
```text
mobile/
├── backend/                # Spring Boot API
├── mobile-app/             # React Native app
├── ai_service/             # FastAPI AI suggestion service
├── docker-compose.yml      # Full stack orchestration
├── README.md               # Main guide
├── .ai-rules.md            # Engineering rules
└── PROJECT_MASTER_DOC.md   # This document
```

## 3. Backend (Spring Boot)
Path: backend

### 3.1 Tech Stack
- Java 17
- Spring Boot 3.x
- PostgreSQL 15
- Flyway migrations
- JWT auth (access + refresh)
- WebSocket/STOMP for household events

### 3.2 Main Modules
- modules/app/auth: login/register/oauth/refresh/forgot-reset password.
- modules/app/household: overview, invite regenerate/accept, owner transfer, remove/leave.
- modules/app/inventory: CRUD tồn kho, invoice scan/confirm endpoints.
- modules/app/chat: orchestration với inventory context + AI response.
- modules/analytics, planner, social, identity, inventory: domain-specific features.

### 3.3 API Response Contract
Chuẩn response:
```json
{
  "success": true,
  "data": {},
  "error": null
}
```
Lỗi:
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": {}
  }
}
```

### 3.4 Security
- Stateless auth với JWT.
- Public endpoints: `/api/v1/auth/**`, health/docs/ws cần thiết.
- Protected endpoints: `/api/v1/**`.

## 4. Mobile App (React Native)
Path: mobile-app

### 4.1 Tech Stack
- React Native + TypeScript strict
- Redux Toolkit + redux-persist
- Axios instance + retry interceptor + unified exception mapping
- React Navigation (Stack + Bottom Tabs)

### 4.2 Feature Modules
- auth: login/signup/forgot/reset/join household by QR.
- account: household management, member actions, invite flow.
- inventory: inventory listing, detail, add/edit, history.
- planner, recipes, social, chat, home.

### 4.3 Current UX Flows
- QR Join thực tế:
  1) Scan QR hoặc nhập mã.
  2) Parse invite code.
  3) Login.
  4) Call `acceptInvite`.
  5) Redirect tới Account > Household Management.
  6) Auto refresh overview + toast success.

## 5. AI Service (FastAPI)
Path: ai_service

### 5.1 Purpose
- Tạo suggestion dựa trên inventory, thời tiết, điều kiện nấu ăn.
- Hybrid retrieval cho context recipe/knowledge.

### 5.2 Tech
- Python 3.11
- FastAPI + Uvicorn
- PostgreSQL (async) + Redis cache
- Gemini models for LLM and embedding

## 6. Database Overview
- Migrations nằm tại `backend/src/main/resources/db/migration`.
- Schema snapshot tham khảo: `backend/AI_DATABASE_SCHEMA.sql`.
- Core tables:
  - identity: `user`, `role`, `user_preference`
  - household: `household`, `household_member`, `household_invite`, `household_event`
  - chat: `chat_session`, `chat_message`
  - food domain: `category`, `food`, `recipe`, `recipe_step`, `recipe_food`, `dish`, `recipe_vectors`
  - planning: `meal`, `meal_attendance`, `meal_dish`
  - inventory: `inventory`, `inventory_batch`
  - system: `notification`, `auth_refresh_token`, `password_reset_otp`

Seed strategy:
- Flyway `V11__seed_all_tables_docker.sql` seed 20 records/table (core tables) khi khởi tạo DB mới.

## 7. Docker and Runtime

### 7.1 Main Compose
File: `docker-compose.yml`
Services:
- postgres
- backend
- ai_service
- redis

### 7.2 Build Optimization
- Multi-stage Dockerfiles cho backend và ai_service.
- `.dockerignore` riêng theo service để giảm build context:
  - backend/.dockerignore
  - mobile-app/.dockerignore
  - ai_service/.dockerignore

### 7.3 Typical Commands
```bash
# Start full stack
docker compose up -d --build

# Check health
docker compose ps

# Reset data and reseed
docker compose down -v
docker compose up -d --build

# Stop
docker compose down
```

## 8. Environment Configuration

### 8.1 Root .env
Dùng cho docker compose orchestration:
- DB credentials
- backend runtime env
- AI service env
- Google OAuth env (client id/redirect/...)

### 8.2 Mobile env
- `mobile-app/.env.local`: API URL, timeout, mobile feature flags, Google public OAuth config.

### 8.3 Backend env
- `backend/src/main/resources/application.yml` đọc env cho datasource, JWT, Google client id.

## 9. Development Workflow

1. Pull code và chuẩn bị env.
2. Chạy Docker stack để có backend, db, ai service.
3. Chạy mobile app local (Expo) kết nối backend URL tương ứng.
4. Khi thay đổi DB: thêm Flyway migration mới, không sửa migration cũ đã chạy.
5. Trước merge: compile/type-check/build tối thiểu cho scope thay đổi.

## 10. Standards and Governance
- Quy chuẩn kỹ thuật chính: `.ai-rules.md`.
- API envelope chuẩn và rule phân tầng được áp dụng xuyên backend/mobile.
- Secrets không hardcode trong source code.

## 11. Current Important Notes
- Redis host port có thể xung đột nếu máy đã dùng 6379.
- Nếu cần truy cập Redis từ host, map sang port khác (ví dụ 6380:6379).
- Nếu dữ liệu cũ gây sai khác seed/migration, reset volume DB để môi trường sạch.

## 12. Next Recommended Improvements
- Thêm CI pipeline cho:
  - backend compile + test
  - mobile type-check + lint
  - compose config validation
- Thêm smoke test cho auth + household QR join flow.
- Bổ sung OpenAPI sync để contract backend/mobile luôn nhất quán.
