# Dashboard Family su Netlify

Questa versione e pensata per:

- Netlify: pubblica l'app e la apre velocemente anche da telefono.
- Supabase: tiene salvati i dati della famiglia, senza perderli quando il sito si riavvia.

## 1. Crea il database su Supabase

1. Vai su https://supabase.com e crea un progetto gratuito.
2. Entra nel progetto.
3. Apri `SQL Editor`.
4. Incolla questo codice e premi `Run`:

```sql
create table if not exists public.app_state (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
```

## 2. Prendi le chiavi Supabase

Nel progetto Supabase apri `Project Settings` > `API`.

Ti servono:

- `Project URL`
- `service_role key`

La `service_role key` non va mai messa dentro i file del sito e non va caricata su GitHub.

## 3. Pubblica su Netlify

1. Vai su https://app.netlify.com
2. `Add new site` > `Import an existing project`
3. Collega GitHub.
4. Seleziona il repository `dashboard-family`.
5. Imposta:
   - `Build command`: lascia vuoto
   - `Publish directory`: `public`
   - `Functions directory`: `netlify/functions`
6. Pubblica il sito.

## 4. Aggiungi le variabili segrete su Netlify

Dentro il sito Netlify vai su `Site configuration` > `Environment variables`.

Aggiungi:

```text
FAMILY_PASSWORD=cosmo
SESSION_SECRET=scrivi-una-frase-lunga-solo-tua
SUPABASE_URL=incolla-il-Project-URL-di-Supabase
SUPABASE_SERVICE_ROLE_KEY=incolla-la-service-role-key-di-Supabase
```

Dopo averle aggiunte, fai `Deploys` > `Trigger deploy` > `Deploy site`.

## 5. Prova dal telefono

Apri il link Netlify da iPhone.

La password e:

```text
cosmo
```

Quando aggiungi prodotti, spese, calendario, note o salvadanaio, i dati restano salvati nel database.
