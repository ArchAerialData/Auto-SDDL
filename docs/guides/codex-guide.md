# CODEX Guide — FormGen App (Refactored)

> Path: `docs/guides/codex-guide.md`  
> Purpose: Single, actionable guide to scaffold a **two‑tab** pywebview app and ship **.exe + .dmg** via GitHub Actions. This version **implements the “cleanest refactor”** discussed: PowerShell `Compress-Archive` on Windows, `hdiutil` on macOS, OS‑specific artifact names, and platform‑safe pywebview startup.

---

## 1) Executive Summary
A small, local desktop app (Python + pywebview, HTML/CSS/JS UI) with two screens:  
- **Form**: end‑user fills fields → generates **XLSX + DOCX**.  
- **Edit Forms**: maintain the form schema (labels, required flags, types/options).

Targets **Windows** and **macOS**. CI builds **.exe** and **.dmg**. Self‑bootstrapping venv for local dev. Legacy features from other repos are out of scope.

## 2) Repo Layout (copy/paste)
```
formgen-app/
├─ app.py                      # pywebview entrypoint (window + js_api)
├─ api.py                      # LocalAPI: form schema + generation endpoints
├─ forms/
│  └─ schema.json              # editable JSON that drives the form fields
├─ ui/
│  ├─ index.html               # header + sidebar + two tabs
│  ├─ js/
│  │  ├─ api_bridge.js         # minimal bridge to Python API
│  │  ├─ form.js               # logic for “Form” tab
│  │  └─ edit_forms.js         # logic for “Edit Forms” tab
│  └─ static/
│     ├─ css/                  # docker-theme.css, header-theme.css, sidebar-theme.css, utilities.css, card-header-theme.css
│     ├─ images/               # logo(s)
│     └─ vendor/               # bootstrap, fontawesome (local with CDN fallback)
├─ templates/
│  └─ docx_base_template.docx  # sample DOCX template (optional placeholders {{field}})
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
      └─ build-release.yml     # matrix build: windows exe + mac dmg (refactored)
```

> **UI cloning note:** Mirror the existing app’s HTML shell (header + sidebar) and the JS bridge pattern, but include **only two sections** and the corresponding sidebar items.

## 3) GUI Scaffolding — What to keep, drop, add
**Keep:** header bar, collapsible sidebar, theme CSS, and the “active section” switching pattern.  
**Drop:** legacy sections/features not related to a two‑tab schema‑driven form generator.  
**Add:** sidebar items `Form` and `Edit Forms`, with sections `#form-section` and `#edit-forms-section`. Buttons: **Generate**, **Save**, **Open Output Folder**.

## 4) Form Schema (forms/schema.json)
A minimal, durable schema example:
```json
{
  "title": "FormGen",
  "version": 1,
  "fields": [
    { "key": "site_name", "label": "Site Name", "type": "text", "required": true },
    { "key": "inspection_date", "label": "Inspection Date", "type": "date", "required": true },
    { "key": "inspector", "label": "Inspector", "type": "text", "required": true },
    { "key": "priority", "label": "Priority", "type": "select", "options": ["Low", "Medium", "High"], "required": false },
    { "key": "notes", "label": "Notes", "type": "textarea", "required": false }
  ]
}
```
UI maps `type` → control: `text|number|date|textarea|select` (+ `options` for selects). Enforce `required` before generating.

## 5) Requirements (pin for PyInstaller stability)
```
pywebview==4.4.1
openpyxl==3.1.5
python-docx==1.1.2
# optional template path:
# docxtpl==0.16.8
pyinstaller==6.10.0
```
- **Windows:** pywebview uses **WebView2** (install Evergreen runtime if the window is blank).  
- **macOS:** uses built‑in WebKit.  
- Use Python **3.10–3.12**.

## 6) Python — Minimal LocalAPI (pywebview)
`app.py`
```python
import os
import webview
from api import LocalAPI

def main():
    api = LocalAPI()
    html_path = os.path.abspath(os.path.join('ui', 'index.html'))
    window = webview.create_window('FormGen', html_path, js_api=api)
    # NOTE: do not force a GUI backend (e.g., edgechromium); keep portable.
    webview.start(http_server=True)

if __name__ == '__main__':
    main()
```

`api.py`
```python
import json, os, sys, subprocess
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
        os.makedirs(folder or '.', exist_ok=True)
        xlsx_path = os.path.join(folder or '.', 'output.xlsx')
        if os.path.exists(xlsx_path):
            wb = load_workbook(xlsx_path); ws = wb.active
        else:
            wb = Workbook(); ws = wb.active; ws.append(list(data.keys()))
        ws.append([data.get(k, '') for k in ws[1]])
        wb.save(xlsx_path)
        return os.path.abspath(xlsx_path)

    def generate_docx(self, data, folder):
        os.makedirs(folder or '.', exist_ok=True)
        docx_path = os.path.join(folder or '.', 'output.docx')
        template = os.path.join(TEMPLATES_DIR, 'docx_base_template.docx')
        if os.path.exists(template):
            doc = Document(template)
            for p in doc.paragraphs:
                for k, v in data.items():
                    p.text = p.text.replace(f'{{{{{k}}}}}', str(v))
        else:
            doc = Document(); doc.add_heading('Form Output', level=1)
            for k, v in data.items(): doc.add_paragraph(f"{k}: {v}")
        doc.add_paragraph(f"Generated: {datetime.now().isoformat(timespec='seconds')}")
        doc.save(docx_path)
        return os.path.abspath(docx_path)

    def open_folder(self, path):
        path = os.path.abspath(path or '.')
        if sys.platform.startswith('win'):
            os.startfile(path)  # type: ignore[attr-defined]
        elif sys.platform == 'darwin':
            subprocess.call(['open', path])
        else:
            subprocess.call(['xdg-open', path])
        return True
```

## 7) UI — Shell + Bridge (two tabs)
`ui/index.html` (skeleton)
```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>FormGen</title>
  <!-- Local first, CDN fallback -->
  <link rel="stylesheet" href="static/vendor/bootstrap.min.css"
        onerror="this.onerror=null;this.href='https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css'">
  <link rel="stylesheet" href="static/vendor/fontawesome.min.css">
  <link rel="stylesheet" href="static/css/docker-theme.css">
  <link rel="stylesheet" href="static/css/header-theme.css">
  <link rel="stylesheet" href="static/css/sidebar-theme.css">
  <link rel="stylesheet" href="static/css/utilities.css">
  <link rel="stylesheet" href="static/css/card-header-theme.css">
</head>
<body>
  <header class="p-2 border-bottom d-flex align-items-center">
    <img src="static/images/logo.png" alt="" height="28" onerror="this.style.display='none'">
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
              <input type="text" id="output-folder" class="form-control" placeholder="Output folder (optional)">
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
  function hasPywebview() { return typeof window.pywebview !== 'undefined' && window.pywebview.api; }
  async function call(name, ...args) {
    if (hasPywebview()) return await window.pywebview.api[name](...args);
    throw new Error('API bridge not available');
  }
  window.API = {
    get_schema: () => call('get_schema'),
    save_schema: (schema) => call('save_schema', schema),
    generate_xlsx: (data, folder) => call('generate_xlsx', data, folder || ''),
    generate_docx: (data, folder) => call('generate_docx', data, folder || ''),
    open_folder: (folder) => call('open_folder', folder)
  };
  document.addEventListener('pywebviewready', () => console.log('pywebview ready'));
})();
```

`ui/js/form.js`
```javascript
(function () {
  const formEl = document.getElementById('dynamic-form');
  const outputEl = document.getElementById('output-folder');
  const btnGen = document.getElementById('btn-generate');
  const btnOpen = document.getElementById('btn-open-folder');

  // Simple sidebar switching
  document.querySelectorAll('#sidebar a').forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault();
      const id = a.dataset.target;
      document.querySelectorAll('main > section').forEach(sec => sec.hidden = sec.id !== id);
      document.querySelectorAll('#sidebar a').forEach(x => x.classList.toggle('active', x === a));
    });
  });

  function renderField(f) {
    const wrap = document.createElement('div'); wrap.className = 'vstack gap-1';
    const label = document.createElement('label');
    label.textContent = f.label + (f.required ? ' *' : '');
    label.htmlFor = f.key;
    let input;
    if (f.type === 'select') {
      input = document.createElement('select');
      (f.options || []).forEach(opt => { const o = document.createElement('option'); o.value = o.textContent = opt; input.appendChild(o); });
    } else if (f.type === 'textarea') {
      input = document.createElement('textarea'); input.rows = 3;
    } else {
      input = document.createElement('input'); input.type = f.type || 'text';
    }
    input.id = f.key; input.required = !!f.required; input.className = 'form-control';
    wrap.appendChild(label); wrap.appendChild(input);
    return wrap;
  }

  async function loadSchema() {
    const schema = await window.API.get_schema();
    formEl.innerHTML = '';
    (schema.fields || []).forEach(f => formEl.appendChild(renderField(f)));
  }

  btnGen.addEventListener('click', async (e) => {
    e.preventDefault();
    const data = {};
    formEl.querySelectorAll('input,select,textarea').forEach(el => { data[el.id] = el.value; });
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

## 8) Local Development (self‑bootstrapping venv)
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

## 9) Packaging — PyInstaller + Spec
`app.spec`
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

Local builds:  
- **Windows**: `pyinstaller --clean -y app.spec` → `dist/FormGen/FormGen.exe`  
- **macOS**: same → `dist/FormGen.app`

## 10) GitHub Actions — **Refactored** matrix (.exe + .dmg)
Create `.github/workflows/build-release.yml`:

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

**Why this is cleaner**
- No external 7‑Zip dependency.  
- Clear, OS‑specific artifact names → simpler release globs.  
- macOS uses native `hdiutil` (no `brew install create-dmg`).

## 11) Smoke Test
1. Edit `forms/schema.json` → add a field.  
2. Run `scripts/dev.*` → confirm UI shows the field.  
3. Fill the form → **Generate** → verify `output.xlsx` and `output.docx`.  
4. **Open Output Folder** → ensure it opens in Finder/Explorer.  

## 12) Troubleshooting
- **Blank window on Windows** → install WebView2 Runtime (Evergreen).  
- **Missing assets in build** → check `app.spec` `datas` list.  
- **DOCX template issues** → start with plain python‑docx; enable templating later.  
- **AV false positives** → plan for signed installers.  
- **Apple notarization** → future: `codesign` + notarization with secrets.

## 13) Roadmap (Optional)
- Multiple forms / profiles.  
- WebView2 bootstrap installer step on Windows.  
- Code signing (Windows) & notarization (macOS).  
- Auto‑update channel.

## Appendix: .gitignore (starter)
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

---

**Hand‑off note:** Follow with the companion prompt file at `docs/prompts/prompt.md` for agent instructions.
