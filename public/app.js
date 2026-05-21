const form = document.querySelector("#itemForm");
const list = document.querySelector("#itemsList");
const template = document.querySelector("#itemTemplate");
const emptyState = document.querySelector("#emptyState");
const syncStatus = document.querySelector("#syncStatus");
const openCount = document.querySelector("#openCount");
const doneCount = document.querySelector("#doneCount");
const clearButton = document.querySelector("#clearButton");
const filterButtons = document.querySelectorAll(".filter");
const openAddButton = document.querySelector("#openAddButton");
const openChartButton = document.querySelector("#openChartButton");
const closeAddButton = document.querySelector("#closeAddButton");
const addPanel = document.querySelector("#addPanel");
const chartPanel = document.querySelector("#chartPanel");
const closeChartButton = document.querySelector("#closeChartButton");
const chartTypeInput = document.querySelector("#chartTypeInput");
const expenseChart = document.querySelector("#expenseChart");
const chartTotal = document.querySelector("#chartTotal");
const confirmPanel = document.querySelector("#confirmPanel");
const cancelClearButton = document.querySelector("#cancelClearButton");
const confirmClearButton = document.querySelector("#confirmClearButton");
const dashboardView = document.querySelector("#dashboardView");
const shoppingView = document.querySelector("#shoppingView");
const expensesView = document.querySelector("#expensesView");
const vaultView = document.querySelector("#vaultView");
const calendarView = document.querySelector("#calendarView");
const notesView = document.querySelector("#notesView");
const shoppingBadge = document.querySelector("#shoppingBadge");
const calendarBadge = document.querySelector("#calendarBadge");
const notesBadge = document.querySelector("#notesBadge");
const currentDayIcons = document.querySelectorAll("[data-current-day]");
const backToDashboardButton = document.querySelector("#backToDashboardButton");
const expensesList = document.querySelector("#expensesList");
const expenseTemplate = document.querySelector("#expenseTemplate");
const expensesEmptyState = document.querySelector("#expensesEmptyState");
const expenseTotal = document.querySelector("#expenseTotal");
const currentMonthLabel = document.querySelector("#currentMonthLabel");
const currentMonthTotal = document.querySelector("#currentMonthTotal");
const expenseStatus = document.querySelector("#expenseStatus");
const productField = document.querySelector("#productField");
const expenseTypeField = document.querySelector("#expenseTypeField");
const expenseMonthField = document.querySelector("#expenseMonthField");
const expenseMonthInput = document.querySelector("#expenseMonthInput");
const vaultMovementField = document.querySelector("#vaultMovementField");
const vaultMovementInput = document.querySelector("#vaultMovementInput");
const vaultStatus = document.querySelector("#vaultStatus");
const vaultBalance = document.querySelector("#vaultBalance");
const vaultAmountInput = document.querySelector("#vaultAmountInput");
const vaultPlusButton = document.querySelector("#vaultPlusButton");
const vaultMinusButton = document.querySelector("#vaultMinusButton");
const calendarList = document.querySelector("#calendarList");
const calendarTemplate = document.querySelector("#calendarTemplate");
const calendarEmptyState = document.querySelector("#calendarEmptyState");
const calendarStatus = document.querySelector("#calendarStatus");
const calendarCount = document.querySelector("#calendarCount");
const nextEventLabel = document.querySelector("#nextEventLabel");
const calendarDateField = document.querySelector("#calendarDateField");
const calendarTimeField = document.querySelector("#calendarTimeField");
const calendarDateInput = document.querySelector("#calendarDateInput");
const calendarTimeInput = document.querySelector("#calendarTimeInput");
const notesList = document.querySelector("#notesList");
const noteTemplate = document.querySelector("#noteTemplate");
const notesEmptyState = document.querySelector("#notesEmptyState");
const notesStatus = document.querySelector("#notesStatus");
const notesCount = document.querySelector("#notesCount");
const nameInput = document.querySelector("#nameInput");
const quantityInput = document.querySelector("#quantityInput");
const noteInput = document.querySelector("#noteInput");
const urgentInput = document.querySelector("#urgentInput");
const quantityLabelText = document.querySelector("#quantityLabelText");
const addPanelTitle = document.querySelector("#addPanelTitle");

let items = [];
let expenses = loadExpenses();
let vaultMovements = loadVaultMovements();
let calendarEvents = loadCalendarEvents();
let notes = loadNotes();
let activeFilter = "open";
let activeTool = "dashboard";
let lastUpdatedAt = "";
let isSaving = false;
let pendingOperations = 0;
const monthNames = [
  "",
  "GENNAIO",
  "FEBBRAIO",
  "MARZO",
  "APRILE",
  "MAGGIO",
  "GIUGNO",
  "LUGLIO",
  "AGOSTO",
  "SETTEMBRE",
  "OTTOBRE",
  "NOVEMBRE",
  "DICEMBRE"
];
const shortDayFormatter = new Intl.DateTimeFormat("it-IT", { weekday: "short" });
const shortDateFormatter = new Intl.DateTimeFormat("it-IT", { day: "2-digit", month: "short" });

async function api(path, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);

  const response = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    signal: controller.signal,
    ...options
  }).finally(() => clearTimeout(timeout));

  let payload = {};
  try {
    payload = await response.json();
  } catch {
    payload = {};
  }

  if (response.status === 401) {
    window.location.href = "/login.html";
    throw new Error(payload.error || "Serve la password di famiglia.");
  }

  if (!response.ok) {
    throw new Error(payload.error || "Operazione non riuscita.");
  }

  return payload;
}

async function loadItems(showFreshStatus = false) {
  if (pendingOperations > 0) return;

  try {
    const data = await api("/api/items");
    if (!showFreshStatus && data.updatedAt === lastUpdatedAt) {
      syncStatus.textContent = `Ultimo aggiornamento: ${formatTime(lastUpdatedAt)}`;
      return;
    }
    items = data.items || [];
    lastUpdatedAt = data.updatedAt || "";
    render();
    syncStatus.textContent = showFreshStatus
      ? "Lavagna aggiornata adesso"
      : `Ultimo aggiornamento: ${formatTime(lastUpdatedAt)}`;
  } catch {
    syncStatus.textContent = "Non riesco a raggiungere la lavagna. Riprovo tra poco.";
  }
}

function render() {
  list.innerHTML = "";
  const visibleItems = items.filter(item => {
    if (activeFilter === "done") return item.done;
    if (activeFilter === "open") return !item.done;
    return true;
  });

  openCount.textContent = items.filter(item => !item.done).length;
  doneCount.textContent = items.filter(item => item.done).length;
  emptyState.hidden = visibleItems.length > 0;

  visibleItems
    .sort((a, b) => Number(b.urgent) - Number(a.urgent) || new Date(b.createdAt) - new Date(a.createdAt))
    .forEach(item => list.appendChild(createCard(item)));

  updateDashboardBadges();
}

function loadExpenses() {
  try {
    return JSON.parse(localStorage.getItem("family-expenses") || "[]");
  } catch {
    return [];
  }
}

function saveExpenses() {
  localStorage.setItem("family-expenses", JSON.stringify(expenses));
  saveFamilyState();
}

function loadVaultMovements() {
  try {
    return JSON.parse(localStorage.getItem("family-vault") || "[]");
  } catch {
    return [];
  }
}

function saveVaultMovements() {
  localStorage.setItem("family-vault", JSON.stringify(vaultMovements));
  saveFamilyState();
}

function loadCalendarEvents() {
  try {
    return JSON.parse(localStorage.getItem("family-calendar") || "[]");
  } catch {
    return [];
  }
}

function saveCalendarEvents() {
  localStorage.setItem("family-calendar", JSON.stringify(calendarEvents));
  saveFamilyState();
}

function loadNotes() {
  try {
    return JSON.parse(localStorage.getItem("family-notes") || "[]");
  } catch {
    return [];
  }
}

function saveNotes() {
  localStorage.setItem("family-notes", JSON.stringify(notes));
  saveFamilyState();
}

function hasLocalFamilyData() {
  return expenses.length > 0 || calendarEvents.length > 0 || notes.length > 0 || vaultMovements.length > 0;
}

function hasRemoteFamilyData(data) {
  return Boolean(
    data &&
    ((data.expenses || []).length > 0 ||
      (data.calendarEvents || []).length > 0 ||
      (data.notes || []).length > 0 ||
      (data.vaultMovements || []).length > 0)
  );
}

async function loadFamilyState() {
  try {
    const data = await api("/api/family-state");
    if (!hasRemoteFamilyData(data) && hasLocalFamilyData()) {
      await saveFamilyState();
      return;
    }

    expenses = data.expenses || [];
    calendarEvents = data.calendarEvents || [];
    notes = data.notes || [];
    vaultMovements = data.vaultMovements || [];
    localStorage.setItem("family-expenses", JSON.stringify(expenses));
    localStorage.setItem("family-calendar", JSON.stringify(calendarEvents));
    localStorage.setItem("family-notes", JSON.stringify(notes));
    localStorage.setItem("family-vault", JSON.stringify(vaultMovements));
    renderExpenses();
    renderCalendar();
    renderNotes();
    renderVault();
    updateDashboardBadges();
  } catch {
    // Offline preview: keep using this device's local copy.
  }
}

async function saveFamilyState() {
  try {
    await api("/api/family-state", {
      method: "PUT",
      body: JSON.stringify({
        expenses,
        calendarEvents,
        notes,
        vaultMovements
      })
    });
  } catch {
    // Offline preview: localStorage already has the latest value.
  }
}

function renderExpenses() {
  expensesList.innerHTML = "";
  expensesEmptyState.hidden = expenses.length > 0;

  const total = expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
  const currentMonth = new Date().getMonth() + 1;
  const currentTotal = expenses
    .filter(expense => Number(expense.month) === currentMonth)
    .reduce((sum, expense) => sum + Number(expense.amount || 0), 0);

  currentMonthLabel.textContent = `Mese corrente · ${monthNames[currentMonth]}`;
  currentMonthTotal.textContent = formatCurrency(currentTotal);
  expenseTotal.textContent = formatCurrency(total);

  expenses
    .sort((a, b) => Number(a.month || 13) - Number(b.month || 13) || new Date(b.createdAt) - new Date(a.createdAt))
    .forEach(expense => expensesList.appendChild(createExpenseCard(expense)));

  renderExpenseChart();
}

function renderExpenseChart() {
  const selectedType = chartTypeInput.value || "ALL";
  const totals = Array.from({ length: 12 }, () => 0);

  expenses
    .filter(expense => selectedType === "ALL" || expense.type === selectedType)
    .forEach(expense => {
      const monthIndex = Number(expense.month) - 1;
      if (monthIndex >= 0 && monthIndex < 12) {
        totals[monthIndex] += Number(expense.amount || 0);
      }
    });

  const total = totals.reduce((sum, value) => sum + value, 0);
  const max = Math.max(...totals, 1);
  chartTotal.textContent = formatCurrency(total);
  expenseChart.innerHTML = "";

  totals.forEach((value, index) => {
    const bar = document.createElement("div");
    bar.className = "chart-bar-row";
    bar.innerHTML = `
      <span class="chart-month">${monthNames[index + 1].slice(0, 3)}</span>
      <div class="chart-track">
        <span class="chart-bar" style="width: ${Math.max(4, (value / max) * 100)}%"></span>
      </div>
      <strong>${formatCurrency(value)}</strong>
    `;
    expenseChart.appendChild(bar);
  });
}

function createExpenseCard(expense) {
  const node = expenseTemplate.content.firstElementChild.cloneNode(true);
  node.dataset.id = expense.id;
  node.dataset.type = normalizeCategory(expense.type);
  node.dataset.month = expense.month || "";
  node.querySelector(".expense-month").textContent = monthNames[Number(expense.month)] || "SENZA MESE";
  node.querySelector(".expense-type").textContent = String(expense.type || "").toUpperCase();
  node.querySelector(".expense-amount").textContent = formatCurrency(expense.amount);
  node.querySelector(".note").textContent = expense.note || "";
  node.querySelector(".note").hidden = !expense.note;
  node.querySelector(".delete-expense-button").setAttribute("aria-label", `Elimina spesa ${expense.type}`);
  return node;
}

function renderVault() {
  vaultBalance.textContent = formatCurrency(getVaultBalance());
}

function getVaultBalance() {
  return vaultMovements.reduce((sum, movement) => {
    const amount = Number(movement.amount || 0);
    return movement.type === "out" ? sum - amount : sum + amount;
  }, 0);
}

function renderCalendar() {
  calendarList.innerHTML = "";
  calendarEmptyState.hidden = calendarEvents.length > 0;
  calendarCount.textContent = calendarEvents.length;

  const sortedEvents = [...calendarEvents].sort(compareCalendarEvents);
  const upcomingEvent = sortedEvents.find(event => getEventDateTime(event) >= startOfToday());
  nextEventLabel.textContent = upcomingEvent ? formatCalendarPreview(upcomingEvent) : "Nessuno";

  sortedEvents.forEach(event => calendarList.appendChild(createCalendarCard(event)));
  updateDashboardBadges();
}

function renderNotes() {
  notesList.innerHTML = "";
  notesEmptyState.hidden = notes.length > 0;
  notesCount.textContent = notes.length;

  notes
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .forEach(note => notesList.appendChild(createNoteCard(note)));

  updateDashboardBadges();
}

function updateDashboardBadges() {
  const openItems = items.filter(item => !item.done).length;
  const upcomingEvents = calendarEvents.filter(event => getEventDateTime(event) >= startOfToday()).length;

  shoppingBadge.hidden = openItems === 0;
  shoppingBadge.textContent = openItems > 9 ? "9+" : String(openItems);

  calendarBadge.hidden = upcomingEvents === 0;
  calendarBadge.textContent = upcomingEvents > 9 ? "9+" : String(upcomingEvents);

  notesBadge.hidden = notes.length === 0;
  notesBadge.textContent = notes.length > 9 ? "9+" : String(notes.length);
}

function updateCurrentDayIcons() {
  const today = String(new Date().getDate());
  currentDayIcons.forEach(icon => {
    icon.dataset.currentDay = today;
  });
}

function createCalendarCard(event) {
  const node = calendarTemplate.content.firstElementChild.cloneNode(true);
  const eventDate = parseLocalDate(event.date);
  node.dataset.id = event.id;
  node.querySelector(".calendar-day").textContent = shortDayFormatter.format(eventDate).replace(".", "");
  node.querySelector(".calendar-date").textContent = shortDateFormatter.format(eventDate).replace(".", "");
  node.querySelector("h2").textContent = event.title;
  node.querySelector(".calendar-time").textContent = event.time || "Tutto il giorno";
  node.querySelector(".note").textContent = event.note || "";
  node.querySelector(".note").hidden = !event.note;
  node.querySelector(".delete-calendar-button").setAttribute("aria-label", `Elimina impegno ${event.title}`);
  node.classList.toggle("past-event", getEventDateTime(event) < startOfToday());
  return node;
}

function createNoteCard(note) {
  const node = noteTemplate.content.firstElementChild.cloneNode(true);
  node.dataset.id = note.id;
  node.querySelector("h2").textContent = note.title;
  node.querySelector(".note").textContent = note.body || "";
  node.querySelector(".note").hidden = !note.body;
  node.querySelector(".delete-note-button").setAttribute("aria-label", `Elimina nota ${note.title}`);
  return node;
}

function createCard(item) {
  const node = template.content.firstElementChild.cloneNode(true);
  node.dataset.id = item.id;
  node.classList.toggle("done", item.done);
  node.classList.toggle("urgent-card", item.urgent);
  node.dataset.category = normalizeCategory(item.category);
  node.querySelector("h2").textContent = item.name;
  node.querySelector(".quantity").textContent = item.quantity || "q.b.";
  node.querySelector(".note").textContent = item.note || "";
  node.querySelector(".note").hidden = !item.note;

  const checkbox = node.querySelector(".done-check");
  checkbox.checked = item.done;
  checkbox.setAttribute("aria-label", `Segna ${item.name} come preso`);
  checkbox.addEventListener("change", async () => {
    await updateItem(item.id, { done: checkbox.checked });
  });

  node.querySelector(".delete-button").setAttribute("aria-label", `Elimina ${item.name}`);

  return node;
}

async function updateItem(id, changes) {
  try {
    const payload = await api(`/api/items/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(changes)
    });
    items = payload.state.items;
    render();
    syncStatus.textContent = "Modifica salvata";
  } catch (error) {
    syncStatus.textContent = error.message;
    await loadItems();
  }
}

async function deleteItem(id) {
  const previousItems = items;
  try {
    pendingOperations += 1;
    items = items.filter(item => item.id !== id);
    render();
    syncStatus.textContent = "Prodotto eliminato";

    const data = await api(`/api/items/${encodeURIComponent(id)}`, { method: "DELETE" });
    items = data.items;
    render();
    syncStatus.textContent = "Prodotto eliminato";
  } catch (error) {
    pendingOperations -= 1;
    await loadItems(true);
    pendingOperations += 1;
    const stillExists = items.some(item => item.id === id);

    if (stillExists) {
      items = previousItems;
      render();
      syncStatus.textContent = error.name === "AbortError"
        ? "Eliminazione lenta. Riprova tra un momento."
        : error.message;
    } else {
      syncStatus.textContent = "Prodotto eliminato";
    }
  } finally {
    pendingOperations = Math.max(0, pendingOperations - 1);
  }
}

list.addEventListener("click", async event => {
  const deleteButton = event.target.closest(".delete-button");
  if (!deleteButton) return;

  const card = deleteButton.closest(".item-card");
  if (!card?.dataset.id) return;

  deleteButton.disabled = true;
  await deleteItem(card.dataset.id);
});

expensesList.addEventListener("click", event => {
  const deleteButton = event.target.closest(".delete-expense-button");
  if (!deleteButton) return;

  const card = deleteButton.closest(".expense-card");
  if (!card?.dataset.id) return;

  expenses = expenses.filter(expense => expense.id !== card.dataset.id);
  saveExpenses();
  renderExpenses();
  expenseStatus.textContent = "Spesa eliminata";
});

calendarList.addEventListener("click", event => {
  const deleteButton = event.target.closest(".delete-calendar-button");
  if (!deleteButton) return;

  const card = deleteButton.closest(".calendar-card");
  if (!card?.dataset.id) return;

  calendarEvents = calendarEvents.filter(calendarEvent => calendarEvent.id !== card.dataset.id);
  saveCalendarEvents();
  renderCalendar();
  calendarStatus.textContent = "Impegno eliminato";
});

notesList.addEventListener("click", event => {
  const deleteButton = event.target.closest(".delete-note-button");
  if (!deleteButton) return;

  const card = deleteButton.closest(".note-card");
  if (!card?.dataset.id) return;

  notes = notes.filter(note => note.id !== card.dataset.id);
  saveNotes();
  renderNotes();
  notesStatus.textContent = "Nota eliminata";
});

form.addEventListener("submit", async event => {
  event.preventDefault();
  if (isSaving) return;

  if (activeTool === "expenses") {
    addExpense();
    return;
  }

  if (activeTool === "vault") {
    addVaultMovement();
    return;
  }

  if (activeTool === "calendar") {
    addCalendarEvent();
    return;
  }

  if (activeTool === "notes") {
    addNote();
    return;
  }

  const formData = new FormData(form);
  const submitButton = form.querySelector("button[type='submit']");
  const payload = {
    name: String(formData.get("name") || "").trim(),
    quantity: formData.get("quantity"),
    category: "Altro",
    owner: "Casa",
    note: formData.get("note"),
    urgent: formData.get("urgent") === "on"
  };

  if (!payload.name) {
    syncStatus.textContent = "Scrivi il nome del prodotto.";
    document.querySelector("#nameInput").focus();
    return;
  }

  try {
    isSaving = true;
    pendingOperations += 1;
    submitButton.disabled = true;
    submitButton.textContent = "Aggiungo...";
    syncStatus.textContent = "Aggiungo alla lavagna...";

    const optimisticItem = {
      id: `temp-${Date.now()}`,
      ...payload,
      done: false,
      createdAt: new Date().toISOString()
    };
    items = [optimisticItem, ...items];
    form.reset();
    closeAddPanel();
    render();

    const data = await api("/api/items", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    items = data.state.items;
    render();
    syncStatus.textContent = "Aggiunto alla lavagna";
  } catch (error) {
    pendingOperations -= 1;
    await loadItems(true);
    pendingOperations += 1;
    const savedAnyway = items.some(item =>
      item.name === payload.name &&
      item.quantity === String(payload.quantity || "").trim() &&
      item.note === String(payload.note || "").trim()
    );

    if (savedAnyway) {
      closeAddPanel();
      syncStatus.textContent = "Aggiunto alla lavagna";
    } else {
      items = items.filter(item => !String(item.id).startsWith("temp-"));
      render();
      syncStatus.textContent = error.name === "AbortError"
        ? "Salvataggio lento. Riprova tra un momento."
        : error.message;
    }
  } finally {
    pendingOperations = Math.max(0, pendingOperations - 1);
    isSaving = false;
    submitButton.disabled = false;
    submitButton.textContent = "Aggiungi alla lavagna";
  }
});

function addExpense() {
  const formData = new FormData(form);
  const amount = parseEuro(formData.get("quantity"));
  const type = String(formData.get("expenseType") || "Varie").trim();
  const month = Number(formData.get("expenseMonth") || new Date().getMonth() + 1);

  if (!amount || amount <= 0) {
    expenseStatus.textContent = "Scrivi l'importo della spesa.";
    quantityInput.focus();
    return;
  }

  expenses = [{
    id: `expense-${Date.now()}`,
    type,
    month,
    amount,
    note: String(formData.get("note") || "").trim(),
    createdAt: new Date().toISOString()
  }, ...expenses];

  saveExpenses();
  renderExpenses();
  form.reset();
  closeAddPanel();
  expenseStatus.textContent = "Spesa aggiunta";
}

function addVaultMovement() {
  const formData = new FormData(form);
  const amount = parseEuro(formData.get("quantity"));
  const type = String(formData.get("vaultMovement") || "in");
  const reason = String(formData.get("name") || "").trim();

  if (!reason) {
    vaultStatus.textContent = "Scrivi il motivo del movimento.";
    nameInput.focus();
    return;
  }

  if (!amount || amount <= 0) {
    vaultStatus.textContent = "Scrivi l'importo da aggiungere o togliere.";
    quantityInput.focus();
    return;
  }

  vaultMovements = [{
    id: `vault-${Date.now()}`,
    type,
    reason,
    amount,
    note: String(formData.get("note") || "").trim(),
    createdAt: new Date().toISOString()
  }, ...vaultMovements];

  saveVaultMovements();
  renderVault();
  form.reset();
  closeAddPanel();
  vaultStatus.textContent = type === "in" ? "Fondi aggiunti" : "Fondi tolti";
}

function confirmVaultAdjustment(type) {
  const amount = parseEuro(vaultAmountInput.value);

  if (!amount || amount <= 0) {
    vaultStatus.textContent = "Scrivi un importo.";
    vaultAmountInput.focus();
    return;
  }

  vaultMovements = [{
    id: `vault-${Date.now()}`,
    type,
    reason: type === "in" ? "Aggiunta fondi" : "Prelievo fondi",
    amount,
    note: "",
    createdAt: new Date().toISOString()
  }, ...vaultMovements];

  saveVaultMovements();
  renderVault();
  vaultAmountInput.value = "";
  vaultStatus.textContent = type === "in" ? "Importo aggiunto." : "Importo tolto.";
  vaultAmountInput.focus();
}

function addCalendarEvent() {
  const formData = new FormData(form);
  const title = String(formData.get("name") || "").trim();
  const date = String(formData.get("calendarDate") || "").trim();

  if (!title) {
    calendarStatus.textContent = "Scrivi il nome dell'impegno.";
    nameInput.focus();
    return;
  }

  if (!date) {
    calendarStatus.textContent = "Scegli la data dell'impegno.";
    calendarDateInput.focus();
    return;
  }

  calendarEvents = [{
    id: `calendar-${Date.now()}`,
    title,
    date,
    time: String(formData.get("calendarTime") || "").trim(),
    note: String(formData.get("note") || "").trim(),
    createdAt: new Date().toISOString()
  }, ...calendarEvents];

  saveCalendarEvents();
  renderCalendar();
  form.reset();
  closeAddPanel();
  calendarStatus.textContent = "Impegno aggiunto";
}

function addNote() {
  const formData = new FormData(form);
  const title = String(formData.get("name") || "").trim();
  const body = String(formData.get("note") || "").trim();

  if (!title && !body) {
    notesStatus.textContent = "Scrivi una nota o un titolo.";
    nameInput.focus();
    return;
  }

  notes = [{
    id: `note-${Date.now()}`,
    title: title || "Nota di casa",
    body,
    createdAt: new Date().toISOString()
  }, ...notes];

  saveNotes();
  renderNotes();
  form.reset();
  closeAddPanel();
  notesStatus.textContent = "Nota aggiunta";
}

openAddButton.addEventListener("click", openAddPanel);
openChartButton.addEventListener("click", openChartPanel);
vaultPlusButton.addEventListener("click", () => confirmVaultAdjustment("in"));
vaultMinusButton.addEventListener("click", () => confirmVaultAdjustment("out"));
vaultAmountInput.addEventListener("keydown", event => {
  if (event.key === "Enter") {
    event.preventDefault();
    confirmVaultAdjustment("in");
  }
});
closeAddButton.addEventListener("click", closeAddPanel);
addPanel.addEventListener("click", event => {
  if (event.target === addPanel) {
    closeAddPanel();
  }
});
closeChartButton.addEventListener("click", closeChartPanel);
chartTypeInput.addEventListener("change", renderExpenseChart);
chartPanel.addEventListener("click", event => {
  if (event.target === chartPanel) {
    closeChartPanel();
  }
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape" && addPanel.classList.contains("open")) {
    closeAddPanel();
  }
  if (event.key === "Escape" && chartPanel.classList.contains("open")) {
    closeChartPanel();
  }
  if (event.key === "Escape" && confirmPanel.classList.contains("open")) {
    closeConfirmPanel();
  }
});

filterButtons.forEach(button => {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    filterButtons.forEach(entry => entry.classList.toggle("active", entry === button));
    render();
  });
});

clearButton.addEventListener("click", () => {
  if (!items.some(item => item.done)) {
    syncStatus.textContent = "Non ci sono prodotti presi da svuotare.";
    return;
  }
  openConfirmPanel();
});

cancelClearButton.addEventListener("click", closeConfirmPanel);
confirmPanel.addEventListener("click", event => {
  if (event.target === confirmPanel) {
    closeConfirmPanel();
  }
});

confirmClearButton.addEventListener("click", async () => {
  try {
    pendingOperations += 1;
    confirmClearButton.disabled = true;
    confirmClearButton.querySelector("span:last-child").textContent = "Svuoto...";

    items = items.filter(item => !item.done);
    render();
    closeConfirmPanel();
    syncStatus.textContent = "Carrello svuotato";

    const data = await api("/api/clear-done", { method: "POST" });
    items = data.items;
    render();
    syncStatus.textContent = "Carrello svuotato";
  } catch (error) {
    pendingOperations -= 1;
    syncStatus.textContent = error.message;
    await loadItems(true);
    pendingOperations += 1;
  } finally {
    pendingOperations = Math.max(0, pendingOperations - 1);
    confirmClearButton.disabled = false;
    confirmClearButton.querySelector("span:last-child").textContent = "Svuota";
  }
});

document.querySelectorAll("[data-open-tool]").forEach(button => {
  button.addEventListener("click", () => {
    showTool(button.dataset.openTool);
  });
});

backToDashboardButton.addEventListener("click", showDashboard);
document.querySelectorAll("[data-back-dashboard]").forEach(button => {
  button.addEventListener("click", showDashboard);
});

function formatTime(value) {
  if (!value) return "mai";
  return new Intl.DateTimeFormat("it-IT", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function formatCurrency(value) {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR"
  }).format(Number(value || 0));
}

function parseLocalDate(value) {
  const [year, month, day] = String(value || "").split("-").map(Number);
  return new Date(year || 1970, (month || 1) - 1, day || 1);
}

function getEventDateTime(event) {
  const date = parseLocalDate(event.date);
  if (event.time) {
    const [hours, minutes] = event.time.split(":").map(Number);
    date.setHours(hours || 0, minutes || 0, 0, 0);
  }
  return date;
}

function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function compareCalendarEvents(a, b) {
  return getEventDateTime(a) - getEventDateTime(b);
}

function formatCalendarPreview(event) {
  const date = parseLocalDate(event.date);
  const label = shortDateFormatter.format(date).replace(".", "");
  return event.time ? `${label} · ${event.time}` : label;
}

function parseEuro(value) {
  return Number(String(value || "")
    .replace(/\s/g, "")
    .replace("€", "")
    .replace(",", "."));
}

function normalizeCategory(category) {
  return String(category || "Altro")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function openAddPanel() {
  configureAddPanel();
  addPanel.classList.add("open");
  addPanel.setAttribute("aria-hidden", "false");
  document.body.classList.add("panel-open");
  if (activeTool === "expenses" || activeTool === "vault") {
    quantityInput.focus();
  } else if (activeTool === "calendar") {
    nameInput.focus();
  } else {
    nameInput.focus();
  }
}

function closeAddPanel() {
  addPanel.classList.remove("open");
  addPanel.setAttribute("aria-hidden", "true");
  document.body.classList.remove("panel-open");
}

function openChartPanel() {
  renderExpenseChart();
  chartPanel.classList.add("open");
  chartPanel.setAttribute("aria-hidden", "false");
  document.body.classList.add("panel-open");
  chartTypeInput.focus();
}

function closeChartPanel() {
  chartPanel.classList.remove("open");
  chartPanel.setAttribute("aria-hidden", "true");
  document.body.classList.remove("panel-open");
}

function openConfirmPanel() {
  confirmPanel.classList.add("open");
  confirmPanel.setAttribute("aria-hidden", "false");
  document.body.classList.add("panel-open");
  cancelClearButton.focus();
}

function closeConfirmPanel() {
  confirmPanel.classList.remove("open");
  confirmPanel.setAttribute("aria-hidden", "true");
  document.body.classList.remove("panel-open");
}

function configureAddPanel() {
  const isExpenses = activeTool === "expenses";
  const isVault = activeTool === "vault";
  const isCalendar = activeTool === "calendar";
  const isNotes = activeTool === "notes";
  form.reset();
  addPanelTitle.textContent = isNotes ? "Aggiungi nota" : isCalendar ? "Aggiungi impegno" : isVault ? "Movimento salvadanaio" : isExpenses ? "Aggiungi spesa" : "Aggiungi";
  addPanel.setAttribute("aria-label", isNotes ? "Aggiungi nota" : isCalendar ? "Aggiungi impegno" : isVault ? "Movimento salvadanaio" : isExpenses ? "Aggiungi spesa" : "Aggiungi prodotto");
  productField.hidden = isExpenses;
  expenseTypeField.hidden = !isExpenses;
  expenseMonthField.hidden = !isExpenses;
  vaultMovementField.hidden = !isVault;
  calendarDateField.hidden = !isCalendar;
  calendarTimeField.hidden = !isCalendar;
  urgentInput.closest("label").hidden = isExpenses || isVault || isCalendar || isNotes;
  nameInput.required = !isExpenses;
  quantityInput.required = isExpenses || isVault;
  quantityInput.closest("label").hidden = isCalendar || isNotes;
  quantityInput.inputMode = isExpenses || isVault ? "decimal" : "text";
  productField.querySelector("span").textContent = isNotes ? "TITOLO" : isCalendar ? "EVENTO" : isVault ? "MOTIVO" : "PRODOTTO";
  nameInput.placeholder = isNotes ? "Es. chiamare idraulico" : isCalendar ? "Es. visita pediatra" : isVault ? "Es. fondo vacanze" : "Es. pomodori";
  quantityLabelText.textContent = isExpenses || isVault ? "IMPORTO" : "QUANTITA";
  quantityInput.placeholder = isExpenses || isVault ? "Es. 45,90" : "Es. 500 g";
  noteInput.placeholder = isNotes ? "Scrivi il promemoria..." : isCalendar ? "Luogo, persona, promemoria..." : isVault ? "Es. contanti messi da parte..." : isExpenses ? "Es. bolletta maggio, ricevuta..." : "Marca, offerta, negozio...";
  form.querySelector("button[type='submit']").textContent = isNotes ? "Aggiungi nota" : isCalendar ? "Aggiungi impegno" : isVault ? "Salva movimento" : isExpenses ? "Aggiungi spesa" : "Aggiungi alla lavagna";
  openAddButton.setAttribute("aria-label", isNotes ? "Aggiungi nota" : isCalendar ? "Aggiungi impegno" : isVault ? "Aggiungi movimento salvadanaio" : isExpenses ? "Aggiungi spesa" : "Aggiungi prodotto");
  if (isExpenses) {
    expenseMonthInput.value = String(new Date().getMonth() + 1);
  }
  if (isVault) {
    vaultMovementInput.value = "in";
  }
  if (isCalendar) {
    calendarDateInput.value = new Date().toISOString().slice(0, 10);
  }
}

function showDashboard() {
  activeTool = "dashboard";
  dashboardView.hidden = false;
  shoppingView.hidden = true;
  expensesView.hidden = true;
  vaultView.hidden = true;
  calendarView.hidden = true;
  notesView.hidden = true;
  openAddButton.hidden = true;
  openChartButton.hidden = true;
  closeAddPanel();
  closeChartPanel();
  closeConfirmPanel();
}

function showTool(tool) {
  activeTool = tool;
  dashboardView.hidden = true;
  shoppingView.hidden = tool !== "shopping";
  expensesView.hidden = tool !== "expenses";
  vaultView.hidden = tool !== "vault";
  calendarView.hidden = tool !== "calendar";
  notesView.hidden = tool !== "notes";
  openAddButton.hidden = !["shopping", "expenses", "calendar", "notes"].includes(tool);
  openChartButton.hidden = tool !== "expenses";
  configureAddPanel();

  if (tool === "shopping") {
    loadItems(true);
  } else if (tool === "expenses") {
    renderExpenses();
    expenseStatus.textContent = "Tieni traccia delle spese di casa.";
  } else if (tool === "vault") {
    renderVault();
    vaultStatus.textContent = "Quanto abbiamo messo da parte.";
  } else if (tool === "calendar") {
    renderCalendar();
    calendarStatus.textContent = "Organizza gli impegni di casa.";
  } else if (tool === "notes") {
    renderNotes();
    notesStatus.textContent = "Promemoria veloci per tutti.";
  }
}

loadItems(true);
loadFamilyState();
renderExpenses();
renderVault();
renderCalendar();
renderNotes();
updateCurrentDayIcons();
showDashboard();
setInterval(async () => {
  const previousUpdate = lastUpdatedAt;
  await loadItems();
  if (previousUpdate && previousUpdate !== lastUpdatedAt) {
    syncStatus.textContent = "Lavagna aggiornata dalla famiglia";
  }
}, 2500);
setInterval(() => {
  if (!addPanel.classList.contains("open") && !chartPanel.classList.contains("open")) {
    loadFamilyState();
  }
}, 5000);
