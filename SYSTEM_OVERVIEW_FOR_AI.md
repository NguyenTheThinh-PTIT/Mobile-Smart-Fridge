# Fridge AI System Overview

This document describes the whole system at a level suitable for AI agents, architecture review, and onboarding.

## 1. Product Summary

Fridge AI is a household food management platform with a React Native mobile app and a Spring Boot backend. The system helps users:

- manage household members and invitations,
- track food inventory and expiration dates,
- plan meals,
- store recipes and dishes,
- exchange notifications,
- keep chat history,
- support authentication and user preferences.

The repository currently contains a backend service, a mobile app, Docker Compose infrastructure, database migrations, and API definitions.

## 2. High-Level Architecture

The system follows a modular monolith pattern:

- Mobile app: React Native + Expo + TypeScript.
- Backend: Spring Boot 3 application with domain modules.
- Database: PostgreSQL 15.
- Infrastructure: Docker Compose for local orchestration.

The backend is the central source of truth. The mobile app talks to the backend through HTTP APIs. The backend stores persistent data in PostgreSQL and exposes business logic through REST endpoints.

## 3. Main Runtime Components

### 3.1 Mobile App

Location: `mobile-app/`

Important characteristics:

- Expo-based React Native application.
- TypeScript UI and navigation structure.
- Axios-based API client with retry logic.
- Redux Toolkit for app state.
- Environment-driven API base URL.

The mobile client is configured to call the backend at `/api/v1`.

### 3.2 Backend

Location: `backend/`

Important characteristics:

- Spring Boot application.
- Modular package structure under `com.ai.fridge`.
- REST APIs for auth, users, household, inventory, planner, social, analytics, and current-user actions.
- Shared exception model and error codes.
- Database migrations managed by Flyway.
- JPA/Hibernate for persistence.
- Actuator health endpoint for container readiness.

### 3.3 Database

Location:

- Migration scripts: `backend/src/main/resources/db/migration/`
- Schema snapshot: `backend/AI_DATABASE_SCHEMA.sql`

The schema models identity, household membership, chat history, recipes, meals, inventory, and notifications.

### 3.4 Docker Compose

Location: `docker-compose.yml`

Services:

- `postgres`: PostgreSQL 15 database.
- `backend`: Spring Boot API service.

The Compose file wires the backend to the database, defines health checks, and exposes ports `5432` and `8080`.

## 4. Backend Module Map

The backend is organized by domain. The current codebase exposes the following major areas:

- `config`: security and retry configuration.
- `common`: DTOs, exceptions, shared API response wrappers, utilities.
- `modules/app/auth`: login, register, refresh, logout, token handling.
- `modules/app/user`: current-user operations.
- `modules/app/household`: household operations.
- `modules/app/inventory`: inventory app-level operations.
- `modules/identity`: user management.
- `modules/inventory`: food and item management.
- `modules/planner`: meal planning.
- `modules/social`: recipe sharing and social interactions.
- `modules/analytics`: event logging and analytics.

The database also includes `chat_session` and `chat_message`, which means chat history is already part of the domain model even if there is not yet a dedicated AI chat orchestrator.

## 5. Database Domains

The current schema can be grouped into these domains:

### 5.1 Identity and Profile

- `role`
- `user`
- `user_preference`

Purpose:

- store user identity,
- store OAuth token reference,
- store personal preferences such as cooking skill, allergies, diets, and tastes.

### 5.2 Household Management

- `household`
- `household_member`
- `household_invite`

Purpose:

- represent a shared household,
- link users to households with a role,
- create invite links and codes for onboarding.

### 5.3 Chat History

- `chat_session`
- `chat_message`

Purpose:

- store per-member chat sessions,
- store messages and timestamps,
- keep context tags for conversation grouping or future retrieval.

### 5.4 Food Knowledge and Recipes

- `category`
- `food`
- `recipe`
- `recipe_step`
- `recipe_food`
- `dish`

Purpose:

- classify foods,
- store recipe content and steps,
- map ingredients to recipes,
- represent prepared dishes derived from recipes.

### 5.5 Meal Planning

- `meal`
- `meal_attendance`
- `meal_dish`

Purpose:

- schedule meals for a household,
- track attendance,
- attach dishes to a planned meal.

### 5.6 Inventory Tracking

- `inventory`
- `inventory_batch`

Purpose:

- represent a household inventory,
- track batches of food, quantities, units, storage sections, purchase state, and expiration dates.

### 5.7 Notifications

- `notification`

Purpose:

- store household-level notifications,
- attach metadata for extensibility,
- track read/unread state.

## 6. Relationship Overview

Important relationships:

- one `user` can have one or more `household_member` rows,
- one `household` can have many members,
- one `household` can have many meals, inventories, notifications, and invites,
- one `household_member` can own multiple `chat_session` rows,
- one `chat_session` can have many `chat_message` rows,
- one `recipe` can have many `recipe_step` and `recipe_food` rows,
- one `food` can appear in many recipe ingredients and inventory batches,
- one `inventory` can have many `inventory_batch` rows,
- one `meal` can have many `meal_attendance` and `meal_dish` rows.

There is one circular relationship in the identity area:

- `user.profile_id` references `user_preference.id`
- `user_preference.user_id` references `user.id`

This means preference and user records must be created in a controlled order.

## 7. API Surface

The OpenAPI file in `backend/openapi.yaml` shows the current API shape. Major groups include:

- Auth: login, register, refresh, logout.
- Users: CRUD operations.
- Current User: profile operations for the logged-in user.
- Inventory App and Inventory Core: inventory item and household inventory flows.
- Planner: meal planning operations.
- Social: recipe share actions.
- Analytics: event logging.
- Household: household management.

The mobile app uses the backend base URL from environment variables and the Axios client in `mobile-app/src/core/network/AxiosClient.ts`.

## 8. Authentication and Session Model

The backend includes auth controllers and services for login/register/refresh/logout.

Current model hints:

- OAuth token storage exists in the `user` table.
- JWT or token-based session handling appears to be managed in application services.
- Current-user endpoints rely on authorization headers.

The exact auth implementation is in backend services, but from the API surface the system behaves like a token-based authenticated app.

## 9. Error Handling Model

The backend uses a shared exception framework with typed error codes.

Groups in `ErrorCode.java` include:

- not found errors,
- database errors,
- AI and vision errors,
- business logic errors,
- external service errors,
- internal server errors.

This is important for any AI assistant because the backend already has a normalized error vocabulary that can be mapped to user-friendly responses.

## 10. Runtime Configuration

### Backend configuration

Primary configuration is in `backend/src/main/resources/application.yml`.

Relevant settings:

- database URL, username, password,
- Flyway migration location,
- JPA/Hibernate settings,
- server port `8080`,
- logging levels,
- actuator endpoints,
- Gemini API key/model name placeholders.

### Docker Compose configuration

The root Compose file defines:

- PostgreSQL database name `fridge_ai`,
- user `fridge_user`,
- password `fridge_password`,
- backend database URL `jdbc:postgresql://postgres:5432/fridge_ai`,
- backend container port `8080`.

### Mobile app configuration

The mobile app reads API URL from `EXPO_PUBLIC_API_URL` or `REACT_APP_API_URL`.

Default local value:

- `http://localhost:8080/api/v1`

## 11. Data Flow

Typical user flow:

1. User opens the mobile app.
2. Mobile app sends requests to the backend API.
3. Backend validates request, authenticates user if needed, and executes business rules.
4. Backend reads/writes PostgreSQL tables.
5. Backend returns structured JSON responses.
6. Mobile app renders the response and may persist auth state locally.

For planning and inventory flows, the backend becomes the source of truth for household data.

## 12. Chat and AI Readiness

The repository is partially prepared for AI features, but an actual chatbot orchestration layer is not yet implemented.

What already exists:

- chat session and message tables,
- AI-related error codes,
- Gemini configuration placeholders,
- centralized HTTP client on the mobile side,
- a modular backend structure that can accept new services cleanly.

What is still missing for a full RAG chatbot:

- a dedicated chat controller/service for AI orchestration,
- a document ingestion pipeline,
- chunking and embedding generation,
- a vector store or pgvector index,
- retrieval ranking and source citation format,
- prompt templates and guardrails,
- evaluation and observability for answer quality.

## 13. Recommended AI Chat Architecture

If the goal is to build a chatbot that calls APIs and uses RAG with a separate knowledge base, the safest architecture is:

### 13.1 Orchestration layer

Add a new backend domain such as `modules/chatbot` or `modules/ai-chat`.

Responsibilities:

- receive chat requests,
- identify intent,
- decide whether to query live APIs or knowledge base,
- combine retrieved context,
- call the LLM,
- return answer plus citations.

### 13.2 Knowledge base layer

Keep two different sources:

- operational DB: users, households, meals, inventory, recipes,
- knowledge base: docs, FAQs, how-to guides, policies, recipes corpus, prompts, and extracted content.

Do not treat all app data as raw knowledge base content. Operational data and semantic knowledge should stay separate.

### 13.3 Retrieval layer

For a first version:

- store documents in PostgreSQL,
- generate embeddings,
- use pgvector or an external vector DB,
- retrieve top-k passages by query similarity,
- rerank if needed,
- inject only the most relevant context into the prompt.

### 13.4 Tool/API layer

When the chatbot needs live data, call backend APIs or domain services instead of relying only on the knowledge base.

Examples:

- check user inventory,
- fetch upcoming meals,
- read household members,
- get recipe details,
- get current notifications.

This makes the assistant factual and up to date.

## 14. Suggested Development Order

1. Add a chatbot API contract.
2. Define which questions are answered from live APIs and which from RAG.
3. Build a small knowledge base ingest pipeline.
4. Add embeddings and retrieval.
5. Connect prompt builder and LLM provider.
6. Add citations, logging, and evaluation.
7. Add mobile chat UI.
8. Add fallback and safety handling.

## 15. Practical Mental Model for AI Agents

If an AI agent needs to understand this repo quickly, the correct mental model is:

- one mobile client,
- one Spring Boot backend,
- one PostgreSQL database,
- a set of business domains around household food management,
- chat history already stored in DB,
- AI config placeholders already present,
- no production chatbot service yet,
- clear room to add a dedicated AI orchestration module without breaking current flows.

## 16. Current Schema Snapshot

For the exact database structure, see:

- [backend/AI_DATABASE_SCHEMA.sql](backend/AI_DATABASE_SCHEMA.sql)

That file is the canonical schema summary for the current repository state.
