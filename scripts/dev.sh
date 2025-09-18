#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

# Prefer Python 3.11 for macOS (pyobjc wheels, pywebview stability)
if command -v python3.11 >/dev/null 2>&1; then
  PY=${PY:-python3.11}
else
  PY=${PY:-python3}
fi

# Ensure Python >= 3.9 (pyobjc requires 3.9+)
ver=$($PY -c 'import sys;print("%d.%d"%sys.version_info[:2])' 2>/dev/null || echo "0.0")
major=${ver%%.*}; minor=${ver#*.}
if [ "$major" -lt 3 ] || [ "$minor" -lt 9 ]; then
  echo "[dev.sh] Python $ver detected. Please install Python 3.11 (recommended) or 3.10/3.12."
  echo "- macOS (Homebrew):   brew install python@3.11 && /opt/homebrew/bin/python3.11 -m venv .venv"
  echo "- Or download from python.org: https://www.python.org/downloads/macos/"
  exit 1
fi

if [ ! -d .venv ]; then "$PY" -m venv .venv; fi
source .venv/bin/activate
python -m pip install -U pip
python -m pip install -r requirements.txt
export WEBVIEW_DEBUG=1
python app.py
