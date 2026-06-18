SHELL := /bin/sh

.PHONY: up down seed test proto go-test py-test

up:
	docker compose -f deploy/compose/docker-compose.yml up -d

down:
	docker compose -f deploy/compose/docker-compose.yml down

seed:
	python scripts/generate_synthetic_data.py

test: py-test go-test

py-test:
	python -m unittest discover -s agents -p "*_test.py"

go-test:
	go test ./...

proto:
	docker run --rm -v "$$(pwd):/workspace" -w /workspace bufbuild/buf:latest generate

