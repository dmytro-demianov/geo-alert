.PHONY: dev build test migrate migrate-down docker-up docker-down lint

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

docker-up:
	docker compose up -d --build

docker-down:
	docker compose down

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
