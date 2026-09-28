// ===== HELPERS DE FECHA =====
function todayISO(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

// ===== PERSISTENCIA: SUPABASE (nube) con respaldo local =====
const STORAGE_KEY_TASKS = "friday_tasks";
const STORAGE_KEY_CONTACTS = "friday_contacts";
let storageAvailable = true;
let db = null;
let dbReady = false;

function showConnBanner(message) {
  const banner = document.getElementById("connBanner");
  banner.textContent = message;
  banner.hidden = false;
}

function initSupabase() {
  const configured =
    typeof SUPABASE_URL !== "undefined" &&
    typeof SUPABASE_ANON_KEY !== "undefined" &&
    !SUPABASE_URL.startsWith("PEGA_AQUI") &&
    !SUPABASE_ANON_KEY.startsWith("PEGA_AQUI");

  if (!configured) {
    showConnBanner(
      "⚠ Falta configurar Supabase en config.js. Tus datos se guardarán solo en este navegador, no se sincronizarán entre dispositivos."
    );
    return false;
  }

  try {
    db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    return true;
  } catch (err) {
    showConnBanner("⚠ No se pudo iniciar la conexión a la nube. Revisa config.js. Usando guardado local por ahora.");
    return false;
  }
}

function saveTasksLocal() {
  if (!storageAvailable) return;
  try {
    localStorage.setItem(STORAGE_KEY_TASKS, JSON.stringify(tasks));
  } catch (err) {
    showConnBanner("⚠ No se pudieron guardar las tareas en este navegador: " + err.message);
  }
}

function saveContactsLocal() {
  if (!storageAvailable) return;
  try {
    localStorage.setItem(STORAGE_KEY_CONTACTS, JSON.stringify(contacts));
  } catch (err) {
    showConnBanner("⚠ No se pudieron guardar los contactos en este navegador: " + err.message);
  }
}

// ===== DATOS: se cargan de Supabase (o localStorage si no hay conexión) =====
const seedTasks = [
  { id: -1, title: "Entregar ensayo de Historia", category: "escolar", priority: "alta", date: todayISO(0), time: "18:00", done: false },
  { id: -2, title: "Repasar fórmulas de Física", category: "escolar", priority: "media", date: todayISO(0), time: "20:30", done: false },
  { id: -3, title: "Llamar al dentista para agendar cita", category: "personal", priority: "baja", date: todayISO(-1), time: "12:00", done: true },
];

const seedContacts = [
  { id: -1, name: "Prof. Elena Ríos", photo: null, phone: "", email: "", address: "", blood: "", allergies: "", tags: ["Profesor", "Historia"], note: "Recibe ensayos por correo antes de las 6pm.", favorite: false, birthday: null },
  { id: -2, name: "Marco Duarte", photo: null, phone: "", email: "", address: "", blood: "", allergies: "", tags: ["Compañero", "Física"], note: "Compañero de equipo del proyecto de Física.", favorite: false, birthday: null },
];

let tasks = [];
let contacts = [];

async function loadTasks() {
  if (dbReady) {
    const { data, error } = await db.from("tasks").select("*").order("date", { ascending: true });
    if (error) {
      showConnBanner("⚠ No se pudieron cargar las tareas de la nube: " + error.message);
      tasks = [];
    } else {
      tasks = data;
    }
    return;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TASKS);
    tasks = raw ? JSON.parse(raw) : seedTasks;
    if (!raw) saveTasksLocal();
  } catch (err) {
    storageAvailable = false;
    tasks = seedTasks;
  }
}

async function loadContacts() {
  if (dbReady) {
    const { data, error } = await db.from("contacts").select("*").order("name", { ascending: true });
    if (error) {
      showConnBanner("⚠ No se pudieron cargar los contactos de la nube: " + error.message);
      contacts = [];
    } else {
      contacts = data;
    }
    return;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CONTACTS);
    contacts = raw ? JSON.parse(raw) : seedContacts;
    if (!raw) saveContactsLocal();
  } catch (err) {
    storageAvailable = false;
    contacts = seedContacts;
  }
}

let activeFilter = "todas";
let activeContactFilter = "todos";
let editingId = null;
let editingContactId = null;

// ===== NAVEGACIÓN ENTRE PANTALLAS =====
const navButtons = document.querySelectorAll(".nav-btn");
const screens = document.querySelectorAll(".screen");

navButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const target = btn.dataset.target;
    navButtons.forEach((b) => b.classList.toggle("is-active", b === btn));
    screens.forEach((s) => { s.hidden = s.dataset.screen !== target; });
  });
});

// ===== FECHA Y SALUDO =====
function setHeader() {
  const now = new Date();
  const dateFmt = now.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });
  document.getElementById("dateLine").textContent = dateFmt.charAt(0).toUpperCase() + dateFmt.slice(1);

  const hour = now.getHours();
  let saludo = "Buenas noches, Jefe";
  if (hour < 12) saludo = "Buenos días, Jefe";
  else if (hour < 19) saludo = "Buenas tardes, Jefe";
  document.getElementById("greetingLine").textContent = saludo;
}

// ===== DIAL DE PROGRESO =====
const CIRCUMFERENCE = 2 * Math.PI * 50;

function buildDialTicks() {
  const g = document.getElementById("dialTicks");
  const total = 24;
  for (let i = 0; i < total; i++) {
    const angle = (i / total) * 2 * Math.PI;
    const x1 = 60 + Math.cos(angle) * 46;
    const y1 = 60 + Math.sin(angle) * 46;
    const x2 = 60 + Math.cos(angle) * 50;
    const y2 = 60 + Math.sin(angle) * 50;
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", x1); line.setAttribute("y1", y1);
    line.setAttribute("x2", x2); line.setAttribute("y2", y2);
    g.appendChild(line);
  }
}

function updateDial() {
  const todayTasks = tasks.filter((t) => t.date === todayISO(0));
  const base = todayTasks.length ? todayTasks : tasks;
  const total = base.length;
  const done = base.filter((t) => t.done).length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);

  const offset = CIRCUMFERENCE - (pct / 100) * CIRCUMFERENCE;
  document.getElementById("dialProgress").style.strokeDasharray = CIRCUMFERENCE;
  document.getElementById("dialProgress").style.strokeDashoffset = offset;
  document.getElementById("dialValue").textContent = `${pct}%`;

  const pendingTotal = tasks.filter((t) => !t.done).length;
  document.getElementById("taskSummary").textContent =
    pendingTotal === 0
      ? "Bitácora al día. No tienes pendientes."
      : `Tienes ${pendingTotal} ${pendingTotal === 1 ? "pendiente" : "pendientes"} en tu bitácora.`;
}


// ===== CUMPLEAÑOS =====
// Se guarda como texto "MM-DD" (mes-día), sin año, porque normalmente no sabemos el año de nacimiento.
const MONTH_NAMES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
const NAME_TITLES = ["prof","profa","profesor","profesora","dr","dra","doctor","doctora","lic","ing","mtro","mtra","sr","sra","srita","don","doña"];

function firstName(fullName) {
  const words = (fullName || "").trim().split(/\s+/).filter(Boolean);
  const real = words.find((w) => !NAME_TITLES.includes(w.toLowerCase().replace(/\./g, "")));
  return real || words[0] || "";
}

function parseBirthday(value) {
  if (!value || typeof value !== "string") return null;
  const m = value.match(/(\d{2})-(\d{2})$/); // acepta "MM-DD" y también "YYYY-MM-DD"
  if (!m) return null;
  const month = Number(m[1]), day = Number(m[2]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { month, day };
}

function formatBirthday(value, short = false) {
  const b = parseBirthday(value);
  if (!b) return "";
  const monthName = MONTH_NAMES[b.month - 1];
  return short ? `${b.day} ${monthName.slice(0, 3)}` : `${b.day} de ${monthName}`;
}

function nextOccurrence(b, today) {
  let year = today.getFullYear();
  const build = (y) => {
    // 29 de febrero en año no bisiesto -> se celebra el 28
    const isLeap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
    const day = b.month === 2 && b.day === 29 && !isLeap ? 28 : b.day;
    return new Date(y, b.month - 1, day);
  };
  let date = build(year);
  if (date < today) date = build(year + 1);
  return date;
}

function updateBirthdayLine() {
  const el = document.getElementById("birthdayLine");
  const today = new Date(); today.setHours(0, 0, 0, 0);

  let best = null; // { date, names: [] }
  contacts.forEach((c) => {
    const b = parseBirthday(c.birthday);
    if (!b) return;
    const date = nextOccurrence(b, today);
    if (!best || date < best.date) best = { date, names: [firstName(c.name)], raw: c.birthday };
    else if (date.getTime() === best.date.getTime()) best.names.push(firstName(c.name));
  });

  if (!best) { el.hidden = true; el.textContent = ""; return; }

  const names = best.names.length > 1
    ? best.names.slice(0, -1).join(", ") + " y " + best.names[best.names.length - 1]
    : best.names[0];
  const isToday = best.date.getTime() === today.getTime();
  const dateText = formatBirthday(best.raw);
  el.textContent = isToday
    ? `🎂 Hoy cumple ${names} · ${dateText}`
    : `🎂 ${names} · ${dateText}`;
  el.hidden = false;
}

function buildBirthdayDayOptions() {
  const sel = document.getElementById("fieldBirthdayDay");
  for (let d = 1; d <= 31; d++) {
    const opt = document.createElement("option");
    opt.value = String(d).padStart(2, "0");
    opt.textContent = d;
    sel.appendChild(opt);
  }
}

function readBirthdayField() {
  const day = document.getElementById("fieldBirthdayDay").value;
  const month = document.getElementById("fieldBirthdayMonth").value;
  return day && month ? `${month}-${day}` : null;
}

function writeBirthdayField(value) {
  const b = parseBirthday(value);
  document.getElementById("fieldBirthdayDay").value = b ? String(b.day).padStart(2, "0") : "";
  document.getElementById("fieldBirthdayMonth").value = b ? String(b.month).padStart(2, "0") : "";
}

// Mensaje claro si la columna "birthday" aún no existe en Supabase
function contactErrorMessage(prefix, error) {
  if (error && /birthday/i.test(error.message || "")) {
    return "⚠ Falta crear la columna 'birthday' en la tabla contacts de Supabase. Ejecuta en el SQL Editor: alter table contacts add column if not exists birthday text;";
  }
  return prefix + error.message;
}

// ===== HELPERS DE FECHA (visual) =====
function formatDate(dateStr) {
  if (!dateStr) return "Sin fecha";
  const [y, m, d] = dateStr.split("-").map(Number);
  const dateObj = new Date(y, m - 1, d);
  const today = new Date(); today.setHours(0,0,0,0);
  const diffDays = Math.round((dateObj - today) / 86400000);

  if (diffDays === 0) return "Hoy";
  if (diffDays === 1) return "Mañana";
  if (diffDays === -1) return "Ayer";
  return dateObj.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

function isOverdue(task) {
  if (!task.date || task.done) return false;
  return task.date < todayISO(0);
}

// ===== ORDEN: por fecha, luego por prioridad =====
const PRIORITY_ORDER = { alta: 0, media: 1, baja: 2 };

function sortedTasks(list) {
  return [...list].sort((a, b) => {
    const da = a.date || "9999-99-99";
    const db = b.date || "9999-99-99";
    if (da !== db) return da < db ? -1 : 1;
    return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
  });
}

// ===== RENDER TAREAS =====
function renderTasks() {
  const list = document.getElementById("taskList");
  const emptyNote = document.getElementById("taskEmptyNote");
  list.innerHTML = "";

  const visible = sortedTasks(tasks.filter((t) => activeFilter === "todas" || t.category === activeFilter));
  emptyNote.hidden = visible.length !== 0;

  visible.forEach((task) => {
    const li = document.createElement("li");
    li.className = `task-item priority-${task.priority}${task.done ? " is-done" : ""}`;
    li.dataset.id = task.id;

    const dateLabel = formatDate(task.date);
    const overdueClass = isOverdue(task) ? " is-overdue" : "";

    li.innerHTML = `
      <button class="task-check" data-id="${task.id}" aria-label="Marcar como completada">${task.done ? "✓" : ""}</button>
      <div class="task-body" data-id="${task.id}">
        <p class="task-title">${task.title}</p>
        <div class="task-meta">
          <span class="tag tag-${task.category}">${task.category === "escolar" ? "Escolar" : "Personal"}</span>
          <span class="task-date${overdueClass}">${dateLabel}${task.time ? " · " + task.time : ""}</span>
        </div>
      </div>
    `;
    list.appendChild(li);
  });

  list.querySelectorAll(".task-check").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const id = Number(btn.dataset.id) || btn.dataset.id;
      const task = tasks.find((t) => t.id == id);
      const newDone = !task.done;

      if (dbReady) {
        const { error } = await db.from("tasks").update({ done: newDone }).eq("id", task.id);
        if (error) { showConnBanner("⚠ No se pudo actualizar: " + error.message); return; }
      }
      task.done = newDone;
      if (!dbReady) saveTasksLocal();
      renderTasks();
      updateDial();
    });
  });

  list.querySelectorAll(".task-body").forEach((el) => {
    el.addEventListener("click", () => openTaskModal(Number(el.dataset.id)));
  });
}

// ===== FILTROS DE TAREAS =====
document.querySelectorAll("#taskFilterRow .chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    document.querySelectorAll("#taskFilterRow .chip").forEach((c) => c.classList.remove("is-active"));
    chip.classList.add("is-active");
    activeFilter = chip.dataset.filter;
    renderTasks();
  });
});

// ===== MODAL: CREAR / EDITAR TAREA =====
const overlay = document.getElementById("taskModalOverlay");
const form = document.getElementById("taskForm");
const modalTitle = document.getElementById("modalTitle");
const btnDelete = document.getElementById("btnDeleteTask");

function setSegmentedValue(containerId, value) {
  document.querySelectorAll(`#${containerId} .segment`).forEach((seg) => {
    seg.classList.toggle("is-active", seg.dataset.value === value);
  });
}
function getSegmentedValue(containerId) {
  return document.querySelector(`#${containerId} .segment.is-active`).dataset.value;
}
document.querySelectorAll(".segmented").forEach((group) => {
  group.addEventListener("click", (e) => {
    const btn = e.target.closest(".segment");
    if (!btn) return;
    group.querySelectorAll(".segment").forEach((s) => s.classList.remove("is-active"));
    btn.classList.add("is-active");
  });
});

function openTaskModal(id = null) {
  editingId = id;
  if (id === null) {
    modalTitle.textContent = "Nueva tarea";
    form.reset();
    document.getElementById("fieldDate").value = todayISO(0);
    setSegmentedValue("fieldCategory", "escolar");
    setSegmentedValue("fieldPriority", "media");
    btnDelete.hidden = true;
  } else {
    const task = tasks.find((t) => t.id == id);
    modalTitle.textContent = "Editar tarea";
    document.getElementById("fieldTitle").value = task.title;
    document.getElementById("fieldDate").value = task.date || "";
    document.getElementById("fieldTime").value = task.time || "";
    setSegmentedValue("fieldCategory", task.category);
    setSegmentedValue("fieldPriority", task.priority);
    btnDelete.hidden = false;
  }
  overlay.hidden = false;
  document.getElementById("fieldTitle").focus();
}

function closeTaskModal() {
  overlay.hidden = true;
  editingId = null;
}

document.getElementById("btnAddTask").addEventListener("click", () => openTaskModal(null));
document.getElementById("modalClose").addEventListener("click", closeTaskModal);
overlay.addEventListener("click", (e) => { if (e.target === overlay) closeTaskModal(); });

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const title = document.getElementById("fieldTitle").value.trim();
  if (!title) return;

  const payload = {
    title,
    date: document.getElementById("fieldDate").value || null,
    time: document.getElementById("fieldTime").value || null,
    category: getSegmentedValue("fieldCategory"),
    priority: getSegmentedValue("fieldPriority"),
  };

  if (editingId === null) {
    if (dbReady) {
      const { data, error } = await db.from("tasks").insert({ ...payload, done: false }).select().single();
      if (error) { showConnBanner("⚠ No se pudo guardar: " + error.message); return; }
      tasks.push(data);
    } else {
      tasks.push({ id: Date.now(), done: false, ...payload });
    }
  } else {
    if (dbReady) {
      const { error } = await db.from("tasks").update(payload).eq("id", editingId);
      if (error) { showConnBanner("⚠ No se pudo actualizar: " + error.message); return; }
    }
    const task = tasks.find((t) => t.id == editingId);
    Object.assign(task, payload);
  }

  if (!dbReady) saveTasksLocal();
  closeTaskModal();
  renderTasks();
  updateDial();
});

btnDelete.addEventListener("click", async () => {
  if (editingId === null) return;
  if (dbReady) {
    const { error } = await db.from("tasks").delete().eq("id", editingId);
    if (error) { showConnBanner("⚠ No se pudo eliminar: " + error.message); return; }
  }
  tasks = tasks.filter((t) => t.id != editingId);
  if (!dbReady) saveTasksLocal();
  closeTaskModal();
  renderTasks();
  updateDial();
});

// ===== RENDER CONTACTOS =====
function renderContacts(query = "") {
  const list = document.getElementById("contactList");
  const emptyNote = document.getElementById("contactEmptyNote");
  list.innerHTML = "";
  const q = query.trim().toLowerCase();
  const visible = contacts.filter((c) =>
    (activeContactFilter === "todos" || !!c.favorite) &&
    (c.name.toLowerCase().includes(q) ||
    (c.note || "").toLowerCase().includes(q) ||
    (c.tags || []).some((t) => t.toLowerCase().includes(q)))
  );

  emptyNote.hidden = visible.length !== 0;
  if (visible.length === 0) {
    emptyNote.textContent = activeContactFilter === "favoritos"
      ? "Todavía no tienes contactos en favoritos. Toca la estrella de un contacto para agregarlo."
      : "No hay entradas en este filtro. Añade un nuevo contacto.";
  }

  visible.forEach((c) => {
    const initials = c.name.split(" ").filter((w) => w[0] === w[0].toUpperCase()).slice(0, 2).map((w) => w[0]).join("");
    const tagsHtml = (c.tags || []).map((t) => `<span class="contact-tag">${t}</span>`).join("");
    const avatarInner = c.photo
      ? `<img src="${c.photo}" alt="" />`
      : initials;
    const isFav = !!c.favorite;
    const li = document.createElement("li");
    li.className = "contact-item";
    li.dataset.id = c.id;
    li.innerHTML = `
      <div class="contact-avatar">${avatarInner}</div>
      <div class="contact-body">
        <p class="contact-name">${c.name}</p>
        <div class="contact-tags">${tagsHtml}</div>
        <p class="contact-note">${c.note || ""}</p>
        ${c.birthday ? `<p class="contact-birthday">🎂 ${formatBirthday(c.birthday)}</p>` : ""}
      </div>
      <button type="button" class="star-btn contact-star${isFav ? " is-active" : ""}" data-id="${c.id}" aria-label="${isFav ? "Quitar de favoritos" : "Agregar a favoritos"}" aria-pressed="${isFav}">${isFav ? "★" : "☆"}</button>
    `;
    list.appendChild(li);
  });

  list.querySelectorAll(".contact-item").forEach((el) => {
    el.addEventListener("click", () => openContactModal(Number(el.dataset.id)));
  });

  list.querySelectorAll(".contact-star").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleFavorite(Number(btn.dataset.id));
    });
  });
}
document.getElementById("contactSearch").addEventListener("input", (e) => renderContacts(e.target.value));

// ===== FILTROS DE CONTACTOS (Conocidos / Favoritos) =====
document.querySelectorAll("#contactFilterRow .chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    document.querySelectorAll("#contactFilterRow .chip").forEach((c) => c.classList.remove("is-active"));
    chip.classList.add("is-active");
    activeContactFilter = chip.dataset.filter;
    renderContacts(document.getElementById("contactSearch").value);
  });
});

// ===== FAVORITOS: agregar/quitar sin clonar ni eliminar el contacto =====
async function toggleFavorite(id) {
  const c = contacts.find((x) => x.id == id);
  if (!c) return;
  const newFavorite = !c.favorite;

  if (dbReady) {
    const { error } = await db.from("contacts").update({ favorite: newFavorite }).eq("id", id);
    if (error) { showConnBanner("⚠ No se pudo actualizar favoritos: " + error.message); return; }
  }

  c.favorite = newFavorite;
  if (!dbReady) saveContactsLocal();

  // Si el contacto que se está editando en el modal es este, refleja el cambio ahí también.
  if (editingContactId !== null && editingContactId == id) {
    setFavoriteButtonState(newFavorite);
  }

  renderContacts(document.getElementById("contactSearch").value);
}

// ===== MODAL: CREAR / EDITAR CONTACTO (expediente) =====
const contactOverlay = document.getElementById("contactModalOverlay");
const contactForm = document.getElementById("contactForm");
const contactModalTitle = document.getElementById("contactModalTitle");
const btnDeleteContact = document.getElementById("btnDeleteContact");
const dossierFileNumber = document.getElementById("dossierFileNumber");
const btnFavoriteContact = document.getElementById("btnFavoriteContact");
let pendingFavorite = false; // estado de favorito del contacto que se está creando/editando en el modal

function setFavoriteButtonState(isFav) {
  pendingFavorite = isFav;
  btnFavoriteContact.classList.toggle("is-active", isFav);
  btnFavoriteContact.textContent = isFav ? "★" : "☆";
  btnFavoriteContact.setAttribute("aria-pressed", isFav ? "true" : "false");
  btnFavoriteContact.setAttribute("aria-label", isFav ? "Quitar de favoritos" : "Agregar a favoritos");
}

btnFavoriteContact.addEventListener("click", () => setFavoriteButtonState(!pendingFavorite));

const photoFrame = document.getElementById("btnPhotoUpload");
const photoInput = document.getElementById("fieldContactPhoto");
const photoPreview = document.getElementById("photoPreview");
const photoPlaceholder = document.getElementById("photoPlaceholder");
let pendingPhoto = null; // dataURL de la foto seleccionada en este formulario

photoFrame.addEventListener("click", () => photoInput.click());

photoInput.addEventListener("change", () => {
  const file = photoInput.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    pendingPhoto = reader.result;
    photoPreview.src = pendingPhoto;
    photoPreview.hidden = false;
    photoPlaceholder.hidden = true;
  };
  reader.readAsDataURL(file);
});

function resetPhotoField(existingPhoto = null) {
  pendingPhoto = existingPhoto;
  if (existingPhoto) {
    photoPreview.src = existingPhoto;
    photoPreview.hidden = false;
    photoPlaceholder.hidden = true;
  } else {
    photoPreview.hidden = true;
    photoPreview.src = "";
    photoPlaceholder.hidden = false;
  }
  photoInput.value = "";
}

function fileNumberFor(id) {
  const n = Math.abs(id) % 1000;
  return "N.º " + String(n).padStart(3, "0");
}

function openContactModal(id = null) {
  editingContactId = id;
  if (id === null) {
    contactModalTitle.textContent = "Nuevo contacto";
    contactForm.reset();
    resetPhotoField(null);
    writeBirthdayField(null);
    setFavoriteButtonState(false);
    dossierFileNumber.textContent = fileNumberFor(Date.now());
    btnDeleteContact.hidden = true;
  } else {
    const c = contacts.find((x) => x.id == id);
    contactModalTitle.textContent = "Editar contacto";
    dossierFileNumber.textContent = fileNumberFor(c.id);
    document.getElementById("fieldContactName").value = c.name;
    document.getElementById("fieldContactPhone").value = c.phone || "";
    document.getElementById("fieldContactEmail").value = c.email || "";
    document.getElementById("fieldContactAddress").value = c.address || "";
    document.getElementById("fieldContactBlood").value = c.blood || "";
    document.getElementById("fieldContactAllergies").value = c.allergies || "";
    document.getElementById("fieldContactTags").value = (c.tags || []).join(", ");
    document.getElementById("fieldContactNote").value = c.note || "";
    writeBirthdayField(c.birthday);
    resetPhotoField(c.photo || null);
    setFavoriteButtonState(!!c.favorite);
    btnDeleteContact.hidden = false;
  }
  contactOverlay.hidden = false;
  document.getElementById("fieldContactName").focus();
}

function closeContactModal() {
  contactOverlay.hidden = true;
  editingContactId = null;
}

document.getElementById("btnAddContact").addEventListener("click", () => openContactModal(null));
document.getElementById("contactModalClose").addEventListener("click", closeContactModal);
contactOverlay.addEventListener("click", (e) => { if (e.target === contactOverlay) closeContactModal(); });

contactForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = document.getElementById("fieldContactName").value.trim();
  if (!name) return;

  const tags = document.getElementById("fieldContactTags").value
    .split(",").map((t) => t.trim()).filter(Boolean);

  const payload = {
    name,
    photo: pendingPhoto,
    phone: document.getElementById("fieldContactPhone").value.trim(),
    email: document.getElementById("fieldContactEmail").value.trim(),
    address: document.getElementById("fieldContactAddress").value.trim(),
    blood: document.getElementById("fieldContactBlood").value.trim(),
    allergies: document.getElementById("fieldContactAllergies").value.trim(),
    tags,
    note: document.getElementById("fieldContactNote").value.trim(),
    favorite: pendingFavorite,
    birthday: readBirthdayField(),
  };

  if (editingContactId === null) {
    if (dbReady) {
      const { data, error } = await db.from("contacts").insert(payload).select().single();
      if (error) { showConnBanner(contactErrorMessage("⚠ No se pudo guardar el contacto: ", error)); return; }
      contacts.push(data);
    } else {
      contacts.push({ id: Date.now(), ...payload });
    }
  } else {
    if (dbReady) {
      const { error } = await db.from("contacts").update(payload).eq("id", editingContactId);
      if (error) { showConnBanner(contactErrorMessage("⚠ No se pudo actualizar el contacto: ", error)); return; }
    }
    const c = contacts.find((x) => x.id == editingContactId);
    Object.assign(c, payload);
  }

  if (!dbReady) saveContactsLocal();
  closeContactModal();
  renderContacts(document.getElementById("contactSearch").value);
  updateBirthdayLine();
});

btnDeleteContact.addEventListener("click", async () => {
  if (editingContactId === null) return;
  if (dbReady) {
    const { error } = await db.from("contacts").delete().eq("id", editingContactId);
    if (error) { showConnBanner("⚠ No se pudo eliminar el contacto: " + error.message); return; }
  }
  contacts = contacts.filter((x) => x.id != editingContactId);
  if (!dbReady) saveContactsLocal();
  closeContactModal();
  renderContacts(document.getElementById("contactSearch").value);
  updateBirthdayLine();
});

// ===== VOZ: RECONOCIMIENTO (hablar → texto) =====
const btnMic = document.getElementById("btnMic");
const micNote = document.getElementById("micNote");
const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
let isListening = false;

if (SpeechRecognitionAPI) {
  recognition = new SpeechRecognitionAPI();
  recognition.lang = "es-MX";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.addEventListener("start", () => {
    isListening = true;
    btnMic.classList.add("is-listening");
    micNote.textContent = "Escuchando… habla ahora.";
  });

  recognition.addEventListener("result", (event) => {
    const transcript = event.results[0][0].transcript;
    chatInput.value = transcript;
    sendChatMessage();
  });

  recognition.addEventListener("error", () => {
    micNote.textContent = "No entendí eso. Toca el micrófono para intentar de nuevo.";
  });

  recognition.addEventListener("end", () => {
    isListening = false;
    btnMic.classList.remove("is-listening");
    if (micNote.textContent === "Escuchando… habla ahora.") {
      micNote.textContent = "Toca el micrófono y habla — se transcribe solo.";
    }
  });

  btnMic.addEventListener("click", () => {
    if (isListening) {
      recognition.stop();
    } else {
      recognition.start();
    }
  });
} else {
  btnMic.disabled = true;
  micNote.textContent = "Tu navegador no soporta comandos de voz — usa el teclado.";
}

// ===== VOZ: SÍNTESIS (texto → hablar) =====
const btnVoiceToggle = document.getElementById("btnVoiceToggle");
let voiceEnabled = true;

btnVoiceToggle.addEventListener("click", () => {
  voiceEnabled = !voiceEnabled;
  btnVoiceToggle.classList.toggle("is-active", voiceEnabled);
  btnVoiceToggle.textContent = voiceEnabled ? "🔊" : "🔇";
  if (!voiceEnabled) window.speechSynthesis.cancel();
});

function speak(text) {
  if (!voiceEnabled || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "es-MX";
  window.speechSynthesis.speak(utterance);
}

// ===== CHAT CON FRIDAY (IA real vía /api/friday) =====
const chatLog = document.getElementById("chatLog");
const chatInput = document.getElementById("chatInput");
const btnSendChat = document.getElementById("btnSendChat");
let chatHistory = []; // [{ role: "user"|"friday", text }]

function appendBubble(role, text) {
  const div = document.createElement("div");
  div.className = `chat-bubble bubble-${role === "friday" ? "friday" : "user"}`;
  div.textContent = text;
  chatLog.appendChild(div);
  chatLog.scrollTop = chatLog.scrollHeight;
  return div;
}

async function sendChatMessage() {
  const text = chatInput.value.trim();
  if (!text) return;

  appendBubble("user", text);
  chatHistory.push({ role: "user", text });
  chatInput.value = "";
  btnSendChat.disabled = true;

  const typingBubble = appendBubble("friday", "Escribiendo…");
  typingBubble.classList.add("is-typing");

  try {
    const response = await fetch("/api/friday", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: text,
        history: chatHistory.slice(0, -1),
        tasks,
        contacts,
      }),
    });
    const data = await response.json();

    typingBubble.remove();

    if (!response.ok) {
      appendBubble("friday", "⚠ " + (data.error || "Algo salió mal al conectar."));
      document.getElementById("fridayStatusDot").classList.add("is-offline");
      return;
    }

    appendBubble("friday", data.text);
    chatHistory.push({ role: "friday", text: data.text });
    document.getElementById("fridayStatusDot").classList.remove("is-offline");
    speak(data.text);
  } catch (err) {
    typingBubble.remove();
    appendBubble("friday", "⚠ No pude conectarme. Revisa tu conexión o la configuración de GEMINI_API_KEY en Vercel.");
    document.getElementById("fridayStatusDot").classList.add("is-offline");
  } finally {
    btnSendChat.disabled = false;
  }
}

btnSendChat.addEventListener("click", sendChatMessage);
chatInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendChatMessage();
});

// ===== INIT =====
async function init() {
  setHeader();
  buildDialTicks();
  buildBirthdayDayOptions();
  dbReady = initSupabase();
  await loadTasks();
  await loadContacts();
  updateDial();
  updateBirthdayLine();
  renderTasks();
  renderContacts();
}
init()
  .catch((err) => console.error("Error de inicialización:", err))
  .finally(() => {
    if (typeof window.hideSplash === "function") window.hideSplash();
  });
