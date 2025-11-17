# Deployment Guide

This guide covers deployment options for the Portfolio application.

## Prerequisites

- Docker and Docker Compose (for Docker deployment)
- kubectl and a Kubernetes cluster (for Kubernetes deployment)
- Node.js 20+ (for local development)

## Quick Start with Docker Compose (Recommended)

The easiest way to deploy the application is using Docker Compose:

### 1. Setup Environment Variables

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your configuration
nano .env  # or use your preferred editor
```

**Important:** Update these values in `.env`:
- `JWT_SECRET` - A secure random string for JWT token signing
- `ENCRYPTION_KEY` - A 32-character string for API key encryption

### 2. Deploy

```bash
# Make the script executable (first time only)
chmod +x scripts/deploy-docker.sh

# Deploy the application
./scripts/deploy-docker.sh deploy
```

This will:
- Build Docker images for backend and frontend
- Start PostgreSQL and Redis databases
- Start the backend API server
- Start the frontend Next.js server
- Run database migrations
- Perform health checks

### 3. Access the Application

Once deployed, access the application at:
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:3001/api
- **Health Check:** http://localhost:3001/api/health

### 4. Manage the Deployment

```bash
# View logs
./scripts/deploy-docker.sh logs

# Check service status
./scripts/deploy-docker.sh status

# Restart services
./scripts/deploy-docker.sh restart

# Rebuild images and redeploy
./scripts/deploy-docker.sh rebuild

# Stop services
./scripts/deploy-docker.sh stop

# Remove all services and data
./scripts/deploy-docker.sh destroy
```

## Kubernetes Deployment

For production Kubernetes deployment:

### 1. Install kubectl

Follow the official guide: https://kubernetes.io/docs/tasks/tools/

### 2. Configure kubectl

```bash
# Configure kubectl to connect to your cluster
kubectl config use-context your-cluster-context
```

### 3. Update Kubernetes Configurations

Update the following files with your specific configuration:
- `kubernetes/deployments/*.yaml` - Update image names, resource limits
- `kubernetes/configmaps/*.yaml` - Update environment-specific configs

### 4. Deploy

```bash
./scripts/deploy.sh kubernetes
```

This will:
- Apply Kubernetes configurations
- Deploy PostgreSQL and Redis
- Deploy backend and frontend services
- Deploy nginx ingress
- Run database migrations
- Perform health checks

## Environment Variables

### Backend Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment (development/production) | production |
| `DATABASE_URL` | PostgreSQL connection string | - |
| `REDIS_HOST` | Redis host | localhost |
| `REDIS_PORT` | Redis port | 6379 |
| `JWT_SECRET` | JWT signing secret | - |
| `ENCRYPTION_KEY` | API key encryption key | - |

### Frontend Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment (development/production) | production |
| `NEXT_PUBLIC_API_URL` | Backend API URL | http://localhost:3001/api |

## Troubleshooting

### Docker Compose Issues

**Services won't start:**
```bash
# Check logs
docker compose logs

# Check specific service
docker compose logs backend
```

**Database connection errors:**
```bash
# Ensure PostgreSQL is healthy
docker compose ps

# Restart PostgreSQL
docker compose restart postgres
```

**Migration errors:**
```bash
# Manually run migrations
docker compose exec backend npm run prisma:migrate deploy
```

### Kubernetes Issues

**Pods not starting:**
```bash
# Check pod status
kubectl get pods

# Check pod logs
kubectl logs <pod-name>

# Describe pod for events
kubectl describe pod <pod-name>
```

**Service not accessible:**
```bash
# Check services
kubectl get svc

# Check ingress
kubectl get ingress
```

## Production Checklist

Before deploying to production:

- [ ] Update `JWT_SECRET` with a strong random value
- [ ] Update `ENCRYPTION_KEY` with a secure 32-character key
- [ ] Configure production database (not using Docker)
- [ ] Configure production Redis (not using Docker)
- [ ] Set up SSL/TLS certificates
- [ ] Configure domain names
- [ ] Set up monitoring and logging
- [ ] Configure backups for PostgreSQL
- [ ] Review and update resource limits
- [ ] Enable security scanning for Docker images
- [ ] Set up CI/CD pipelines
- [ ] Configure rate limiting
- [ ] Review CORS settings
- [ ] Set up error tracking (e.g., Sentry)

## Monitoring

### Docker Compose Monitoring

```bash
# View resource usage
docker stats

# View logs in real-time
docker compose logs -f

# Check health status
curl http://localhost:3001/api/health
```

### Kubernetes Monitoring

```bash
# View resource usage
kubectl top pods
kubectl top nodes

# View logs
kubectl logs -f <pod-name>

# Port forward for local access
kubectl port-forward service/backend 3001:3001
```

## Scaling

### Docker Compose Scaling

Docker Compose is suitable for single-server deployments. For multi-server scaling, use Kubernetes.

### Kubernetes Scaling

```bash
# Scale backend
kubectl scale deployment backend --replicas=3

# Scale frontend
kubectl scale deployment frontend --replicas=2

# Auto-scaling
kubectl autoscale deployment backend --min=2 --max=10 --cpu-percent=80
```

## Backup and Restore

### PostgreSQL Backup

```bash
# Docker Compose
docker compose exec postgres pg_dump -U portfolio_user portfolio > backup.sql

# Kubernetes
kubectl exec <postgres-pod> -- pg_dump -U portfolio_user portfolio > backup.sql
```

### PostgreSQL Restore

```bash
# Docker Compose
docker compose exec -T postgres psql -U portfolio_user portfolio < backup.sql

# Kubernetes
kubectl exec -i <postgres-pod> -- psql -U portfolio_user portfolio < backup.sql
```

## Support

For issues and questions:
- Check logs for error messages
- Review this deployment guide
- Check GitHub issues
- Contact the development team
