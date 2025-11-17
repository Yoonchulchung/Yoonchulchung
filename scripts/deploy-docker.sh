#!/bin/bash

# Docker Compose Deployment Script
# Simple deployment using Docker Compose (no kubectl required)

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

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

    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        exit 1
    fi

    # Check Docker Compose
    if ! command -v docker compose &> /dev/null && ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed"
        exit 1
    fi

    log_info "Prerequisites check completed"
}

check_env_file() {
    if [ ! -f .env ]; then
        log_warn ".env file not found"
        log_info "Creating .env from .env.example..."
        if [ -f .env.example ]; then
            cp .env.example .env
            log_warn "Please update .env with your actual configuration"
            log_info "Edit .env and press Enter to continue..."
            read
        else
            log_error ".env.example not found"
            exit 1
        fi
    fi
}

build_images() {
    log_info "Building Docker images..."
    docker compose build --no-cache
    log_info "Docker images built successfully"
}

start_services() {
    log_info "Starting services..."
    if docker compose up -d; then
        log_info "Services started"
    else
        log_error "Failed to start services"
        log_info "Showing logs for debugging..."
        docker compose logs --tail=50
        exit 1
    fi
}

run_migrations() {
    log_info "Waiting for services to be ready..."
    sleep 10

    log_info "Running database migrations..."
    docker compose exec backend npm run prisma:migrate deploy || {
        log_warn "Migration failed, trying to generate Prisma client first..."
        docker compose exec backend npm run prisma:generate
        docker compose exec backend npm run prisma:migrate deploy
    }
    log_info "Database migrations completed"

    log_info "Seeding database with initial data..."
    docker compose exec backend npm run prisma:seed || {
        log_warn "Seeding failed or already completed"
    }
    log_info "Database setup completed"
}

health_check() {
    log_info "Performing health check..."

    # Wait for services to stabilize (health checks have 60s start_period)
    log_info "Waiting for services to start up (this may take up to 60 seconds)..."
    sleep 15

    # Check backend health with retries
    log_info "Checking backend health..."
    backend_healthy=false
    for i in {1..6}; do
        if curl -f http://localhost:3001/api/health/live > /dev/null 2>&1; then
            log_info "Backend health check passed ✓"
            backend_healthy=true
            break
        else
            if [ $i -lt 6 ]; then
                log_warn "Backend not ready yet, retrying in 10 seconds... (attempt $i/6)"
                sleep 10
            else
                log_error "Backend health check failed after 6 attempts"
                log_info "Running troubleshoot to show logs..."
                troubleshoot
            fi
        fi
    done

    # Check frontend health with retries
    if [ "$backend_healthy" = true ]; then
        log_info "Checking frontend health..."
        frontend_healthy=false
        for i in {1..3}; do
            if curl -f http://localhost:3000 > /dev/null 2>&1; then
                log_info "Frontend health check passed ✓"
                frontend_healthy=true
                break
            else
                if [ $i -lt 3 ]; then
                    log_warn "Frontend not ready yet, retrying in 10 seconds... (attempt $i/3)"
                    sleep 10
                else
                    log_warn "Frontend health check failed - may still be starting"
                fi
            fi
        done
    fi

    log_info ""
    log_info "Application URLs:"
    log_info "  Frontend: http://localhost:3000"
    log_info "  Backend API: http://localhost:3001/api"
    log_info "  Health Check: http://localhost:3001/api/health"
    log_info ""
    log_info "To view logs: ./scripts/deploy-docker.sh logs"
    log_info "To troubleshoot: ./scripts/deploy-docker.sh troubleshoot"
}

show_logs() {
    log_info "Showing service logs (Ctrl+C to exit)..."
    docker compose logs -f
}

troubleshoot() {
    log_info "=== Troubleshooting Information ==="

    log_info "\n1. Service Status:"
    docker compose ps

    log_info "\n2. Backend Logs (last 30 lines):"
    docker compose logs backend --tail=30

    log_info "\n3. Frontend Logs (last 30 lines):"
    docker compose logs frontend --tail=30

    log_info "\n4. Database Logs (last 20 lines):"
    docker compose logs postgres --tail=20

    log_info "\n5. Redis Logs (last 20 lines):"
    docker compose logs redis --tail=20

    log_info "\n6. Container Health:"
    docker compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Health}}"

    log_info "\nFor more details, run: ./scripts/deploy-docker.sh logs"
}

stop_services() {
    log_info "Stopping services..."
    docker compose down
    log_info "Services stopped"
}

destroy_all() {
    log_warn "This will remove all containers, volumes, and data!"
    read -p "Are you sure? (yes/no): " confirm
    if [ "$confirm" = "yes" ]; then
        log_info "Destroying all services and data..."
        docker compose down -v
        log_info "All services and data removed"
    else
        log_info "Cancelled"
    fi
}

# Main function
main() {
    case "${1:-deploy}" in
        deploy|start)
            log_info "=== Starting Deployment ==="
            check_prerequisites
            check_env_file
            build_images
            start_services
            run_migrations
            health_check
            log_info ""
            log_info "Deployment completed successfully!"
            log_info "Run './scripts/deploy-docker.sh logs' to view logs"
            ;;
        rebuild)
            log_info "=== Rebuilding and Restarting ==="
            check_prerequisites
            stop_services
            build_images
            start_services
            run_migrations
            health_check
            ;;
        restart)
            log_info "=== Restarting Services ==="
            docker compose restart
            health_check
            ;;
        stop)
            stop_services
            ;;
        logs)
            show_logs
            ;;
        status)
            log_info "Service status:"
            docker compose ps
            ;;
        troubleshoot|debug)
            troubleshoot
            ;;
        destroy)
            destroy_all
            ;;
        *)
            echo "Usage: $0 {deploy|rebuild|restart|stop|logs|status|troubleshoot|destroy}"
            echo ""
            echo "Commands:"
            echo "  deploy       - Build and deploy all services (default)"
            echo "  rebuild      - Rebuild images and redeploy"
            echo "  restart      - Restart all services"
            echo "  stop         - Stop all services"
            echo "  logs         - Show service logs"
            echo "  status       - Show service status"
            echo "  troubleshoot - Show detailed troubleshooting information"
            echo "  destroy      - Remove all services and data"
            exit 1
            ;;
    esac
}

# Run main function
main "$@"
