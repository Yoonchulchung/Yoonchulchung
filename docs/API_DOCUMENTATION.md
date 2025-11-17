# API 문서

Base URL: `http://localhost/api` (Nginx를 통한 접근)  
또는 `http://localhost:3001/api` (Backend 직접 접근)

## 인증

대부분의 엔드포인트는 JWT 토큰이 필요합니다.

**Header:**
```
Authorization: Bearer <token>
```

## 📌 Auth Endpoints

### 1. 회원가입

```
POST /api/auth/register
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "username": "username"
}
```

**Response (201):**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "username",
    "role": "USER",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "token": "jwt-token"
}
```

### 2. 로그인

```
POST /api/auth/login
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "username",
    "role": "USER"
  },
  "token": "jwt-token"
}
```

### 3. 로그아웃

```
POST /api/auth/logout
```

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "message": "Logged out successfully"
}
```

### 4. 현재 사용자 정보

```
GET /api/auth/me
```

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "username": "username",
  "role": "USER",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

## 📁 Project Endpoints

### 1. 프로젝트 목록 조회 (Public)

```
GET /api/projects?published=true
```

**Query Parameters:**
- `published` (optional): `true` | `false` - 공개된 프로젝트만 조회

**Response (200):**
```json
[
  {
    "id": "uuid",
    "title": "Project Title",
    "description": "Project description",
    "content": "Project content...",
    "imageUrl": "https://example.com/image.jpg",
    "demoUrl": "https://demo.example.com",
    "githubUrl": "https://github.com/user/repo",
    "tags": ["React", "TypeScript"],
    "startDate": "2024-01-01T00:00:00.000Z",
    "endDate": "2024-06-01T00:00:00.000Z",
    "isPublished": true,
    "order": 0,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
]
```

### 2. 프로젝트 상세 조회 (Public)

```
GET /api/projects/:id
```

**Response (200):**
```json
{
  "id": "uuid",
  "title": "Project Title",
  "description": "Project description",
  "content": "Project content...",
  "imageUrl": "https://example.com/image.jpg",
  "demoUrl": "https://demo.example.com",
  "githubUrl": "https://github.com/user/repo",
  "tags": ["React", "TypeScript"],
  "startDate": "2024-01-01T00:00:00.000Z",
  "endDate": "2024-06-01T00:00:00.000Z",
  "isPublished": true,
  "order": 0,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

### 3. 태그별 프로젝트 조회 (Public)

```
GET /api/projects/tag/:tag
```

**Response (200):**
```json
[...]
```

### 4. 프로젝트 생성 (Admin Only)

```
POST /api/projects
```

**Headers:**
```
Authorization: Bearer <admin-token>
```

**Request Body:**
```json
{
  "title": "New Project",
  "description": "Project description",
  "content": "Detailed content...",
  "imageUrl": "https://example.com/image.jpg",
  "demoUrl": "https://demo.example.com",
  "githubUrl": "https://github.com/user/repo",
  "tags": ["React", "TypeScript"],
  "startDate": "2024-01-01T00:00:00.000Z",
  "endDate": "2024-06-01T00:00:00.000Z",
  "isPublished": true,
  "order": 0
}
```

**Response (201):**
```json
{
  "id": "uuid",
  ...
}
```

### 5. 프로젝트 수정 (Admin Only)

```
PATCH /api/projects/:id
```

**Headers:**
```
Authorization: Bearer <admin-token>
```

**Request Body:**
```json
{
  "title": "Updated Title",
  "isPublished": false
}
```

**Response (200):**
```json
{
  "id": "uuid",
  ...
}
```

### 6. 프로젝트 삭제 (Admin Only)

```
DELETE /api/projects/:id
```

**Headers:**
```
Authorization: Bearer <admin-token>
```

**Response (204):** No Content

## 💼 Portfolio Endpoints

### 1. 포트폴리오 목록 조회 (Public)

```
GET /api/portfolios?published=true
```

**Query Parameters:**
- `published` (optional): `true` | `false`

**Response (200):**
```json
[
  {
    "id": "uuid",
    "title": "My Portfolio",
    "subtitle": "Full Stack Developer",
    "description": "Portfolio description",
    "content": "Detailed content...",
    "avatarUrl": "https://example.com/avatar.jpg",
    "resumeUrl": "https://example.com/resume.pdf",
    "email": "contact@example.com",
    "github": "https://github.com/user",
    "linkedin": "https://linkedin.com/in/user",
    "website": "https://example.com",
    "skills": ["JavaScript", "TypeScript", "React"],
    "isPublished": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
]
```

### 2. 공개 포트폴리오 조회 (Public)

```
GET /api/portfolios/published
```

**Response (200):**
```json
{
  "id": "uuid",
  ...
}
```

### 3. 포트폴리오 상세 조회 (Public)

```
GET /api/portfolios/:id
```

### 4. 포트폴리오 생성 (Admin Only)

```
POST /api/portfolios
```

**Headers:**
```
Authorization: Bearer <admin-token>
```

**Request Body:**
```json
{
  "title": "My Portfolio",
  "subtitle": "Full Stack Developer",
  "description": "Portfolio description",
  "content": "Detailed content...",
  "avatarUrl": "https://example.com/avatar.jpg",
  "resumeUrl": "https://example.com/resume.pdf",
  "email": "contact@example.com",
  "github": "https://github.com/user",
  "linkedin": "https://linkedin.com/in/user",
  "website": "https://example.com",
  "skills": ["JavaScript", "TypeScript", "React"],
  "isPublished": true
}
```

### 5. 포트폴리오 수정 (Admin Only)

```
PATCH /api/portfolios/:id
```

### 6. 포트폴리오 삭제 (Admin Only)

```
DELETE /api/portfolios/:id
```

## ❌ 에러 응답

**400 Bad Request:**
```json
{
  "statusCode": 400,
  "message": "Validation error",
  "error": "..."
}
```

**401 Unauthorized:**
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

**403 Forbidden:**
```json
{
  "statusCode": 403,
  "message": "Forbidden"
}
```

**404 Not Found:**
```json
{
  "statusCode": 404,
  "message": "Resource not found"
}
```

**500 Internal Server Error:**
```json
{
  "statusCode": 500,
  "message": "Internal server error"
}
```
