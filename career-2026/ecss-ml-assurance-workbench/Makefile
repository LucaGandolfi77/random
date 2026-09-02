# ECSS ML Assurance Workbench — week 1 (Data Readiness Inspector)

Includes: local development helpers, Docker orchestration and quality gates.

.PHONY: help up down build logs ps test test-backend test-frontend lint clean seed dev

help: ## Show available targets
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}'

up: ## Build and start the full stack (frontend + backend)
	docker compose up --build -d

down: ## Stop the stack (keeps the persistent volume)
	docker compose down

build: ## Build images
	docker compose build

logs: ## Tail container logs
	docker compose logs -f --tail=100

ps: ## Container status
	docker compose ps

dev-backend: ## Run the backend locally with hot reload (expects ./backend/.venv)
	cd backend && .venv/bin/uvicorn app.main:app --reload --port 8000

dev-frontend: ## Run the frontend dev server (expects node_modules)
	cd frontend && npm run dev

seed: ## Regenerate the deterministic sample datasets
	docker compose run --rm --no-deps -v $(CURDIR)/sample-data:/sample-data backend \
		python -m app.scripts.seed_samples --output-dir /sample-data

test: test-backend test-frontend ## Run backend + frontend unit tests (dockerized)

test-backend: ## Backend pytest suite
	docker compose --profile test run --rm backend-tests

test-frontend: ## Frontend vitest suite
	docker compose --profile test run --rm frontend-tests

lint: ## Ruff + mypy (backend), ESLint + tsc (frontend)
	docker compose --profile test run --rm backend-quality
	docker compose --profile test run --rm frontend-quality

clean: ## Stop everything and remove volumes + local build artifacts
	docker compose down -v --remove-orphans
	rm -rf frontend/dist backend/.pytest_cache
	find . -type d -name __pycache__ -prune -exec rm -rf {} +

e2e: ## Run the Playwright E2E suite against the running stack (see frontend/README)
	cd frontend && npx playwright test

seed-week3: ## (Re)import the four week-3 demo projects (idempotent)
	docker compose run --rm --no-deps backend python -m app.scripts.seed_week3
