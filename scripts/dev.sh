#!/bin/bash

# Development Mode Script
# Uses docker-compose.dev.yml for live reload during development

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

log_dev() {
    echo -e "${BLUE}[DEV]${NC} $1"
}

check_env_file() {
    if [ ! -f .env ]; then
        log_warn ".env file not found"
        log_info "Creating .env from .env.example..."
        if [ -f .env.example ]; then
            cp .env.example .env
            log_warn "Using default development credentials"
        fi
    fi
}

start_dev() {
    log_dev "=== Starting Development Mode ==="
    log_info "File changes will be automatically reflected"
    log_info ""

    check_env_file

    log_info "Building development images..."
    docker compose -f docker-compose.dev.yml build

    log_info "Starting services in development mode..."
    docker compose -f docker-compose.dev.yml up -d

    log_info "Waiting for database to be ready..."
    sleep 10

    log_info "Running database migrations..."
    docker compose -f docker-compose.dev.yml exec backend npm run prisma:migrate deploy || {
        log_warn "Migration failed, trying to generate Prisma client first..."
        docker compose -f docker-compose.dev.yml exec backend npm run prisma:generate
        docker compose -f docker-compose.dev.yml exec backend npm run prisma:migrate deploy
    }

    log_info "Seeding database..."
    docker compose -f docker-compose.dev.yml exec backend npm run prisma:seed || {
        log_warn "Seeding skipped (may already be seeded)"
    }

    log_dev ""
    log_dev "✅ Development environment is ready!"
    log_dev ""
    log_dev "📱 Application URLs:"
    log_dev "   Frontend: http://localhost:3000"
    log_dev "   Backend API: http://localhost:3001/api"
    log_dev "   Health Check: http://localhost:3001/api/health"
    log_dev ""
    log_dev "🔥 Hot Reload Active:"
    log_dev "   - Edit files in ./backend/src or ./frontend/src"
    log_dev "   - Changes will automatically reload"
    log_dev ""
    log_dev "📋 Useful Commands:"
    log_dev "   View logs:    ./scripts/dev.sh logs"
    log_dev "   Restart:      ./scripts/dev.sh restart"
    log_dev "   Stop:         ./scripts/dev.sh stop"
    log_dev "   Shell:        ./scripts/dev.sh shell backend|frontend"
    log_dev ""
    log_info "Run './scripts/dev.sh logs' to follow logs"
}

stop_dev() {
    log_info "Stopping development services..."
    docker compose -f docker-compose.dev.yml down
    log_info "Development services stopped"
}

restart_dev() {
    log_info "Restarting development services..."
    docker compose -f docker-compose.dev.yml restart
    log_info "Services restarted"
}

show_logs() {
    log_info "Showing development logs (Ctrl+C to exit)..."
    docker compose -f docker-compose.dev.yml logs -f
}

show_status() {
    log_info "Development service status:"
    docker compose -f docker-compose.dev.yml ps
}

rebuild_dev() {
    log_info "=== Rebuilding Development Environment ==="
    stop_dev
    log_info "Rebuilding images..."
    docker compose -f docker-compose.dev.yml build --no-cache
    start_dev
}

shell_access() {
    SERVICE=$1
    if [ -z "$SERVICE" ]; then
        log_error "Please specify service: backend or frontend"
        log_info "Usage: ./scripts/dev.sh shell backend"
        exit 1
    fi

    log_info "Opening shell in $SERVICE container..."
    docker compose -f docker-compose.dev.yml exec $SERVICE /bin/bash || \
    docker compose -f docker-compose.dev.yml exec $SERVICE /bin/sh
}

db_shell() {
    log_info "Opening PostgreSQL shell..."
    docker compose -f docker-compose.dev.yml exec postgres psql -U portfolio_user -d portfolio
}

run_migrations() {
    log_info "Running database migrations..."
    docker compose -f docker-compose.dev.yml exec backend npm run prisma:migrate dev
    log_info "Migrations completed"
}

run_seed() {
    log_info "Seeding database..."
    docker compose -f docker-compose.dev.yml exec backend npm run prisma:seed
    log_info "Seeding completed"
}

clean_volumes() {
    log_warn "This will remove all development data!"
    read -p "Are you sure? (yes/no): " confirm
    if [ "$confirm" = "yes" ]; then
        log_info "Stopping services and removing volumes..."
        docker compose -f docker-compose.dev.yml down -v
        log_info "All development data removed"
    else
        log_info "Cancelled"
    fi
}

# Main function
main() {
    case "${1:-start}" in
        start|up)
            start_dev
            ;;
        stop|down)
            stop_dev
            ;;
        restart)
            restart_dev
            ;;
        logs)
            show_logs
            ;;
        status|ps)
            show_status
            ;;
        rebuild)
            rebuild_dev
            ;;
        shell|sh|bash)
            shell_access "${2:-backend}"
            ;;
        db|psql)
            db_shell
            ;;
        migrate)
            run_migrations
            ;;
        seed)
            run_seed
            ;;
        clean)
            clean_volumes
            ;;
        *)
            echo "Usage: $0 {start|stop|restart|logs|status|rebuild|shell|db|migrate|seed|clean}"
            echo ""
            echo "Commands:"
            echo "  start    - Start development environment (default)"
            echo "  stop     - Stop development services"
            echo "  restart  - Restart development services"
            echo "  logs     - Show and follow logs"
            echo "  status   - Show service status"
            echo "  rebuild  - Rebuild and restart everything"
            echo "  shell    - Open shell in container (backend|frontend)"
            echo "  db       - Open PostgreSQL shell"
            echo "  migrate  - Run database migrations"
            echo "  seed     - Seed database with initial data"
            echo "  clean    - Remove all data and volumes"
            exit 1
            ;;
    esac
}

# Run main function
main "$@"
