#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
: "${PY:=python3}"
if [ ! -d .venv ]; then $PY -m venv .venv; fi
source .venv/bin/activate
pip install -U pip
pip install -r requirements.txt
$PY app.py

