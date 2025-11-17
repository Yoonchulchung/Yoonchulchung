#!/bin/bash

# Portfolio Deployment Script
# This script automates the deployment process for the portfolio application

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BACKEND_DIR="backend"
FRONTEND_DIR="frontend"
DEPLOYMENT_ENV=${1:-production}

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_prerequisites() {
    log_info "Checking prerequisites..."

    # Check Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed"
        exit 1
    fi

    # Check npm
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed"
        exit 1
    fi

    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_warn "Docker is not installed (optional for local builds)"
    fi

    # Check kubectl
    if ! command -v kubectl &> /dev/null; then
        log_warn "kubectl is not installed (required for Kubernetes deployment)"
    fi

    log_info "Prerequisites check completed"
}

build_backend() {
    log_info "Building backend..."

    cd $BACKEND_DIR

    # Install dependencies
    log_info "Installing backend dependencies..."
    npm ci

    # Generate Prisma client
    log_info "Generating Prisma client..."
    npm run prisma:generate

    # Build TypeScript
    log_info "Building TypeScript..."
    npm run build

    # Run tests
    log_info "Running backend tests..."
    npm test || {
        log_error "Backend tests failed"
        exit 1
    }

    cd ..
    log_info "Backend build completed"
}

build_frontend() {
    log_info "Building frontend..."

    cd $FRONTEND_DIR

    # Install dependencies
    log_info "Installing frontend dependencies..."
    npm ci

    # Build Next.js
    log_info "Building Next.js..."
    npm run build

    # Run tests
    log_info "Running frontend tests..."
    npm test || {
        log_error "Frontend tests failed"
        exit 1
    }

    cd ..
    log_info "Frontend build completed"
}

build_docker_images() {
    log_info "Building Docker images..."

    # Build backend image
    log_info "Building backend Docker image..."
    docker build -t portfolio-backend:latest -t portfolio-backend:${DEPLOYMENT_ENV} ./backend

    # Build frontend image
    log_info "Building frontend Docker image..."
    docker build -t portfolio-frontend:latest -t portfolio-frontend:${DEPLOYMENT_ENV} ./frontend

    log_info "Docker images built successfully"
}

deploy_to_cloudflare() {
    log_info "Deploying to Cloudflare..."

    # Deploy frontend to Cloudflare Pages
    if [ -f "cloudflare/wrangler.toml" ]; then
        log_info "Deploying frontend to Cloudflare Pages..."
        cd $FRONTEND_DIR
        npx wrangler pages deploy .next --project-name=portfolio-frontend
        cd ..
    else
        log_warn "Cloudflare configuration not found, skipping Cloudflare deployment"
    fi
}

deploy_to_kubernetes() {
    log_info "Deploying to Kubernetes..."

    # Check if kubectl is available
    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl is not installed"
        return 1
    fi

    # Apply Kubernetes configurations
    log_info "Applying Kubernetes configurations..."

    # Apply in order
    kubectl apply -f kubernetes/configmaps/
    kubectl apply -f kubernetes/deployments/postgres.yaml
    kubectl apply -f kubernetes/services/postgres.yaml
    kubectl apply -f kubernetes/deployments/redis.yaml
    kubectl apply -f kubernetes/services/redis.yaml

    # Wait for databases to be ready
    log_info "Waiting for databases to be ready..."
    kubectl wait --for=condition=ready pod -l app=postgres --timeout=300s
    kubectl wait --for=condition=ready pod -l app=redis --timeout=300s

    # Deploy backend
    kubectl apply -f kubernetes/deployments/backend.yaml
    kubectl apply -f kubernetes/services/backend.yaml
    kubectl wait --for=condition=ready pod -l app=backend --timeout=300s

    # Deploy frontend
    kubectl apply -f kubernetes/deployments/frontend.yaml
    kubectl apply -f kubernetes/services/frontend.yaml
    kubectl wait --for=condition=ready pod -l app=frontend --timeout=300s

    # Deploy nginx
    kubectl apply -f kubernetes/deployments/nginx.yaml
    kubectl apply -f kubernetes/services/nginx.yaml
    kubectl wait --for=condition=ready pod -l app=nginx --timeout=300s

    log_info "Kubernetes deployment completed"
}

run_database_migrations() {
    log_info "Running database migrations..."

    # Get backend pod name
    BACKEND_POD=$(kubectl get pods -l app=backend -o jsonpath='{.items[0].metadata.name}')

    if [ -n "$BACKEND_POD" ]; then
        log_info "Running migrations on pod: $BACKEND_POD"
        kubectl exec $BACKEND_POD -- npm run prisma:migrate deploy
        log_info "Database migrations completed"
    else
        log_warn "Backend pod not found, skipping migrations"
    fi
}

health_check() {
    log_info "Performing health check..."

    # Get nginx service external IP
    EXTERNAL_IP=$(kubectl get service nginx -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

    if [ -n "$EXTERNAL_IP" ]; then
        log_info "Service is available at: http://$EXTERNAL_IP"

        # Check health endpoint
        if curl -f "http://$EXTERNAL_IP/api/health" > /dev/null 2>&1; then
            log_info "Health check passed"
        else
            log_warn "Health check failed"
        fi
    else
        log_warn "External IP not yet assigned"
    fi
}

cleanup() {
    log_info "Cleaning up..."
    # Add cleanup logic if needed
}

# Main deployment flow
main() {
    log_info "Starting deployment process for environment: $DEPLOYMENT_ENV"

    # Check prerequisites
    check_prerequisites

    # Build
    log_info "=== Build Phase ==="
    build_backend
    build_frontend

    # Docker
    if command -v docker &> /dev/null; then
        log_info "=== Docker Build Phase ==="
        build_docker_images
    fi

    # Deploy
    log_info "=== Deployment Phase ==="

    case "$DEPLOYMENT_ENV" in
        cloudflare)
            deploy_to_cloudflare
            ;;
        kubernetes|production)
            deploy_to_kubernetes
            run_database_migrations
            health_check
            ;;
        *)
            log_error "Unknown deployment environment: $DEPLOYMENT_ENV"
            log_info "Available environments: cloudflare, kubernetes, production"
            exit 1
            ;;
    esac

    log_info "Deployment completed successfully!"
}

# Trap errors
trap cleanup ERR

# Run main function
main "$@"
