(() => {
  "use strict";
  const STORAGE_KEY = "agentflow_agents_v1";
  const defaultAgents = [
    {id:"a1",name:"Priya Sharma",email:"priya@company.com",role:"Digital Marketing Specialist",status:"Available",color:0},
    {id:"a2",name:"Arjun Kumar",email:"arjun@company.com",role:"SEO Specialist",status:"Busy",color:1},
    {id:"a3",name:"Meera Krishnan",email:"meera@company.com",role:"Social Media Manager",status:"Available",color:2},
    {id:"a4",name:"Rahul Verma",email:"rahul@company.com",role:"Content Strategist",status:"Busy",color:3},
    {id:"a5",name:"Ananya Reddy",email:"ananya@company.com",role:"Performance Marketing",status:"Available",color:4},
    {id:"a6",name:"Vikram Patel",email:"vikram@company.com",role:"Campaign Manager",status:"Available",color:5}
  ];
  const colors = [
    ["#087e71","#d9f5ed"],["#6652e9","#e7e2ff"],["#d94e7c","#ffe0ec"],
    ["#3975d9","#dceaff"],["#bf7614","#ffebc2"],["#8150dc","#eee2ff"]
  ];
  const $ = (selector) => document.querySelector(selector);
  const grid = $("#agentGrid"), modal = $("#agentModal"), form = $("#agentForm");
  let agents = [], toastTimer;
async function loadFromServer() {
  try {
    const response = await fetch("/api/agents");
    if (!response.ok) throw new Error("Server error");
    agents = await response.json();

    if (agents.length === 0 &&
        !localStorage.getItem("agentflow_backend_seeded_v1")) {
      for (const agent of defaultAgents) {
        const result = await fetch("/api/agents", {
          method: "POST",
          headers: {"Content-Type": "application/json"},
          body: JSON.stringify(agent)
        });
        if (!result.ok) throw new Error("Could not add default agents");
      }
      localStorage.setItem("agentflow_backend_seeded_v1", "yes");
      const updated = await fetch("/api/agents");
      agents = await updated.json();
    } else {
      localStorage.setItem("agentflow_backend_seeded_v1", "yes");
    }

    render();
  } catch (error) {
    console.error(error);
    showToast("Server connect aagala. Check server.js.");
  }
}  function loadAgents(){
    try { const saved = localStorage.getItem(STORAGE_KEY); if(saved){const parsed=JSON.parse(saved);if(Array.isArray(parsed)) return parsed;} } catch(e) { console.warn("Could not read saved agents",e); }
    return defaultAgents.map(a=>({...a}));
  }
  function saveAgents(){ try { localStorage.setItem(STORAGE_KEY,JSON.stringify(agents)); } catch(e) { showToast("Could not save changes in this browser."); } }
  function initials(name){return name.trim().split(/\s+/).slice(0,2).map(p=>p[0]||"").join("").toUpperCase();}
  function escapeHTML(value){return String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
  function getFiltered(){
    const query=$("#agentSearch").value.trim().toLowerCase(), status=$("#statusFilter").value;
    return agents.filter(a=>{
      const matchesStatus=status==="all"||a.status===status;
      const matchesQuery=!query||[a.name,a.email,a.role].some(v=>String(v).toLowerCase().includes(query));
      return matchesStatus&&matchesQuery;
    });
  }
  function render(){
    const filtered=getFiltered();
    grid.innerHTML=filtered.map((a,i)=>{
      const palette=colors[(Number(a.color)||0)%colors.length], available=a.status==="Available";
      return `<article class="agent-card" style="--agent-accent:${palette[0]};--agent-bg:${palette[1]};--status-color:${available?'#12b886':'#f08a37'};animation-delay:${Math.min(i*55,330)}ms">
        <div class="agent-head"><div class="agent-avatar">${escapeHTML(initials(a.name))}</div><div class="agent-info"><h3 title="${escapeHTML(a.name)}">${escapeHTML(a.name)}</h3><p title="${escapeHTML(a.role)}">${escapeHTML(a.role)}</p></div><button class="card-menu" type="button" data-edit="${escapeHTML(a.id)}" aria-label="Edit ${escapeHTML(a.name)}">•••</button></div>
        <div class="card-divider"></div>
        <div class="status-row"><span class="status-label">CURRENT STATUS</span><span class="status-badge ${available?'available':'busy'}">${escapeHTML(a.status)}</span><select class="agent-status-select" data-status="${escapeHTML(a.id)}" aria-label="Change ${escapeHTML(a.name)} status"><option ${available?'selected':''}>Available</option><option ${!available?'selected':''}>Busy</option></select></div>
        <div class="agent-footer"><span class="agent-email" title="${escapeHTML(a.email)}">✉ &nbsp;${escapeHTML(a.email)}</span><button class="edit-link" type="button" data-edit="${escapeHTML(a.id)}">Edit details ↗</button></div>
      </article>`;
    }).join("");
    $("#emptyState").classList.toggle("hidden",filtered.length>0);
    grid.classList.toggle("hidden",filtered.length===0);
    $("#agentCount").textContent=`${agents.length} ${agents.length===1?"agent":"agents"}`;
    $("#showingCount").textContent=`Showing ${filtered.length} of ${agents.length} agents`;
    updateStats();
    updateAnalytics();
  }
  function animateNumber(el,target,suffix=""){
    const current=Number((el.dataset.current||"0").replace("%",""))||0;
    const start=performance.now(), duration=750;
    function tick(now){const t=Math.min((now-start)/duration,1), eased=1-Math.pow(1-t,3), value=Math.round(current+(target-current)*eased);el.textContent=value+suffix;if(t<1)requestAnimationFrame(tick);else el.dataset.current=String(target);}
    requestAnimationFrame(tick);
  }
  function updateStats(){
    const total=agents.length, available=agents.filter(a=>a.status==="Available").length, busy=total-available, rate=total?Math.round(available/total*100):0;
    animateNumber($('[data-stat="total"]'),total);animateNumber($('[data-stat="available"]'),available);animateNumber($('[data-stat="busy"]'),busy);animateNumber($('[data-stat="rate"]'),rate,"%");
    $("#availabilityProgress").style.width=rate+"%";
  }

  function updateAnalytics(){
    const total=agents.length, available=agents.filter(a=>a.status==="Available").length, busy=total-available;
    const availablePct=total?available/total*100:0;
    const busyPct=total?busy/total*100:0;
    const donut=$("#statusDonut");
    donut.style.background=`conic-gradient(#14b88a 0 ${availablePct}%, #f39a48 ${availablePct}% 100%)`;
    donut.setAttribute("aria-label",`${available} available and ${busy} busy out of ${total} agents`);
    $("#donutTotal").textContent=total;
    $("#donutAvailable").textContent=available;
    $("#donutBusy").textContent=busy;
  }
  function showToast(message){const el=$("#toast");el.textContent=message;el.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove("show"),2600);}
  function openModal(agent=null){
    form.reset();$("#formError").classList.add("hidden");$("#agentId").value=agent?.id||"";
    $("#modalTitle").textContent=agent?"Edit agent details":"Add new agent";
    if(agent){$("#agentName").value=agent.name;$("#agentEmail").value=agent.email;$("#agentRole").value=agent.role;$("#agentStatus").value=agent.status;}
    modal.classList.remove("hidden");document.body.style.overflow="hidden";setTimeout(()=>$("#agentName").focus(),80);
  }
  function closeModal(){modal.classList.add("hidden");document.body.style.overflow="";}
  function editAgent(id){const agent=agents.find(a=>a.id===id);if(agent)openModal(agent);}
  $("#addAgentBtn").addEventListener("click",()=>openModal());
  $("#quickAdd").addEventListener("click",()=>openModal());
  $("#closeModal").addEventListener("click",closeModal);
  $("#cancelModal").addEventListener("click",closeModal);
  modal.addEventListener("click",e=>{if(e.target===modal)closeModal();});
  document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!modal.classList.contains("hidden"))closeModal();if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="k"){e.preventDefault();$("#agentSearch").focus();}});
form.addEventListener("submit", async e => {
  e.preventDefault();

  const id = $("#agentId").value;
  const name = $("#agentName").value.trim();
  const email = $("#agentEmail").value.trim();
  const role = $("#agentRole").value.trim();
  const status = $("#agentStatus").value;
  const error = $("#formError");

  if (!name || !email || !role) {
    error.textContent = "Please fill in all required fields.";
    error.classList.remove("hidden");
    return;
  }

  if (agents.some(a =>
    a.email.toLowerCase() === email.toLowerCase() &&
    String(a.id) !== String(id)
  )) {
    error.textContent = "An agent with this email already exists.";
    error.classList.remove("hidden");
    return;
  }

  const existing = agents.find(a => String(a.id) === String(id));
  const payload = {
    name, email, role, status,
    color: existing?.color ?? (agents.length % colors.length)
  };

  try {
    const url = id
      ? `/api/agents/${encodeURIComponent(id)}`
      : "/api/agents";

    const response = await fetch(url, {
      method: id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Save failed");

    await loadFromServer();
    closeModal();
    showToast(id ? "Agent details updated." : "New agent added successfully.");
  } catch (err) {
    error.textContent = "Save failed: " + err.message;
    error.classList.remove("hidden");
  }
});  grid.addEventListener("click",e=>{const btn=e.target.closest("[data-edit]");if(btn)editAgent(btn.dataset.edit);});
  grid.addEventListener("change", async e => {
  const select = e.target.closest("[data-status]");
  if (!select) return;

  const agent = agents.find(a => a.id === select.dataset.status);
  if (!agent) return;

  const oldStatus = agent.status;

  try {
    const response = await fetch(
      `/api/agents/${encodeURIComponent(agent.id)}/status`,
      {
        method: "PATCH",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({status: select.value})
      }
    );

    if (!response.ok) throw new Error("Status save failed");

    agent.status = select.value;
    render();
    showToast(`${agent.name}'s status saved successfully.`);
  } catch (error) {
    select.value = oldStatus;
    showToast("Status save aagala. Server check pannu.");
  }
});
  function syncSearch(value){$("#agentSearch").value=value;$("#topSearch").value=value;render();}
  $("#agentSearch").addEventListener("input",e=>syncSearch(e.target.value));
  $("#topSearch").addEventListener("input",e=>syncSearch(e.target.value));
  $("#statusFilter").addEventListener("change",render);
  $("#clearFiltersBtn").addEventListener("click",()=>{syncSearch("");$("#statusFilter").value="all";render();});
  $("#refreshBtn").addEventListener("click",()=>{render();showToast("Dashboard refreshed.");});
  $("#focusSearch").addEventListener("click",()=>$("#agentSearch").focus());
  $("#quickFilter").addEventListener("click",()=>{$("#statusFilter").focus();$("#statusFilter").scrollIntoView({behavior:"smooth",block:"center"});});
  loadFromServer();
})();