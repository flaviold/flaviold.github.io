#!/usr/bin/env bash
# Serves the site locally, the same way GitHub Pages serves it from the repo root.
# Usage: bin/serve.sh [port]   (default port: 8000)
set -euo pipefail

PORT="${1:-8000}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if ! command -v python3 >/dev/null 2>&1; then
  echo "Error: python3 is required to run the local server." >&2
  exit 1
fi

echo "Serving $ROOT at http://localhost:$PORT/ (Ctrl+C to stop)"
exec python3 -m http.server "$PORT" --bind 127.0.0.1 --directory "$ROOT"
