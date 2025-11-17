# Development Guide

이 문서는 포트폴리오 애플리케이션의 개발 환경 설정 방법을 설명합니다.

## 🔥 Hot Reload 개발 모드

개발 모드에서는 로컬 파일 변경이 자동으로 서버에 반영됩니다.

### 시작하기

```bash
# 개발 환경 시작
./scripts/dev.sh start

# 또는 간단히
./scripts/dev.sh
```

### 어떻게 작동하나요?

개발 모드는 다음과 같이 구성됩니다:

1. **Docker Volume 마운트**: 로컬 소스 코드를 컨테이너에 실시간으로 마운트
2. **Watch 모드**:
   - Backend: `npm run start:dev` (NestJS watch mode)
   - Frontend: `npm run dev` (Next.js dev server)
3. **자동 재시작**: 파일 변경 감지 시 자동으로 재컴파일 및 재시작

### 파일 변경 시나리오

#### Backend 파일 수정
```bash
# 예: backend/src/project/project.service.ts 수정
vim backend/src/project/project.service.ts

# 변경 사항이 자동으로 감지되고
# NestJS가 자동으로 재컴파일 및 재시작
# 로그에서 확인:
[Nest] Webpack is building...
[Nest] Webpack build done
[Nest] Starting Nest application...
```

#### Frontend 파일 수정
```bash
# 예: frontend/src/app/dashboard/page.tsx 수정
vim frontend/src/app/dashboard/page.tsx

# Next.js가 자동으로 Fast Refresh
# 브라우저가 자동으로 새로고침 (Hot Module Replacement)
```

## 📋 개발 명령어

### 기본 명령어

```bash
# 개발 환경 시작 (hot reload 활성화)
./scripts/dev.sh start

# 개발 환경 중지
./scripts/dev.sh stop

# 서비스 재시작
./scripts/dev.sh restart

# 로그 보기 (실시간)
./scripts/dev.sh logs

# 서비스 상태 확인
./scripts/dev.sh status
```

### 고급 명령어

```bash
# 전체 재빌드 (의존성 변경 시)
./scripts/dev.sh rebuild

# 백엔드 컨테이너 쉘 접속
./scripts/dev.sh shell backend

# 프론트엔드 컨테이너 쉘 접속
./scripts/dev.sh shell frontend

# PostgreSQL 쉘 접속
./scripts/dev.sh db

# 데이터베이스 마이그레이션
./scripts/dev.sh migrate

# 데이터베이스 시드
./scripts/dev.sh seed

# 모든 데이터 삭제 (volumes 포함)
./scripts/dev.sh clean
```

## 🌐 접속 URL

개발 모드 실행 후 다음 URL로 접속:

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001/api
- **API Health**: http://localhost:3001/api/health
- **Database**: localhost:5432 (postgres)
- **Redis**: localhost:6379

## 🔧 개발 환경 vs 프로덕션 환경

### 개발 환경 (`docker-compose.dev.yml`)
- ✅ Hot reload 활성화
- ✅ 소스 코드 volume 마운트
- ✅ devDependencies 포함
- ✅ Source maps 활성화
- ✅ 상세한 로그
- ⚠️ 인증 비활성화 (개발 편의)
- 🚀 빠른 개발 사이클

### 프로덕션 환경 (`docker-compose.yml`)
- ✅ 최적화된 빌드
- ✅ 최소 이미지 크기
- ✅ 프로덕션 의존성만 포함
- ✅ 인증 활성화
- 🔒 보안 강화
- 📦 배포 최적화

## 💡 개발 팁

### 1. 의존성 추가 시

의존성을 추가한 경우 컨테이너를 재빌드해야 합니다:

```bash
# package.json 수정 후
./scripts/dev.sh rebuild
```

### 2. Prisma 스키마 변경 시

```bash
# prisma/schema.prisma 수정 후
./scripts/dev.sh migrate

# 마이그레이션 이름 입력
# 예: "add_user_profile_fields"
```

### 3. 환경 변수 변경 시

```bash
# .env 파일 수정 후
./scripts/dev.sh restart
```

### 4. 로그 확인

```bash
# 모든 서비스 로그
./scripts/dev.sh logs

# 특정 서비스만
docker compose -f docker-compose.dev.yml logs -f backend
docker compose -f docker-compose.dev.yml logs -f frontend
```

### 5. 데이터베이스 초기화

```bash
# 모든 데이터 삭제 후 재시작
./scripts/dev.sh clean
./scripts/dev.sh start
```

## 🐛 문제 해결

### 변경사항이 반영되지 않음

1. **볼륨 마운트 확인**:
   ```bash
   docker compose -f docker-compose.dev.yml ps
   ```

2. **컨테이너 재시작**:
   ```bash
   ./scripts/dev.sh restart
   ```

3. **캐시 삭제 후 재빌드**:
   ```bash
   ./scripts/dev.sh rebuild
   ```

### 포트 충돌

다른 프로세스가 포트를 사용 중인 경우:

```bash
# 포트 사용 확인
lsof -i :3000  # Frontend
lsof -i :3001  # Backend
lsof -i :5432  # PostgreSQL
lsof -i :6379  # Redis

# 프로세스 종료
kill -9 <PID>
```

### 데이터베이스 연결 오류

```bash
# 데이터베이스 상태 확인
./scripts/dev.sh db

# 연결 가능하면 OK
# 연결 불가능하면 재시작
./scripts/dev.sh restart
```

### 메모리 부족

Docker Desktop 메모리 설정 확인:
- 최소 4GB 권장
- 8GB 이상 권장 (AI 기능 사용 시)

## 📝 개발 워크플로우

### 새 기능 개발

```bash
# 1. 개발 환경 시작
./scripts/dev.sh start

# 2. 로그 모니터링 (새 터미널)
./scripts/dev.sh logs

# 3. 코드 수정
vim backend/src/...
vim frontend/src/...

# 4. 브라우저/API 테스트
# 변경사항이 자동 반영됨

# 5. 데이터베이스 변경 필요 시
vim backend/prisma/schema.prisma
./scripts/dev.sh migrate

# 6. 테스트
./scripts/dev.sh shell backend
npm test

# 7. 완료 후 커밋
git add .
git commit -m "Add new feature"
```

### 버그 수정

```bash
# 1. 로그 확인
./scripts/dev.sh logs

# 2. 해당 서비스 쉘 접속
./scripts/dev.sh shell backend

# 3. 디버깅
npm run start:debug  # breakpoint 설정 가능

# 4. 코드 수정
# 자동 재시작으로 즉시 테스트

# 5. 수정 확인 후 커밋
```

## 🔄 프로덕션 모드로 전환

개발이 완료되면 프로덕션 모드로 테스트:

```bash
# 개발 모드 중지
./scripts/dev.sh stop

# 프로덕션 모드 시작
./scripts/deploy-docker.sh deploy

# 테스트 후 다시 개발 모드
./scripts/deploy-docker.sh stop
./scripts/dev.sh start
```

## ⚙️ 설정 파일

### 개발 모드 관련 파일

- `docker-compose.dev.yml` - 개발 환경 Docker Compose 설정
- `backend/Dockerfile.dev` - 백엔드 개발 Dockerfile
- `frontend/Dockerfile.dev` - 프론트엔드 개발 Dockerfile
- `scripts/dev.sh` - 개발 환경 관리 스크립트
- `.env` - 환경 변수 (개발/프로덕션 공통)

### Volume 마운트 설정

개발 모드에서 마운트되는 디렉토리:

**Backend**:
- `./backend/src` → 소스 코드 (읽기 전용)
- `./backend/prisma` → Prisma 스키마
- `./backend/tsconfig.json` → TypeScript 설정
- Volume: `backend_node_modules` → node_modules (컨테이너 전용)

**Frontend**:
- `./frontend/src` → 소스 코드 (읽기 전용)
- `./frontend/public` → 정적 파일
- `./frontend/tailwind.config.js` → Tailwind 설정
- Volume: `frontend_node_modules` → node_modules (컨테이너 전용)
- Volume: `frontend_next` → .next 빌드 캐시

## 🎯 다음 단계

1. ✅ 개발 환경 시작: `./scripts/dev.sh start`
2. ✅ 브라우저에서 http://localhost:3000 열기
3. ✅ 코드 수정 및 자동 반영 확인
4. ✅ API 테스트: http://localhost:3001/api
5. ✅ 기능 개발 시작!

Happy Coding! 🚀
