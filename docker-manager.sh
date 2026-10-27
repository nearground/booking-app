#!/bin/bash

# PUERTO VALLARTA TODAY - Docker Startup Script
# This script helps you manage the Docker environment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=====================================${NC}"
echo -e "${GREEN}  PUERTO VALLARTA TODAY - Docker Manager${NC}"
echo -e "${GREEN}=====================================${NC}"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}No .env file found. Creating from .env.example...${NC}"
    cp .env.example .env
    echo -e "${GREEN}✓ Created .env file. Please review and update the values.${NC}"
    echo ""
fi

# Function to check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        echo -e "${RED}✗ Docker is not running. Please start Docker and try again.${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ Docker is running${NC}"
}

# Function to start services
start_services() {
    echo -e "${YELLOW}Starting services...${NC}"
    docker-compose up -d --build
    echo ""
    echo -e "${GREEN}✓ Services started!${NC}"
    echo ""
    echo "Access the application at:"
    echo -e "  Frontend: ${GREEN}http://localhost${NC}"
    echo -e "  Backend API: ${GREEN}http://localhost:4000${NC}"
    echo -e "  Database: ${GREEN}localhost:3306${NC}"
    echo ""
    echo "Use 'docker-compose logs -f' to view logs"
}

# Function to stop services
stop_services() {
    echo -e "${YELLOW}Stopping services...${NC}"
    docker-compose down
    echo -e "${GREEN}✓ Services stopped${NC}"
}

# Function to show logs
show_logs() {
    docker-compose logs -f
}

# Function to show status
show_status() {
    docker-compose ps
}

# Function to run production-safe deployment
deploy_production() {
    check_docker
    echo -e "${YELLOW}Running production-safe deployment sequence...${NC}"
    echo -e "${YELLOW}1) Applying database migrations...${NC}"
    docker-compose -f docker-compose.prod.yml run --rm backend npx sequelize-cli db:migrate

    echo ""
    echo -e "${YELLOW}2) Building and starting production services...${NC}"
    docker-compose -f docker-compose.prod.yml up -d --build

    echo ""
    echo -e "${YELLOW}3) Showing backend startup logs...${NC}"
    docker-compose -f docker-compose.prod.yml logs --tail=120 backend
    echo -e "${GREEN}✓ Production deployment sequence completed${NC}"
}

# Main menu
case "${1:-start}" in
    start)
        check_docker
        start_services
        ;;
    stop)
        stop_services
        ;;
    restart)
        check_docker
        stop_services
        echo ""
        start_services
        ;;
    logs)
        show_logs
        ;;
    status)
        show_status
        ;;
    clean)
        echo -e "${YELLOW}Removing all containers, networks, and volumes...${NC}"
        docker-compose down -v
        echo -e "${GREEN}✓ Cleanup complete${NC}"
        ;;
    r2)
        echo -e "${YELLOW}Starting local R2 via Wrangler...${NC}"
        cd r2-local
        npm install
        npm run dev
        ;;
    prod-deploy)
        deploy_production
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|logs|status|clean|r2|prod-deploy}"
        echo ""
        echo "Commands:"
        echo "  start   - Start all services (default)"
        echo "  stop    - Stop all services"
        echo "  restart - Restart all services"
        echo "  logs    - Show logs (follow mode)"
        echo "  status  - Show status of services"
        echo "  clean   - Remove all containers and volumes"
        echo "  r2      - Start local Cloudflare R2 (Wrangler)"
        echo "  prod-deploy - Run migration-first production deployment sequence"
        exit 1
        ;;
esac
