# NEW_REPO_GUIDE.md

## 1) Executive Summary

This guide creates a small, local desktop app using pywebview with two screens: **Form** (fill fields → generate XLSX + DOCX) and **Edit Forms** (edit labels, required flags, options). The app targets Windows and macOS, distributing as **.exe** and **.dmg** respectively. Legacy features from the original repo (clients/pilots/email/etc) are intentionally excluded to maintain simplicity.

## 2) Repo Layout

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
│  │  ├─ form.js               # logic for "Form" tab
│  │  └─ edit_forms.js         # logic for "Edit Forms" tab
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
│     └─ build-release.yml     # matrix build: windows exe + mac dmg
```

## 3) GUI Scaffolding (what to copy and what to delete)

**Keep**:
- Header bar with app title and branding
- Collapsible sidebar with toggle button
- Typography and color theme files (docker-theme.css, header-theme.css, sidebar-theme.css, utilities.css, card-header-theme.css)
- Section switching pattern using `.content-section.active` class
- Bootstrap + FontAwesome includes with local vendor paths plus CDN fallback

**Remove**:
- All legacy sections (dashboard, reports, no-hits, client-management, pilot-directory, email-distribution, notes-map)
- Complex navigation groups and submenus
- Business logic related to aerial patrol operations

**Add**:
- **Sidebar items**: "Form" and "Edit Forms" only
- **Sections**: `#form-section`, `#edit-forms-section`

**Index HTML Structure**: Copy the Bootstrap + FontAwesome loading pattern, sidebar toggle behavior, and card header styles from the source. Use the same `window.pywebview.api` detection and `pywebviewready` event pattern.

**JS Bridge**: Expose only form-related endpoints: `get_form_schema`, `save_form_schema`, `generate_outputs`, `choose_folder`, `reveal_path`.

## 4) Python Side: Minimal LocalAPI (pywebview)

### app.py
```python
import os
from pathlib import Path
import logging
import webview
from api import LocalAPI

def create_window():
    base = Path(__file__).parent
    index_html = str((base / 'ui' / 'index.html').resolve())

    # Expose the Python API to JS
    api = LocalAPI()

    window = webview.create_window(
        title='FormGen - Local Form Generator',
        url=index_html,
        js_api=api,
        width=1200,
        height=800,
        resizable=True
    )

    # Allow API access to the window for dialogs
    api._attach_window(window)

    return window

def main():
    logging.basicConfig(level=logging.INFO)
    window = create_window()
    webview.start(debug=False)

if __name__ == '__main__':
    main()
```

### api.py
```python
import json
import os
from pathlib import Path
import webview
from openpyxl import Workbook
from docx import Document
import datetime

class LocalAPI:
    def __init__(self):
        self.window = None
        self.base_path = Path(__file__).parent
        self.forms_path = self.base_path / 'forms'
        self.templates_path = self.base_path / 'templates'

    def _attach_window(self, window):
        """Called by app.py to provide window reference for dialogs"""
        self.window = window

    def get_form_schema(self):
        """Read and return the current form schema"""
        try:
            schema_file = self.forms_path / 'schema.json'
            if schema_file.exists():
                with open(schema_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            else:
                # Return default schema if file doesn't exist
                return {
                    "title": "FormGen",
                    "version": 1,
                    "fields": []
                }
        except Exception as e:
            return {"error": f"Failed to load schema: {str(e)}"}

    def save_form_schema(self, payload):
        """Save form schema to JSON file"""
        try:
            # Ensure forms directory exists
            self.forms_path.mkdir(exist_ok=True)

            # Basic validation
            if not isinstance(payload, dict) or 'fields' not in payload:
                return {"error": "Invalid schema format"}

            schema_file = self.forms_path / 'schema.json'
            with open(schema_file, 'w', encoding='utf-8') as f:
                json.dump(payload, f, indent=2, ensure_ascii=False)

            return {"success": True, "message": "Schema saved successfully"}
        except Exception as e:
            return {"error": f"Failed to save schema: {str(e)}"}

    def choose_folder(self):
        """Open OS dialog to choose output folder"""
        try:
            result = self.window.create_file_dialog(webview.FOLDER_DIALOG)
            if result and len(result) > 0:
                return {"success": True, "path": result[0]}
            return {"success": False, "message": "No folder selected"}
        except Exception as e:
            return {"error": f"Failed to open folder dialog: {str(e)}"}

    def generate_outputs(self, form_data, out_dir):
        """Generate XLSX and DOCX files from form data"""
        try:
            if not form_data or not out_dir:
                return {"error": "Form data and output directory required"}

            out_path = Path(out_dir)
            if not out_path.exists():
                return {"error": "Output directory does not exist"}

            timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")

            # Generate XLSX
            xlsx_path = out_path / f"form_output_{timestamp}.xlsx"
            wb = Workbook()
            ws = wb.active
            ws.title = "Form Data"

            # Headers
            headers = []
            values = []
            for field_id, value in form_data.items():
                headers.append(field_id.replace('_', ' ').title())
                values.append(str(value) if value is not None else '')

            ws.append(headers)
            ws.append(values)
            wb.save(xlsx_path)

            # Generate DOCX
            docx_path = out_path / f"form_output_{timestamp}.docx"
            doc = Document()
            doc.add_heading('Form Submission', 0)
            doc.add_paragraph(f'Generated: {datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")}')

            for field_id, value in form_data.items():
                doc.add_heading(field_id.replace('_', ' ').title(), level=1)
                doc.add_paragraph(str(value) if value is not None else 'N/A')

            doc.save(docx_path)

            return {
                "success": True,
                "files": [str(xlsx_path), str(docx_path)],
                "message": f"Generated files in {out_dir}"
            }

        except Exception as e:
            return {"error": f"Failed to generate outputs: {str(e)}"}

    def reveal_path(self, path):
        """Open folder in OS file explorer"""
        try:
            import subprocess
            import platform

            if platform.system() == "Windows":
                subprocess.run(["explorer", path])
            elif platform.system() == "Darwin":  # macOS
                subprocess.run(["open", path])
            else:  # Linux
                subprocess.run(["xdg-open", path])

            return {"success": True, "message": f"Opened {path}"}
        except Exception as e:
            return {"error": f"Failed to open path: {str(e)}"}
```

## 5) Form Schema Contract

The `forms/schema.json` file defines the form structure:

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

**Field Types:**
- `text`: Single line text input
- `textarea`: Multi-line text input
- `number`: Numeric input
- `date`: Date picker
- `select`: Dropdown with predefined options

**Validation**: Required fields must be filled before form submission. The UI should highlight missing required fields.

**Extensibility**: Additional field types can be added by extending the schema and updating the form rendering logic.

## 6) Requirements & Cross-Platform Notes

### requirements.txt
```
pywebview==4.4.1
python-docx==1.1.2
openpyxl==3.1.5
# optional templating path:
docxtpl==0.16.7
# packaging
pyinstaller==6.10.0
```

**Platform Notes:**
- **Windows**: Uses WebView2. If UI appears blank, install WebView2 Runtime (Evergreen) from Microsoft.
- **macOS**: Uses built-in WebKit with fewer runtime dependencies.
- Use Python 3.10-3.12 for best PyInstaller compatibility.
- Stick to filesystem-safe APIs (`pathlib`, UTF-8 encoding).

## 7) Local Development (self-bootstrapping venv)

### scripts/dev.sh
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

### scripts/dev.ps1
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

**Usage**: Run `./scripts/dev.sh` on macOS/Linux or `.\scripts\dev.ps1` on Windows to automatically set up the environment and launch the app.

## 8) Packaging (PyInstaller) + Spec File

Create `app.spec` for consistent packaging across platforms:

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

**Build Commands:**
- Windows EXE: `pyinstaller --clean -y app.spec` (creates `dist/FormGen/FormGen.exe`)
- macOS App: Same spec creates `dist/FormGen.app`; wrap to DMG for distribution

## 9) GitHub Actions (build + release EXE & DMG)

### .github/workflows/build-release.yml
```yaml
name: Build and Release

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    strategy:
      matrix:
        os: [windows-latest, macos-latest]

    runs-on: ${{ matrix.os }}

    steps:
    - uses: actions/checkout@v4

    - name: Set up Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.11'
        cache: 'pip'

    - name: Install dependencies
      run: |
        python -m pip install --upgrade pip
        pip install -r requirements.txt

    - name: Build with PyInstaller
      run: pyinstaller --clean -y app.spec

    - name: Package Windows
      if: matrix.os == 'windows-latest'
      run: |
        cd dist
        7z a FormGen-windows.zip FormGen/

    - name: Package macOS DMG
      if: matrix.os == 'macos-latest'
      run: |
        brew install create-dmg
        create-dmg \
          --volname "FormGen" \
          --window-pos 200 120 \
          --window-size 800 400 \
          --icon-size 100 \
          --icon "FormGen.app" 200 190 \
          --hide-extension "FormGen.app" \
          --app-drop-link 600 185 \
          "dist/FormGen.dmg" \
          "dist/"

    - name: Upload Release Assets
      uses: softprops/action-gh-release@v1
      with:
        files: |
          dist/FormGen-windows.zip
          dist/FormGen.dmg
        token: ${{ secrets.GITHUB_TOKEN }}
```

**Future Code Signing**: Add Windows `signtool` and macOS `codesign` + notarization steps with appropriate secrets.

## 10) Minimal Code Blocks (copy/paste)

### ui/index.html
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>FormGen - Local Form Generator</title>

  <!-- Bootstrap CSS (local vendor if present; CDN fallback) -->
  <link rel="stylesheet" href="vendor/bootstrap.min.css"
        onerror="this.onerror=null;this.href='https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css'">
  <!-- Font Awesome (local vendor if present; CDN fallback) -->
  <link rel="stylesheet" href="vendor/fontawesome/css/all.min.css"
        onerror="this.onerror=null;this.href='https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css'">
  <!-- App theme -->
  <link rel="stylesheet" href="static/css/docker-theme.css" />
  <link rel="stylesheet" href="static/css/header-theme.css" />
  <link rel="stylesheet" href="static/css/sidebar-theme.css" />
  <link rel="stylesheet" href="static/css/utilities.css" />
  <link rel="stylesheet" href="static/css/card-header-theme.css" />

  <style>
    html, body { height: 100%; }
    .dashboard-container { display: flex; min-height: 100vh; }
    .sidebar { width: 280px; }
    .main-content { flex: 1; margin-left: 280px; }
    .content-section { display: none; }
    .content-section.active { display: block; }
    .brand-logo { width: 36px; height: 36px; }
  </style>
</head>
<body>
  <div class="dashboard-container">
    <!-- Sidebar -->
    <nav class="sidebar" id="sidebar">
      <div class="sidebar-header d-flex align-items-center justify-content-between">
        <div class="sidebar-brand d-flex align-items-center gap-2">
          <img src="static/images/logo.png" alt="FormGen" class="brand-logo">
          <span class="brand-text">FormGen</span>
        </div>
        <button class="btn btn-sm btn-outline-secondary" id="sidebarToggle">
          <i class="fas fa-bars"></i>
        </button>
      </div>

      <div class="sidebar-content mt-3">
        <ul class="nav flex-column">
          <li class="nav-item">
            <a class="nav-link active" href="#" data-section="form">
              <i class="fas fa-edit"></i> <span>Form</span>
            </a>
          </li>
          <li class="nav-item">
            <a class="nav-link" href="#" data-section="edit-forms">
              <i class="fas fa-cog"></i> <span>Edit Forms</span>
            </a>
          </li>
        </ul>
      </div>
    </nav>

    <!-- Main content -->
    <div class="main-content">
      <header class="app-header d-flex align-items-center">
        <h4 class="m-0">FormGen - Local Form Generator</h4>
      </header>

      <div class="content-area p-3">
        <!-- Form Section -->
        <section id="form-section" class="content-section active">
          <div class="card">
            <div class="card-header">
              <h5 class="card-title m-0"><i class="fas fa-edit"></i> Fill Form</h5>
            </div>
            <div class="card-body">
              <form id="dynamicForm"></form>
              <div class="mt-3">
                <button id="chooseOutputBtn" class="btn btn-outline-secondary">Choose Output Folder</button>
                <button id="generateBtn" class="btn btn-success ms-2">Generate Files</button>
              </div>
              <div id="outputStatus" class="mt-2"></div>
            </div>
          </div>
        </section>

        <!-- Edit Forms Section -->
        <section id="edit-forms-section" class="content-section">
          <div class="card">
            <div class="card-header">
              <h5 class="card-title m-0"><i class="fas fa-cog"></i> Edit Form Schema</h5>
            </div>
            <div class="card-body">
              <div id="schemaEditor"></div>
              <div class="mt-3">
                <button id="addFieldBtn" class="btn btn-outline-primary">Add Field</button>
                <button id="saveSchemaBtn" class="btn btn-success ms-2">Save Schema</button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>

  <!-- Scripts -->
  <script src="vendor/bootstrap.bundle.min.js"
          onerror="this.onerror=null;this.src='https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js'"></script>
  <script src="js/api_bridge.js"></script>
  <script src="js/form.js"></script>
  <script src="js/edit_forms.js"></script>

  <!-- Section switching -->
  <script>
    document.addEventListener('DOMContentLoaded', () => {
      document.querySelectorAll('.sidebar .nav-link[data-section]').forEach(link => {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          const section = link.getAttribute('data-section');
          document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
          const target = document.getElementById(section + '-section');
          if (target) target.classList.add('active');
          document.querySelectorAll('.sidebar .nav-link[data-section]').forEach(l => l.classList.remove('active'));
          link.classList.add('active');
        });
      });
    });
  </script>
</body>
</html>
```

### ui/js/api_bridge.js
```javascript
window.Api = (function () {
  let readyPromise = null;

  function waitForPywebview() {
    if (readyPromise) return readyPromise;
    readyPromise = new Promise((resolve) => {
      if (typeof window.pywebview !== 'undefined' && window.pywebview.api) {
        return resolve();
      }
      window.addEventListener('pywebviewready', () => resolve());
      const iv = setInterval(() => {
        if (typeof window.pywebview !== 'undefined' && window.pywebview.api) {
          clearInterval(iv);
          resolve();
        }
      }, 100);
    });
    return readyPromise;
  }

  return {
    async ready() { return waitForPywebview(); },

    async get_form_schema() {
      if (typeof window.pywebview !== 'undefined' && window.pywebview.api) {
        return window.pywebview.api.get_form_schema();
      }
      throw new Error('pywebview API not available');
    },

    async save_form_schema(payload) {
      if (typeof window.pywebview !== 'undefined' && window.pywebview.api) {
        return window.pywebview.api.save_form_schema(payload);
      }
      throw new Error('pywebview API not available');
    },

    async generate_outputs(form_data, out_dir) {
      if (typeof window.pywebview !== 'undefined' && window.pywebview.api) {
        return window.pywebview.api.generate_outputs(form_data, out_dir);
      }
      throw new Error('pywebview API not available');
    },

    async choose_folder() {
      if (typeof window.pywebview !== 'undefined' && window.pywebview.api) {
        return window.pywebview.api.choose_folder();
      }
      throw new Error('pywebview API not available');
    },

    async reveal_path(path) {
      if (typeof window.pywebview !== 'undefined' && window.pywebview.api) {
        return window.pywebview.api.reveal_path(path);
      }
      throw new Error('pywebview API not available');
    }
  };
})();
```

## 11) End-to-End Smoke Test

1. **Edit Schema**: Modify `forms/schema.json` → add a new field with type "text"
2. **Launch App**: Run `scripts/dev.*` → confirm UI loads and shows the new field
3. **Fill Form**: Enter values in all required fields → choose output folder
4. **Generate**: Click "Generate Files" → verify XLSX and DOCX files are created
5. **Open Folder**: Click "Open in Finder/Explorer" → confirm files open in OS file manager

## 12) Troubleshooting & Edge Cases

- **Windows blank window**: Install WebView2 Runtime (Evergreen) from Microsoft
- **Missing static assets**: Verify `app.spec` `datas` entries include all UI files
- **DOCX generation errors**: Ensure python-docx is properly installed; avoid complex template features initially
- **Antivirus false positives**: Consider code signing for production distribution
- **Apple notarization**: Future work requiring Apple ID and app-specific password

## 13) Roadmap (Optional)

- Multi-form templates per use case
- Built-in WebView2 bootstrap for Windows
- Signed MSI installers and notarized DMG
- Auto-update mechanism
- Import/export of form schemas

## 14) License & Attribution

- Ensure Bootstrap and FontAwesome licenses are included in distribution
- Clarify licensing for any copied UI assets or icons
- Add appropriate attribution for third-party components in README or LICENSE file