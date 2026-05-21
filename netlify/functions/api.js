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

exports.handler = async event => {
  const route = getRoute(event.path);

  try {
    if (route === "/session" && event.httpMethod === "GET") {
      return json(200, { authenticated: isAuthenticated(event) });
    }

    if (route === "/login" && event.httpMethod === "POST") {
      const body = parseBody(event);
      if (String(body.password || "").trim() !== familyPassword) {
        return json(401, { error: "Password non corretta." });
      }

      return json(200, { ok: true }, {
        "Set-Cookie": `${sessionCookie}=${encodeURIComponent(createSessionToken())}; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=2592000`
      });
    }

    if (!isAuthenticated(event)) {
      return json(401, { error: "Serve la password di famiglia." });
    }

    if (route === "/items" && event.httpMethod === "GET") {
      return json(200, await loadState("shopping", defaultShoppingState()));
    }

    if (route === "/items" && event.httpMethod === "POST") {
      const state = await loadState("shopping", defaultShoppingState());
      const item = createItem(parseBody(event));
      if (!item.name) {
        return json(400, { error: "Aggiungi almeno il nome del prodotto." });
      }
      state.items.unshift(item);
      const saved = await saveState("shopping", state);
      return json(201, { item, state: saved });
    }

    if (route.startsWith("/items/") && event.httpMethod === "PATCH") {
      const id = decodeURIComponent(route.split("/").pop());
      const input = parseBody(event);
      const state = await loadState("shopping", defaultShoppingState());
      const item = state.items.find(entry => entry.id === id);
      if (!item) {
        return json(404, { error: "Elemento non trovato." });
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
      return json(200, { item, state: saved });
    }

    if (route.startsWith("/items/") && event.httpMethod === "DELETE") {
      const id = decodeURIComponent(route.split("/").pop());
      const state = await loadState("shopping", defaultShoppingState());
      state.items = state.items.filter(entry => entry.id !== id);
      return json(200, await saveState("shopping", state));
    }

    if (route === "/clear-done" && event.httpMethod === "POST") {
      const state = await loadState("shopping", defaultShoppingState());
      state.items = state.items.filter(entry => !entry.done);
      return json(200, await saveState("shopping", state));
    }

    if (route === "/family-state" && event.httpMethod === "GET") {
      return json(200, await loadState("family", defaultFamilyState()));
    }

    if (route === "/family-state" && event.httpMethod === "PUT") {
      return json(200, await saveState("family", normalizeFamilyState(parseBody(event))));
    }

    return json(404, { error: "Non trovato." });
  } catch (error) {
    return json(500, { error: error.message || "Errore inatteso." });
  }
};

function getRoute(path) {
  const parts = String(path || "").split("/").filter(Boolean);
  const apiIndex = parts.lastIndexOf("api");
  const routeParts = apiIndex >= 0 ? parts.slice(apiIndex + 1) : parts;
  return `/${routeParts.join("/")}`.replace(/\/$/, "") || "/";
}

function parseBody(event) {
  const rawBody = event.isBase64Encoded
    ? Buffer.from(event.body || "", "base64").toString("utf8")
    : event.body || "";
  if (!rawBody) return {};

  const contentType = String(event.headers["content-type"] || event.headers["Content-Type"] || "");
  if (contentType.includes("application/x-www-form-urlencoded")) {
    return Object.fromEntries(new URLSearchParams(rawBody));
  }
  return JSON.parse(rawBody);
}

function getCookie(event, name) {
  const cookies = String(event.headers.cookie || event.headers.Cookie || "")
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

function isAuthenticated(event) {
  return getCookie(event, sessionCookie) === createSessionToken();
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

  const response = await fetch(`${supabaseUrl}/rest/v1/app_state?key=eq.${encodeURIComponent(key)}&select=value`, {
    headers: supabaseHeaders()
  });
  if (!response.ok) {
    throw new Error("Database non raggiungibile.");
  }

  const rows = await response.json();
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

  const response = await fetch(`${supabaseUrl}/rest/v1/app_state?on_conflict=key`, {
    method: "POST",
    headers: {
      ...supabaseHeaders(),
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=representation"
    },
    body: JSON.stringify({ key, value: payload })
  });
  if (!response.ok) {
    throw new Error("Non riesco a salvare nel database.");
  }

  const rows = await response.json();
  return rows[0]?.value || payload;
}

function supabaseHeaders() {
  return {
    apikey: supabaseKey,
    Authorization: `Bearer ${supabaseKey}`
  };
}

function json(statusCode, payload, headers = {}) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...headers
    },
    body: JSON.stringify(payload)
  };
}
