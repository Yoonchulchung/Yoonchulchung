# Portfolio Project

3-Layered Architecture 기반 포트폴리오 웹사이트

## 📖 문서

- [프로젝트 개요](./docs/PROJECT_OVERVIEW.md)
- [설치 가이드](./docs/INSTALLATION.md)
- [API 문서](./docs/API_DOCUMENTATION.md)
- [유지보수 가이드](./docs/MAINTENANCE.md)

## 🚀 빠른 시작

### 로컬 개발 환경

```bash
# Backend
cd backend
npm install
cp .env.example .env
npm run start:dev

# Frontend
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

### Kubernetes 배포

```bash
# Secrets 생성
kubectl create secret generic postgres-secret --from-literal=password=your-password
kubectl create secret generic redis-secret --from-literal=password=your-password
kubectl create secret generic backend-secret \
  --from-literal=database-url="postgresql://portfolio_user:password@postgres:5432/portfolio" \
  --from-literal=jwt-secret=your-jwt-secret

# 배포
kubectl apply -f kubernetes/configmaps/
kubectl apply -f kubernetes/deployments/
kubectl apply -f kubernetes/services/
```

## 🏗️ 프로젝트 구조

```
.
├── backend/                 # NestJS Backend
│   ├── src/
│   │   ├── auth/           # 인증 모듈
│   │   ├── project/        # 프로젝트 모듈
│   │   ├── portfolio/      # 포트폴리오 모듈
│   │   ├── config/         # 설정 (DB, Redis)
│   │   └── common/         # 공통 모듈
│   ├── prisma/             # DB 스키마
│   └── Dockerfile
├── frontend/               # Next.js Frontend
│   ├── src/
│   │   ├── app/           # App Router
│   │   ├── components/    # React 컴포넌트
│   │   └── lib/           # 유틸리티
│   └── Dockerfile
├── kubernetes/             # Kubernetes 설정
│   ├── deployments/
│   ├── services/
│   ├── configmaps/
│   └── secrets/
└── docs/                   # 문서
```

## 🔧 기술 스택

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Backend**: NestJS, Prisma, PostgreSQL, Redis
- **Infrastructure**: Docker, Kubernetes, Nginx

## 📝 라이선스

MIT
