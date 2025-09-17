Got it, Doug. Below is a **single, drop‑in “master prompt”** you can paste into CODEX‑GPT‑5. It tells it exactly what to deliver: **one comprehensive Markdown guide** that shows how to stand up your new repo, reuse the current app’s GUI scaffolding, add the two tabs (“Form” and “Edit Forms”), wire a minimal Python API, and ship **EXE + DMG via GitHub Actions**—with local venv bootstrapping and cross‑platform notes.

Where I reference concrete bits of the current app (to anchor the look & architecture you want cloned), I’m basing that on your provided files:
- **pywebview entry and window wiring** in `app.py` (title, `js_api`, `webview.start`, etc.). fileciteturn0file0  
- **HTML shell + CSS/JS theme includes + sidebar/nav structure** in `index.html`. fileciteturn0file1  
- **JS bridge pattern for talking UI → Python (`window.pywebview.api`)** in `js/api_bridge.js`. fileciteturn0file2

---

## MASTER PROMPT FOR CODEX‑GPT‑5
**Goal:** Produce **one** Markdown file named `NEW_REPO_GUIDE.md` that I can drop into a fresh repo. The guide must be **complete, actionable, and copy‑paste friendly** for an engineer to:  
1) scaffold a new app that **reuses the visual look** of our existing GUI, but with only **two sidebar tabs**;  
2) implement **form‑driven XLSX + DOCX generation**;  
3) package to **Windows .exe** and **macOS .dmg** via **GitHub Actions**;  
4) support local dev with a **self‑bootstrapping venv**;  
5) keep cross‑platform edge cases and future signing/notarization in mind.

You (CODEX‑GPT‑5) have full read access to the source repo of the current app. Use it to **clone the look/structure** without pulling in unrelated business logic. When a detail isn’t knowable from the repo, **do not guess**—mark it with `TODO(Owner)` and proceed.

### Deliverable
Create **one** file at the repo root: `NEW_REPO_GUIDE.md`. Structure it exactly as follows:

---

### 1) Executive Summary
- One paragraph on **what this app is**: a small, local desktop app (pywebview shell) with two screens:  
  **Form** (fill fields → generate XLSX + DOCX) and **Edit Forms** (edit labels, required flags, options).  
- Platforms: Win + mac. Distribution artifacts: **.exe** and **.dmg**.  
- Not in scope: any of the legacy feature sets from the old repo (clients/pilots/email/etc).

### 2) Repo Layout (copy/paste tree)
Provide a ready‑to‑use directory tree for the new project, for example:

```
formgen-app/
├─ app.py                      # pywebview entrypoint (window + js_api)
├─ api.py                      # LocalAPI: form schema + generation endpoints
├─ forms/
│  └─ schema.json              # editable JSON that drives the form fields
├─ ui/
│  ├─ index.html               # cloned visual shell: header + sidebar + 2 tabs
│  ├─ js/
│  │  ├─ api_bridge.js         # minimal bridge (adapted from source)
│  │  ├─ form.js               # logic for “Form” tab
│  │  └─ edit_forms.js         # logic for “Edit Forms” tab
│  ├─ static/
│  │  ├─ css/                  # docker-theme.css, header-theme.css, sidebar-theme.css, utilities.css, card-header-theme.css
│  │  ├─ images/               # logo(s) used by UI
│  │  └─ vendor/               # bootstrap, fontawesome (local with CDN fallback)
├─ templates/
│  └─ docx_base_template.docx  # sample DOCX template (placeholder tags)
├─ requirements.txt
├─ README.md
├─ LICENSE
├─ .gitignore
├─ .gitattributes
├─ scripts/
│  ├─ dev.sh                   # create venv, install deps, run app (mac/linux)
│  └─ dev.ps1                  # create venv, install deps, run app (windows)
├─ .github/
│  └─ workflows/
│     └─ build-release.yml     # matrix build: windows exe + mac dm g
```

> **Instruction:** Base the UI shell on the existing app’s patterns: `app.py` showing `webview.create_window(..., js_api=LocalAPI)` and `webview.start(...)` (this is in the current code). Clone the HTML structure and theme includes from `index.html` (Bootstrap, FA, docker/header/sidebar themes, utilities, card-header animation). **Keep only two sections** and the sidebar with two items. The JS bridge should mirror the shape in `js/api_bridge.js`, but be **reduced to this app’s endpoints only**. fileciteturn0file0 fileciteturn0file1 fileciteturn0file2

### 3) GUI Scaffolding (what to copy and what to delete)
- **Keep**: the header bar, collapsible sidebar, typography, color theme files, and the section switching pattern from the current UI.  
- **Remove**: all legacy sections (reports, pilots, etc).  
- **Add**:  
  - **Sidebar items**: “Form” and “Edit Forms”.  
  - **Sections**: `#form-section`, `#edit-forms-section`.  
- **Index HTML**: Include Bootstrap + FontAwesome with **local vendor paths plus CDN fallback**, same pattern as source `index.html`. Keep sidebar toggle behavior, card header styles, and the “content-section active” class switching idiom. Cite refs to the copied CSS files.  
- **JS**:  
  - `ui/js/api_bridge.js`: expose only `get_form_schema`, `save_form_schema`, `generate_outputs`, `choose_folder`, `reveal_path`. Use the same `window.pywebview.api` detection and `pywebviewready` event pattern from the source bridge.  
  - `ui/js/form.js`: render form inputs from `schema.json`, collect values, call `Api.generate_outputs(...)`, show progress/status, and enable “Open output folder”.  
  - `ui/js/edit_forms.js`: load schema, allow editing label, `required`, `type` (`text`, `number`, `date`, `select`, etc.), `options` (for selects), then `Api.save_form_schema(...)`.

(Anchor points: current **HTML shell + assets include order** and **bridge pattern**: see `index.html` and `js/api_bridge.js` in the source app. fileciteturn0file1 fileciteturn0file2)

### 4) Python Side: Minimal LocalAPI (pywebview)
Document the following implementation (code blocks included in the guide):
- `app.py`: creates the window and attaches `LocalAPI`, mirroring the entry pattern in the current app (title, size, `js_api=api`, `webview.start(debug=...)`). fileciteturn0file0  
- `api.py` with class `LocalAPI` implementing:
  - `get_form_schema()` → read `forms/schema.json`.
  - `save_form_schema(payload)` → validate and write `schema.json`.
  - `choose_folder()` → OS dialog via pywebview.
  - `generate_outputs(form_data, out_dir)` → generates:
    - **XLSX** via `openpyxl` (one row per submission, headers from schema).
    - **DOCX** via **python-docx** (stable) or **docxtpl** if a template is provided. Provide both options; default to python‑docx.
  - `reveal_path(path)` → open folder in OS file explorer.
- Include error handling patterns and JSON-safe return values.

### 5) Form Schema Contract
Define `forms/schema.json` with a small, durable schema:

```json
{
  "title": "FormGen",
  "version": 1,
  "fields": [
    {"id":"site_name","label":"Site Name","type":"text","required":true},
    {"id":"inspection_date","label":"Inspection Date","type":"date","required":true},
    {"id":"inspector","label":"Inspector","type":"text","required":true},
    {"id":"priority","label":"Priority","type":"select","required":false,"options":["Low","Medium","High"]},
    {"id":"notes","label":"Notes","type":"textarea","required":false}
  ]
}
```

Explain how the UI should map each `type` to an input control and how required flags are enforced. Include **validation rules** and **extensibility** notes.

### 6) Requirements & Cross‑Platform Notes
Pin versions known to play nicely with PyInstaller on both OSes (use Python 3.10–3.12). Example `requirements.txt`:

```
pywebview==4.4.1
python-docx==1.1.2
openpyxl==3.1.5
# optional templating path:
docxtpl==0.16.7
# packaging
pyinstaller==6.10.0
```

- **Windows**: pywebview uses **WebView2**. Note in the guide that end‑user machines may need the WebView2 Runtime. Provide a section: *“If UI is blank on Windows, install WebView2 Runtime (Evergreen).”*  
- **macOS**: uses built‑in WebKit; fewer runtime surprises.  
- Use only file‑system safe APIs (`pathlib`, UTF‑8) and avoid platform‑specific shell tricks.

### 7) Local Development (self‑bootstrapping venv)
Provide **two scripts** and document their behavior:

**`scripts/dev.sh`**
```bash
#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
: "${PY:=python3}"
if [ ! -d .venv ]; then $PY -m venv .venv; fi
source .venv/bin/activate
pip install -U pip
pip install -r requirements.txt
$PY app.py
```

**`scripts/dev.ps1`**
```powershell
Set-StrictMode -Version Latest
$PSScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location (Join-Path $PSScriptRoot "..")
if (-not (Test-Path ".venv")) { py -m venv .venv }
. .\.venv\Scripts\Activate.ps1
python -m pip install -U pip
python -m pip install -r requirements.txt
python app.py
```

### 8) Packaging (PyInstaller) + Spec File
Use a **spec file** so data inclusion is identical on both OSes. Include `app.spec` in the guide:

```python
# app.spec
from PyInstaller.utils.hooks import collect_data_files
datas = [
    ('ui/index.html', 'ui'),
    ('ui/static', 'ui/static'),
    ('ui/js', 'ui/js'),
    ('forms/schema.json', 'forms'),
    ('templates', 'templates'),
]

block_cipher = None
a = Analysis(
    ['app.py'],
    pathex=[],
    binaries=[],
    datas=datas,
    hiddenimports=[],
    noarchive=False
)
pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)
exe = EXE(pyz, a.scripts, a.binaries, a.zipfiles, a.datas,
          name='FormGen',
          console=False)
app = BUNDLE(exe, name='FormGen.app', icon=None)  # macOS target
```

Document **two local build commands**:
- Windows EXE: `pyinstaller --clean -y app.spec` (the EXE lands under `dist/FormGen/`)  
- macOS .app: same spec produces `dist/FormGen.app`; wrap to DMG (see Actions below).

### 9) GitHub Actions (build + release EXE & DMG)
Provide **one matrix workflow** `build-release.yml` that:
- Triggers on tags like `v*`.
- Builds on `windows-latest` and `macos-latest`.
- Sets up Python, installs deps, runs `pyinstaller` with the spec file.
- **Windows job**: upload `FormGen.zip` (zip the dist folder) as a release asset.  
- **macOS job**: create DMG (use `hdiutil create` or `create-dmg`), upload as a release asset.  
- Uses `actions/upload-artifact` during build and `softprops/action-gh-release` (or similar) on tag push.
- Clearly mark **optional code‑signing** (Windows `signtool`, macOS `codesign` + notarization) as **future work** with placeholders for secrets.

Include a full YAML example with steps, cache, and artifact names.

### 10) Minimal Code Blocks (copy/paste)
Provide short, working skeletons for:
- `app.py` (pywebview window + LocalAPI attachment) modeled on the current file where `webview.create_window(..., js_api=api)` and `webview.start(...)` are used. fileciteturn0file0  
- `api.py` (class `LocalAPI` with the 5 endpoints described).  
- `ui/index.html` (header, sidebar with exactly two items, CDN fallback tags, and section switching—modeled on the current `index.html` patterns). fileciteturn0file1  
- `ui/js/api_bridge.js` (bridge pattern with `pywebviewready` and fetch fallback, trimmed to this app’s endpoints—modeled on the current file). fileciteturn0file2

### 11) End‑to‑End Smoke Test
- Edit `forms/schema.json` → add a field.  
- Run `scripts/dev.*` → confirm the UI shows the new field.  
- Fill the form → pick an output folder → click **Generate**.  
- Verify `output.xlsx` (row appended) and `output.docx` (fields merged).  
- Open the folder via **Open in Finder/Explorer** button.

### 12) Troubleshooting & Edge Cases
- **Windows blank window** → install WebView2 Runtime.  
- **Bundled static assets missing** → verify spec file `datas` entries and relative paths.  
- **DOCX template issues** → use python‑docx default rendering; only enable docxtpl if a template exists.  
- **Antivirus false positives** → distribute via signed installers in the future.  
- **Apple notarization** → document required Apple ID and app‑specific password (future work).

### 13) Roadmap (Optional)
- Multi‑form packs (per client).  
- Built‑in WebView2 bootstrap step for Windows.  
- Signed MSI + signed DMG.  
- Auto‑update channel.

### 14) License & Attribution
- Clarify license for copied UI assets and icons.  
- Ensure third‑party licenses for Bootstrap/FontAwesome are included.

---

### Output Requirements
- The **entire guide** must be **self‑contained**: someone new can follow it to the letter and succeed.  
- Prefer **task checklists / TODO blocks** and **code fences** over prose.  
- When you reference the source app, call out **exact files** and **what to copy** (HTML structure, CSS includes, bridge pattern) **without** dragging in old features. Base those references on the current code: `app.py`, `index.html`, and `js/api_bridge.js`. fileciteturn0file0 fileciteturn0file1 fileciteturn0file2  
- Use section headers exactly as specified above.  
- Use **bold** warnings where a step is platform‑specific.