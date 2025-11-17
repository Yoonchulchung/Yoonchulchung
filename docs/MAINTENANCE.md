# 유지보수 가이드

## 📊 모니터링

### Kubernetes 리소스 모니터링

```bash
# Pod 상태 확인
kubectl get pods -o wide

# 리소스 사용량 확인
kubectl top pods
kubectl top nodes

# 특정 Pod 로그 확인
kubectl logs <pod-name>
kubectl logs <pod-name> -f  # 실시간 로그

# 이전 컨테이너 로그 확인 (재시작된 경우)
kubectl logs <pod-name> --previous
```

### 데이터베이스 모니터링

```bash
# PostgreSQL Pod 접속
kubectl exec -it <postgres-pod-name> -- psql -U portfolio_user -d portfolio

# 데이터베이스 크기 확인
SELECT pg_size_pretty(pg_database_size('portfolio'));

# 테이블 크기 확인
SELECT 
    table_name,
    pg_size_pretty(pg_total_relation_size(quote_ident(table_name)))
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY pg_total_relation_size(quote_ident(table_name)) DESC;
```

### Redis 모니터링

```bash
# Redis Pod 접속
kubectl exec -it <redis-pod-name> -- redis-cli -a <password>

# 메모리 사용량 확인
INFO memory

# 키 개수 확인
DBSIZE

# 특정 패턴의 키 확인
KEYS session:*
KEYS blacklist:*
```

## 🔄 업데이트 및 배포

### Backend 업데이트

```bash
# 1. 코드 수정
cd backend

# 2. Docker 이미지 빌드
docker build -t portfolio-backend:v2 .

# 3. 이미지 푸시 (선택사항 - Docker Registry 사용 시)
docker push your-registry/portfolio-backend:v2

# 4. Kubernetes Deployment 업데이트
kubectl set image deployment/backend backend=portfolio-backend:v2

# 5. 롤아웃 상태 확인
kubectl rollout status deployment/backend

# 롤백이 필요한 경우
kubectl rollout undo deployment/backend
```

### Frontend 업데이트

```bash
# Backend와 동일한 프로세스
docker build -t portfolio-frontend:v2 .
kubectl set image deployment/frontend frontend=portfolio-frontend:v2
kubectl rollout status deployment/frontend
```

### 데이터베이스 마이그레이션

```bash
# 1. Backend Pod에서 마이그레이션 실행
kubectl exec -it <backend-pod-name> -- npm run prisma:migrate

# 2. 마이그레이션 상태 확인
kubectl exec -it <backend-pod-name> -- npx prisma migrate status
```

## 🗄️ 백업 및 복구

### PostgreSQL 백업

```bash
# 전체 데이터베이스 백업
kubectl exec <postgres-pod-name> -- pg_dump -U portfolio_user portfolio > backup-$(date +%Y%m%d).sql

# 압축 백업
kubectl exec <postgres-pod-name> -- pg_dump -U portfolio_user -F c portfolio > backup-$(date +%Y%m%d).dump
```

### PostgreSQL 복구

```bash
# SQL 파일로 복구
kubectl exec -i <postgres-pod-name> -- psql -U portfolio_user portfolio < backup-20240101.sql

# Dump 파일로 복구
kubectl exec -i <postgres-pod-name> -- pg_restore -U portfolio_user -d portfolio backup-20240101.dump
```

### Redis 백업

```bash
# RDB 스냅샷 생성
kubectl exec <redis-pod-name> -- redis-cli -a <password> BGSAVE

# 스냅샷 파일 복사
kubectl cp <redis-pod-name>:/data/dump.rdb ./redis-backup-$(date +%Y%m%d).rdb
```

## 🔧 스케일링

### 수평 스케일링

```bash
# Backend 스케일 조정
kubectl scale deployment backend --replicas=3

# Frontend 스케일 조정
kubectl scale deployment frontend --replicas=3

# Nginx 스케일 조정
kubectl scale deployment nginx --replicas=3

# Auto-scaling 설정 (HPA)
kubectl autoscale deployment backend --cpu-percent=70 --min=2 --max=5
```

### 수직 스케일링

리소스 제한 수정:
```yaml
resources:
  requests:
    memory: "256Mi"
    cpu: "250m"
  limits:
    memory: "512Mi"
    cpu: "500m"
```

적용:
```bash
kubectl apply -f kubernetes/deployments/backend.yaml
```

## 🧹 정리 작업

### 오래된 세션 정리

```bash
# Redis에서 만료된 키 정리 (자동으로 처리되지만 수동으로도 가능)
kubectl exec <redis-pod-name> -- redis-cli -a <password> --scan --pattern "session:*" | xargs redis-cli -a <password> DEL
```

### 로그 정리

```bash
# 오래된 Pod 삭제
kubectl delete pod --field-selector status.phase=Succeeded

# 완료된 Job 삭제
kubectl delete jobs --field-selector status.successful=1
```

## 🔒 보안 업데이트

### Secret 로테이션

```bash
# 1. 새로운 Secret 생성
kubectl create secret generic postgres-secret-new \
  --from-literal=password=new-password

# 2. Deployment에서 Secret 참조 변경
kubectl edit deployment postgres

# 3. 이전 Secret 삭제
kubectl delete secret postgres-secret
```

### SSL/TLS 인증서 갱신

```bash
# Let's Encrypt 사용 시 cert-manager 설정
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml
```

## 🚨 트러블슈팅

### Pod가 계속 재시작되는 경우

```bash
# 로그 확인
kubectl logs <pod-name> --previous

# 이벤트 확인
kubectl describe pod <pod-name>

# 리소스 부족 확인
kubectl top nodes
kubectl top pods
```

### 데이터베이스 연결 실패

```bash
# PostgreSQL 상태 확인
kubectl exec <postgres-pod-name> -- pg_isready

# 연결 테스트
kubectl exec <postgres-pod-name> -- psql -U portfolio_user -d portfolio -c "SELECT 1"
```

### 성능 이슈

```bash
# Slow query 확인 (PostgreSQL)
kubectl exec <postgres-pod-name> -- psql -U portfolio_user -d portfolio -c "
SELECT query, calls, total_time, mean_time 
FROM pg_stat_statements 
ORDER BY total_time DESC 
LIMIT 10;"
```

## 📈 모범 사례

1. **정기적인 백업**: 매일 자동 백업 스케줄 설정
2. **모니터링 알람**: Prometheus + Grafana 설정
3. **로그 집계**: ELK Stack 또는 Loki 사용
4. **보안 스캔**: 정기적인 이미지 보안 스캔
5. **문서화**: 모든 변경사항 문서화
