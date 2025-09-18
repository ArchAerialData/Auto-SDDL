# Agent Playbook — Next Steps After CI Setup (Tag, Build, Verify, Report)

> **Audience:** Implementation agent only.  
> **Context:** You reported that `app.spec` and `.github/workflows/build-release.yml` are in place and task docs were added. The next phase is to **cut a tag, run the CI matrix, verify the artifacts, and finalize documentation**. Use this playbook; do not wait for additional confirmation.

---

## Preconditions (read-only)
- Tasks 6–10 were documented (`docs/tasks/Task-06_to_10.md`). 
- Optional hardening doc exists (`docs/tasks/Task-11_hardening.md`). 
- App core is stable: `app.py` uses `webview.start(http_server=True)`; **do not change this**. 
- API exposes required endpoints (`get_schema`, `save_schema`, `generate_xlsx`, `generate_docx`, `open_folder`). 
- Schema exists and is valid JSON (`forms/schema.json`). 
- Dev scripts present (`scripts/dev.sh` / `scripts/dev.ps1`). 
- Requirements pinned (includes `pywebview`, `openpyxl`, `python-docx`, `pyinstaller`).
- Tasks 1–5 completion report exists.

If any are missing, restore them to match the cited files, then continue.

---

## Step 1 — Ensure vendor assets are local (offline UI)

**Goal:** The packaged app must render without internet. If local vendor files are placeholders or missing, replace them now in `ui/static/vendor/` (Bootstrap CSS/JS and FontAwesome CSS). The spec already includes `ui/static` so these will be bundled. (If already done, proceed.)

**Deliverable:** Actual, non-empty files at:
- `ui/static/vendor/bootstrap.min.css`
- `ui/static/vendor/bootstrap.bundle.min.js`
- `ui/static/vendor/fontawesome.min.css` (or `fontawesome/css/all.min.css`)

---

## Step 2 — Create and push a release tag

Use an annotated tag. Auto-detect the default remote (prefer `origin`).

**Bash (macOS/Linux):**
```bash
set -euo pipefail
REMOTE="$(git remote | head -n1)"
: "${REMOTE:=origin}"
git fetch "$REMOTE" --tags
TAG="v0.1.0"
if git rev-parse "$TAG" >/dev/null 2>&1; then
  echo "Tag $TAG already exists locally. Bumping..."
  exit 1  # (Owner can choose the next version; stop here if collision.)
fi
git tag -a "$TAG" -m "$TAG"
git push "$REMOTE" "$TAG"
```

**PowerShell (Windows):**
```powershell
$Remote = (git remote) | Select-Object -First 1
if (-not $Remote) { $Remote = "origin" }
git fetch $Remote --tags
$Tag = "v0.1.0"
$exists = git rev-parse $Tag 2>$null
if ($LASTEXITCODE -eq 0) { throw "Tag $Tag already exists locally. Bump version and retry." }
git tag -a $Tag -m $Tag
git push $Remote $Tag
```

**Done when:** The `build-release` workflow starts for both `windows-latest` and `macos-latest` runners.

---

## Step 3 — Monitor CI and collect outputs

1. In the Actions tab, open the **build-release** run for your tag. Confirm two successful matrix jobs and the **release** job.  
2. Download artifacts (or open the created Release). Expected artifact names:
   - `FormGen-windows.zip`
   - `FormGen-macos.dmg`

**Acceptance:** Both artifacts exist and are non-zero size.

---

## Step 4 — Verify artifact structure and compute checksums

**Windows ZIP (PowerShell):**
```powershell
Expand-Archive -Path dist\FormGen-windows.zip -DestinationPath dist\__win_check -Force
Get-ChildItem -Recurse dist\__win_check
Get-FileHash dist\FormGen-windows.zip -Algorithm SHA256 | Format-List
```

**macOS DMG (bash):**
```bash
set -euo pipefail
shasum -a 256 dist/FormGen-macos.dmg
# Optional mount check (only on macOS):
# hdiutil attach dist/FormGen-macos.dmg -nobrowse -mountpoint /Volumes/FormGenTest
# ls -la /Volumes/FormGenTest
# hdiutil detach /Volumes/FormGenTest
```

**Acceptance:** Windows ZIP contains a `FormGen/` folder with `FormGen.exe`; DMG mounts and contains `FormGen.app` (mac only). Record SHA256 for both.

---

## Step 5 — Update documentation

1. **`docs/tasks/Task-06_to_10.md`** — append the actual run URLs, artifact sizes, and SHA256 hashes obtained in Steps 3–4. The file already exists as the phase report; update it with live data. fileciteturn0file0  
2. **`docs/tasks/Task-11_hardening.md`** — mark the smoke tests as complete and note any deviations or TODOs (e.g., signing/notarization). fileciteturn0file1

**Acceptance:** Both docs are updated and committed.

---

## Step 6 — Commit and push doc updates

```bash
git add docs/tasks/Task-06_to_10.md docs/tasks/Task-11_hardening.md
git commit -m "docs(ci): record build-release run URLs, sizes, and SHA256 hashes"
git push
```

---

## Step 7 — Final status message for the owner

Post a summary comment containing:
- Tag used (e.g., `v0.1.0`) and link to Release.  
- Artifact names + sizes + SHA256 hashes.  
- One-line verification for Windows ZIP (contains `FormGen.exe`) and macOS DMG (contains `FormGen.app`).  
- Any follow-ups (signing, notarization, README WebView2 note).

**Stop after posting the summary.** Await explicit approval before proceeding with signing/notarization or auto-update work.

---

## Acceptance Criteria (must all be true)
- A GitHub Release exists for the tag with both artifacts attached.  
- Checksums computed and recorded in `docs/tasks/Task-06_to_10.md`. fileciteturn0file0  
- Hardening notes updated in `docs/tasks/Task-11_hardening.md`. fileciteturn0file1  
- No changes were made to core app code, schema, dev scripts, or pinned deps. fileciteturn0file5 fileciteturn0file2 fileciteturn0file3 fileciteturn0file4 fileciteturn0file7

