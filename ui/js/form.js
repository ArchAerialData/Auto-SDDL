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
    // Add a clear required badge for specific AP fields
    if (f.required && (f.key === 'ap_email' || f.key === 'ap_phone_number')) {
      const note = document.createElement('span');
      note.className = 'required-note';
      note.textContent = 'FIELD IS REQUIRED, YOU DIRTY PIGS';
      label.appendChild(document.createTextNode(' '));
      label.appendChild(note);
    }
    label.htmlFor = f.key;
    let input;
    if (f.type === 'select') {
      input = document.createElement('select');
      (f.options || []).forEach(opt => { const o = document.createElement('option'); o.value = o.textContent = opt; input.appendChild(o); });
    } else if (f.type === 'multiselect') {
      // Custom multi-select dropdown (checkbox list) that stays open
      const container = document.createElement('div');
      container.className = 'ms-container';

      const display = document.createElement('button');
      display.type = 'button';
      display.className = 'ms-display form-control text-start';
      display.textContent = 'Select…';

      const panel = document.createElement('div');
      panel.className = 'ms-panel';
      panel.id = f.key + '__panel';
      panel.hidden = true;

      (f.options || []).forEach(opt => {
        const row = document.createElement('label');
        row.className = 'ms-option';
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.value = opt;
        const txt = document.createElement('span');
        txt.textContent = ' ' + opt;
        row.appendChild(cb); row.appendChild(txt);
        panel.appendChild(row);
      });

      // Add a built-in "Custom" option that converts to free text
      let customRow, customCB;
      const customInput = document.createElement('input');
      customInput.type = 'text';
      customInput.className = 'form-control mt-1';
      customInput.placeholder = 'Custom entries (comma or semicolon separated)';
      customInput.id = f.key + '__custom';
      customInput.style.display = 'none';

      if (f.allow_custom) {
        customRow = document.createElement('label');
        customRow.className = 'ms-option';
        customCB = document.createElement('input');
        customCB.type = 'checkbox';
        customCB.value = '__CUSTOM__';
        const ctxt = document.createElement('span'); ctxt.textContent = ' Custom';
        customRow.appendChild(customCB); customRow.appendChild(ctxt);
        panel.appendChild(customRow);
      }

      const hidden = document.createElement('input');
      hidden.type = 'hidden';
      hidden.id = f.key;
      hidden.required = !!f.required;

      function updateDisplay() {
        // If Custom is active, ignore checkbox selections and use free text
        let values = [];
        if (customCB && customCB.checked) {
          const parts = (customInput.value || '').split(/[,;\n]+/).map(s => s.trim()).filter(Boolean);
          values = parts;
        } else {
          values = Array.from(panel.querySelectorAll('label.ms-option input[type="checkbox"]'))
            .filter(x => x !== customCB && x.checked)
            .map(x => x.value);
        }
        hidden.value = values.join(', ');
        display.textContent = values.length ? values.join(', ') : 'Select…';
      }

      function handleCustomToggle() {
        if (!customCB) return;
        const enabled = customCB.checked;
        customInput.style.display = enabled ? '' : 'none';
        if (enabled) { panel.hidden = true; customInput.focus(); }
        updateDisplay();
      }

      display.addEventListener('click', () => { panel.hidden = !panel.hidden; });
      display.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); panel.hidden = !panel.hidden; }});
      panel.addEventListener('change', (e) => {
        if (e.target === customCB) handleCustomToggle();
        else updateDisplay();
      });
      customInput.addEventListener('input', updateDisplay);

      // Close when clicking outside
      const closeOnOutside = (e) => { if (!container.contains(e.target)) { panel.hidden = true; } };
      panel.addEventListener('mouseenter', () => document.addEventListener('click', closeOnOutside, { once: true }));

      container.appendChild(display);
      container.appendChild(panel);

      wrap.appendChild(label);
      wrap.appendChild(container);
      wrap.appendChild(hidden);
      wrap.appendChild(customInput);
      return wrap;
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
        // Hidden input holds combined values (selected+custom)
        val = (el.value || '').trim();
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
