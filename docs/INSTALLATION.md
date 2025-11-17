# 설치 가이드

## 📋 사전 요구사항

- Node.js 20+ (Backend/Frontend)
- Docker (컨테이너화)
- Kubernetes (오케스트레이션)
- kubectl (Kubernetes CLI)

## 🔧 로컬 개발 환경 설정

### 1. 프로젝트 클론

```bash
git clone <repository-url>
cd Yoonchulchung
```

### 2. Backend 설정

```bash
cd backend

# 의존성 설치
npm install

# 환경 변수 설정
cp .env.example .env
# .env 파일을 편집하여 실제 값으로 변경

# Prisma 클라이언트 생성
npm run prisma:generate

# 데이터베이스 마이그레이션
npm run prisma:migrate

# 개발 서버 실행
npm run start:dev
```

Backend는 `http://localhost:3001`에서 실행됩니다.

### 3. Frontend 설정

```bash
cd frontend

# 의존성 설치
npm install

# 환경 변수 설정
cp .env.example .env.local
# .env.local 파일을 편집

# 개발 서버 실행
npm run dev
```

Frontend는 `http://localhost:3000`에서 실행됩니다.

## 🐳 Docker를 사용한 실행

### 1. Docker 이미지 빌드

```bash
# Backend 이미지 빌드
cd backend
docker build -t portfolio-backend:latest .

# Frontend 이미지 빌드
cd ../frontend
docker build -t portfolio-frontend:latest .
```

### 2. Docker Compose 실행 (선택사항)

```bash
# docker-compose.yml 파일 생성 후
docker-compose up -d
```

## ☸️ Kubernetes 배포

### 1. Secrets 생성

```bash
# PostgreSQL Secret
kubectl create secret generic postgres-secret \
  --from-literal=password=your-postgres-password

# Redis Secret
kubectl create secret generic redis-secret \
  --from-literal=password=your-redis-password

# Backend Secret
kubectl create secret generic backend-secret \
  --from-literal=database-url="postgresql://portfolio_user:your-postgres-password@postgres:5432/portfolio?schema=public" \
  --from-literal=jwt-secret=your-jwt-secret
```

### 2. ConfigMap 적용

```bash
kubectl apply -f kubernetes/configmaps/nginx.yaml
```

### 3. Database 배포

```bash
# PostgreSQL
kubectl apply -f kubernetes/deployments/postgres.yaml
kubectl apply -f kubernetes/services/postgres.yaml

# Redis
kubectl apply -f kubernetes/deployments/redis.yaml
kubectl apply -f kubernetes/services/redis.yaml
```

### 4. 데이터베이스 마이그레이션

```bash
# PostgreSQL Pod에 접속
kubectl exec -it <postgres-pod-name> -- psql -U portfolio_user -d portfolio

# 또는 Backend Pod에서 마이그레이션 실행
kubectl exec -it <backend-pod-name> -- npm run prisma:migrate
```

### 5. Backend 배포

```bash
kubectl apply -f kubernetes/deployments/backend.yaml
kubectl apply -f kubernetes/services/backend.yaml
```

### 6. Frontend 배포

```bash
kubectl apply -f kubernetes/deployments/frontend.yaml
kubectl apply -f kubernetes/services/frontend.yaml
```

### 7. Nginx 배포

```bash
kubectl apply -f kubernetes/deployments/nginx.yaml
kubectl apply -f kubernetes/services/nginx.yaml
```

### 8. 배포 확인

```bash
# 모든 Pod 상태 확인
kubectl get pods

# 모든 Service 확인
kubectl get services

# Nginx LoadBalancer의 외부 IP 확인
kubectl get service nginx

# 로그 확인
kubectl logs <pod-name>
```

## 🔍 트러블슈팅

### Pod가 시작되지 않는 경우

```bash
# Pod 상세 정보 확인
kubectl describe pod <pod-name>

# 로그 확인
kubectl logs <pod-name>
```

### 데이터베이스 연결 오류

1. PostgreSQL Pod가 정상 실행 중인지 확인
2. Secret에 올바른 비밀번호가 설정되어 있는지 확인
3. DATABASE_URL 형식이 올바른지 확인

### Redis 연결 오류

1. Redis Pod가 정상 실행 중인지 확인
2. REDIS_PASSWORD가 Secret과 일치하는지 확인

## 🧪 초기 관리자 계정 생성

```bash
# Backend Pod에 접속
kubectl exec -it <backend-pod-name> -- sh

# Node REPL 실행
node

# 아래 코드 실행
const bcrypt = require('bcrypt');
const password = bcrypt.hashSync('your-admin-password', 10);
console.log(password);
```

이후 PostgreSQL에서 직접 ADMIN 유저를 생성하거나, API를 통해 회원가입 후 역할을 변경합니다.

## 📝 다음 단계

- [API 문서](./API_DOCUMENTATION.md) 확인
- [유지보수 가이드](./MAINTENANCE.md) 확인
