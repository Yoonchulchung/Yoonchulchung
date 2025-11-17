# 포트폴리오 프로젝트 개요

## 🎯 프로젝트 설명

3-Layered Architecture로 구성된 포트폴리오 웹사이트입니다. 사용자 인증을 통해 접근하며, 프로젝트와 포트폴리오 정보를 관리할 수 있습니다.

## 🏗️ 아키텍처

### 3-Layered Architecture

```
┌─────────────────────────────────────┐
│          Presentation Layer         │
│   (Next.js Frontend + Nginx)        │
└─────────────────────────────────────┘
               ↓
┌─────────────────────────────────────┐
│         Application Layer           │
│   (NestJS Backend API + Redis)      │
└─────────────────────────────────────┘
               ↓
┌─────────────────────────────────────┐
│           Data Layer                │
│         (PostgreSQL)                │
└─────────────────────────────────────┘
```

### 기술 스택

**Frontend**
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Axios (HTTP Client)
- Zustand (State Management)

**Backend**
- NestJS
- TypeScript
- Prisma ORM
- PostgreSQL
- Redis (Session Management)
- JWT (Authentication)
- Passport.js

**Infrastructure**
- Docker
- Kubernetes
- Nginx (Reverse Proxy & Load Balancer)

## 📊 데이터베이스 스키마

### 1. User 테이블
외부 접근을 관리하기 위한 사용자 테이블
- id (UUID, Primary Key)
- email (Unique)
- username (Unique)
- password (Hashed)
- role (ADMIN/USER)
- createdAt
- updatedAt

### 2. Project 테이블
개별 프로젝트를 설명하는 테이블
- id (UUID, Primary Key)
- title
- description
- content
- imageUrl
- demoUrl
- githubUrl
- tags (Array)
- startDate
- endDate
- isPublished
- order
- createdAt
- updatedAt

### 3. Portfolio 테이블
전체 포트폴리오를 설명하는 테이블
- id (UUID, Primary Key)
- title
- subtitle
- description
- content
- avatarUrl
- resumeUrl
- email
- github
- linkedin
- website
- skills (Array)
- isPublished
- createdAt
- updatedAt

## 🔐 인증 시스템

- **JWT Token 기반 인증**
- **Redis를 통한 세션 관리**
- **Token Blacklisting (로그아웃)**
- **Role-based Access Control (RBAC)**
  - ADMIN: 모든 CRUD 작업 가능
  - USER: 읽기 전용

## 🚀 주요 기능

1. **사용자 인증**
   - 회원가입 / 로그인
   - JWT 토큰 기반 인증
   - 세션 관리 (Redis)

2. **프로젝트 관리**
   - 프로젝트 CRUD
   - 태그별 검색
   - 공개/비공개 설정

3. **포트폴리오 관리**
   - 포트폴리오 정보 CRUD
   - 공개 포트폴리오 조회

## 📦 컨테이너 구성

```
nginx (LoadBalancer)
  ↓
frontend (x2 replicas)
backend (x2 replicas)
  ↓
redis (x1 replica)
postgres (x1 replica)
```

## 🔧 환경 변수

### Backend (.env)
```
PORT=3001
NODE_ENV=production
DATABASE_URL=postgresql://user:password@postgres:5432/portfolio
JWT_SECRET=your-jwt-secret
JWT_EXPIRES_IN=7d
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
CORS_ORIGIN=http://localhost
```

### Frontend (.env)
```
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```
