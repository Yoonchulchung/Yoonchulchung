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
    docker compose up -d
    log_info "Services started"
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
}

health_check() {
    log_info "Performing health check..."

    # Wait a bit for services to stabilize
    sleep 5

    # Check backend health
    if curl -f http://localhost:3001/api/health > /dev/null 2>&1; then
        log_info "Backend health check passed ✓"
    else
        log_warn "Backend health check failed"
    fi

    # Check frontend
    if curl -f http://localhost:3000 > /dev/null 2>&1; then
        log_info "Frontend health check passed ✓"
    else
        log_warn "Frontend health check failed"
    fi

    log_info ""
    log_info "Application URLs:"
    log_info "  Frontend: http://localhost:3000"
    log_info "  Backend API: http://localhost:3001/api"
    log_info "  Health Check: http://localhost:3001/api/health"
}

show_logs() {
    log_info "Showing service logs (Ctrl+C to exit)..."
    docker compose logs -f
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
        destroy)
            destroy_all
            ;;
        *)
            echo "Usage: $0 {deploy|rebuild|restart|stop|logs|status|destroy}"
            echo ""
            echo "Commands:"
            echo "  deploy   - Build and deploy all services (default)"
            echo "  rebuild  - Rebuild images and redeploy"
            echo "  restart  - Restart all services"
            echo "  stop     - Stop all services"
            echo "  logs     - Show service logs"
            echo "  status   - Show service status"
            echo "  destroy  - Remove all services and data"
            exit 1
            ;;
    esac
}

# Run main function
main "$@"
