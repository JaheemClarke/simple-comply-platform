
/* Simple Comply V2 Functions Add-on */
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  function save(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function load(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) || fallback; }
    catch { return fallback; }
  }

  function card(title, body) {
    return `<article><h3>${title}</h3>${body}</article>`;
  }

  function addSections() {
    const main = document.querySelector('main');
    if (!main || document.querySelector('#v2-functions')) return;

    const section = document.createElement('section');
    section.className = 'section light';
    section.id = 'v2-functions';
    section.innerHTML = `
      <div class="container">
        <p class="eyebrow">Smart Compliance Tools</p>
        <h2>Simple Comply Functions</h2>
        <p>Use these tools to check readiness, track compliance, manage invoices, report HSE matters, and access safety topics.</p>

        <div class="cards">
          ${card('Readiness Checker', `
            <form id="v2-readiness-form">
              <label>Business Registration<select name="business"><option value="yes">Yes</option><option value="no">No</option></select></label>
              <label>TIN Registration<select name="tin"><option value="yes">Yes</option><option value="no">No</option></select></label>
              <label>NIS Registration<select name="nis"><option value="yes">Yes</option><option value="no">No</option></select></label>
              <label>PAYE Setup<select name="paye"><option value="yes">Yes</option><option value="no">No</option></select></label>
              <label>VAT Review<select name="vat"><option value="yes">Yes</option><option value="no">No</option></select></label>
              <label>Accounting Records<select name="records"><option value="yes">Yes</option><option value="no">No</option></select></label>
              <label>HSE Documentation<select name="hse"><option value="yes">Yes</option><option value="no">No</option></select></label>
              <button type="submit">Calculate Score</button>
              <div class="result" id="v2-readiness-result">Score will appear here.</div>
            </form>
          `)}

          ${card('Compliance Checklist', `
            <div id="v2-checklist"></div>
            <button id="v2-reset-checklist" type="button">Reset Checklist</button>
          `)}

          ${card('Compliance Calendar', `
            <form id="v2-calendar-form">
              <label>Reminder Title<input name="title" placeholder="PAYE Due"></label>
              <label>Due Date<input name="date" type="date"></label>
              <button type="submit">Add Reminder</button>
            </form>
            <div id="v2-calendar-list"></div>
          `)}

          ${card('Quote Generator', `
            <form id="v2-quote-form">
              <label>Select Service<select name="service">
                <option value="Business Registration">Business Registration</option>
                <option value="GRA Compliance">GRA Compliance</option>
                <option value="NIS Compliance">NIS Compliance</option>
                <option value="HSE Advisory">HSE Advisory</option>
                <option value="Accounting Support">Accounting Support</option>
                <option value="Business Compliance Review">Business Compliance Review</option>
              </select></label>
              <button type="submit">Generate Quote</button>
              <div class="result" id="v2-quote-result">Estimate will appear here.</div>
            </form>
          `)}

          ${card('HSE Report', `
            <form id="v2-hse-form">
              <label>Report Type<select name="type"><option>Near Miss</option><option>First Aid</option><option>Inspection</option><option>Unsafe Act</option><option>Property Damage</option></select></label>
              <label>Location<input name="location"></label>
              <label>Description<textarea name="description" required></textarea></label>
              <label>Corrective Action<textarea name="action"></textarea></label>
              <button type="submit">Save HSE Report</button>
            </form>
            <div id="v2-hse-list"></div>
          `)}

          ${card('Toolbox Talks', `
            <div id="v2-talks"></div>
          `)}
        </div>
      </div>
    `;

    main.appendChild(section);
  }

  const checklistItems = [
    'Business Registration', 'TIN Registration', 'PAYE Setup', 'VAT Review',
    'NIS Registration', 'Accounting Records', 'HSE Documentation'
  ];

  function renderChecklist() {
    const box = $('#v2-checklist');
    if (!box) return;
    const state = load('sc_checklist', checklistItems.map(x => ({ name: x, done: false })));
    box.innerHTML = state.map((item, i) => `
      <label style="display:flex;gap:10px;align-items:center;margin:8px 0;">
        <input type="checkbox" data-check-index="${i}" ${item.done ? 'checked' : ''} style="width:auto;">
        ${item.name}
      </label>
    `).join('');
    const done = state.filter(x => x.done).length;
    box.innerHTML += `<div class="result">Checklist Score: ${Math.round(done / state.length * 100)}%</div>`;
  }

  function bindActions() {
    document.addEventListener('change', (e) => {
      if (e.target.matches('[data-check-index]')) {
        const state = load('sc_checklist', checklistItems.map(x => ({ name: x, done: false })));
        state[Number(e.target.dataset.checkIndex)].done = e.target.checked;
        save('sc_checklist', state);
        renderChecklist();
      }
    });

    $('#v2-reset-checklist')?.addEventListener('click', () => {
      localStorage.removeItem('sc_checklist');
      renderChecklist();
    });

    $('#v2-readiness-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(e.target).entries());
      const labels = {
        business: 'Business Registration', tin: 'TIN Registration', nis: 'NIS Registration',
        paye: 'PAYE Setup', vat: 'VAT Review', records: 'Accounting Records', hse: 'HSE Documentation'
      };
      const keys = Object.keys(labels);
      const yes = keys.filter(k => data[k] === 'yes').length;
      const score = Math.round((yes / keys.length) * 100);
      const missing = keys.filter(k => data[k] !== 'yes').map(k => labels[k]);
      const rec = missing.map(x => x.includes('HSE') ? 'HSE Advisory' : x.includes('Accounting') ? 'Accounting Support' : x.includes('NIS') ? 'NIS Compliance' : 'GRA / Business Compliance');
      $('#v2-readiness-result').innerHTML = `<b>Compliance Score: ${score}%</b><br><b>Missing:</b> ${missing.join(', ') || 'None'}<br><b>Recommended:</b> ${[...new Set(rec)].join(', ') || 'None'}`;
    });

    $('#v2-calendar-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const item = Object.fromEntries(new FormData(e.target).entries());
      const list = load('sc_calendar', []);
      list.push(item);
      save('sc_calendar', list);
      e.target.reset();
      renderCalendar();
    });

    $('#v2-quote-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const service = new FormData(e.target).get('service');
      const prices = {
        'Business Registration': 15000,
        'GRA Compliance': 20000,
        'NIS Compliance': 18000,
        'HSE Advisory': 30000,
        'Accounting Support': 25000,
        'Business Compliance Review': 20000
      };
      $('#v2-quote-result').innerHTML = `<b>${service}</b><br>Estimated fee: GYD ${prices[service].toLocaleString()}<br><small>Final price depends on document review.</small>`;
    });

    $('#v2-hse-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const report = Object.fromEntries(new FormData(e.target).entries());
      report.date = new Date().toLocaleDateString();
      const list = load('sc_hse_reports', []);
      list.unshift(report);
      save('sc_hse_reports', list);
      e.target.reset();
      renderHseReports();
    });
  }

  function renderCalendar() {
    const box = $('#v2-calendar-list');
    if (!box) return;
    const list = load('sc_calendar', [
      { title: 'PAYE Due', date: '2026-06-15' },
      { title: 'NIS Due', date: '2026-06-20' },
      { title: 'VAT Review', date: '2026-06-30' }
    ]);
    box.innerHTML = list.map(x => `<p><b>${x.date}</b> - ${x.title}</p>`).join('');
  }

  function renderHseReports() {
    const box = $('#v2-hse-list');
    if (!box) return;
    const list = load('sc_hse_reports', []);
    box.innerHTML = list.length ? list.slice(0, 4).map(x => `<p><b>${x.type}</b> - ${x.location || 'No location'}<br>${x.description}</p>`).join('') : '<p>No HSE reports saved yet.</p>';
  }

  function renderTalks() {
    const box = $('#v2-talks');
    if (!box) return;
    const talks = [
      ['Working at Heights', 'Inspect harnesses, anchor properly, maintain edge protection, and stop work when fall protection is missing.'],
      ['Confined Spaces', 'Confirm permit, gas testing, ventilation, standby person, and rescue plan before entry.'],
      ['LPG Safety', 'Keep cylinders upright, inspect hoses, control ignition sources, and close valves after use.'],
      ['Rainy Weather Safety', 'Control slips, poor visibility, unstable ground, and electrical exposure.'],
      ['Housekeeping', 'Keep walkways clear, remove waste, stack materials safely, and control trip hazards.']
    ];
    box.innerHTML = talks.map(t => `<p><b>${t[0]}</b><br>${t[1]}</p>`).join('');
  }

  document.addEventListener('DOMContentLoaded', () => {
    addSections();
    bindActions();
    renderChecklist();
    renderCalendar();
    renderHseReports();
    renderTalks();
  });
})();
