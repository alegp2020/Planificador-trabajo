const $ = s => { const el = document.querySelector(s); if (!el) console.warn("Elemento no encontrado:", s); return el; }; 
const $$ = s => document.querySelectorAll(s);
let events = JSON.parse(localStorage.getItem("plannerEvents") || "[]");
let current = new Date(); let activeView = "inicio";
let userProfile = JSON.parse(localStorage.getItem("plannerProfile") || '{"name":"Usuario","role":"enfermera"}');
const todayISO = () => new Date().toISOString().slice(0, 10);
const save = () => localStorage.setItem("plannerEvents", JSON.stringify(events));
const saveProfile = () => localStorage.setItem("plannerProfile", JSON.stringify(userProfile));
const fmtDate = d => new Date(d + "T12:00:00").toLocaleDateString("es-ES", { day: "numeric", month: "long" });
const typeName = t => ({ work: "Trabajo", study: "Estudios", personal: "Personal", reminder: "Recordatorio" }[t] || t);
const symbol = t => ({ work: "<i class='fas fa-briefcase-medical'></i>", study: "<i class='fas fa-book-medical'></i>", personal: "<i class='fas fa-heart'></i>", reminder: "<i class='fas fa-bell'></i>" }[t] || "<i class='fas fa-heart'></i>");
const tcaeSymbol = r => ({ medico: "<i class='fas fa-user-md'></i>", enfermera: "<i class='fas fa-user-nurse'></i>", auxiliar: "<i class='fas fa-user-nurse'></i>", celador: "<i class='fas fa-ambulance'></i>", fisioterapeuta: "<i class='fas fa-running'></i>" }[r] || "<i class='fas fa-user-md'></i>");

function initializeProfile() { if (!localStorage.getItem("plannerProfile")) { userProfile = { name: "Usuario", role: "enfermera" }; saveProfile(); updateProfileUI(); } }
function showView(id) { activeView = id; $$(".view").forEach(v => v.classList.toggle("active-view", v.id === id)); $$(".nav-item[data-view]").forEach(b => b.classList.toggle("active", b.dataset.view === id)); renderAll(); }

function updateProfileUI() { 
  $("#profileName").textContent = userProfile.name; 
  $("#heroName").textContent = userProfile.name; 
  const roleIcon = document.createElement("span"); 
  roleIcon.innerHTML = tcaeSymbol(userProfile.role); 
  roleIcon.style.marginRight = "8px"; 
  $(".profile").innerHTML = ""; 
  $(".profile").appendChild(roleIcon); 
  const nameSpan = document.createElement("span"); 
  nameSpan.id = "profileName"; 
  nameSpan.textContent = userProfile.name; 
  $(".profile").appendChild(nameSpan); 
  const heart = document.createElement("span"); 
  heart.textContent = " ✿"; 
  $(".profile").appendChild(heart); 
}

function requestNotificationPermission() { 
  if (!("Notification" in window)) return;
  if (Notification.permission === "granted") { 
    localStorage.setItem("notifications", "true"); 
    setupDailyCheck(); 
    return; 
  } 
  if (Notification.permission === "denied") return;
  Notification.requestPermission().then(permission => { 
    if (permission === "granted") { 
      localStorage.setItem("notifications", "true"); 
      localStorage.setItem("notificationPermission", "granted"); 
      showNotification("¡Notificaciones activadas!", "Ahora recibirás avisos de tus recordatorios"); 
      setupDailyCheck(); 
    } else { 
      localStorage.setItem("notificationPermission", "denied"); 
    } 
  }); 
}

function showNotification(title, body) { 
  if ("Notification" in window && Notification.permission === "granted") { 
    const options = { body: body, icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>✿</text></svg>", tag: "planner-reminder" }; 
    try { new Notification(title, options); } catch (e) { console.error("Error al mostrar notificación:", e); } 
  } 
}

const getNotifiedSet = () => new Set(JSON.parse(localStorage.getItem("notifiedReminders") || "[]"));
const markNotified = key => { const s = getNotifiedSet(); s.add(key); localStorage.setItem("notifiedReminders", JSON.stringify([...s])); };
const nowHM = () => { const d = new Date(); return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0"); };

function checkDailyReminders() {
  const today = todayISO();
  const notified = getNotifiedSet();
  const currentHM = nowHM();
  events.filter(e => e.category === "reminder" && e.date === today).forEach(r => {
    const key = `${r.id}:${today}`;
    if (notified.has(key)) return;
    if (r.start) {
      // Notify once the scheduled time has arrived (checked periodically, so allow the current minute onward).
      if (currentHM >= r.start) { showNotification("Recordatorio", `${r.title} · ${r.start}`); markNotified(key); }
    } else {
      // No specific time: notify once the first time we check it today.
      showNotification("Recordatorio", r.title); markNotified(key);
    }
  });
}

let dailyCheckInterval = null;
function setupDailyCheck() {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  checkDailyReminders();
  if (dailyCheckInterval) return; // avoid stacking multiple intervals
  dailyCheckInterval = setInterval(checkDailyReminders, 30000);
}

$$("[data-view]").forEach(b => b.addEventListener("click", () => { showView(b.dataset.view); if (window.innerWidth <= 768) { $(".sidebar").classList.remove("open"); } }));
$("#mobileMenu").addEventListener("click", () => { $(".sidebar").classList.toggle("open"); });
$("#closeSidebar")?.addEventListener("click", () => { $(".sidebar").classList.remove("open"); });
$("#themeToggle").addEventListener("click", () => { document.body.classList.toggle("dark"); localStorage.setItem("dark", document.body.classList.contains("dark")); });
if (localStorage.getItem("dark") === "true") document.body.classList.add("dark");

updateProfileUI();
initializeProfile();

if ("Notification" in window && Notification.permission === "granted") { 
  localStorage.setItem("notifications", "true");
  setupDailyCheck(); 
}

$$("[data-open]").forEach(b => b.addEventListener("click", () => openModal(b.dataset.open)));

function openModal(type) {
  if (type === "perfil") {
    $("#profileNameConfig").value = userProfile.name; 
    $("#profileRoleConfig").value = userProfile.role; 
    $("#profileModalBackdrop").style.display = "block"; 
    return; 
  } 
  $("#eventType").value = type; 
  $("#modalTitle").textContent = type === "turno" ? "Nuevo turno" : type === "tarea" ? "Nueva tarea" : type === "recordatorio" ? "Nuevo recordatorio" : "Añadir evento"; 
  $("#modalEyebrow").textContent = type === "turno" ? "TU HORARIO" : "NUEVO EVENTO"; 
  $("#eventForm").reset(); 
  $("#date").value = todayISO(); 
  $("#category").value = type === "turno" ? "work" : type === "tarea" ? "study" : type === "recordatorio" ? "reminder" : "personal"; 
  $("#modalBackdrop").classList.add("open"); 
}

$("#closeModal").addEventListener("click", () => $("#modalBackdrop").classList.remove("open"));
$("#modalBackdrop").addEventListener("click", e => { if (e.target.id === "modalBackdrop") $("#modalBackdrop").classList.remove("open"); });
$("#closeProfileModal").addEventListener("click", () => $("#profileModalBackdrop").style.display = "none");
$("#profileModalBackdrop").addEventListener("click", e => { if (e.target.id === "profileModalBackdrop") $("#profileModalBackdrop").style.display = "none"; });

$("#eventForm").addEventListener("submit", e => {
  e.preventDefault();
  const newEvent = { id: Date.now(), title: $("#title").value, date: $("#date").value, start: $("#start").value, end: $("#end").value, category: $("#category").value, notes: $("#notes").value, done: false };
  events.push(newEvent);
  save();
  $("#modalBackdrop").classList.remove("open");
  renderAll();
  if (newEvent.category === "reminder") {
    // Ask for notification permission the first time a reminder is created, so alerts actually work without needing to open "Mi perfil" first.
    if ("Notification" in window && Notification.permission === "default") {
      requestNotificationPermission();
    } else {
      checkDailyReminders();
    }
  }
  showNotification("Evento guardado", `${newEvent.title} ha sido añadido correctamente`);
});

const profileForm = $("#profileForm");
if (profileForm) {
  profileForm.addEventListener("submit", e => {
    e.preventDefault();
    const newName = $("#profileNameConfig").value.trim();
    const newRole = $("#profileRoleConfig").value;
    if (newName) {
      userProfile.name = newName;
      userProfile.role = newRole;
      saveProfile();
      updateProfileUI();
      requestNotificationPermission();
      $("#profileModalBackdrop").style.display = "none";
      showNotification("Perfil actualizado", `¡Hola ${userProfile.name}! Tu perfil ha sido configurado correctamente`);
    } else {
      alert("Por favor, introduce tu nombre");
    }
  });
}

function removeEvent(id) { events = events.filter(e => e.id !== id); save(); renderAll(); showNotification("Evento eliminado", "El evento ha sido eliminado correctamente"); }
function toggleDone(id) { events = events.map(e => e.id === id ? { ...e, done: !e.done } : e); save(); renderAll(); }
function card(e) { const isTask = e.category === "study"; const doneClass = isTask && e.done ? "done" : ""; return `<div class="list-card ${doneClass}"><div class="list-main"><div class="list-symbol">${symbol(e.category)}</div><div><strong>${escapeHtml(e.title)}</strong><p>${fmtDate(e.date)} ${e.start ? "· " + e.start : ""}${e.end ? " – " + e.end : ""}</p>${e.notes ? `<p>${escapeHtml(e.notes)}</p>` : ""}</div></div><span class="tag">${typeName(e.category)}</span>${isTask ? `<button class="check-btn" data-done="${e.id}">${e.done ? "✓" : "○"}</button>` : ""}<button class="delete-btn" data-delete="${e.id}">×</button></div>`; }
function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c])); }

function renderLists() { 
  let shifts = events.filter(e => e.category === "work").sort((a, b) => a.date.localeCompare(b.date)); 
  let tasks = events.filter(e => e.category === "study").sort((a, b) => a.date.localeCompare(b.date)); 
  let reminders = events.filter(e => e.category === "reminder").sort((a, b) => a.date.localeCompare(b.date)); 
  $("#shiftList").innerHTML = shifts.length ? shifts.map(card).join("") : '<div class="empty">Todavía no tienes turnos guardados ✿</div>'; 
  $("#taskList").innerHTML = tasks.length ? tasks.map(card).join("") : '<div class="empty">No tienes tareas pendientes ♡</div>'; 
  $("#reminderList").innerHTML = reminders.length ? reminders.map(card).join("") : '<div class="empty">No tienes recordatorios ✨</div>'; 
  $$("[data-delete]").forEach(b => b.addEventListener("click", () => removeEvent(Number(b.dataset.delete))));
  $$("[data-done]").forEach(b => b.addEventListener("click", () => toggleDone(Number(b.dataset.done)))); 
}

function renderHome() { 
  let upcoming = events.filter(e => e.date >= todayISO()).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5); 
  $("#statShifts").textContent = events.filter(e => e.category === "work").length; 
  $("#statTasks").textContent = events.filter(e => e.category === "study" && !e.done).length; 
  $("#statReminders").textContent = events.filter(e => e.category === "reminder").length; 
  $("#upcoming").innerHTML = upcoming.length ? upcoming.map(e => `<div class="event-card"><div class="event-date"><strong>${new Date(e.date + "T12:00:00").getDate()}</strong><span>${new Date(e.date + "T12:00:00").toLocaleDateString("es-ES", { month: "short" }).toUpperCase()}</span></div><div class="event-info"><strong>${escapeHtml(e.title)}</strong><p>${e.start || "Todo el día"}${e.end ? " – " + e.end : ""} · ${typeName(e.category)}</p></div><span class="tag">${typeName(e.category)}</span></div>`).join("") : '<div class="empty">Tu agenda está libre. Añade tu primer evento ✿</div>'; 
}

function renderCalendar() { 
  let y = current.getFullYear(), m = current.getMonth(); 
  $("#monthTitle").textContent = new Date(y, m, 1).toLocaleDateString("es-ES", { month: "long", year: "numeric" }).replace(/^./, c => c.toUpperCase()); 
  $("#weekdays").innerHTML = ["L", "M", "X", "J", "V", "S", "D"].map(d => `<div>${d}</div>`).join(""); 
  let first = (new Date(y, m, 1).getDay() + 6) % 7; 
  let days = new Date(y, m + 1, 0).getDate(); 
  let prev = new Date(y, m, 0).getDate(); 
  let html = ""; 
  for (let i = 0; i < 42; i++) { 
    let n = i - first + 1; 
    let date, muted = false; 
    if (n < 1) { 
      let prevMonth = m === 0 ? 11 : m - 1;
      let prevYear = m === 0 ? y - 1 : y;
      date = `${prevYear}-${String(prevMonth + 1).padStart(2, "0")}-${String(prev + n).padStart(2, "0")}`; 
      muted = true; 
    } else if (n > days) { 
      let nextMonth = m === 11 ? 0 : m + 1;
      let nextYear = m === 11 ? y + 1 : y;
      date = `${nextYear}-${String(nextMonth + 1).padStart(2, "0")}-${String(n - days).padStart(2, "0")}`; 
      muted = true; 
    } else {
      date = `${y}-${String(m + 1).padStart(2, "0")}-${String(n).padStart(2, "0")}`; 
    }
    let dayNum = n < 1 ? prev + n : n > days ? n - days : n; 
    let ev = events.filter(e => e.date === date); 
    html += `<div class="day ${muted ? "muted" : ""} ${date === todayISO() ? "today" : ""}"><div class="day-number">${dayNum}</div><div class="day-events">${ev.slice(0, 3).map(e => `<div class="day-event ${e.category}" title="${escapeHtml(e.title)}">${escapeHtml(e.title)}</div>`).join("")}</div></div>`; 
  } 
  $("#calendarGrid").innerHTML = html; 
}

$("#prevMonth").addEventListener("click", () => { current.setMonth(current.getMonth() - 1); renderCalendar(); }); 
$("#nextMonth").addEventListener("click", () => { current.setMonth(current.getMonth() + 1); renderCalendar(); }); 
$("#todayBtn").addEventListener("click", () => { current = new Date(); renderCalendar(); }); 

function renderAll() { renderHome(); renderLists(); renderCalendar(); }
$("#todayLabel").textContent = new Date().toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });
renderAll();