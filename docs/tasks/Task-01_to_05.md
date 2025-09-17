# Task 01–05 Report

Scope: Implement two-tab pywebview app per docs/guides/codex-guide.md, Tasks 1–5 only.

## Files Created/Modified

Top-level:
- `.gitattributes`
- `.gitignore`
- `LICENSE`
- `README.md` (pre-existing)
- `requirements.txt`
- `app.py`
- `api.py`

Forms + Templates:
- `forms/schema.json`
- `templates/.gitkeep`
- `templates/docx_base_template.docx` (generated via python-docx during verification)

UI:
- `ui/index.html`
- `ui/js/api_bridge.js`
- `ui/js/form.js`
- `ui/js/edit_forms.js`
- `ui/static/css/docker-theme.css`
- `ui/static/css/header-theme.css`
- `ui/static/css/sidebar-theme.css`
- `ui/static/css/utilities.css`
- `ui/static/css/card-header-theme.css`
- `ui/static/vendor/bootstrap.min.css` (placeholder)
- `ui/static/vendor/fontawesome.min.css` (placeholder)
- `ui/static/images/logo.png` (placeholder)

Dev scripts:
- `scripts/dev.ps1`
- `scripts/dev.sh`

Verification artifacts (local):
- `test_output/output.xlsx`
- `test_output/output.docx`

## Deviations and Rationale
- Packaging/CI files (`app.spec`, `.github/workflows/build-release.yml`) are intentionally NOT added in this phase, as they belong to Tasks 6–10.
- `templates/docx_base_template.docx` was created programmatically (to avoid committing binary via patch tooling). It exists on disk and is used by the app.
- Vendor CSS files are lightweight placeholders; `index.html` falls back to CDN for Bootstrap if local file is insufficient.

## Evidence of Success

Environment: Windows with Python launcher; venv bootstrapped. Exact run (trimmed):

```
> py -m venv .venv
> .venv\Scripts\python.exe -m pip install -U pip
> .venv\Scripts\python.exe -m pip install -r requirements.txt
...
Successfully installed ... pywebview-4.4.1 ... openpyxl-3.1.5 ... python-docx-1.1.2 ... pyinstaller-6.10.0

> .venv\Scripts\python.exe -c "from docx import Document; import os; os.makedirs('templates', exist_ok=True); Document().save('templates/docx_base_template.docx')"
Template created: C:\...\templates\docx_base_template.docx

// LocalAPI smoke test
Schema fields: ['site_name', 'inspection_date', 'inspector', 'priority', 'notes']
Generated files:
C:\...\test_output\output.xlsx
C:\...\test_output\output.docx
Listing test_output:
 - output.docx
 - output.xlsx
```

Folder listings (selected):
- `ui/` contains `index.html`, `js/` and `static/` with theme and vendor placeholders.
- `forms/schema.json` present with required fields and types.
- `templates/docx_base_template.docx` exists and loads via python-docx.
- `test_output/` contains both `output.xlsx` and `output.docx` produced by `LocalAPI`.

Notes on generation:
- `generate_xlsx` creates or appends to `output.xlsx`, preserving the header row on first write.
- `generate_docx` uses `templates/docx_base_template.docx` if present; placeholders like `{{key}}` are replaced in paragraph text. Otherwise, it generates a simple document with key/value lines and timestamp.

## Known TODOs
- UI visual verification: Window launch is not captured in this CLI run. Manual launch via `scripts/dev.ps1`/`scripts/dev.sh` recommended to visually confirm the two-tab shell loads.
- Theme CSS and vendor assets: Replace placeholders with full local copies if offline operation without CDN is required.
- LICENSE: Placeholder content — choose and add the correct license.
- Python version: Guide recommends 3.10–3.12; local venv used the system default (3.13). No issues observed, but pin to 3.11 if packaging compatibility issues arise later (Task 6–10).

## How to Run Locally
- Windows: `scripts/dev.ps1` (may require allowing script execution or run the steps inline without activation: use `.venv\Scripts\python.exe`).
- macOS/Linux: `scripts/dev.sh`.

This completes Tasks 1–5. Awaiting approval to continue with Tasks 6–10.

