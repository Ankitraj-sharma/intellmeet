.PHONY: help dev build up down logs test lint clean seed

# Default target
help:
	@echo ""
	@echo "  IntellMeet – Available Commands"
	@echo "  ─────────────────────────────────────────"
	@echo "  make dev        Start full dev environment (Docker infra + local apps)"
	@echo "  make up         Start all services via Docker Compose"
	@echo "  make down       Stop all services"
	@echo "  make build      Rebuild Docker images"
	@echo "  make logs       Tail all service logs"
	@echo "  make test       Run backend tests with coverage"
	@echo "  make lint       Run linters (backend + frontend)"
	@echo "  make seed       Seed the database with demo data"
	@echo "  make clean      Remove containers and volumes"
	@echo "  make deploy     Deploy to Kubernetes (requires kubectl + kubeconfig)"
	@echo ""

# ── Development ────────────────────────────────────────────────
dev:
	@echo "Starting infrastructure..."
	docker compose up mongodb redis -d
	@echo "Starting backend & frontend in parallel..."
	@(cd backend && npm run dev) & (cd frontend && npm run dev) & wait

infra:
	docker compose up mongodb redis prometheus grafana -d

# ── Docker Compose ─────────────────────────────────────────────
up:
	docker compose up --build -d
	@echo "Services started:"
	@echo "  App:        http://localhost"
	@echo "  API:        http://localhost:5000"
	@echo "  Grafana:    http://localhost:3000"
	@echo "  Prometheus: http://localhost:9090"

down:
	docker compose down

build:
	docker compose build --no-cache

logs:
	docker compose logs -f

restart:
	docker compose restart backend

# ── Testing ────────────────────────────────────────────────────
test:
	@echo "Running backend tests..."
	cd backend && npm test -- --coverage

test-watch:
	cd backend && npm test -- --watch

# ── Code Quality ───────────────────────────────────────────────
lint:
	@echo "Linting backend..."
	cd backend && npm run lint --if-present
	@echo "Linting frontend..."
	cd frontend && npm run lint --if-present

fmt:
	cd backend && npx prettier --write "**/*.js" --ignore-path .gitignore
	cd frontend && npx prettier --write "src/**/*.{ts,tsx}" --ignore-path .gitignore

# ── Database ───────────────────────────────────────────────────
seed:
	@echo "Seeding database with demo data..."
	cd backend && node scripts/seed.js

migrate:
	cd backend && node scripts/migrate.js

# ── Production Deploy ──────────────────────────────────────────
deploy:
	@echo "Applying Kubernetes manifests..."
	kubectl apply -f k8s/namespace.yaml
	kubectl apply -f k8s/configmap.yaml
	kubectl apply -f k8s/mongodb.yaml
	kubectl apply -f k8s/redis.yaml
	kubectl apply -f k8s/backend-deployment.yaml
	kubectl apply -f k8s/frontend-deployment.yaml
	kubectl apply -f k8s/ingress.yaml
	@echo "Deployment complete. Check status:"
	kubectl get pods -n intellmeet

rollback:
	kubectl rollout undo deployment/intellmeet-backend -n intellmeet
	kubectl rollout undo deployment/intellmeet-frontend -n intellmeet

status:
	kubectl get all -n intellmeet

# ── Cleanup ────────────────────────────────────────────────────
clean:
	docker compose down -v --remove-orphans
	docker system prune -f

clean-all:
	docker compose down -v --remove-orphans
	docker system prune -af
	rm -rf backend/node_modules frontend/node_modules backend/logs
