Set-StrictMode -Version Latest
$PSScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location (Join-Path $PSScriptRoot "..")
if (-not (Test-Path ".venv")) { py -m venv .venv }
. .\.venv\Scripts\Activate.ps1
python -m pip install -U pip
python -m pip install -r requirements.txt
python app.py

