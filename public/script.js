
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
let token = localStorage.getItem("sc_token") || "";
let currentUser = JSON.parse(localStorage.getItem("sc_user") || "null");

async function api(path, options = {}) {
  const headers = options.headers || {};
  if (!(options.body instanceof FormData)) headers["Content-Type"] = "application/json";
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(path, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

$("#menu")?.addEventListener("click",()=>$("#nav").classList.toggle("active"));
$$("[data-open]").forEach(b=>b.onclick=()=>$("#"+b.dataset.open).classList.add("active"));
$$(".close").forEach(b=>b.onclick=()=>b.closest(".modal").classList.remove("active"));
$$(".modal").forEach(m=>m.onclick=e=>{if(e.target===m)m.classList.remove("active")});

async function loadServices() {
  const fallback = [
    ["Business Registration","Business name registration, company support, document preparation, and follow-up."],
    ["GRA Compliance","TIN applications, PAYE support, VAT support, tax documentation, and certificates."],
    ["NIS Compliance","Employer registration, forms, contribution guidance, clearance support, and monitoring."],
    ["HSE Advisory","Workplace inspections, risk assessments, safety documents, and compliance reviews."],
    ["Accounting Support","Basic bookkeeping, payroll support, financial record organization, and document support."],
    ["Document Preparation","Review documents, identify missing items, prepare packages, and track applications."]
  ];
  try {
    const data = await api("/api/services");
    renderServices(data.services.map(s=>[s.name,s.description]));
    renderServiceSelect(data.services);
  } catch {
    renderServices(fallback);
    renderServiceSelect(fallback.map((s,i)=>({id:i+1,name:s[0]})));
  }
}

function renderServices(services) {
  const cards = $("#serviceCards");
  cards.innerHTML = services.map((s,i)=>`<article><span>${String(i+1).padStart(2,"0")}</span><h3>${s[0]}</h3><p>${s[1]}</p></article>`).join("");
}

function renderServiceSelect(services) {
  const select = $("#applicationService");
  if (!select) return;
  select.innerHTML = services.map(s=>`<option value="${s.id}">${s.name}</option>`).join("");
}

$("#assessmentForm")?.addEventListener("submit",e=>{
  e.preventDefault();
  let s=0; for(const v of new FormData(e.target).values()) s+=Number(v);
  $("#result").textContent=`Your Business Readiness Score: ${s}% — ${s>=80?"Strong":s>=60?"Moderate":"Needs Work"}`;
});

$("#contactForm")?.addEventListener("submit", async e=>{
  e.preventDefault();
  try {
    const body = JSON.stringify(Object.fromEntries(new FormData(e.target).entries()));
    const data = await api("/api/contact", { method:"POST", body });
    $("#note").textContent = data.message;
    e.target.reset();
  } catch(err) {
    $("#note").textContent = err.message;
  }
});

$("#registerBtn")?.addEventListener("click", async ()=>{
  try {
    const data = await api("/api/auth/register", {
      method:"POST",
      body: JSON.stringify({
        name: $("#regName").value,
        business_name: $("#regBusiness").value,
        email: $("#regEmail").value,
        phone: $("#regPhone").value,
        password: $("#regPassword").value
      })
    });
    token = data.token; currentUser = data.user;
    localStorage.setItem("sc_token", token);
    localStorage.setItem("sc_user", JSON.stringify(currentUser));
    $("#regNote").textContent = "Account created. Opening portal.";
    setTimeout(openPortal, 500);
  } catch(err) { $("#regNote").textContent = err.message; }
});

$("#loginBtn")?.addEventListener("click", async ()=>{
  try {
    const data = await api("/api/auth/login", {
      method:"POST",
      body: JSON.stringify({ email: $("#loginEmail").value, password: $("#loginPassword").value })
    });
    token = data.token; currentUser = data.user;
    localStorage.setItem("sc_token", token);
    localStorage.setItem("sc_user", JSON.stringify(currentUser));
    $("#loginNote").textContent = "Login successful.";
    setTimeout(openPortal, 400);
  } catch(err) { $("#loginNote").textContent = err.message; }
});

async function openPortal() {
  $$(".modal").forEach(m=>m.classList.remove("active"));
  $("#portal").classList.remove("hidden");
  document.body.style.overflow = "hidden";
  $("#portalTitle").textContent = currentUser?.role === "admin" || currentUser?.role === "officer" ? "Admin Dashboard" : "Client Portal";
  $("#welcomeText").textContent = `Welcome ${currentUser?.name || "Client"}. Role: ${currentUser?.role || "client"}.`;
  await refreshPortal();
}

$$(".exit").forEach(b=>b.onclick=()=>{$("#portal").classList.add("hidden");document.body.style.overflow=""});

$$("[data-tab]").forEach(b=>b.onclick=()=>{
  $$("[data-page]").forEach(p=>p.classList.add("hidden"));
  $(`[data-page="${b.dataset.tab}"]`)?.classList.remove("hidden");
});

async function refreshPortal() {
  await loadApplications();
  await loadDocuments();
  if (currentUser?.role === "admin" || currentUser?.role === "officer") await loadAdmin();
  else {
    $("#stat1").textContent = "85%";
    $("#stat2").textContent = "4";
    $("#stat3").textContent = "2";
  }
}

async function loadApplications() {
  try {
    const data = await api("/api/applications");
    $("#applicationsList").innerHTML = data.applications.length ? data.applications.map(a=>`
      <p><b>${a.service_name}</b> <span class="tag progress">${a.status}</span><br><small>${a.business_name || ""} ${a.notes || ""}</small></p>
    `).join("") : "<p>No applications yet.</p>";
  } catch(err) {
    $("#applicationsList").innerHTML = `<p>${err.message}</p>`;
  }
}

async function loadDocuments() {
  try {
    const data = await api("/api/documents");
    $("#documentsList").innerHTML = data.documents.length ? data.documents.map(d=>`
      <p><b>${d.original_name}</b> <span class="tag neutral">${d.status}</span> <a href="/api/documents/${d.id}/download" target="_blank">Download</a></p>
    `).join("") : "<p>No documents uploaded.</p>";
  } catch(err) {
    $("#documentsList").innerHTML = `<p>${err.message}</p>`;
  }
}

$("#applicationForm")?.addEventListener("submit", async e=>{
  e.preventDefault();
  try {
    await api("/api/applications", {
      method:"POST",
      body: JSON.stringify({ service_id: $("#applicationService").value, notes: $("#applicationNotes").value })
    });
    $("#applicationNotes").value = "";
    await loadApplications();
    alert("Service request submitted.");
  } catch(err) { alert(err.message); }
});

$("#uploadForm")?.addEventListener("submit", async e=>{
  e.preventDefault();
  const fd = new FormData(e.target);
  try {
    await api("/api/documents", { method:"POST", body: fd });
    e.target.reset();
    await loadDocuments();
    alert("Document uploaded.");
  } catch(err) { alert(err.message); }
});

async function loadAdmin() {
  try {
    const stats = await api("/api/admin/stats");
    $("#stat1").textContent = stats.totalClients;
    $("#stat2").textContent = stats.activeCases;
    $("#stat3").textContent = stats.pendingDocuments;
    const apps = await api("/api/applications");
    $("#adminList").innerHTML = apps.applications.map(a=>`
      <p><b>${a.business_name || a.client_name}</b> — ${a.service_name} — <span class="tag progress">${a.status}</span></p>
    `).join("") || "<p>No cases yet.</p>";
  } catch(err) {
    $("#adminList").innerHTML = `<p>${err.message}</p>`;
  }
}

loadServices();
