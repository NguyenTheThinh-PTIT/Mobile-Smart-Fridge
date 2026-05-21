# ============================================
# Makefile — Common project commands
# Usage: make <target>
# ============================================

.PHONY: help init up up-d down build logs logs-service clean status restart test debezium-up debezium-register debezium-logs

help: ## Show all available commands
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

init: ## Initialize project
	bash scripts/init.sh

up: ## Build and start all services
	docker compose up --build

up-d: ## Start all services (detached)
	docker compose up --build -d

down: ## Stop all services
	docker compose down

build: ## Rebuild all containers
	docker compose build --no-cache

logs: ## View logs
	docker compose logs -f

logs-service: ## Tail logs from a specific service (usage: make logs-service s=service-a)
	docker compose logs -f $(s)

clean: ## Remove everything
	docker compose down -v --rmi all --remove-orphans

status: ## Show status of all services
	docker compose ps

restart: ## Restart all services
	docker compose restart

test: ## Run tests (customize per your stack)
	@echo "Add your test commands here"
	@echo "Example: docker compose exec service-a npm test"
	@echo "Example: docker compose exec service-a pytest"

debezium-up: ## Start Kafka Connect (Debezium)
	docker compose up -d kafka-connect

debezium-register: ## Register schedule outbox connector
	bash scripts/debezium/register-schedule-outbox-connector.sh

debezium-logs: ## View Kafka Connect logs
	docker compose logs -f kafka-connect
