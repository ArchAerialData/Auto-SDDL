# NEW_REPO_GUIDE

## 1) Executive Summary
- A small, local desktop app built with a Python backend (pywebview) and a simple HTML/CSS/JS UI. It has two screens: Form (fill fields and generate XLSX + DOCX) and Edit Forms (edit labels, required flags, options). It runs locally with a self-bootstrapping virtual environment and packages to platform-native binaries.
- Platforms: Windows and macOS. Distribution artifacts: .exe and .dmg.
- Not in scope: any legacy features from prior repos (clients/pilots/email/etc.). Keep scope tight and focused on form-driven generation.

## 2) Repo Layout (copy/paste tree)
```
formgen-app/
├─ app.py                      # pywebview entrypoint (window + js_api)
├─ api.py                      # LocalAPI: form schema + generation endpoints
├─ forms/
│  └─ schema.json              # editable JSON that drives the form fields
├─ ui/
│  ├─ index.html               # cloned visual shell: header + sidebar + 2 tabs
│  ├─ js/
│  │  ├─ api_bridge.js         # minimal bridge to Python API
│  │  ├─ form.js               # logic for "Form" tab
│  │  └─ edit_forms.js         # logic for "Edit Forms" tab
│  └─ static/
│     ├─ css/                  # docker-theme.css, header-theme.css, sidebar-theme.css, utilities.css, card-header-theme.css
│     ├─ images/               # logo(s) used by UI
│     └─ vendor/               # bootstrap, fontawesome (local with CDN fallback)
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
└─ .github/
   └─ workflows/
      └─ build-release.yml     # matrix build: windows exe + mac dmg
```

> Instruction: Base the UI shell on your existing app’s patterns: `app.py` showing `webview.create_window(..., js_api=LocalAPI)` and `webview.start(...)`. Clone the HTML structure and theme includes from your current `index.html` (Bootstrap, FontAwesome, docker/header/sidebar themes, utilities, card-header animation). Keep only two sections and the sidebar with two items. The JS bridge should mirror your `js/api_bridge.js`, reduced to just this app’s endpoints. When a detail is not knowable from the source, mark it `TODO(Owner)`.

## 3) GUI Scaffolding (what to copy and what to delete)
- Keep: header bar, collapsible sidebar, typography, color theme files, and the section switching pattern from the current UI.
- Remove: all legacy sections (reports, pilots, etc.).
- Add:
  - Sidebar items: “Form” and “Edit Forms”.
  - Sections: `#form-section`, `#edit-forms-section` in `index.html`.
  - Buttons: “Generate” (Form), “Save” (Edit Forms), “Open Output Folder”.
- JS bridge: expose only the endpoints listed in Section 6 and wire listeners in `form.js` and `edit_forms.js`.

## 4) Data Model (forms/schema.json)
- A single JSON file drives the UI fields and generation:
```
{
  "title": "Sample Form",
  "version": 1,
  "fields": [
    { "key": "first_name", "label": "First Name", "type": "text", "required": true },
    { "key": "last_name",  "label": "Last Name",  "type": "text", "required": true },
    { "key": "age",        "label": "Age",        "type": "number", "required": false },
    { "key": "status",     "label": "Status",     "type": "select", "options": ["Active","Inactive"], "required": true }
  ]
}
```
- Owners can edit labels, required flags, and select options in the “Edit Forms” tab.
- Add more forms as future work by extending structure to `{ forms: { name: schema } }`. For now, single form suffices.

## 5) Minimal Dependencies
Create `requirements.txt` with only what’s needed:
```
pywebview==4.4.1
openpyxl==3.1.5
python-docx==1.1.2
# Optional (templated DOCX):
# docxtpl==0.16.8
```
- Windows requires Microsoft Edge WebView2 Runtime for pywebview (most systems have it; if not, installer link in Troubleshooting).

## 6) API Endpoints (LocalAPI)
- `get_schema() -> dict`: Return current form schema.
- `save_schema(schema: dict) -> bool`: Persist new schema to `forms/schema.json` (validate shape).
- `generate_xlsx(data: dict, folder: str) -> str`: Append a row to `output.xlsx` (create if missing), return full path.
- `generate_docx(data: dict, folder: str) -> str`: Render `templates/docx_base_template.docx` with fields, return full path. Use python-docx defaults; only use docxtpl if placeholders are present.
- `open_folder(path: str) -> bool`: Open folder in Finder/Explorer using `subprocess`/`os.startfile`.

## 7) Local Development (self-bootstrapping venv)
Provide two scripts and document their behavior.

`scripts/dev.sh`
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

`scripts/dev.ps1`
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

## 8) Packaging (PyInstaller) + Spec File
Use a spec file so data inclusion is identical on both OSes. Include `app.spec` in the repo and call it in CI.

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

Local build commands:
- Windows EXE: `pyinstaller --clean -y app.spec` (the EXE lands under `dist/FormGen/`)
- macOS .app: same spec produces `dist/FormGen.app`; wrap to DMG (see Actions below).

## 9) GitHub Actions (build + release EXE & DMG)
Create `.github/workflows/build-release.yml` with a tag-triggered matrix build:

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

      - name: Install dependencies
        run: |
          python -m pip install -U pip
          pip install -r requirements.txt
          pip install pyinstaller

      - name: Build app with PyInstaller
        run: |
          pyinstaller --clean -y app.spec

      - name: Package artifacts
        shell: bash
        run: |
          if [[ "${{ runner.os }}" == "Windows" ]]; then
            7z a FormGen.zip ./dist/FormGen/
          else
            hdiutil create -volname FormGen -srcfolder ./dist/FormGen.app FormGen.dmg
          fi

      - name: Upload artifact
        uses: actions/upload-artifact@v4
        with:
          name: ${{ runner.os }}-artifact
          path: |
            FormGen.zip
            FormGen.dmg

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
            artifacts/**/FormGen.zip
            artifacts/**/FormGen.dmg
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

Notes:
- Optional signing placeholders (future work):
  - Windows: use `signtool` with `secrets.WIN_CERT_PFX` + `secrets.WIN_CERT_PASSWORD`.
  - macOS: use `codesign` + notarization with Apple ID and app-specific password. Mark as TODO until certs available.

## 10) Minimal Code Blocks (copy/paste)

`app.py`
```python
import json
import os
import webview
from api import LocalAPI


def main():
    api = LocalAPI()
    html_path = os.path.abspath(os.path.join('ui', 'index.html'))
    window = webview.create_window('FormGen', html_path, js_api=api)
    webview.start(gui='edgechromium', http_server=True)


if __name__ == '__main__':
    main()
```

`api.py`
```python
import json
import os
import sys
import subprocess
from datetime import datetime

from openpyxl import Workbook, load_workbook
from docx import Document

SCHEMA_PATH = os.path.join('forms', 'schema.json')
TEMPLATES_DIR = 'templates'


class LocalAPI:
    def get_schema(self):
        with open(SCHEMA_PATH, 'r', encoding='utf-8') as f:
            return json.load(f)

    def save_schema(self, schema):
        if not isinstance(schema, dict) or 'fields' not in schema:
            raise ValueError('Invalid schema: missing fields')
        os.makedirs(os.path.dirname(SCHEMA_PATH), exist_ok=True)
        with open(SCHEMA_PATH, 'w', encoding='utf-8') as f:
            json.dump(schema, f, ensure_ascii=False, indent=2)
        return True

    def generate_xlsx(self, data, folder):
        os.makedirs(folder, exist_ok=True)
        xlsx_path = os.path.join(folder, 'output.xlsx')
        if os.path.exists(xlsx_path):
            wb = load_workbook(xlsx_path)
            ws = wb.active
        else:
            wb = Workbook()
            ws = wb.active
            # header row from keys
            ws.append(list(data.keys()))
        ws.append([data.get(k, '') for k in ws[1]])
        wb.save(xlsx_path)
        return os.path.abspath(xlsx_path)

    def generate_docx(self, data, folder):
        os.makedirs(folder, exist_ok=True)
        docx_path = os.path.join(folder, 'output.docx')
        template = os.path.join(TEMPLATES_DIR, 'docx_base_template.docx')
        if os.path.exists(template):
            # Simple placeholder replacement using python-docx paragraphs
            doc = Document(template)
            for p in doc.paragraphs:
                for k, v in data.items():
                    p.text = p.text.replace(f'{{{{{k}}}}}', str(v))
        else:
            doc = Document()
            doc.add_heading('Form Output', level=1)
            for k, v in data.items():
                doc.add_paragraph(f"{k}: {v}")
        doc.add_paragraph(f"Generated: {datetime.now().isoformat(timespec='seconds')}")
        doc.save(docx_path)
        return os.path.abspath(docx_path)

    def open_folder(self, path):
        if sys.platform.startswith('win'):
            os.startfile(os.path.abspath(path))  # type: ignore[attr-defined]
        elif sys.platform == 'darwin':
            subprocess.call(['open', path])
        else:
            subprocess.call(['xdg-open', path])
        return True
```

`ui/index.html`
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>FormGen</title>
    <!-- Vendor CSS (local first, CDN fallback) -->
    <link rel="stylesheet" href="static/vendor/bootstrap.min.css" onerror="this.onerror=null;this.href='https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css'">
    <link rel="stylesheet" href="static/vendor/fontawesome.min.css">
    <!-- Theme CSS -->
    <link rel="stylesheet" href="static/css/docker-theme.css">
    <link rel="stylesheet" href="static/css/header-theme.css">
    <link rel="stylesheet" href="static/css/sidebar-theme.css">
    <link rel="stylesheet" href="static/css/utilities.css">
    <link rel="stylesheet" href="static/css/card-header-theme.css">
  </head>
  <body>
    <header class="p-2 border-bottom d-flex align-items-center">
      <img src="static/images/logo.png" alt="Logo" height="28" onerror="this.style.display='none'">
      <h1 class="h5 ms-2 mb-0">FormGen</h1>
    </header>
    <div class="d-flex" style="height: calc(100vh - 48px);">
      <nav id="sidebar" class="border-end p-2" style="width: 220px;">
        <ul class="nav flex-column">
          <li class="nav-item"><a class="nav-link active" href="#" data-target="form-section">Form</a></li>
          <li class="nav-item"><a class="nav-link" href="#" data-target="edit-forms-section">Edit Forms</a></li>
        </ul>
      </nav>
      <main class="flex-fill p-3 overflow-auto">
        <section id="form-section">
          <div class="card">
            <div class="card-header">Fill Form</div>
            <div class="card-body">
              <form id="dynamic-form" class="vstack gap-2"></form>
              <div class="d-flex gap-2 mt-3">
                <input type="text" id="output-folder" class="form-control" placeholder="Output folder (optional)" />
                <button id="btn-generate" class="btn btn-primary">Generate</button>
                <button id="btn-open-folder" class="btn btn-outline-secondary">Open Output Folder</button>
              </div>
            </div>
          </div>
        </section>
        <section id="edit-forms-section" hidden>
          <div class="card">
            <div class="card-header">Edit Form Schema</div>
            <div class="card-body">
              <textarea id="schema-editor" class="form-control" rows="16" spellcheck="false"></textarea>
              <div class="d-flex gap-2 mt-3">
                <button id="btn-save-schema" class="btn btn-success">Save</button>
                <button id="btn-revert-schema" class="btn btn-outline-secondary">Revert</button>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>

    <script src="js/api_bridge.js"></script>
    <script src="js/form.js"></script>
    <script src="js/edit_forms.js"></script>
  </body>
  </html>
```

`ui/js/api_bridge.js`
```javascript
(function () {
  function hasPywebview() {
    return typeof window.pywebview !== 'undefined' && window.pywebview.api;
  }

  async function call(name, ...args) {
    if (hasPywebview()) {
      return await window.pywebview.api[name](...args);
    }
    // Dev fallback (serve via http_server=True): POST to /api if you wire one
    throw new Error('API bridge not available');
  }

  window.API = {
    get_schema: () => call('get_schema'),
    save_schema: (schema) => call('save_schema', schema),
    generate_xlsx: (data, folder) => call('generate_xlsx', data, folder || ''),
    generate_docx: (data, folder) => call('generate_docx', data, folder || ''),
    open_folder: (folder) => call('open_folder', folder)
  };

  document.addEventListener('pywebviewready', () => {
    console.log('pywebview ready');
  });
})();
```

`ui/js/form.js`
```javascript
(function () {
  const formEl = document.getElementById('dynamic-form');
  const outputEl = document.getElementById('output-folder');
  const btnGen = document.getElementById('btn-generate');
  const btnOpen = document.getElementById('btn-open-folder');

  function switchTo(id) {
    for (const sec of document.querySelectorAll('main > section')) {
      sec.hidden = sec.id !== id;
    }
    for (const a of document.querySelectorAll('#sidebar a')) {
      a.classList.toggle('active', a.dataset.target === id);
    }
  }

  document.querySelectorAll('#sidebar a').forEach(a => {
    a.addEventListener('click', (e) => { e.preventDefault(); switchTo(a.dataset.target); });
  });

  function renderField(f) {
    const wrapper = document.createElement('div');
    wrapper.className = 'vstack gap-1';
    const label = document.createElement('label');
    label.textContent = f.label + (f.required ? ' *' : '');
    label.htmlFor = f.key;
    let input;
    if (f.type === 'select') {
      input = document.createElement('select');
      (f.options || []).forEach(opt => {
        const o = document.createElement('option');
        o.value = o.textContent = opt;
        input.appendChild(o);
      });
    } else {
      input = document.createElement('input');
      input.type = f.type || 'text';
    }
    input.id = f.key;
    input.required = !!f.required;
    input.className = 'form-control';
    wrapper.appendChild(label);
    wrapper.appendChild(input);
    return wrapper;
  }

  async function loadSchema() {
    const schema = await window.API.get_schema();
    formEl.innerHTML = '';
    (schema.fields || []).forEach(f => formEl.appendChild(renderField(f)));
  }

  btnGen.addEventListener('click', async (e) => {
    e.preventDefault();
    const data = {};
    formEl.querySelectorAll('input,select,textarea').forEach(el => {
      data[el.id] = el.value;
    });
    const folder = outputEl.value || '';
    const x = await window.API.generate_xlsx(data, folder);
    const d = await window.API.generate_docx(data, folder);
    alert(`Generated:\n${x}\n${d}`);
  });

  btnOpen.addEventListener('click', async (e) => {
    e.preventDefault();
    const folder = outputEl.value || '.';
    await window.API.open_folder(folder);
  });

  loadSchema();
})();
```

`ui/js/edit_forms.js`
```javascript
(function () {
  const editor = document.getElementById('schema-editor');
  const btnSave = document.getElementById('btn-save-schema');
  const btnRevert = document.getElementById('btn-revert-schema');

  async function load() {
    const schema = await window.API.get_schema();
    editor.value = JSON.stringify(schema, null, 2);
  }

  btnSave.addEventListener('click', async (e) => {
    e.preventDefault();
    try {
      const schema = JSON.parse(editor.value);
      await window.API.save_schema(schema);
      alert('Saved');
    } catch (err) {
      alert('Invalid JSON: ' + err);
    }
  });

  btnRevert.addEventListener('click', (e) => { e.preventDefault(); load(); });
  load();
})();
```

## 11) End-to-End Smoke Test
- Edit `forms/schema.json` and add a field.
- Run `scripts/dev.sh` or `scripts/dev.ps1` and confirm the UI shows the new field.
- Fill the form, pick an output folder (optional), click Generate.
- Verify `output.xlsx` (row appended) and `output.docx` (fields rendered).
- Click “Open Output Folder” to open the folder in Finder/Explorer.

## 12) Troubleshooting & Edge Cases
- Windows blank window: install WebView2 Runtime (https://developer.microsoft.com/en-us/microsoft-edge/webview2/).
- Bundled static assets missing: verify `app.spec` `datas` entries and relative paths.
- DOCX template issues: python-docx writes plain text by default; only enable docxtpl if you add Jinja-like placeholders.
- Antivirus false positives: prefer signed installers in future.
- Apple notarization: document Apple ID and app-specific password (future work).

## 13) Roadmap (Optional)
- Multiple form packs (per client) via `{ forms: { name: schema } }`.
- Built-in WebView2 bootstrap step for Windows.
- Signed MSI + signed DMG.
- Auto-update channel.

## 14) License & Attribution
- Confirm license for any copied UI assets and icons.
- Include third-party licenses for Bootstrap/FontAwesome.

---

## Appendix A: .gitignore (starter)
```
.venv/
dist/
build/
__pycache__/
*.spec
*.log
*.zip
*.dmg
*.exe
```

## Appendix B: README (starter)
```
# FormGen

Local desktop app (pywebview) for filling a form and generating XLSX + DOCX. Includes packaging via GitHub Actions for Windows (.exe) and macOS (.dmg).

## Quickstart
scripts/dev.ps1   # Windows
scripts/dev.sh    # macOS/Linux

## Build Locally
pyinstaller --clean -y app.spec

## License
TODO(Owner)
```

