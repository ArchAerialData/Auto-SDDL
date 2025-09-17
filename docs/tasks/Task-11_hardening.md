# Task 11 – Hardening Pass (Optional)

Scope: Validate packaged paths, runtime notes, and basic smoke tests across OS runners.

## Path Validation
- Confirmed `app.spec` includes required assets:
  - `ui/index.html`, `ui/static`, `ui/js` → available to the packaged app.
  - `forms/schema.json` → schema loads in packaged app.
  - `templates/` → optional DOCX template is bundled.
- `ui/index.html` references local assets under `ui/static` and `ui/js` that are copied by PyInstaller via `datas`.

## Runtime Notes
- Windows: pywebview requires WebView2 runtime (Evergreen). If the app window is blank, install WebView2.
- macOS: uses built‑in WebKit; no additional runtime required.

## CI Smoke Tests (GitHub Runners)
- Windows:
  - Launch built app from `dist/FormGen/FormGen.exe`.
  - Fill a minimal schema form; generate XLSX and DOCX; confirm files exist.
- macOS:
  - Open `dist/FormGen.app` directly or mount `dist/FormGen-macos.dmg` and run.
  - Perform the same generate/verify check.

## Observations & Mitigations
- If assets are missing after packaging, extend `datas` in `app.spec`.
- If opening output folder fails on Linux/macOS in non‑GUI contexts, guard calls or skip smoke test in headless CI.
- Ensure `requirements.txt` stays pinned as per guide to avoid PyInstaller regressions.

## TODO(Owner)
- Run smoke tests on both GitHub runners for tag `v0.1.0` and record results.
- Update README with a short WebView2 runtime note if not already present.

