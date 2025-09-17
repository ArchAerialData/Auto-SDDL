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

