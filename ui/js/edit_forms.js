(function () {
  const editor = document.getElementById('schema-editor');
  const btnSave = document.getElementById('btn-save-schema');
  const btnRevert = document.getElementById('btn-revert-schema');

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
  document.addEventListener('pywebviewready', load);
  // Also call once on load for http_server fallback
  load();
})();
