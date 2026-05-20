const http = require("http");
const fs = require("fs");
const path = require("path");
const os = require("os");
const crypto = require("crypto");

const PORT = Number(process.env.PORT || 3000);
const publicDir = path.join(__dirname, "public");
const dataFile = path.join(__dirname, "shopping-list.json");
const familyDataFile = path.join(__dirname, "family-state.json");
const familyPassword = process.env.FAMILY_PASSWORD || "cosmo";
const sessionCookie = "dashboard_family_session";
const sessionSecret = process.env.SESSION_SECRET || crypto.randomBytes(32).toString("hex");

let state = loadState();
let familyState = loadFamilyState();

function loadState() {
  try {
    return JSON.parse(fs.readFileSync(dataFile, "utf8"));
  } catch {
    return {
      items: [
        createItem({ name: "Latte", quantity: "2 bottiglie", category: "Frigo", owner: "Casa" }),
        createItem({ name: "Pane", quantity: "1", category: "Dispensa", owner: "Casa" }),
        createItem({ name: "Detersivo piatti", quantity: "1", category: "Casa", owner: "Casa" })
      ],
      updatedAt: new Date().toISOString()
    };
  }
}

function saveState() {
  state.updatedAt = new Date().toISOString();
  fs.writeFileSync(dataFile, JSON.stringify(state, null, 2));
}

function loadFamilyState() {
  try {
    const parsed = JSON.parse(fs.readFileSync(familyDataFile, "utf8"));
    return {
      expenses: Array.isArray(parsed.expenses) ? parsed.expenses : [],
      calendarEvents: Array.isArray(parsed.calendarEvents) ? parsed.calendarEvents : [],
      notes: Array.isArray(parsed.notes) ? parsed.notes : [],
      vaultMovements: Array.isArray(parsed.vaultMovements) ? parsed.vaultMovements : [],
      updatedAt: parsed.updatedAt || new Date().toISOString()
    };
  } catch {
    return {
      expenses: [],
      calendarEvents: [],
      notes: [],
      vaultMovements: [],
      updatedAt: new Date().toISOString()
    };
  }
}

function saveFamilyState(input) {
  familyState = {
    expenses: Array.isArray(input.expenses) ? input.expenses : familyState.expenses,
    calendarEvents: Array.isArray(input.calendarEvents) ? input.calendarEvents : familyState.calendarEvents,
    notes: Array.isArray(input.notes) ? input.notes : familyState.notes,
    vaultMovements: Array.isArray(input.vaultMovements) ? input.vaultMovements : familyState.vaultMovements,
    updatedAt: new Date().toISOString()
  };
  fs.writeFileSync(familyDataFile, JSON.stringify(familyState, null, 2));
  return familyState;
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

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", chunk => {
      body += chunk;
      if (body.length > 1_000_000) {
        request.destroy();
        reject(new Error("Payload troppo grande"));
      }
    });
    request.on("end", () => {
      if (!body) {
        resolve({});
        return;
      }
      if (String(request.headers["content-type"] || "").includes("application/x-www-form-urlencoded")) {
        resolve(Object.fromEntries(new URLSearchParams(body)));
        return;
      }
      resolve(JSON.parse(body));
    });
    request.on("error", reject);
  });
}

function sendJson(response, status, payload) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  response.end(JSON.stringify(payload));
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

function sendLoginPage(response, error = "") {
  response.writeHead(200, {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store"
  });
  response.end(`<!doctype html>
<html lang="it">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Dashboard Family - accesso</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Patrick+Hand&display=swap" rel="stylesheet">
    <style>
      :root {
        --ink: #171512;
        --muted: #5b5b57;
        --line: #1f1b17;
        --paper: #fffdf4;
        --accent: #12dcd1;
        --gold: #f4ea35;
        --hand-font: "Patrick Hand", "Segoe Print", "Comic Sans MS", cursive;
        --ui-font: "Segoe UI", system-ui, -apple-system, sans-serif;
      }
      * { box-sizing: border-box; }
      body {
        min-height: 100vh;
        margin: 0;
        display: grid;
        place-items: center;
        padding: 22px;
        color: var(--ink);
        font-family: var(--hand-font);
        background:
          linear-gradient(90deg, rgba(4, 118, 111, 0.13) 1px, transparent 1px),
          linear-gradient(0deg, rgba(4, 118, 111, 0.11) 1px, transparent 1px),
          linear-gradient(90deg, rgba(23, 21, 18, 0.055) 1px, transparent 1px),
          linear-gradient(0deg, rgba(23, 21, 18, 0.05) 1px, transparent 1px),
          #fffdf4;
        background-size: 28px 28px, 28px 28px, 7px 7px, 7px 7px, auto;
      }
      main {
        width: min(420px, 100%);
        border: 4px solid var(--line);
        border-radius: 7px;
        background: #ffffff;
        box-shadow: 8px 9px 0 rgba(23, 21, 18, 0.16);
        padding: 28px 24px;
        transform: rotate(-0.5deg);
      }
      .home {
        position: relative;
        width: 92px;
        height: 80px;
        margin: 0 auto 10px;
        filter: drop-shadow(5px 6px 0 rgba(23, 21, 18, 0.16));
      }
      .home::before {
        content: "";
        position: absolute;
        left: 15px;
        top: 32px;
        z-index: 2;
        width: 62px;
        height: 42px;
        border: 6px solid var(--line);
        border-radius: 5px 5px 9px 9px;
        background: linear-gradient(var(--line), var(--line)) center bottom / 17px 25px no-repeat, var(--paper);
      }
      .home::after {
        content: "";
        position: absolute;
        left: 14px;
        top: 3px;
        z-index: 1;
        width: 64px;
        height: 64px;
        border-left: 7px solid var(--line);
        border-top: 7px solid var(--line);
        border-radius: 5px 0 0 0;
        background: var(--accent);
        transform: rotate(45deg);
      }
      h1 {
        margin: 0 0 6px;
        text-align: center;
        font-size: 2rem;
        line-height: 1;
      }
      p {
        margin: 0 0 18px;
        color: var(--muted);
        text-align: center;
      }
      label {
        display: grid;
        gap: 8px;
        color: var(--muted);
        font-weight: 900;
      }
      input {
        width: 100%;
        min-height: 52px;
        border: 3px solid var(--line);
        border-radius: 6px;
        background: var(--paper);
        color: var(--ink);
        font-family: var(--ui-font);
        font-size: 1.1rem;
        padding: 0 14px;
      }
      button {
        width: 100%;
        min-height: 52px;
        margin-top: 14px;
        border: 3px solid var(--line);
        border-radius: 6px;
        background: var(--gold);
        color: var(--ink);
        box-shadow: 4px 5px 0 rgba(23, 21, 18, 0.18);
        cursor: pointer;
        font-family: var(--hand-font);
        font-size: 1.2rem;
        font-weight: 900;
      }
      .error {
        margin-top: 12px;
        color: #ff4b3f;
        font-weight: 900;
      }
    </style>
  </head>
  <body>
    <main>
      <div class="home" aria-hidden="true"></div>
      <h1>Dashboard Family</h1>
      <p>Inserisci la password di famiglia.</p>
      <form method="post" action="/login">
        <label>
          PASSWORD
          <input name="password" type="password" autocomplete="current-password" autofocus>
        </label>
        <button type="submit">Entra</button>
      </form>
      ${error ? `<p class="error">${error}</p>` : ""}
    </main>
  </body>
</html>`);
}

function sendFile(response, filePath) {
  const extension = path.extname(filePath).toLowerCase();
  const type = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".webmanifest": "application/manifest+json; charset=utf-8",
    ".png": "image/png"
  }[extension] || "application/octet-stream";

  fs.readFile(filePath, (error, content) => {
    if (error) {
      response.writeHead(404);
      response.end("Non trovato");
      return;
    }
    response.writeHead(200, { "Content-Type": type });
    response.end(content);
  });
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);

  try {
    if (url.pathname === "/login" && request.method === "GET") {
      if (isAuthenticated(request)) {
        response.writeHead(302, { Location: "/" });
        response.end();
        return;
      }
      sendLoginPage(response);
      return;
    }

    if (url.pathname === "/login" && request.method === "POST") {
      const input = await readBody(request);
      const password = String(input.password || "").trim();
      if (password !== familyPassword) {
        sendLoginPage(response, "Password non corretta.");
        return;
      }
      response.writeHead(302, {
        "Set-Cookie": `${sessionCookie}=${encodeURIComponent(createSessionToken())}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`,
        Location: "/"
      });
      response.end();
      return;
    }

    if (!isAuthenticated(request) && !url.pathname.startsWith("/icons/")) {
      if (url.pathname.startsWith("/api/")) {
        sendJson(response, 401, { error: "Serve la password di famiglia." });
        return;
      }
      sendLoginPage(response);
      return;
    }

    if (url.pathname === "/api/items" && request.method === "GET") {
      sendJson(response, 200, state);
      return;
    }

    if (url.pathname === "/api/family-state" && request.method === "GET") {
      sendJson(response, 200, familyState);
      return;
    }

    if (url.pathname === "/api/family-state" && request.method === "PUT") {
      const input = await readBody(request);
      sendJson(response, 200, saveFamilyState(input));
      return;
    }

    if (url.pathname === "/api/items" && request.method === "POST") {
      const input = await readBody(request);
      const item = createItem(input);
      if (!item.name) {
        sendJson(response, 400, { error: "Aggiungi almeno il nome del prodotto." });
        return;
      }
      state.items.unshift(item);
      saveState();
      sendJson(response, 201, { item, state });
      return;
    }

    if (url.pathname.startsWith("/api/items/") && request.method === "PATCH") {
      const id = decodeURIComponent(url.pathname.split("/").pop());
      const input = await readBody(request);
      const item = state.items.find(entry => entry.id === id);
      if (!item) {
        sendJson(response, 404, { error: "Elemento non trovato." });
        return;
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
      saveState();
      sendJson(response, 200, { item, state });
      return;
    }

    if (url.pathname.startsWith("/api/items/") && request.method === "DELETE") {
      const id = decodeURIComponent(url.pathname.split("/").pop());
      state.items = state.items.filter(entry => entry.id !== id);
      saveState();
      sendJson(response, 200, state);
      return;
    }

    if (url.pathname === "/api/clear-done" && request.method === "POST") {
      state.items = state.items.filter(entry => !entry.done);
      saveState();
      sendJson(response, 200, state);
      return;
    }

    const requested = url.pathname === "/" ? "/index.html" : url.pathname;
    const filePath = path.normalize(path.join(publicDir, requested));
    if (!filePath.startsWith(publicDir)) {
      response.writeHead(403);
      response.end("Accesso negato");
      return;
    }
    sendFile(response, filePath);
  } catch (error) {
    sendJson(response, 500, { error: error.message || "Errore inatteso." });
  }
});

server.listen(PORT, "0.0.0.0", () => {
  const addresses = Object.values(os.networkInterfaces())
    .flat()
    .filter(info => info && info.family === "IPv4" && !info.internal)
    .map(info => `http://${info.address}:${PORT}`);

  console.log(`Dashboard Family attiva su http://localhost:${PORT}`);
  addresses.forEach(address => console.log(`In rete locale: ${address}`));
});
