# Agent Runbook & First Prompt

> Path: `docs/prompts/prompt.md`  
> Use: Paste the **First Prompt** into the agent (VSCode / CODEX‑GPT‑5) in the new repo. The **Operating Rules** guide its execution style to be thorough and low‑risk.

---

## First Prompt (paste as‑is)
You are the implementation agent for a new two‑tab pywebview app.  
Read the guide at **docs/guides/codex-guide.md** and execute **Tasks 1–5** only, then stop and report.

**Tasks 1–5 (Definition of Done for this phase):**
1) **Repo skeleton** — Create the directory tree exactly as shown, including placeholders where needed.  
2) **Python core** — Implement `app.py` and `api.py` from the guide with the exact API surface.  
3) **UI shell** — Add `ui/index.html`, `ui/js/api_bridge.js`, `ui/js/form.js`, `ui/js/edit_forms.js`, and theme links. Only two sidebar items.  
4) **Schema + template** — Add `forms/schema.json` and `templates/docx_base_template.docx` (empty docx is fine).  
5) **Local dev scripts** — Add `scripts/dev.ps1` and `scripts/dev.sh`. Run the app once to **prove** the UI loads and generation creates `output.xlsx` and `output.docx` in a chosen folder.

**Reporting requirements (after completion):**
- Create `docs/tasks/Task-01_to_05.md` that includes:
  - Exact files created/modified (with relative paths).
  - Any deviations and why.
  - Evidence of success: console output (trimmed), folder listings, and notes on XLSX/DOCX generation.
  - Known TODOs if any.
- Do not proceed to later tasks until I explicitly say “continue”.

When ready, wait for my confirmation to continue with **Tasks 6–10** in the guide (packaging + CI), with a similar task report: `docs/tasks/Task-06_to_10.md`.

---

## Operating Rules (follow strictly)
- **No scope creep.** Stick to the two‑tab form app; do not import unrelated legacy features.  
- **Deterministic edits.** Prefer explicit files/paths; no guesswork. If a detail is missing, mark `TODO(Owner)` and continue.  
- **Cross‑platform discipline.** Do not introduce Windows‑only or macOS‑only code outside the sections marked as such.  
- **Idempotent scripts.** Dev scripts must be re‑runnable.  
- **Version pinning.** Use exact versions from the guide; don’t upgrade without instruction.  
- **Atomic commits.** Commit at logical boundaries with clear messages (e.g., `feat(ui): add two-tab shell`).  
- **Verification first.** After each major step, run and verify before moving on.  
- **Artifacts & docs.** For each phase, produce a `docs/tasks/*.md` report with: what you did, how it works, and how you verified it.

---
### Continue to Tasks 6–10 (after approval)

#### Preconditions (read-only checks)

Confirm these already exist from Tasks 1–5 (do not modify unless noted):
- `app.py` uses a **portable** pywebview start (`webview.start(http_server=True)`). 
- `api.py` exposes the minimal endpoints (`get_schema`, `save_schema`, `generate_xlsx`, `generate_docx`, `open_folder`). 
- `forms/schema.json` contains the initial fields for the form UI.  
- `scripts/dev.sh` and `scripts/dev.ps1` exist for local runs. 
- `requirements.txt` pins `pywebview`, `openpyxl`, `python-docx`, and `pyinstaller`.  
- Tasks 1–5 completion is recorded in `docs/tasks/Task-01_to_05.md`. 

##### If any are missing, recreate them exactly as referenced, then continue with steps 6-10 below

Read `docs/guides/codex-guide.md` and implement **Tasks 6–10** only:
- Add `app.spec` exactly as shown.
- Create `.github/workflows/build-release.yml` using PowerShell `Compress-Archive` on Windows and `hdiutil` on macOS, with OS‑specific artifact names:
  - `dist/FormGen-windows.zip`
  - `dist/FormGen-macos.dmg`
- Open a PR or commit changes.
- Trigger a tag build `v0.1.0` (draft tag if you can; otherwise provide the command in the report).
- **Verify outputs**: attach the produced artifacts to the GitHub Release.

Create `docs/tasks/Task-06_to_10.md` documenting the CI run, artifact names, and any mitigations applied.

### Hardening pass (optional)
Perform a quick hardening pass and document in `docs/tasks/Task-11_hardening.md`:
- Validate that paths in `app.spec` and `index.html` resolve inside the packaged app.
- Verify WebView2 runtime check note in README.
- Smoke‑test on both OS runners with a basic schema.

---

## Acceptance Criteria
- App runs locally from `scripts/dev.*` on both platforms.  
- Filling the form generates valid **XLSX + DOCX**.  
- CI produces **FormGen-windows.zip** and **FormGen-macos.dmg** on tag push.  
- Task reports for tasks 6-10 are present under `docs/tasks/` and are legible by a new engineer.
