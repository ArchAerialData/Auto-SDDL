(function () {
  const editor = document.getElementById('schema-editor');
  const btnSave = document.getElementById('btn-save-schema');
  const btnRevert = document.getElementById('btn-revert-schema');
  const btnSync = document.getElementById('btn-sync-schema');

  async function load() {
    try {
      const schema = await window.API.get_schema();
      editor.value = JSON.stringify(schema, null, 2);
    } catch (err) {
      try {
        const resp = await fetch('../forms/schema.json');
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        const schema = await resp.json();
        editor.value = JSON.stringify(schema, null, 2);
      } catch (e2) {
        editor.value = '// Failed to load schema via API and HTTP fallback.';
        console.error('load schema failed:', err, e2);
      }
    }
  }

  btnSave.addEventListener('click', async (e) => {
    e.preventDefault();
    try {
      const schema = JSON.parse(editor.value);
      await window.API.save_schema(schema);
      alert('Saved');
    } catch (err) {
      alert('Invalid JSON or save failed: ' + err);
    }
  });

  btnRevert.addEventListener('click', (e) => { e.preventDefault(); load(); });
  btnSync.addEventListener('click', async (e) => {
    e.preventDefault();
    try {
      const proposal = await window.API.propose_schema_from_template();
      if (!proposal || typeof proposal !== 'object') throw new Error('No proposal returned');
      const confirmed = confirm('Replace editor content with schema proposed from the XLSX template headers?');
      if (!confirmed) return;
      editor.value = JSON.stringify(proposal, null, 2);
      alert('Loaded proposed schema from XLSX headers. Review and click Save to apply.');
    } catch (err) {
      alert('Sync failed: ' + err);
    }
  });
  document.addEventListener('pywebviewready', load);
  // Also call once on load for http_server fallback
  load();
})();
