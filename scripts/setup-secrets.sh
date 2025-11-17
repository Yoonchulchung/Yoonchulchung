#!/bin/bash

# Secret Setup Script
# This script helps set up Kubernetes secrets securely

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Generate random password
generate_password() {
    openssl rand -base64 32 | tr -d "=+/" | cut -c1-25
}

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    log_error "kubectl is not installed"
    exit 1
fi

log_info "Setting up Kubernetes secrets..."

# Check if secrets already exist
if kubectl get secret postgres-secret &> /dev/null; then
    read -p "postgres-secret already exists. Do you want to replace it? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        kubectl delete secret postgres-secret
    else
        log_info "Skipping postgres-secret"
    fi
fi

# PostgreSQL Secret
if ! kubectl get secret postgres-secret &> /dev/null; then
    log_info "Creating postgres-secret..."

    read -p "Enter PostgreSQL password (leave empty to generate): " POSTGRES_PASSWORD
    if [ -z "$POSTGRES_PASSWORD" ]; then
        POSTGRES_PASSWORD=$(generate_password)
        log_info "Generated PostgreSQL password: $POSTGRES_PASSWORD"
    fi

    kubectl create secret generic postgres-secret \
        --from-literal=password="$POSTGRES_PASSWORD"

    log_info "postgres-secret created"
fi

# Redis Secret
if ! kubectl get secret redis-secret &> /dev/null; then
    log_info "Creating redis-secret..."

    read -p "Enter Redis password (leave empty to generate): " REDIS_PASSWORD
    if [ -z "$REDIS_PASSWORD" ]; then
        REDIS_PASSWORD=$(generate_password)
        log_info "Generated Redis password: $REDIS_PASSWORD"
    fi

    kubectl create secret generic redis-secret \
        --from-literal=password="$REDIS_PASSWORD"

    log_info "redis-secret created"
fi

# Backend Secret
if ! kubectl get secret backend-secret &> /dev/null; then
    log_info "Creating backend-secret..."

    # Get PostgreSQL password
    if [ -z "$POSTGRES_PASSWORD" ]; then
        POSTGRES_PASSWORD=$(kubectl get secret postgres-secret -o jsonpath='{.data.password}' | base64 -d)
    fi

    # Generate JWT secret
    read -p "Enter JWT secret (leave empty to generate): " JWT_SECRET
    if [ -z "$JWT_SECRET" ]; then
        JWT_SECRET=$(generate_password)
        log_info "Generated JWT secret: $JWT_SECRET"
    fi

    # Construct database URL
    DATABASE_URL="postgresql://portfolio_user:${POSTGRES_PASSWORD}@postgres:5432/portfolio?schema=public"

    kubectl create secret generic backend-secret \
        --from-literal=database-url="$DATABASE_URL" \
        --from-literal=jwt-secret="$JWT_SECRET"

    log_info "backend-secret created"
fi

log_info "All secrets have been set up successfully!"
log_info "IMPORTANT: Save the generated passwords in a secure location!"
