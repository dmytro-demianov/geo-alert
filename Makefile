.PHONY: help dev build up down clean test migrate migrate-down docker-build docker-up docker-down docker-clean docker-logs docker-db lint

help:
	@echo "Usage: make <target>"
	@echo ""
	@echo "Docker:"
	@echo "  build        Собрать образы и запустить контейнеры"
	@echo "  up           Запустить контейнеры (без пересборки)"
	@echo "  down         Остановить контейнеры"
	@echo "  clean        Остановить, удалить тома и образы"
	@echo ""
	@echo "Dev:"
	@echo "  dev          Запустить бэкенд локально"
	@echo "  dev-frontend Запустить фронтенд локально"
	@echo ""
	@echo "Tests:"
	@echo "  test          Тесты бэкенда"
	@echo "  test-frontend Тесты фронтенда"
	@echo ""
	@echo "Migrations:"
	@echo "  migrate       Применить миграции"
	@echo "  migrate-down  Откатить последнюю миграцию"
	@echo ""
	@echo "Quality:"
	@echo "  lint          Линтер бэкенда"
	@echo "  lint-frontend Линтер фронтенда"
	@echo "  tidy          go mod tidy"

# ── Local dev ──────────────────────────────────────────────────────────────────

dev:
	cd backend && go run ./cmd/server

dev-frontend:
	cd frontend && npm run dev

# ── Build ──────────────────────────────────────────────────────────────────────

build:
	cd backend && CGO_ENABLED=0 go build -ldflags="-s -w" -o bin/geo-alert ./cmd/server

build-frontend:
	cd frontend && npm run build

# ── Migrations ────────────────────────────────────────────────────────────────

migrate:
	@if [ -z "$$DATABASE_URL" ]; then \
		export DATABASE_URL=$$(cd backend && go run ./cmd/print-dsn 2>/dev/null || \
		echo "postgres://$$DB_USER:$$DB_PASSWORD@$$DB_HOST:$${DB_PORT:-5432}/$$DB_NAME?sslmode=disable"); \
	fi; \
	migrate -path backend/migrations -database "$$DATABASE_URL" up

migrate-down:
	migrate -path backend/migrations -database "$$DATABASE_URL" down 1

migrate-status:
	migrate -path backend/migrations -database "$$DATABASE_URL" version

# ── Tests ─────────────────────────────────────────────────────────────────────

test:
	cd backend && go test ./... -v -timeout 60s

test-frontend:
	cd frontend && npm run test

# ── Docker ────────────────────────────────────────────────────────────────────

build: docker-build
up: docker-up
down: docker-down
clean: docker-clean

docker-build:
	docker compose up -d --build

docker-up:
	docker compose up -d

docker-down:
	docker compose down

docker-clean:
	docker compose down -v --rmi all

docker-logs:
	docker compose logs -f backend

docker-db:
	docker compose exec postgres psql -U $${DB_USER:-geo_alert} -d $${DB_NAME:-geo_alert}

# ── Code quality ──────────────────────────────────────────────────────────────

lint:
	cd backend && golangci-lint run ./...

lint-frontend:
	cd frontend && npm run lint

tidy:
	cd backend && go mod tidy
