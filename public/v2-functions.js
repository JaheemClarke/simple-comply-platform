/* Simple Comply V2 Backend Connected Functions */
(function () {
  const $ = (s, r = document) => r.querySelector(s);

  function getToken() {
    return localStorage.getItem("sc_token") || localStorage.getItem("token") || "";
  }

  async function api(path, options = {}) {
    const token = getToken();
    const headers = options.headers || {};

    if (!(options.body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
    }

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const res = await fetch(path, { ...options, headers });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data.error || "Request failed");
    }

    return data;
  }

  function addSections() {
    const main = $("main");
    if (!main || $("#v2-functions")) return;

    const section = document.createElement("section");
    section.className = "section light";
    section.id = "v2-functions";

    section.innerHTML = `
      <div class="container">
        <p class="eyebrow">Smart Compliance Tools</p>
        <h2>Simple Comply Functions</h2>
        <p>Check business readiness, estimate service cost, and access practical HSE topics.</p>

        <div class="cards">
          <article>
            <h3>Readiness Checker</h3>
            <form id="v2-readiness-form">
              <label>Business Name<input name="business_name" placeholder="Your business name"></label>

              <label>Business Registration
                <select name="business">
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </label>

              <label>TIN Registration
                <select name="tin">
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </label>

              <label>NIS Registration
                <select name="nis">
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </label>

              <label>PAYE Setup
                <select name="paye">
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </label>

              <label>VAT Review
                <select name="vat">
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </label>

              <label>Accounting Records
                <select name="records">
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </label>

              <label>HSE Documentation
                <select name="hse">
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </label>

              <button type="submit">Save Readiness Score</button>
              <div class="result" id="v2-readiness-result">Score will appear here.</div>
            </form>
          </article>

          <article>
            <h3>Quote Generator</h3>
            <form id="v2-quote-form">
              <label>Select Service
                <select name="service">
                  <option value="Business Registration">Business Registration</option>
                  <option value="GRA Compliance">GRA Compliance</option>
                  <option value="NIS Compliance">NIS Compliance</option>
                  <option value="HSE Advisory">HSE Advisory</option>
                  <option value="Accounting Support">Accounting Support</option>
                  <option value="Business Compliance Review">Business Compliance Review</option>
                </select>
              </label>
              <button type="submit">Generate Estimate</button>
              <div class="result" id="v2-quote-result">Estimate will appear here.</div>
            </form>
          </article>

          <article>
            <h3>Toolbox Talks Preview</h3>
            <div id="v2-talks">
              <p><b>Working at Heights</b><br>Inspect harnesses, anchor properly, and stop work when fall protection is missing.</p>
              <p><b>LPG Safety</b><br>Keep cylinders upright, inspect hoses, and control ignition sources.</p>
              <p><b>Rainy Weather Safety</b><br>Control slips, unstable ground, poor visibility, and electrical exposure.</p>
            </div>
          </article>
        </div>
      </div>
    `;

    main.appendChild(section);
  }

  function addPortalModules() {
    const portalMain = $(".portal-main");
    if (!portalMain || $("#v2-portal-modules")) return;

    const module = document.createElement("div");
    module.id = "v2-portal-modules";
    module.className = "box";

    module.innerHTML = `
      <h3>Compliance Management</h3>

      <div class="cards">
        <article>
          <h3>Compliance Checklist</h3>
          <form id="v2-compliance-form">
            <label>Compliance Item<input name="item_name" placeholder="PAYE Setup"></label>
            <label>Status
              <select name="status">
                <option>Pending</option>
                <option>In Progress</option>
                <option>Completed</option>
              </select>
            </label>
            <label>Due Date<input type="date" name="due_date"></label>
            <label>Notes<textarea name="notes"></textarea></label>
            <button type="submit">Add Checklist Item</button>
          </form>
          <div id="v2-compliance-list"></div>
        </article>

        <article>
          <h3>HSE Report</h3>
          <form id="v2-hse-form">
            <label>Report Type
              <select name="report_type">
                <option>Near Miss</option>
                <option>First Aid</option>
                <option>Inspection</option>
                <option>Unsafe Act</option>
                <option>Property Damage</option>
              </select>
            </label>
            <label>Location<input name="location"></label>
            <label>Description<textarea name="description" required></textarea></label>
            <label>Corrective Action<textarea name="corrective_action"></textarea></label>
            <button type="submit">Submit HSE Report</button>
          </form>
          <div id="v2-hse-list"></div>
        </article>

        <article>
          <h3>Invoices</h3>
          <div id="v2-invoice-list">Login to view invoices.</div>
        </article>
      </div>
    `;

    portalMain.appendChild(module);
  }

  async function bindPublicTools() {
    $("#v2-readiness-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();

      const payload = Object.fromEntries(new FormData(e.target).entries());

      try {
        const data = await api("/api/readiness", {
          method: "POST",
          body: JSON.stringify(payload)
        });

        $("#v2-readiness-result").innerHTML = `
          <b>Compliance Score: ${data.score}%</b><br>
          <b>Missing:</b> ${data.missingItems?.join(", ") || "None"}<br>
          <b>Recommended:</b> ${data.recommendedServices?.join(", ") || "None"}
        `;
      } catch (err) {
        $("#v2-readiness-result").textContent = err.message;
      }
    });

    $("#v2-quote-form")?.addEventListener("submit", (e) => {
      e.preventDefault();

      const service = new FormData(e.target).get("service");

      const prices = {
        "Business Registration": 15000,
        "GRA Compliance": 20000,
        "NIS Compliance": 18000,
        "HSE Advisory": 30000,
        "Accounting Support": 25000,
        "Business Compliance Review": 20000
      };

      $("#v2-quote-result").innerHTML = `
        <b>${service}</b><br>
        Estimated fee: GYD ${prices[service].toLocaleString()}<br>
        <small>Final price depends on document review.</small>
      `;
    });
  }

  async function loadCompliance() {
    const box = $("#v2-compliance-list");
    if (!box || !getToken()) return;

    try {
      const data = await api("/api/compliance");
      box.innerHTML = `
        <p><b>Compliance Score:</b> ${data.score}%</p>
        ${data.items.map(item => `
          <p>
            <b>${item.item_name}</b><br>
            Status: ${item.status}<br>
            Due: ${item.due_date || "No date"}
          </p>
        `).join("")}
      `;
    } catch (err) {
      box.textContent = err.message;
    }
  }

  async function loadHseReports() {
    const box = $("#v2-hse-list");
    if (!box || !getToken()) return;

    try {
      const data = await api("/api/hse/reports");
      box.innerHTML = data.reports.length
        ? data.reports.slice(0, 5).map(report => `
          <p>
            <b>${report.report_type}</b><br>
            ${report.location || "No location"}<br>
            ${report.description}
          </p>
        `).join("")
        : "<p>No HSE reports yet.</p>";
    } catch (err) {
      box.textContent = err.message;
    }
  }

  async function loadInvoices() {
    const box = $("#v2-invoice-list");
    if (!box || !getToken()) return;

    try {
      const data = await api("/api/invoices");
      box.innerHTML = data.invoices.length
        ? data.invoices.slice(0, 5).map(invoice => `
          <p>
            <b>${invoice.invoice_number}</b><br>
            ${invoice.description}<br>
            GYD ${Number(invoice.amount).toLocaleString()} - ${invoice.status}
          </p>
        `).join("")
        : "<p>No invoices yet.</p>";
    } catch (err) {
      box.textContent = err.message;
    }
  }

  function bindPortalTools() {
    $("#v2-compliance-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();

      const payload = Object.fromEntries(new FormData(e.target).entries());

      try {
        await api("/api/compliance", {
          method: "POST",
          body: JSON.stringify(payload)
        });

        e.target.reset();
        loadCompliance();
      } catch (err) {
        alert(err.message);
      }
    });

    $("#v2-hse-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();

      const payload = Object.fromEntries(new FormData(e.target).entries());

      try {
        await api("/api/hse/reports", {
          method: "POST",
          body: JSON.stringify(payload)
        });

        e.target.reset();
        loadHseReports();
      } catch (err) {
        alert(err.message);
      }
    });
  }

  function watchPortal() {
    document.addEventListener("click", () => {
      setTimeout(() => {
        if ($("#portal") && !$("#portal").classList.contains("hidden")) {
          addPortalModules();
          bindPortalTools();
          loadCompliance();
          loadHseReports();
          loadInvoices();
        }
      }, 500);
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    addSections();
    bindPublicTools();
    watchPortal();
  });
})();