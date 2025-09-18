(function () {
  const formEl = document.getElementById('dynamic-form');
  const outputEl = document.getElementById('output-folder');
  const btnGen = document.getElementById('btn-generate');
  const btnOpen = document.getElementById('btn-open-folder');
  let currentSchema = null;

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
    if (f.placeholder) input.placeholder = f.placeholder;
    wrap.appendChild(label); wrap.appendChild(input);
    return wrap;
  }

  async function loadSchema() {
    const schema = await window.API.get_schema();
    currentSchema = schema || {};
    formEl.innerHTML = '';
    (schema.fields || []).forEach(f => formEl.appendChild(renderField(f)));
  }

  btnGen.addEventListener('click', async (e) => {
    e.preventDefault();
    const data = {};
    const missing = [];
    formEl.querySelectorAll('input,select,textarea').forEach(el => {
      const val = (el.value || '').trim();
      data[el.id] = val;
      if (el.required && !val) missing.push(el.id);
    });

    if (missing.length) {
      alert('Please fill required fields: ' + missing.join(', '));
      return;
    }

    // Normalize multiple emails into a single cell if present
    const emailKey = 'ops_contact_emails';
    if (emailKey in data) {
      const delim = (currentSchema && currentSchema.xlsx && currentSchema.xlsx.email_delimiter) || ';';
      const parts = data[emailKey]
        .split(/[,;\n]+/)
        .map(s => s.trim())
        .filter(Boolean);
      data[emailKey] = parts.join(delim + ' ');
    }
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
