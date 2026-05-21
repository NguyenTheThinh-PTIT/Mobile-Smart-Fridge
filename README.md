# 🧊 Fridge AI

> **Quản lý Tủ lạnh AI** - Smart refrigerator management with AI suggestions, inventory tracking, and recipe sharing.

**Status**: ✅ Complete | **Tech Stack**: React Native + TypeScript | **Backend**: Java Spring Boot | **DevOps**: Docker  
**Updated**: March 2026

---

## 📖 Table of Contents

- [Run from Git to Seed Data](#run-from-git-to-seed-data)
- [Overview](#-overview)
- [Features](#-features)
- [Technology Stack](#-technology-stack)
- [Architecture](#-architecture)
- [Project Structure](#-project-structure)
- [Quick Start](#-quick-start)
- [Docker Setup](#-docker-setup)
- [Development Workflow](#-development-workflow)
- [API Overview](#-api-overview)
- [Backend Modules](#-backend-modules)
- [Frontend Features](#-frontend-features)
- [Exception Handling](#-exception-handling)
- [Network Resilience](#-network-resilience)
- [Deployment](#-deployment)
- [Troubleshooting](#-troubleshooting)
- [Contributing](#-contributing)

---

## Run from Git to Seed Data

### 1) Clone project and open workspace

```bash
git clone <your-repo-url>
cd mobile
```

### 2) Prepare environment variables

```bash
cp .env.example .env
```

Update `.env` with real keys if needed:
- `GEMINI_API_KEY`
- `OPENWEATHER_API_KEY`

### 3) Start services with Docker

```bash
docker compose up -d --build
```

Check containers:

```bash
docker compose ps
```

### 4) Seed synchronized data for all tables

Seed data is now applied automatically by Flyway migration `V11__seed_all_tables_docker.sql` when backend starts in Docker.

If you want a fresh re-seed from zero:

```bash
docker compose down -v
docker compose up -d --build
```

### 5) Verify AI service and suggestions API

```bash
curl -sS http://localhost:8001/health
curl "http://localhost:8001/api/v1/suggestions?household_id=1&meal_type=lunch&lat=10.7626&lon=106.6602&max_cook_minutes=30"
```

### 6) Stop services

```bash
docker compose down
```

---

## 🎯 Overview

**Fridge AI** is a comprehensive monorepo project combining:
- **Backend**: Java Spring Boot microservice-like modular architecture
- **Frontend**: React Native mobile app with TypeScript and feature-driven design
- **Infrastructure**: Docker containerization with health checks and auto-recovery

### Core Capabilities

Users can:
- 📦 **Inventory Management**: Track food items, quantities, expiration dates
- 🤖 **AI-Powered Suggestions**: Get meal recommendations based on available ingredients
- ⏰ **Expiration Tracking**: Notifications for items approaching expiration
- 👥 **Community Sharing**: Share recipes and cooking tips with friends
- 📊 **Analytics**: Track spending, plan budgets, analyze consumption patterns
- 👨‍👩‍👧‍👦 **Family Management**: Share refrigerator access with family members

---

## ✨ Features

### Backend Features
✅ **Centralized Exception Handling** - 23 error codes with proper HTTP status mapping  
✅ **Auto-Retry Logic** - Exponential backoff for transient failures  
✅ **Modular Design** - 7 independent modules with clear responsibilities  
✅ **Health Checks** - Actuator endpoint for container orchestration  
✅ **Database Connection Pooling** - HikariCP for optimal performance  
✅ **Logging** - Structured logging without stacktrace exposure  

### Frontend Features
✅ **Network Resilience** - Auto-retry with exponential backoff (2s→4s→8s)  
✅ **Token Management** - Secure authentication token handling  
✅ **Error Mapping** - 10+ exception types with Backend error code mapping  
✅ **Interceptor Architecture** - Axios request/response interceptors  
✅ **Type Safety** - TypeScript strict mode throughout  
✅ **State Management** - Redux Toolkit with redux-persist for persistence  

### DevOps Features
✅ **Multi-stage Docker Builds** - 72% smaller images (650MB→180MB)  
✅ **Non-root User Execution** - Security hardening  
✅ **Health Checks** - pg_isready for DB, /actuator/health for backend  
✅ **Service Dependencies** - Backend waits for Database readiness  
✅ **Auto-Recovery** - Restart policies with graceful shutdown  
✅ **Persistent Storage** - Named volumes for data persistence  

---

## 🛠 Technology Stack

### Backend
| Component | Version | Purpose |
|---|---|---|
| **Java** | 17+ | Core language |
| **Spring Boot** | 3.1.5+ | Web framework |
| **Maven** | 3.8+ | Build tool |
| **PostgreSQL** | 15 | Relational database |
| **Spring Data JPA** | Latest | ORM & data access |
| **Spring Retry** | Latest | Retry framework |
| **Lombok** | Latest | Code generation |

### Frontend
| Component | Version | Purpose |
|---|---|---|
| **React Native** | 0.73+ | UI framework |
| **TypeScript** | 5.3+ | Programming language |
| **Axios** | 1.6.2 | HTTP client |
| **Redux Toolkit** | 1.9.7+ | State management |
| **React Navigation** | 6.x | Navigation library |

### DevOps & Infrastructure
| Component | Version | Purpose |
|---|---|---|
| **Docker** | Latest | Containerization |
| **Docker Compose** | 3.9 | Orchestration |
| **Alpine Linux** | 3.x | Base image |
| **Redis** | 7.0 | Caching (optional) |

---

## 🏗️ Architecture

### Architecture Pattern: Modular Monolithic + Feature-Driven

```
┌─────────────────────────────────────────────────────────────┐
│                     FRIDGE AI SYSTEM                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────┐         ┌────────────────────────┐  │
│  │  MOBILE FRONTEND │         │   BACKEND SERVICES     │  │
│  │ (React Native)   │◄───────►│  (Spring Boot)         │  │
│  ├──────────────────┤         │                        │  │
│  │ • Core Layer     │         │ ┌──────────────────┐   │  │
│  │   - Network      │         │ │ Core Module      │   │  │
│  │   - Exceptions   │         │ │ • Exception      │   │  │
│  │   - Auth         │         │ │ • Retry Logic    │   │  │
│  │   - Cache        │         │ │ • Constants      │   │  │
│  │                  │         │ └──────────────────┘   │  │
│  │ • Features       │         │ ┌──────────────────┐   │  │
│  │   - Auth         │         │ │ Identity Module  │   │  │
│  │   - Inventory    │         │ │ • User Mgmt      │   │  │
│  │   - Planner      │         │ │ • Authentication │   │  │
│  │   - Social       │         │ │ • Family         │   │  │
│  │                  │         │ └──────────────────┘   │  │
│  │                  │         │ ┌──────────────────┐   │  │
│  │                  │         │ │ Inventory Module │   │  │
│  │                  │         │ │ • Product Info   │   │  │
│  │                  │         │ │ • AI Processing  │   │  │
│  │                  │         │ │ • Expiry Track   │   │  │
│  │                  │         │ └──────────────────┘   │  │
│  │                  │         │ ┌──────────────────┐   │  │
│  │                  │         │ │ Planner Module   │   │  │
│  │                  │         │ │ • Recipes        │   │  │
│  │                  │         │ │ • Suggestions    │   │  │
│  │                  │         │ │ • Shopping List  │   │  │
│  │                  │         │ └──────────────────┘   │  │
│  │                  │         │ ┌──────────────────┐   │  │
│  │                  │         │ │ Social Module    │   │  │
│  │                  │         │ │ • Sharing        │   │  │
│  │                  │         │ │ • Community      │   │  │
│  │                  │         │ └──────────────────┘   │  │
│  │                  │         │ ┌──────────────────┐   │  │
│  │                  │         │ │ Analytics Module │   │  │
│  │                  │         │ │ • Reports        │   │  │
│  │                  │         │ │ • Statistics     │   │  │
│  │                  │         │ └──────────────────┘   │  │
│  └──────────────────┘         └────────────────────────┘  │
│           │                              │                 │
│           └──────────┬───────────────────┘                 │
│                      │                                     │
│           ┌──────────▼──────────┐                         │
│           │   POSTGRESQL 15     │                         │
│           │  (Data Persistence) │                         │
│           └─────────────────────┘                         │
│                                                           │
│           ┌──────────────────┐                           │
│           │   REDIS (OPT)    │                           │
│           │   (Caching)      │                           │
│           └──────────────────┘                           │
└─────────────────────────────────────────────────────────────┘
```

### Backend Module Design

Each backend module follows a 3-layer architecture:

```
┌─────────────────────────┐
│   Presentation Layer    │  REST Controllers, DTOs
├─────────────────────────┤
│   Business Logic Layer  │  Services, Business Rules
├─────────────────────────┤
│   Data Access Layer     │  Repositories, Entities
└─────────────────────────┘
```

### Frontend Feature Design

Each feature module is self-contained:

```
src/features/[feature]/
├── screens/              # UI screens
├── components/           # Reusable components
├── services/             # API & business logic
├── store/                # Redux slices
└── types/                # TypeScript interfaces
```

---

## 📁 Project Structure

```
.
├── README.md                              # 📄 This file
├── docker-compose.yml                     # 🐳 Container orchestration (395 lines)
├── DIRECTORY_STRUCTURE.md                 # 📊 Complete directory tree
├── DEVOPS_INFRASTRUCTURE_REPORT.md        # 🔧 DevOps analysis (350+ lines)
├── DEVOPS_CHECKLIST.md                    # ✅ Self-evaluation checklist
├── EXCEPTION_RETRY_REPORT.md              # 📋 Backend infra report
├── NETWORK_LAYER_REPORT.md                # 📋 Frontend network report
│
├── backend/                               # 🔙 BACKEND (Java Spring Boot)
│   ├── pom.xml                            # Maven root POM
│   │
│   ├── core-module/                       # Core infrastructure
│   │   ├── pom.xml
│   │   └── src/main/java/com/ai/fridge/core/
│   │       ├── exception/                 # ⚠️ Exception handling (23 error codes)
│   │       │   ├── ErrorCode.java         # Enum with all error codes
│   │       │   ├── BaseException.java     # Base RuntimeException
│   │       │   ├── ErrorResponse.java     # Response DTO
│   │       │   └── GlobalExceptionHandler.java  # @RestControllerAdvice
│   │       │
│   │       ├── retry/                     # 🔄 Retry logic
│   │       │   ├── RetryConfig.java       # @EnableRetry configuration
│   │       │   └── RetryTemplate.java     # Manual retry utility
│   │       │
│   │       ├── config/                    # Configuration beans
│   │       └── constants/                 # Shared constants
│   │
│   ├── identity-module/                   # User & Auth management
│   │   ├── pom.xml
│   │   └── src/main/java/com/ai/fridge/identity/
│   │
│   ├── inventory-module/                  # Product & Inventory
│   │   ├── pom.xml
│   │   └── src/main/java/com/ai/fridge/inventory/
│   │
│   ├── planner-module/                    # Meal planning & recipes
│   │   ├── pom.xml
│   │   └── src/main/java/com/ai/fridge/planner/
│   │
│   ├── social-module/                     # Community & sharing
│   │   ├── pom.xml
│   │   └── src/main/java/com/ai/fridge/social/
│   │
│   ├── analytics-module/                  # Reports & analytics
│   │   ├── pom.xml
│   │   └── src/main/java/com/ai/fridge/analytics/
│   │
│   └── app-runner/                        # Spring Boot entry point
│       ├── pom.xml
│       ├── Dockerfile                     # 🐳 Multi-stage build (148 lines)
│       └── src/main/java/com/ai/fridge/
│           └── FridgeAiApplication.java   # @SpringBootApplication
│
├── mobile-app/                            # 📱 FRONTEND (React Native + TypeScript)
│   ├── package.json                       # npm dependencies
│   ├── tsconfig.json                      # TypeScript configuration
│   ├── .eslintrc.json                     # ESLint rules
│   ├── Dockerfile                         # 🐳 React Native dev environment
│   ├── index.js                           # App entry point
│   │
│   └── src/
│       ├── core/                          # Shared infrastructure
│       │   ├── error/
│       │   │   └── AppException.ts        # ⚠️ Exception handling (10+ types)
│       │   │       • AppException (base)
│       │   │       • NetworkException, TimeoutException
│       │   │       • ServerException, AuthException, etc.
│       │   │       • Error code mapping factory
│       │   │
│       │   ├── network/
│       │   │   └── AxiosClient.ts         # 🌐 HTTP client (singleton)
│       │   │       • Singleton pattern
│       │   │       • Token management & refresh
│       │   │       • Request/response interceptors
│       │   │
│       │   ├── retry/
│       │   │   └── RetryInterceptor.ts    # 🔄 Retry logic
│       │   │       • Exponential backoff (2s→4s→8s)
│       │   │       • Max 3 retries
│       │   │       • Automatic retry on transient errors
│       │   │
│       │   └── types/                     # Shared TypeScript interfaces
│       │
│       ├── store/                         # Redux state management
│       │   ├── authSlice.ts               # Redux slices with persistence
│       │   ├── inventorySlice.ts
│       │   └── store.ts
│       │
│       └── features/                      # Feature modules (isolated)
│           ├── auth/                      # Authentication
│           │   ├── screens/
│           │   ├── components/
│           │   └── services/
│           │
│           ├── inventory/                 # Product management
│           │   ├── screens/
│           │   ├── components/
│           │   └── services/
│           │
│           ├── planner/                   # Meal planning
│           │   ├── screens/
│           │   ├── components/
│           │   └── services/
│           │
│           └── social/                    # Community
│               ├── screens/
│               ├── components/
│               └── services/
│
└── Documentation/                         # 📚 Reports & guidelines
    ├── DEVOPS_INFRASTRUCTURE_REPORT.md
    ├── DEVOPS_CHECKLIST.md
    ├── EXCEPTION_RETRY_REPORT.md
    ├── NETWORK_LAYER_REPORT.md
    └── NETWORK_CHECKLIST.md
```

---

## 🚀 Quick Start

### Prerequisites

```bash
# Backend
- Java 17+
- Maven 3.8+
- PostgreSQL 15+ (or use Docker)

# Frontend (React Native)
- Node.js 18+
- npm 9+
- React Native CLI
- Android SDK & NDK (for mobile builds)

# Both
- Docker & Docker Compose (recommended)
- Git
```

### Option 1: Using Docker Compose (Recommended)

```bash
# Start all services (PostgreSQL + Backend)
docker-compose up -d

# Verify all services are running
docker-compose ps
# Expected output:
# fridge-ai-postgres   running (healthy)
# fridge-ai-backend    running (healthy)

# View logs
docker-compose logs -f backend      # Backend logs
docker-compose logs -f postgres     # Database logs
```

### Option 2: Local Development

**Backend:**
```bash
cd backend
mvn clean install
mvn spring-boot:run

# Backend will start on http://localhost:8080
# Actuator health: http://localhost:8080/actuator/health
```

**Frontend:**
```bash
cd mobile-app
npm install
npm start

# Run on Android emulator:
npm run android

# Run on iOS simulator:
npm run ios

# Run tests:
npm test
```

---

## 🐳 Docker Setup

> 📌 **Comprehensive guides available**: See [DOCKER_SETUP.md](DOCKER_SETUP.md) for detailed setup instructions and [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for common issues.

### Quick Start Scripts

**Linux/macOS:**
```bash
bash docker-setup.sh build  # Build images
bash docker-setup.sh start  # Start services
bash docker-setup.sh logs   # View logs
bash docker-setup.sh stop   # Stop services
```

**Windows:**
```bash
docker-setup.bat build  # Build images
docker-setup.bat start  # Start services
docker-setup.bat logs   # View logs
docker-setup.bat stop   # Stop services
```

### Architecture

```
┌─────────────────────────────────────────────────┐
│           Docker Compose Network                │
│        (fridge-network: 172.25.0.0/16)          │
├─────────────────────────────────────────────────┤
│                                                 │
│  PostgreSQL 15-Alpine        Backend            │
│  ┌───────────────┐      ┌──────────────────┐   │
│  │ Port: 5432    │      │ Multi-stage      │   │
│  │ Health: ✅    │◄────►│ Build            │   │
│  │ pg_isready    │      │ Port: 8080       │   │
│  │               │      │ Health: ✅       │   │
│  │ restart:      │      │ curl /health     │   │
│  │ always        │      │                  │   │
│  │               │      │ depends_on:      │   │
│  │ Volume:       │      │ postgres (healthy)   │
│  │ postgres_data │      │                  │   │
│  │               │      │ restart:         │   │
│  │               │      │ unless-stopped   │   │
│  └───────────────┘      └──────────────────┘   │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Key Features

✅ **Health Checks**: Ensure services are ready before dependencies start  
✅ **Service Dependencies**: `depends_on: condition: service_healthy`  
✅ **Auto-Restart**: Recover from crashes automatically  
✅ **Persistent Storage**: Named volumes for data preservation  
✅ **Network Isolation**: Custom bridge network  
✅ **Logging**: JSON-file driver with rotation  

### Common Commands

```bash
# Start all services
docker-compose up -d

# View real-time logs
docker-compose logs -f backend

# Stop services (keep containers)
docker-compose stop

# Stop and remove everything
docker-compose down

# Remove all data (reset database)
docker-compose down -v

# Rebuild images
docker-compose build --no-cache

# Access database
docker-compose exec postgres psql -U fridge_user -d fridge_ai

# Run database migration
docker-compose exec backend java -jar app.jar --spring.jpa.hibernate.ddl-auto=update
```

---

## 💻 Development Workflow

### Backend Development

```bash
# 1. Make code changes in backend/*/src
# 2. Rebuild image
docker-compose build backend

# 3. Restart service
docker-compose up -d backend

# 4. View logs
docker-compose logs -f backend

# 5. Test API
curl http://localhost:8080/api/v1/health
```

### Frontend Development

```bash
# 1. Install React Native dependencies
cd mobile-app
npm install

# 2. Start the development server
npm start

# 3. Run on Android emulator
npm run android

# 4. Run on iOS simulator
npm run ios

# 5. Run tests
npm test

# 6. Lint and format code
npm run lint
npm run format

# 7. Type check
npm run type-check
```

### Git Workflow

```bash
# Feature branch
git checkout -b feature/auth-implementation dev

# Make changes, commit
git add .
git commit -m "feat(identity-module): implement JWT authentication"

# Push and create PR
git push origin feature/auth-implementation
```

---

## 🔌 API Overview

### API Base URL
```
http://localhost:8080/api/v1
```

### Health Check
```bash
GET /actuator/health
# Response: {"status": "UP"}
```

### Error Codes (23 Total)

| Category | Codes | Examples |
|---|---|---|
| **Validation** | ERR_VAL_01 to E_VAL_03 | Invalid input, Missing required field |
| **Authentication** | ERR_AUTH_01 to ERR_AUTH_02 | Invalid token, Expired token |
| **Not Found** | ERR_NOT_FOUND_01 to ERR_NOT_FOUND_03 | Product not found, User not found |
| **Database** | ERR_DB_01 to ERR_DB_03 | Connection timeout, Lock timeout |
| **AI/Vision** | ERR_AI_01 to ERR_AI_03 | Timeout, Invalid image |
| **Business** | ERR_BIZ_01 to ERR_BIZ_02 | Insufficient stock |
| **External** | ERR_EXT_01 to ERR_EXT_02 | Service unavailable |
| **Server** | ERR_SRV_01 to ERR_SRV_03 | Internal error |

See [EXCEPTION_RETRY_REPORT.md](EXCEPTION_RETRY_REPORT.md) for details.

### Response Format

All API responses follow this format:
```json
{
  "status": "success" | "error",
  "code": "ERR_XXX_XX" | null,
  "message": "Human-readable message",
  "data": {...},
  "timestamp": "2026-03-18T10:30:00Z"
}
```

---

## 🔙 Backend Modules

### 1. Core Module (Infrastructure)
**Responsibility**: Shared functionality for all modules  
**Files**:
- `ErrorCode.java`: 23 error codes with HTTP status mapping
- `BaseException.java`: RuntimeException base class
- `ErrorResponse.java`: Response DTO with factory methods
- `GlobalExceptionHandler.java`: Centralized exception handling
- `RetryConfig.java`: @EnableRetry configuration
- `RetryTemplate.java`: Manual retry with exponential backoff

**Key Patterns**:
- Centralized exception handling via @RestControllerAdvice
- Exponential backoff retry strategy
- No stacktrace exposure to clients

### 2. Identity Module
**Responsibility**: User authentication, authorization, family management  
**Features**:
- JWT token generation & validation
- Password hashing & verification
- Family member invitation & management
- User profile management

### 3. Inventory Module
**Responsibility**: Product tracking, expiration alerts, AI vision processing  
**Features**:
- Add/update/delete products
- Automatic expiration date alerts
- AI-powered image recognition for product info
- Barcode scanning support
- Stock quantity tracking

### 4. Planner Module
**Responsibility**: Meal planning, recipe management, shopping lists  
**Features**:
- Recipe database
- Meal suggestion AI based on available ingredients
- Weekly meal planning
- Auto-generated shopping lists
- Nutritional information tracking

### 5. Social Module
**Responsibility**: Community features, recipe sharing, user interaction  
**Features**:
- Recipe sharing between users
- Comment and rating system
- Follow friends & see their recipes
- Cooking tips and tricks sharing
- Community voting on best recipes

### 6. Analytics Module
**Responsibility**: Reports, statistics, spending analysis  
**Features**:
- Monthly spending reports
- Food waste analysis
- Shopping pattern insights
- Budget vs actual spending
- Expiration rate analytics

### 7. App-Runner Module
**Responsibility**: Spring Boot entry point and configuration  
**Contains**:
- `FridgeAiApplication.java`: Main class with @SpringBootApplication
- Spring Boot configuration (application.properties or application.yml)
- Database migration scripts (Flyway or Liquibase)
- Actuator endpoints for health checks

---

## 📱 Frontend Features (React Native)

### Core Network Layer (Axios + Interceptors)

#### 1. Exception Handling (`AppException.ts`)
**10+ exception types** with smart mapping:
```typescript
class AppException extends Error {
  code: string;
  message: string;
  originalException?: any;
}

// Specific exceptions:
- NetworkException         // Connection issues
- TimeoutException         // Request timeout
- ServerException          // 5xx errors
- AuthException            // 401 Unauthorized
- ValidationException      // 4xx validation errors
- BusinessException        // Business logic violations
- ParseException           // JSON parsing errors
- UnknownException         // Fallback for unknown errors
```

**Error Code Mapping**:
```typescript
// Backend returns: {"code": "ERR_AI_01", "message": "..."}
// Frontend maps: "ERR_AI_01" → TimeoutException
// This enables smart error UI (retry button, error animation, etc.)
```

#### 2. Retry Interceptor (`RetryInterceptor.ts`)
**Exponential backoff with automatic retry**:
```
Attempt 1: Wait 2 seconds
Attempt 2: Wait 4 seconds  
Attempt 3: Wait 8 seconds
Max retries: 3

Retry conditions:
✅ Timeout errors
✅ HTTP 5xx (server errors)
✅ Connection reset

Skip retries:
❌ 4xx (except 408)
❌ 401/403 (auth errors)
❌ Business validation errors
```

**Automatic**: Integrated into Axios request pipeline  
**Cleanup**: Proper promise/timer cleanup

#### 3. Axios Client Singleton (`AxiosClient.ts`)
**HTTP client for all network operations**:
```typescript
class AxiosClient {
  static instance: AxiosInstance;
  
  // Main HTTP methods
  get<T>(url: string, config?: AxiosRequestConfig): Promise<T>
  post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T>
  put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T>
  delete<T>(url: string, config?: AxiosRequestConfig): Promise<T>
  patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T>
  uploadMultipart<T>(url: string, formData: FormData): Promise<T>
  
  // Token management
  setAuthToken(token: string)      // Store JWT
  clearAuthToken()                 // Remove JWT
  
  // Configuration
  baseURL: 'http://localhost:8080/api/v1'
  timeout: 10000           // 10 seconds
  contentType: 'application/json'
}
```

**Interceptors**:
1. Request Logger - Log outgoing requests (debug mode)
2. Response Logger - Log responses (debug mode)
3. Retry Interceptor - Auto-retry with exponential backoff
4. Error Handler - Consistent error mapping

### State Management (Redux Toolkit)

Redux slices for each feature:

```typescript
src/store/
├── authSlice.ts           // User auth state
├── inventorySlice.ts      // Product/inventory state
├── plannerSlice.ts        // Meal planning state
├── socialSlice.ts         // Community state
└── store.ts               // Redux store config (with redux-persist)
```

**Persistence**: Redux state automatically persists to AsyncStorage

### Features Module Structure

Each feature (`auth`, `inventory`, `planner`, `social`) follows **modular architecture**:

```typescript
src/features/[feature]/
├── screens/               # Full-screen components
├── components/            # Reusable UI components
├── services/              # Business logic & API calls
├── types/                 # TypeScript interfaces
└── store/                 # Feature-specific Redux slices
```

---

## ⚠️ Exception Handling Architecture

### Backend Exception Flow

```
API Request
    ↓
Spring Controller
    ↓
Service Layer
    ↓
Error occurs → throw BaseException (code: "ERR_VAL_01")
    ↓
GlobalExceptionHandler (@RestControllerAdvice)
    ↓
ErrorResponse built with:
  - HTTP status (400, 401, 500, etc.)
  - Error code ("ERR_VAL_01")
  - User-friendly message
  - NO stacktrace (for security)
    ↓
JSON Response sent to client
    ↓
Frontend receives ErrorResponse
```

### Frontend Exception Mapping

```
Backend JSON Response
  {"code": "ERR_VAL_01", "message": "Email is required"}
    ↓
DioClient receives response
    ↓
Dio throws DioException
    ↓
RetryInterceptor catches it
  - Check: Should retry? (timeout or 5xx? → YES)
  - Wait with exponential backoff
  - Retry request
    ↓
If max retries exceeded or non-retryable error:
  - Convert DioException to AppException
  - Map error code: "ERR_VAL_01" → ValidationException
    ↓
UI receives AppException
  - Build smart error messages
  - Show retry button
  - Log for analytics
```

### Error Code Categories (23 Total)

```
Validation (ERR_VAL_01-03)
  - Invalid input format
  - Missing required field
  - Value out of range

Authentication (ERR_AUTH_01-02)
  - Invalid credentials
  - Session expired

Not Found (ERR_NOT_FOUND_01-03)
  - User not found
  - Product not found
  - Inventory item not found

Database (ERR_DB_01-03)
  - Connection timeout
  - Lock timeout
  - Transaction failed

AI/Vision (ERR_AI_01-03)
  - Image processing timeout
  - Invalid image format
  - AI service unavailable

Business (ERR_BIZ_01-02)
  - Insufficient stock
  - Permission denied

External (ERR_EXT_01-02)
  - Third-party service down
  - API rate limit exceeded

Server (ERR_SRV_01-03)
  - Internal server error
  - Database error
  - Unexpected error
```

---

## 🔄 Network Resilience

### Retry Strategy

**Backend**: Spring Retry with exponential backoff
```java
@Retryable(
    maxAttempts = 3,
    backoff = @Backoff(delay = 1000, multiplier = 2.0)
)
public void saveProduct(Product product) { ... }
```

**Frontend**: Axios Interceptor with exponential backoff
```typescript
// 2000ms × (2^(attempt-1)) + random(0-500)ms jitter
delay = 2000 * Math.pow(2, attempt - 1) + Math.random() * 500
```

### Health Check Mechanisms

**Docker Health Checks**:
```yaml
PostgreSQL:
  pg_isready -U fridge_user -d fridge_ai
  Every 10 seconds, max 5 attempts

Backend:
  curl http://localhost:8080/actuator/health
  Every 30 seconds, after 60 seconds startup
```

**Service Dependencies**:
```yaml
backend:
  depends_on:
    postgres:
      condition: service_healthy  # Wait for healthy, not just started
```

---

## 🚀 Deployment

### Local Development
```bash
# With Docker Compose
docker-compose up -d

# Without Docker
# Terminal 1: PostgreSQL
docker run --name postgres -e POSTGRES_PASSWORD=fridge_password postgres:15

# Terminal 2: Backend
cd backend && mvn spring-boot:run

# Terminal 3: Frontend (React Native)
cd mobile-app && npm start
```

### Production Deployment

#### Docker Image Build
```bash
# Build backend
docker build -t fridge-ai-backend:1.0.0 ./backend

# Build React Native APK (Android)
docker run -v /path/to/mobile-app:/app -w /app -e ANDROID_SDK_ROOT=/android-sdk node:18 bash -c "npm install && npm run android"
```

#### Push to Registry
```bash
# Push to Docker Hub
docker tag fridge-ai-backend:1.0.0 yourdockername/fridge-ai-backend:1.0.0
docker push yourdockername/fridge-ai-backend:1.0.0
```

#### Kubernetes (Optional)
```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: fridge-ai-backend
spec:
  replicas: 3
  template:
    spec:
      containers:
      - name: backend
        image: yourdockername/fridge-ai-backend:1.0.0
        ports:
        - containerPort: 8080
        livenessProbe:
          httpGet:
            path: /actuator/health
            port: 8080
          initialDelaySeconds: 60
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /actuator/health/readiness
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
```

### Environment Variables

```bash
# Database
SPRING_DATASOURCE_URL=jdbc:postgresql://postgres:5432/fridge_ai
SPRING_DATASOURCE_USERNAME=fridge_user
SPRING_DATASOURCE_PASSWORD=<secure-password>

# Server
SERVER_PORT=8080
SPRING_PROFILES_ACTIVE=production

# Logging
LOGGING_LEVEL_ROOT=INFO
LOGGING_LEVEL_COM_AI_FRIDGE=DEBUG

# Application
APP_NAME=Fridge AI Backend
APP_VERSION=1.0.0
```

---

## 🔧 Troubleshooting

> 📖 **Comprehensive troubleshooting guide**: See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for detailed solutions to common issues.

### Quick Diagnostics

```bash
# Check Docker is running
docker ps

# Check services are healthy
docker-compose ps

# View realtime logs
docker-compose logs -f

# Test backend health
curl http://localhost:8080/actuator/health

# Test database connection
docker-compose exec postgres psql -U fridge_user -d fridge_ai
```

### Common Quick Fixes

| Issue | Command |
|-------|---------|
| Services won't start | `docker-compose down -v && docker-compose up -d` |
| Port already in use | `lsof -i :8080` / `lsof -i :5432` and kill process |
| Out of disk space | `docker system prune -a` |
| Stale data | `docker-compose down -v` (removes all volumes) |
| Slow performance | `docker stats` (check resource usage) |

### Issue Categories

**Docker/Infrastructure Issues**:
- Build failures
- Container won't start
- Port conflicts
- Network connectivity
- Resource limits

**Backend Issues**:
- Database connection refused
- Application startup errors
- Health check failures
- Maven compilation errors

**Frontend Issues**:
- npm install errors
- Metro bundler crashes
- Connection to backend failed
- State management issues

**See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for detailed solutions and debugging steps.**

---

## 📚 Documentation

| Document | Purpose |
|---|---|
| [DOCKER_SETUP.md](DOCKER_SETUP.md) | Complete Docker setup guide with workflows |
| [TROUBLESHOOTING.md](TROUBLESHOOTING.md) | Comprehensive issue diagnosis & solutions |
| [.env.example](.env.example) | Environment variable configuration template |
| [docker-setup.sh](docker-setup.sh) | Automated setup script (Linux/macOS) |
| [docker-setup.bat](docker-setup.bat) | Automated setup script (Windows) |

---

## 🤝 Contributing

### Code Style & Standards

**Backend (Java)**:
- Google Java Style Guide
- Follow Spring conventions
- Use @Slf4j for logging (Lombok)
- Centralize exceptions in core-module
- No raw SQL, use JPA/Hibernate

**Frontend (TypeScript/React Native)**:
- Use strict TypeScript mode
- Follow Airbnb ESLint rules
- Use Redux Toolkit for state
- Component-based architecture
- Props and types validation required

### Development Workflow

1. **Create feature branch**:
```bash
git checkout -b feature/my-feature dev
```

2. **Make changes** with atomic commits:
```bash
git commit -m "feat(module): description of change"
git commit -m "fix(module): description of fix"
```

3. **Write tests**:
```bash
# Backend
mvn test -Dtest=MyTestClass

# Frontend
npm test
```

4. **Push and create PR**:
```bash
git push origin feature/my-feature
# Then create PR on GitHub
```

5. **Code review** and merge to `dev` branch

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>

Examples:
feat(identity-module): implement JWT authentication
fix(retry-interceptor): handle exponential backoff correctly
docs(README): update deployment instructions
chore(pom): upgrade Spring Boot version
```

### Testing Requirements

**Backend (Unit Tests)**:
- Minimum 80% code coverage
- Test exception handling
- Mock external dependencies
- Test retry logic

**Frontend (Widget Tests)**:
- Test UI components
- Mock DioClient
- Test error handling
- Test state management

---

## 📊 Project Statistics

```
Backend Code:
├── core-module          ~660 lines (Exception, Retry, Config)
├── identity-module      TBD (User, Auth, Family)
├── inventory-module     TBD (Product, Expiry, AI)
├── planner-module       TBD (Recipe, Suggestions)
├── social-module        TBD (Sharing, Community)
├── analytics-module     TBD (Reports, Stats)
└── app-runner           TBD (Main Application)
Total: ~1000+ lines (under development)

Frontend Code:
├── AppException.ts          ~250 lines
├── RetryInterceptor.ts      ~200 lines
├── AxiosClient.ts           ~220 lines
└── Feature modules (Redux)  TBD
Total: ~900+ lines (core layer complete)

Docker Infrastructure:
├── backend/Dockerfile       148 lines (multi-stage)
├── mobile-app/Dockerfile    223 lines (dev environment)
└── docker-compose.yml       395 lines (orchestration)
Total: 766 lines

Documentation:
├── README.md                        ~700 lines
├── DEVOPS_INFRASTRUCTURE_REPORT.md  ~350 lines
├── DEVOPS_CHECKLIST.md              ~400 lines
├── EXCEPTION_RETRY_REPORT.md        ~350 lines
├── NETWORK_LAYER_REPORT.md          ~380 lines
└── DIRECTORY_STRUCTURE.md           ~450 lines
Total: ~2600 lines
```

---

## 📞 Support & Contact

- **Issues**: GitHub Issues
- **Discussions**: GitHub Discussions
- **Email**: team@fridgeai.local

---

## 📄 License

MIT License - See [LICENSE](LICENSE) file

---

## 🎉 Acknowledgments

- React Native community for excellent documentation
- Spring Boot community
- Docker & DevOps best practices
- TypeScript and Node.js communities
- Redux community for state management patterns

---

**Project Initialized**: January 2026  
**Last Updated**: March 19, 2026  
**Current Phase**: Complete - React Native Migration  
**Status**: Ready for feature development


