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
    } else if (f.type === 'multiselect') {
      input = document.createElement('select');
      input.multiple = true;
      input.size = Math.min(6, Math.max(4, (f.options || []).length));
      (f.options || []).forEach(opt => { const o = document.createElement('option'); o.value = o.textContent = opt; input.appendChild(o); });
      input.className = 'form-select';
      // Optional custom text entries
      if (f.allow_custom) {
        const custom = document.createElement('input');
        custom.type = 'text';
        custom.className = 'form-control mt-1';
        custom.placeholder = 'Custom entries (comma or semicolon separated)';
        custom.id = f.key + '__custom';
        wrap.appendChild(label); wrap.appendChild(input); wrap.appendChild(custom);
        return wrap;
      }
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
    try {
      const schema = await window.API.get_schema();
      currentSchema = schema || {};
      formEl.innerHTML = '';
      (schema.fields || []).forEach(f => formEl.appendChild(renderField(f)));
    } catch (err) {
      console.error('Failed to load schema via API:', err);
      // Fallback: fetch the JSON directly when running with http_server
      try {
        const resp = await fetch('../forms/schema.json');
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        const schema = await resp.json();
        currentSchema = schema || {};
        formEl.innerHTML = '';
        (schema.fields || []).forEach(f => formEl.appendChild(renderField(f)));
      } catch (e2) {
        console.error('Fallback fetch failed:', e2);
        formEl.innerHTML = '<div class="text-danger">Failed to load schema. Waiting for API…</div>';
        setTimeout(() => whenApiReady(loadSchema), 500);
      }
    }
  }

  function whenApiReady(fn) {
    // Robust wait: immediate, event-based, and polling fallback.
    const ready = () => (typeof window.pywebview !== 'undefined' && window.pywebview.api);
    if (ready()) { fn(); return; }
    const handler = () => { document.removeEventListener('pywebviewready', handler); fn(); };
    document.addEventListener('pywebviewready', handler);
    let tries = 0;
    const id = setInterval(() => {
      if (ready()) { clearInterval(id); fn(); }
      else if (++tries > 50) { clearInterval(id); fn(); }
    }, 200);
  }

  btnGen.addEventListener('click', async (e) => {
    e.preventDefault();
    const data = {};
    const missing = [];
    // Use schema to collect values per field type
    (currentSchema.fields || []).forEach(f => {
      const el = document.getElementById(f.key);
      if (!el) return;
      let val = '';
      if (f.type === 'multiselect') {
        const selected = Array.from(el.selectedOptions || []).map(o => o.value);
        if (f.allow_custom) {
          const custom = document.getElementById(f.key + '__custom');
          if (custom && custom.value) {
            const parts = custom.value.split(/[,;\n]+/).map(s => s.trim()).filter(Boolean);
            selected.push(...parts);
          }
        }
        val = selected.join(', ');
      } else if (el.tagName === 'SELECT') {
        val = el.value || '';
      } else if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
        val = (el.value || '').trim();
      }
      data[f.key] = val;
      if (f.required && !val) missing.push(f.key);
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

  whenApiReady(loadSchema);
})();
