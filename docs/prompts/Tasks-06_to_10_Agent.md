# Agent Playbook — Tasks 6–10 (Packaging & CI)

> **Audience:** Implementation agent only.  
> **Scope:** Complete packaging + CI/release for the two‑tab FormGen app. Do **not** ask for confirmation; execute autonomously and produce a report.

---

## Preconditions (read-only checks)

Confirm these already exist from Tasks 1–5 (do not modify unless noted):
- `app.py` uses a **portable** pywebview start (`webview.start(http_server=True)`). 
- `api.py` exposes the minimal endpoints (`get_schema`, `save_schema`, `generate_xlsx`, `generate_docx`, `open_folder`). 
- `forms/schema.json` contains the initial fields for the form UI.  
- `scripts/dev.sh` and `scripts/dev.ps1` exist for local runs. 
- `requirements.txt` pins `pywebview`, `openpyxl`, `python-docx`, and `pyinstaller`.  
- Tasks 1–5 completion is recorded in `docs/tasks/Task-01_to_05.md`. 

If any are missing, recreate them exactly as referenced, then continue.

---

## Task 6 — Add PyInstaller spec (`app.spec` at repo root)

1. Create `app.spec` with the exact content below:

```python
# app.spec
datas = [
    ('ui/index.html', 'ui'),
    ('ui/static', 'ui/static'),
    ('ui/js', 'ui/js'),
    ('forms/schema.json', 'forms'),
    ('templates', 'templates'),
]

block_cipher = None
a = Analysis(['app.py'], pathex=[], binaries=[], datas=datas, hiddenimports=[], noarchive=False)
pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)
exe = EXE(pyz, a.scripts, a.binaries, a.zipfiles, a.datas, name='FormGen', console=False)
app = BUNDLE(exe, name='FormGen.app', icon=None)  # macOS target
```

2. **Do not** change existing code; this spec only declares which assets ship in the bundle.

**Done when:** File exists at repo root and passes a local `pyinstaller --clean -y app.spec` dry run (no missing‑file errors).

---

## Task 7 — Create GitHub Actions workflow (tag‑triggered, Windows + macOS)

1. Create `.github/workflows/build-release.yml` with the following content:

```yaml
name: build-release
on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    strategy:
      matrix:
        os: [windows-latest, macos-latest]
        python: ['3.11']
    runs-on: ${{ matrix.os }}

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Python
        uses: actions/setup-python@v5
        with:
          python-version: ${{ matrix.python }}
          cache: 'pip'

      - name: Install dependencies
        run: |
          python -m pip install -U pip
          pip install -r requirements.txt
          pip install pyinstaller

      - name: Build with PyInstaller
        run: pyinstaller --clean -y app.spec

      # --- Windows packaging (ZIP using PowerShell Compress-Archive) ---
      - name: Package Windows (ZIP)
        if: matrix.os == 'windows-latest'
        shell: pwsh
        run: |
          if (Test-Path 'dist\FormGen-windows.zip') { Remove-Item 'dist\FormGen-windows.zip' -Force }
          Compress-Archive -Path 'dist\FormGen' -DestinationPath 'dist\FormGen-windows.zip' -Force

      - name: Upload Windows artifact
        if: matrix.os == 'windows-latest'
        uses: actions/upload-artifact@v4
        with:
          name: Windows-artifact
          path: dist/FormGen-windows.zip

      # --- macOS packaging (DMG via hdiutil) ---
      - name: Package macOS (DMG)
        if: matrix.os == 'macos-latest'
        shell: bash
        run: |
          hdiutil create -volname 'FormGen' -srcfolder './dist/FormGen.app' -ov -format UDZO 'dist/FormGen-macos.dmg'

      - name: Upload macOS artifact
        if: matrix.os == 'macos-latest'
        uses: actions/upload-artifact@v4
        with:
          name: macOS-artifact
          path: dist/FormGen-macos.dmg

  release:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Download artifacts
        uses: actions/download-artifact@v4
        with:
          path: artifacts

      - name: Create GitHub Release
        uses: softprops/action-gh-release@v2
        with:
          files: |
            artifacts/**/FormGen-windows.zip
            artifacts/**/FormGen-macos.dmg
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

2. Keep artifact names **exactly** as above; the release step depends on them.

**Done when:** File exists and passes a workflow syntax check on push (GitHub UI shows “build-release” created).

---

## Task 8 — Ensure local vendor assets are present (offline UI)

**Goal:** Guarantee the packaged app renders correctly **without internet**.

1. Verify these files exist and are non‑empty under `ui/static/vendor/`:
   - `bootstrap.min.css`
   - `bootstrap.bundle.min.js`
   - `fontawesome.min.css` (or `fontawesome/css/all.min.css`)

2. If missing or placeholders, fetch stable versions and commit them. (Source does not matter; any current stable 5.x for Bootstrap and FA 6.x is fine.)

3. No code changes required; `index.html` already falls back to CDN if local files are absent.

**Done when:** Local vendor files are present and included by `app.spec` datas (the `ui/static` subtree is already listed).

---

## Task 9 — Commit, tag, and push

1. Stage and commit **only** new/changed files from Tasks 6–8:
   ```bash
   git add app.spec .github/workflows/build-release.yml ui/static/vendor
   git commit -m "ci(packaging): add PyInstaller spec and CI; include vendor assets for offline UI"
   ```

2. Tag and push to trigger the workflow:
   ```bash
   git tag v0.1.0
   git push --follow-tags
   ```

**Done when:** The **build-release** workflow starts automatically for both OS runners.

---

## Task 10 — Verify artifacts and publish task report

1. Wait for both matrix jobs to complete. Download artifacts or open the auto‑created **Release**.

2. Confirm both assets exist and are non‑zero size:
   - `FormGen-windows.zip` (contains `FormGen/` with `FormGen.exe`)  
   - `FormGen-macos.dmg` (mountable, contains `FormGen.app`)

3. Compute checksums and record sizes:
   - Windows (PowerShell): `Get-FileHash dist\FormGen-windows.zip -Algorithm SHA256`  
   - macOS/Linux: `shasum -a 256 dist/FormGen-macos.dmg`

4. Create **`docs/tasks/Task-06_to_10.md`** with the following structure and fill all placeholders:

```markdown
# Task 06–10 Report

## Summary
- CI workflow added and executed on tag `vX.Y.Z`.
- Artifacts produced: FormGen-windows.zip, FormGen-macos.dmg.

## Commit(s)
- <hash> ci(packaging): add PyInstaller spec and CI; include vendor assets for offline UI

## Workflow Runs
- Windows job URL: <link>
- macOS job URL: <link>

## Artifacts
- FormGen-windows.zip — <bytes> bytes — SHA256: `<hash>`
- FormGen-macos.dmg — <bytes> bytes — SHA256: `<hash>`

## Verification
- Windows: contents show `FormGen/FormGen.exe`
- macOS: DMG mounts and contains `FormGen.app`

## Notes
- Any warnings, deviations, or TODOs.
```

**Done when:** The report exists with live links, hashes, and sizes; both assets are attached to the GitHub Release for the pushed tag.

---

## Non‑Goals / Guardrails
- Do **not** refactor `app.py`, `api.py`, schema, or dev scripts (they were validated in Tasks 1–5). fileciteturn0file3 fileciteturn0file0 fileciteturn0file1 fileciteturn0file2  
- Do **not** change pinned versions in `requirements.txt`. fileciteturn0file5  
- Do **not** introduce 7‑Zip; use **PowerShell `Compress-Archive`** for Windows packaging.

---

## Acceptance Criteria (check all)
- [ ] `app.spec` present at repo root and includes `ui`, `forms`, `templates`.
- [ ] `.github/workflows/build-release.yml` builds for Windows/macOS; artifacts named exactly as specified.
- [ ] Local vendor assets exist and are included in the build.
- [ ] Tag push creates a Release with **both** artifacts attached.
- [ ] `docs/tasks/Task-06_to_10.md` added with commit hash, run URLs, sizes, and SHA256 hashes.

> When complete, stop and wait for explicit approval before any further changes.
