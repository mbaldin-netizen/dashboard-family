# Dashboard Family su Vercel

Questa versione usa:

- Vercel per pubblicare l'app.
- Supabase per salvare i dati senza perderli.

## Impostazioni progetto Vercel

Quando importi il repository:

- `Framework Preset`: Other oppure Node, se Vercel lo rileva cosi.
- `Root Directory`: lascia `./`
- `Build Command`: lascia vuoto
- `Output Directory`: lascia vuoto

## Variabili da aggiungere su Vercel

Apri `Environment Variables` e aggiungi:

```text
FAMILY_PASSWORD=cosmo
SESSION_SECRET=scrivi-una-frase-lunga-solo-tua
SUPABASE_URL=https://yklncfleohtizdpigdmh.supabase.co
SUPABASE_SERVICE_ROLE_KEY=la-tua-secret-key-supabase
```

La `SUPABASE_SERVICE_ROLE_KEY` non va condivisa e non va caricata su GitHub.
Ultimo aggiornamento deploy.
