#!/usr/bin/env bash
set -e

if ! command -v uv >/dev/null 2>&1; then
    echo "uv is not installed. Install it first: https://docs.astral.sh/uv/getting-started/installation/"
    exit 1
fi

uv sync

echo "▶ Installing Playwright browsers..."
uv run playwright install chromium
uv run playwright install-deps chromium   # no-op on macOS/Windows, required on Linux

echo "All set up!"