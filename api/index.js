const crypto = require("crypto");

const familyPassword = process.env.FAMILY_PASSWORD || "cosmo";
const sessionCookie = "dashboard_family_session";
const sessionSecret = process.env.SESSION_SECRET || familyPassword;
const supabaseUrl = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || "";

const fallbackMemory = {
  shopping: null,
  family: null
};

const defaultShoppingState = () => ({
  items: [],
  updatedAt: new Date().toISOString()
});

const defaultFamilyState = () => ({
  expenses: [],
  calendarEvents: [],
  notes: [],
  vaultMovements: [],
  updatedAt: new Date().toISOString()
});

module.exports = async (request, response) => {
  const route = getRoute(request);

  try {
    if (route === "/session" && request.method === "GET") {
      return sendJson(response, 200, { authenticated: isAuthenticated(request) });
    }

    if (route === "/login" && request.method === "POST") {
      const body = request.body || {};
      if (String(body.password || "").trim() !== familyPassword) {
        return sendJson(response, 401, { error: "Password non corretta." });
      }

      response.setHeader("Set-Cookie", `${sessionCookie}=${encodeURIComponent(createSessionToken())}; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=2592000`);
      return sendJson(response, 200, { ok: true });
    }

    if (!isAuthenticated(request)) {
      return sendJson(response, 401, { error: "Serve la password di famiglia." });
    }

    if (route === "/items" && request.method === "GET") {
      return sendJson(response, 200, await loadState("shopping", defaultShoppingState()));
    }

    if (route === "/items" && request.method === "POST") {
      const state = await loadState("shopping", defaultShoppingState());
      const item = createItem(request.body || {});
      if (!item.name) {
        return sendJson(response, 400, { error: "Aggiungi almeno il nome del prodotto." });
      }
      state.items.unshift(item);
      const saved = await saveState("shopping", state);
      return sendJson(response, 201, { item, state: saved });
    }

    if (route.startsWith("/items/") && request.method === "PATCH") {
      const id = decodeURIComponent(route.split("/").pop());
      const input = request.body || {};
      const state = await loadState("shopping", defaultShoppingState());
      const item = state.items.find(entry => entry.id === id);
      if (!item) {
        return sendJson(response, 404, { error: "Elemento non trovato." });
      }
      Object.assign(item, {
        name: input.name === undefined ? item.name : String(input.name).trim(),
        quantity: input.quantity === undefined ? item.quantity : String(input.quantity).trim(),
        category: input.category === undefined ? item.category : String(input.category || "Altro").trim(),
        owner: input.owner === undefined ? item.owner : String(input.owner || "Casa").trim(),
        note: input.note === undefined ? item.note : String(input.note).trim(),
        urgent: input.urgent === undefined ? item.urgent : Boolean(input.urgent),
        done: input.done === undefined ? item.done : Boolean(input.done)
      });
      const saved = await saveState("shopping", state);
      return sendJson(response, 200, { item, state: saved });
    }

    if (route.startsWith("/items/") && request.method === "DELETE") {
      const id = decodeURIComponent(route.split("/").pop());
      const state = await loadState("shopping", defaultShoppingState());
      state.items = state.items.filter(entry => entry.id !== id);
      return sendJson(response, 200, await saveState("shopping", state));
    }

    if (route === "/clear-done" && request.method === "POST") {
      const state = await loadState("shopping", defaultShoppingState());
      state.items = state.items.filter(entry => !entry.done);
      return sendJson(response, 200, await saveState("shopping", state));
    }

    if (route === "/family-state" && request.method === "GET") {
      return sendJson(response, 200, await loadState("family", defaultFamilyState()));
    }

    if (route === "/family-state" && request.method === "PUT") {
      return sendJson(response, 200, await saveState("family", normalizeFamilyState(request.body || {})));
    }

    return sendJson(response, 404, { error: "Non trovato." });
  } catch (error) {
    return sendJson(response, 500, { error: error.message || "Errore inatteso." });
  }
};

function getRoute(request) {
  const url = new URL(request.url, "https://dashboard-family.local");
  const pathFromQuery = url.searchParams.get("path");
  if (pathFromQuery) {
    return `/${pathFromQuery}`.replace(/\/$/, "") || "/";
  }
  return url.pathname.replace(/^\/api/, "").replace(/\/$/, "") || "/";
}

function getCookie(request, name) {
  const cookies = String(request.headers.cookie || "")
    .split(";")
    .map(cookie => cookie.trim())
    .filter(Boolean);
  const prefix = `${name}=`;
  const entry = cookies.find(cookie => cookie.startsWith(prefix));
  return entry ? decodeURIComponent(entry.slice(prefix.length)) : "";
}

function createSessionToken() {
  return crypto
    .createHmac("sha256", sessionSecret)
    .update(familyPassword)
    .digest("hex");
}

function isAuthenticated(request) {
  return getCookie(request, sessionCookie) === createSessionToken();
}

function createItem(input) {
  return {
    id: crypto.randomUUID(),
    name: String(input.name || "").trim(),
    quantity: String(input.quantity || "").trim(),
    category: String(input.category || "Altro").trim(),
    owner: String(input.owner || "Casa").trim(),
    note: String(input.note || "").trim(),
    urgent: Boolean(input.urgent),
    done: Boolean(input.done),
    createdAt: new Date().toISOString()
  };
}

function normalizeFamilyState(input) {
  return {
    expenses: Array.isArray(input.expenses) ? input.expenses : [],
    calendarEvents: Array.isArray(input.calendarEvents) ? input.calendarEvents : [],
    notes: Array.isArray(input.notes) ? input.notes : [],
    vaultMovements: Array.isArray(input.vaultMovements) ? input.vaultMovements : [],
    updatedAt: new Date().toISOString()
  };
}

async function loadState(key, fallback) {
  if (!supabaseUrl || !supabaseKey) {
    fallbackMemory[key] ||= { ...fallback };
    return fallbackMemory[key];
  }

  const apiUrl = `${supabaseUrl}/rest/v1/app_state?key=eq.${encodeURIComponent(key)}&select=value`;
  const fetchResponse = await fetch(apiUrl, { headers: supabaseHeaders() });
  if (!fetchResponse.ok) {
    throw new Error("Database non raggiungibile.");
  }

  const rows = await fetchResponse.json();
  return rows[0]?.value || fallback;
}

async function saveState(key, value) {
  const payload = {
    ...value,
    updatedAt: new Date().toISOString()
  };

  if (!supabaseUrl || !supabaseKey) {
    fallbackMemory[key] = payload;
    return payload;
  }

  const fetchResponse = await fetch(`${supabaseUrl}/rest/v1/app_state?on_conflict=key`, {
    method: "POST",
    headers: {
      ...supabaseHeaders(),
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=representation"
    },
    body: JSON.stringify({ key, value: payload })
  });
  if (!fetchResponse.ok) {
    throw new Error("Non riesco a salvare nel database.");
  }

  const rows = await fetchResponse.json();
  return rows[0]?.value || payload;
}

function supabaseHeaders() {
  return {
    apikey: supabaseKey,
    Authorization: `Bearer ${supabaseKey}`
  };
}

function sendJson(response, status, payload) {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.end(JSON.stringify(payload));
}
