#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$BACKEND_ROOT"

bash "$SCRIPT_DIR/setup.sh"
uv run uvicorn app.main:app --host 0.0.0.0 --port 8000
