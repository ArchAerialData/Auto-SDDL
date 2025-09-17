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

