.PHONY: help build start stop restart logs status clean rebuild r2-start r2-check

help:
	@echo "PUERTO VALLARTA TODAY - Docker Management Commands"
	@echo ""
	@echo "Usage: make [command]"
	@echo ""
	@echo "Commands:"
	@echo "  build    - Build all Docker images"
	@echo "  start    - Start all services"
	@echo "  stop     - Stop all services"
	@echo "  restart  - Restart all services"
	@echo "  logs     - Show logs (all services)"
	@echo "  status   - Show status of all services"
	@echo "  clean    - Remove all containers, networks, and volumes"
	@echo "  rebuild  - Clean and rebuild everything"
	@echo ""
	@echo "Service-specific commands:"
	@echo "  logs-frontend  - Show frontend logs"
	@echo "  logs-backend   - Show backend logs"
	@echo "  logs-database  - Show database logs"
	@echo "  shell-frontend - Access frontend container shell"
	@echo "  shell-backend  - Access backend container shell"
	@echo "  shell-database - Access database shell (MySQL)"
	@echo ""
	@echo "Local R2 commands:"
	@echo "  r2-start       - Start local Cloudflare R2 (Wrangler)"
	@echo "  r2-check       - Validate local R2 worker config"
	@echo ""
	@echo "Production commands:"
	@echo "  prod-migrate   - Apply DB migrations using prod compose"
	@echo "  prod-up        - Build and start production compose services"
	@echo "  prod-deploy    - Run migration-first production deployment"

build:
	docker-compose build

start:
	@if [ ! -f .env ]; then \
		echo "Creating .env file from .env.example..."; \
		cp .env.example .env; \
		echo "Created .env file. Please review and update if needed."; \
		echo ""; \
	fi
	docker-compose up -d --build
	@echo ""
	@echo "Services started!"
	@echo "  Frontend: http://localhost"
	@echo "  Backend: http://localhost:4000"
	@echo "  Database: localhost:3306"

stop:
	docker-compose down

restart:
	docker-compose restart

logs:
	docker-compose logs -f

logs-frontend:
	docker-compose logs -f frontend

logs-backend:
	docker-compose logs -f backend

logs-database:
	docker-compose logs -f database

status:
	docker-compose ps

clean:
	docker-compose down -v
	@echo "Cleaned up all containers, networks, and volumes"

rebuild: clean start

shell-frontend:
	docker-compose exec frontend sh

shell-backend:
	docker-compose exec backend sh

shell-database:
	docker-compose exec database mysql -u staybooker -p

# Development helpers
dev-frontend:
	cd frontend && npm start

dev-backend:
	cd pv-today-hotel-booking-express-api && npm run start:dev

r2-start:
	cd r2-local && npm install && npm run dev

r2-check:
	cd r2-local && npm install && npm run check

prod-migrate:
	docker-compose -f docker-compose.prod.yml run --rm backend npx sequelize-cli db:migrate

prod-up:
	docker-compose -f docker-compose.prod.yml up -d --build

prod-deploy: prod-migrate prod-up
	@echo "Showing backend startup logs..."
	docker-compose -f docker-compose.prod.yml logs --tail=120 backend
