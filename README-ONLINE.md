# Dashboard Family - prova online

Questa app e pronta per una prova online gratuita con Render.

## Pubblicazione rapida

1. Crea un repository GitHub chiamato `dashboard-family`.
2. Carica questi file nel repository:
   - `package.json`
   - `server.js`
   - `render.yaml`
   - `shopping-list.json`
   - `family-state.json`
   - cartella `public`
3. Vai su Render e crea un nuovo Web Service collegato al repository.
4. Usa questi valori:
   - Build command: lascia vuoto
   - Start command: `node server.js`
   - Plan: Free
   - Environment variable consigliata:
     - `FAMILY_PASSWORD`: scegli la password da dare alla famiglia
5. Quando Render finisce, apri il link `https://...onrender.com`.

## Nota

Questa versione e pronta per una prova da telefono e per condividerla in famiglia con un solo link. I dati principali sono salvati dal piccolo server Node:

- lista della spesa
- controllo spese
- calendario
- note di casa
- salvadanaio

Per una versione definitiva, con dati garantiti anche dopo riavvii o spostamenti del servizio, conviene poi collegare un database gratuito.

## Password

La password provvisoria e `cosmo`.

Quando pubblichi online, cambiala impostando la variabile `FAMILY_PASSWORD` nel servizio Render. Dopo il cambio, condividi alla famiglia il link e la nuova password.
