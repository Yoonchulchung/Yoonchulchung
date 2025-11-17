# 배포 가이드

## 🚀 빠른 시작

### 자동 배포 스크립트 사용

```bash
# Kubernetes에 배포
./scripts/deploy.sh kubernetes

# Cloudflare에 배포
./scripts/deploy.sh cloudflare

# 프로덕션 환경에 배포
./scripts/deploy.sh production
```

## 📋 사전 요구사항

### 필수 도구

- Node.js 20+
- npm 또는 yarn
- Docker (로컬 빌드용)
- kubectl (Kubernetes 배포용)
- Git

### 선택 도구

- Wrangler CLI (Cloudflare 배포용)
- PM2 (프로세스 관리용)

## 🔐 시크릿 설정

### 1. Kubernetes Secrets 생성

```bash
# 자동 생성 스크립트 사용
./scripts/setup-secrets.sh

# 또는 수동으로 생성
kubectl create secret generic postgres-secret \
  --from-literal=password=your-postgres-password

kubectl create secret generic redis-secret \
  --from-literal=password=your-redis-password

kubectl create secret generic backend-secret \
  --from-literal=database-url="postgresql://user:password@postgres:5432/portfolio" \
  --from-literal=jwt-secret=your-jwt-secret
```

### 2. 환경 변수 설정

**Backend (.env)**:
```bash
# 서버 설정
PORT=3001
HOST=0.0.0.0
NODE_ENV=production

# 데이터베이스
DATABASE_URL="postgresql://user:password@postgres:5432/portfolio"

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# CORS (쉼표로 구분된 여러 origin 지원)
CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com
```

**Frontend (.env.production)**:
```bash
NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api
```

## 🌐 Cloudflare 배포

### Frontend (Cloudflare Pages)

1. **Cloudflare 대시보드 설정**:
   - Pages 섹션으로 이동
   - Git repository 연결
   - 빌드 설정:
     - Build command: `npm run build`
     - Build output directory: `.next`

2. **Wrangler CLI 사용** (권장):
```bash
cd frontend

# Cloudflare에 로그인
npx wrangler login

# Pages 프로젝트 생성
npx wrangler pages project create portfolio-frontend

# 배포
npm run build
npx wrangler pages deploy .next --project-name=portfolio-frontend
```

3. **환경 변수 설정**:
```bash
# Cloudflare Pages 대시보드에서 설정
NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api
```

### Backend (Cloudflare Tunnel 또는 External Host)

Cloudflare는 주로 정적 사이트와 Workers를 위한 것이므로, Backend는 다음 옵션 중 선택:

**옵션 1: Cloudflare Tunnel (권장)**
```bash
# Cloudflare Tunnel 설치
cloudflared tunnel create portfolio-backend

# 터널 설정
cloudflared tunnel route dns portfolio-backend api.yourdomain.com

# 터널 실행
cloudflared tunnel run portfolio-backend
```

**옵션 2: External Host + Cloudflare DNS**
- VPS/Cloud Provider에 배포
- Cloudflare DNS만 사용하여 DDoS 보호 활성화

## 🐳 Docker 배포

### 1. 이미지 빌드

```bash
# Backend
cd backend
docker build -t portfolio-backend:latest .

# Frontend
cd frontend
docker build -t portfolio-frontend:latest .
```

### 2. Docker Compose 실행

```bash
docker-compose up -d
```

**docker-compose.yml 예시**:
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: portfolio
      POSTGRES_USER: portfolio_user
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres-data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis-data:/data
    ports:
      - "6379:6379"

  backend:
    image: portfolio-backend:latest
    depends_on:
      - postgres
      - redis
    environment:
      DATABASE_URL: postgresql://portfolio_user:${POSTGRES_PASSWORD}@postgres:5432/portfolio
      REDIS_HOST: redis
      REDIS_PASSWORD: ${REDIS_PASSWORD}
      JWT_SECRET: ${JWT_SECRET}
    ports:
      - "3001:3001"

  frontend:
    image: portfolio-frontend:latest
    depends_on:
      - backend
    environment:
      NEXT_PUBLIC_API_URL: http://backend:3001/api
    ports:
      - "3000:3000"

  nginx:
    image: nginx:alpine
    depends_on:
      - frontend
      - backend
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
    ports:
      - "80:80"
      - "443:443"

volumes:
  postgres-data:
  redis-data:
```

## ☸️ Kubernetes 배포

### 1. Secrets 설정
```bash
./scripts/setup-secrets.sh
```

### 2. ConfigMaps 적용
```bash
kubectl apply -f kubernetes/configmaps/
```

### 3. 데이터베이스 배포
```bash
kubectl apply -f kubernetes/deployments/postgres.yaml
kubectl apply -f kubernetes/services/postgres.yaml

kubectl apply -f kubernetes/deployments/redis.yaml
kubectl apply -f kubernetes/services/redis.yaml

# 준비 대기
kubectl wait --for=condition=ready pod -l app=postgres --timeout=300s
kubectl wait --for=condition=ready pod -l app=redis --timeout=300s
```

### 4. Backend 배포
```bash
kubectl apply -f kubernetes/deployments/backend.yaml
kubectl apply -f kubernetes/services/backend.yaml

# 마이그레이션 실행
BACKEND_POD=$(kubectl get pods -l app=backend -o jsonpath='{.items[0].metadata.name}')
kubectl exec $BACKEND_POD -- npm run prisma:migrate deploy
```

### 5. Frontend 배포
```bash
kubectl apply -f kubernetes/deployments/frontend.yaml
kubectl apply -f kubernetes/services/frontend.yaml
```

### 6. Nginx 배포
```bash
kubectl apply -f kubernetes/deployments/nginx.yaml
kubectl apply -f kubernetes/services/nginx.yaml
```

### 7. 상태 확인
```bash
# Pod 상태
kubectl get pods

# Service 상태
kubectl get services

# 로그 확인
kubectl logs -f deployment/backend
kubectl logs -f deployment/frontend

# Health check
kubectl exec -it <backend-pod> -- curl http://localhost:3001/api/health
```

## 🔄 PM2를 사용한 프로덕션 배포

### 1. PM2 설치
```bash
npm install -g pm2
```

### 2. 애플리케이션 시작
```bash
cd backend

# 프로덕션 모드로 시작
pm2 start ecosystem.config.js --env production

# 상태 확인
pm2 status

# 로그 확인
pm2 logs

# 모니터링
pm2 monit
```

### 3. 자동 시작 설정
```bash
# 시스템 부팅 시 자동 시작
pm2 startup
pm2 save
```

### 4. 무중단 재시작
```bash
# 코드 업데이트 후
pm2 reload portfolio-backend
```

## 🛡️ 보안 설정

### 1. Firewall 규칙

```bash
# UFW (Ubuntu)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 22/tcp
sudo ufw enable
```

### 2. SSL/TLS 인증서 (Let's Encrypt)

```bash
# Certbot 설치
sudo apt install certbot

# 인증서 발급
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# Nginx 설정 업데이트
# /etc/nginx/sites-available/portfolio
```

### 3. Cloudflare 보안 설정

- **SSL/TLS**: Full (Strict) 모드 사용
- **Firewall Rules**: 의심스러운 트래픽 차단
- **Rate Limiting**: API 엔드포인트에 적용
- **DDoS Protection**: 자동 활성화
- **Bot Fight Mode**: 활성화

## 📊 모니터링

### 1. Health Check 엔드포인트

```bash
# Liveness
curl http://your-domain/api/health/live

# Readiness
curl http://your-domain/api/health/ready

# Full health
curl http://your-domain/api/health
```

### 2. PM2 모니터링

```bash
# 실시간 모니터링
pm2 monit

# 메모리 사용량
pm2 describe portfolio-backend

# CPU 사용량
pm2 list
```

### 3. Kubernetes 모니터링

```bash
# Resource 사용량
kubectl top pods
kubectl top nodes

# 이벤트 확인
kubectl get events --sort-by='.lastTimestamp'
```

## 🛠️ 서버 안정성 및 복원력

이 프로젝트는 서버가 절대 죽지 않도록 여러 계층의 보호 메커니즘을 구현했습니다.

### 1. Circuit Breaker 패턴

**PrismaService와 RedisService**에 Circuit Breaker 패턴이 적용되어 있습니다:

```typescript
// 데이터베이스 연결이 실패해도 서비스는 계속 실행됩니다
const circuitBreakerConfig = {
  failureThreshold: 3,      // 3번 실패 시 Circuit Open
  successThreshold: 2,      // 2번 성공 시 Circuit Close
  timeout: 30000,           // 30초 후 재시도
};
```

**Circuit 상태**:
- **CLOSED**: 정상 작동
- **OPEN**: 실패 중, 요청 거부하고 빠른 실패
- **HALF_OPEN**: 복구 테스트 중

### 2. 자동 재연결 로직

**PrismaService** (backend/src/config/prisma.service.ts:39):
```typescript
- 최대 5번 재연결 시도
- 각 시도 사이 5초 대기
- 모든 시도 실패 시 degraded mode로 계속 실행
- executeQuery() 래퍼로 안전한 쿼리 실행
```

**RedisService** (backend/src/config/redis.service.ts:17):
```typescript
- 최대 10번 재연결 시도
- 지수 백오프 (50ms * attempts, 최대 2000ms)
- 연결 실패 시에도 애플리케이션 계속 실행
- 모든 메서드에 try-catch로 에러 처리
```

### 3. PM2 클러스터 모드

**ecosystem.config.js** 설정:
```javascript
{
  instances: 'max',              // 모든 CPU 코어 사용
  exec_mode: 'cluster',          // 클러스터 모드
  autorestart: true,             // 자동 재시작
  max_memory_restart: '1G',      // 메모리 누수 방지
  max_restarts: 10,              // 1분당 최대 재시작 횟수
  restart_delay: 4000,           // 재시작 간 지연
  min_uptime: '10s',             // 최소 가동 시간
  cron_restart: '0 3 * * *',     // 매일 3시 재시작
}
```

**장점**:
- 한 인스턴스가 죽어도 다른 인스턴스가 계속 서비스
- 메모리 누수 자동 감지 및 재시작
- CPU 코어 모두 활용으로 성능 향상
- 무중단 재배포 (zero-downtime deployment)

### 4. Graceful Shutdown

**backend/src/main.ts** 핸들러:
```typescript
- SIGTERM/SIGINT 시그널 처리
- 진행 중인 요청 완료 후 종료
- 데이터베이스 연결 정리
- Redis 연결 정리
```

### 5. 에러 복구 전략

**Unhandled Errors** (backend/src/main.ts:87):
```typescript
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection:', reason);
  // 프로덕션에서는 종료하지 않음 - 계속 실행
  if (process.env.NODE_ENV !== 'production') {
    process.exit(1);
  }
});
```

**데이터베이스 연결 손실**:
- 자동 재연결 시도
- Circuit Breaker로 빠른 실패
- Degraded mode로 계속 실행

**Redis 연결 손실**:
- 백그라운드에서 자동 재연결
- 연결 없이도 애플리케이션 계속 실행
- 에러 발생 시 null/false 반환 (throw하지 않음)

### 6. DDoS 및 Rate Limiting 보호

**DDoS Protection Guard** (backend/src/common/guards/ddos-protection.guard.ts):
```typescript
- IP당 1분에 100 요청 제한
- 초과 시 5분간 차단
- Redis 기반 분산 추적
- Cloudflare IP 인식
```

**Rate Limiting** (backend/src/main.ts):
```typescript
- 기본: IP당 100 requests/분
- 로그인: IP당 5 requests/분
- 차단된 IP는 자동 해제 (TTL)
```

### 7. 헬스 체크

**엔드포인트**:
```bash
# Liveness - 서버가 살아있는지
GET /api/health/live
→ Circuit Breaker 상태 포함

# Readiness - 트래픽 받을 준비가 되었는지
GET /api/health/ready
→ DB, Redis 연결 상태 확인

# Full Health
GET /api/health
→ 모든 서비스 상태 상세 정보
```

**Kubernetes Probes**:
```yaml
livenessProbe:
  httpGet:
    path: /api/health/live
    port: 3001
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /api/health/ready
    port: 3001
  initialDelaySeconds: 10
  periodSeconds: 5
```

### 8. 모니터링 및 로깅

**Circuit Breaker 메트릭**:
```bash
# Circuit Breaker 상태 확인
curl http://your-domain/api/health | jq '.circuitBreaker'

# 출력:
# {
#   "state": "CLOSED",
#   "failureCount": 0,
#   "successCount": 0,
#   "nextAttempt": 1234567890
# }
```

**로그 레벨**:
- Development: query, error, warn
- Production: error만

**PM2 로그**:
```bash
pm2 logs portfolio-backend --lines 100
pm2 logs portfolio-backend --err  # 에러만
```

### 9. 보안 강화

**Helmet.js** (backend/src/main.ts:15):
- CSP (Content Security Policy)
- HSTS (HTTP Strict Transport Security)
- XSS Protection
- Frame Guard
- No Sniff

**요청 크기 제한**:
- JSON: 10MB
- URL-encoded: 10MB

**CORS**:
- 다중 origin 지원 (쉼표로 구분)
- Credentials 허용
- Pre-flight 캐싱 (1시간)

### 10. 트러블슈팅

**서버가 느려질 때**:
1. Circuit Breaker가 자동으로 실패한 서비스 차단
2. PM2가 메모리 초과 프로세스 재시작
3. Rate Limiting이 과도한 요청 차단
4. 로그에서 병목 지점 확인: `pm2 logs`

**데이터베이스 연결 문제**:
1. 자동 재연결 시도 (최대 5회)
2. Circuit Open 상태로 전환
3. Degraded mode로 계속 실행
4. Health check에서 상태 확인 가능

**Redis 연결 문제**:
1. 백그라운드에서 자동 재연결
2. 연결 없이도 계속 실행
3. 캐시 없이 직접 DB 조회로 대체

## 🔄 업데이트 및 롤백

### Kubernetes 업데이트

```bash
# 새 이미지로 업데이트
kubectl set image deployment/backend backend=portfolio-backend:v2

# 롤아웃 상태 확인
kubectl rollout status deployment/backend

# 롤백
kubectl rollout undo deployment/backend

# 특정 버전으로 롤백
kubectl rollout undo deployment/backend --to-revision=2
```

### PM2 업데이트

```bash
# 코드 pull
git pull origin main

# 빌드
npm run build

# 무중단 재시작
pm2 reload ecosystem.config.js
```

## 🐛 트러블슈팅

### Pod가 시작되지 않는 경우

```bash
# Pod 상태 확인
kubectl describe pod <pod-name>

# 로그 확인
kubectl logs <pod-name>

# 이전 컨테이너 로그
kubectl logs <pod-name> --previous
```

### 데이터베이스 연결 실패

```bash
# PostgreSQL 상태 확인
kubectl exec -it <postgres-pod> -- psql -U portfolio_user -d portfolio -c "SELECT 1"

# 연결 테스트
kubectl exec -it <backend-pod> -- node -e "require('./dist/config/prisma.service').default.\$connect()"
```

### Redis 연결 실패

```bash
# Redis 상태 확인
kubectl exec -it <redis-pod> -- redis-cli -a <password> ping

# 연결 테스트
kubectl exec -it <backend-pod> -- node -e "const Redis = require('ioredis'); const client = new Redis({host: 'redis', password: '<password>'}); client.ping().then(console.log)"
```

## 📝 체크리스트

배포 전 확인사항:

- [ ] 모든 테스트 통과
- [ ] 환경 변수 설정 완료
- [ ] Secrets 생성 완료
- [ ] 데이터베이스 백업 완료
- [ ] SSL 인증서 설정 완료
- [ ] DNS 레코드 설정 완료
- [ ] Cloudflare 설정 완료
- [ ] 모니터링 설정 완료
- [ ] 로그 수집 설정 완료
- [ ] 백업 전략 수립 완료

배포 후 확인사항:

- [ ] Health check 통과
- [ ] API 엔드포인트 정상 작동
- [ ] 프론트엔드 로드 성공
- [ ] 데이터베이스 연결 정상
- [ ] Redis 연결 정상
- [ ] 로그 정상 수집
- [ ] 모니터링 지표 정상
- [ ] SSL 인증서 적용 확인

## 🆘 지원

문제가 발생하면:

1. 로그 확인: `kubectl logs` 또는 `pm2 logs`
2. Health check 확인
3. GitHub Issues에 문제 보고
4. 문서 참조: [MAINTENANCE.md](./MAINTENANCE.md)
