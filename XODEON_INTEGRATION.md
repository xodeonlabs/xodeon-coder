# Xodeon Account & Data API — Integratie-prompt voor andere Lovable-apps

## ⚠️ Veelgemaakte fout (lees dit eerst)

> `Xodeon: Edge Function returned a non-2xx status code`

Dit betekent **bijna altijd** één van:

1. De andere app roept `supabase.functions.invoke('xodeon-...')` aan op **zijn eigen Supabase project**. Die function bestaat daar niet. **Je moet de volledige Xodeon URL gebruiken via `fetch`**, niet via je eigen supabase client.
2. De app is nog niet aangemaakt op https://xodeon-coder.lovable.app/developers, dus de `XODEON_API_KEY` is ongeldig (`invalid_client`).
3. De `XODEON_API_KEY` of `XODEON_CLIENT_ID` secret ontbreekt of bevat extra spaties.
4. De `redirect_uri` die je doorgeeft staat niet exact in de lijst die je bij het aanmaken hebt opgegeven.

---

## Stap 0 — Eerst dit doen
1. Ga naar https://xodeon-coder.lovable.app/developers en log in.
2. Klik **+ Nieuwe app**, geef een naam, **domain** (bv. `arcade-games.lovable.app`) en exact één of meer redirect URIs (bv. `https://arcade-games.lovable.app/oauth/callback`).
3. Kopieer de `xak_…` API-sleutel en de `client_id` (uuid) — die zie je maar één keer.

---

## Prompt voor de AI in de andere app

> Bouw een "Login met Xodeon"-integratie in deze app. Gebruik **uitsluitend** het volgende systeem en wijk niet af.
>
> ### 1. Secrets (via Lovable Cloud secrets, niet in code)
> - `XODEON_API_KEY` — `xak_…` van https://xodeon-coder.lovable.app/developers
> - `XODEON_CLIENT_ID` — uuid van diezelfde app
>
> ### 2. Constanten
> ```ts
> const XODEON_ORIGIN = "https://xodeon-coder.lovable.app";
> const XODEON_FN_BASE = "https://xgnewppkivznltxugzcu.supabase.co/functions/v1";
> // REDIRECT_URI MOET exact overeenkomen met wat in het Xodeon developers paneel staat
> const REDIRECT_URI = `${window.location.origin}/oauth/callback`;
> ```
>
> ### 3. Login-knop (alleen redirect, GEEN fetch / invoke)
> ```ts
> const state = crypto.randomUUID();
> sessionStorage.setItem("xodeon_state", state);
> window.location.href =
>   `${XODEON_ORIGIN}/oauth/authorize` +
>   `?client_id=${import.meta.env.VITE_XODEON_CLIENT_ID}` +
>   `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
>   `&scopes=profile,friends,messages,apps` +
>   `&state=${state}`;
> ```
> `VITE_XODEON_CLIENT_ID` is publiek en mag in de frontend (alleen de **API key** niet).
>
> ### 4. Callback `/oauth/callback`
> Lees `code` en `state` uit de URL. Verifieer `state` met `sessionStorage`. Roep dan **een eigen edge function** aan (bv. `xodeon-exchange`) die server-side dit doet:
>
> ```ts
> // supabase/functions/xodeon-exchange/index.ts (in JOUW app)
> const res = await fetch("https://xgnewppkivznltxugzcu.supabase.co/functions/v1/xodeon-oauth-token", {
>   method: "POST",
>   headers: { "Content-Type": "application/json" },
>   body: JSON.stringify({
>     api_key: Deno.env.get("XODEON_API_KEY"),
>     code,
>     redirect_uri, // exact dezelfde string als in stap 3
>   }),
> });
> const data = await res.json();
> if (!res.ok) {
>   console.error("Xodeon token error", res.status, data);
>   return new Response(JSON.stringify({ error: data.error ?? "exchange_failed", status: res.status }), { status: 400, headers: corsHeaders });
> }
> // data.access_token opslaan in een eigen tabel xodeon_connections gekoppeld aan auth.uid()
> ```
>
> **Belangrijk:** gebruik nooit `supabase.functions.invoke('xodeon-...')` — dat zoekt de function in JOUW Supabase project en faalt met "non-2xx". Altijd `fetch` naar de volledige `https://xgnewppkivznltxugzcu.supabase.co/functions/v1/...` URL.
>
> ### 5. Data ophalen (altijd server-side)
> ```ts
> const r = await fetch(`https://xgnewppkivznltxugzcu.supabase.co/functions/v1/xodeon-api?path=me`, {
>   headers: {
>     "x-api-key": Deno.env.get("XODEON_API_KEY")!,
>     "Authorization": `Bearer ${accessToken}`,
>   },
> });
> ```
> Endpoints: `me`, `friends`, `messages`, `apps` (vereisen respectievelijk scopes `profile`, `friends`, `messages`, `apps`).
>
> ### 6. UI
> - Profielscherm toont `/me` (naam + avatar)
> - Pagina **Vrienden** toont `/friends`
> - Pagina **Mijn Xodeon Apps** toont `/apps` (render `ngc_code` of doorlink)

---

## Snelle fix-prompt (plak in andere app als je de error al hebt)

> Mijn "Sign in with Xodeon" knop geeft `Edge Function returned a non-2xx status code`. Zoek alle plekken waar `supabase.functions.invoke('xodeon-...')` of `supabase.functions.invoke('xodeon-oauth-token')` voorkomt en vervang door een `fetch` naar `https://xgnewppkivznltxugzcu.supabase.co/functions/v1/<functie>`. De login-knop mag GEEN edge function aanroepen — die moet alleen `window.location.href` zetten naar `https://xodeon-coder.lovable.app/oauth/authorize?client_id=…&redirect_uri=…&scopes=profile,friends,messages,apps&state=…`. Controleer dat secrets `XODEON_API_KEY` en `XODEON_CLIENT_ID` zijn ingesteld. Verifieer dat de `redirect_uri` exact overeenkomt met wat in het Xodeon developers paneel staat geregistreerd.

---

## Endpoint-reference

| Pad | Scope | Geeft |
|---|---|---|
| `/xodeon-oauth-token` (POST) | — | wisselt `code` in voor `access_token` |
| `/xodeon-api?path=me` | `profile` | profiel |
| `/xodeon-api?path=friends` | `friends` | geaccepteerde vrienden |
| `/xodeon-api?path=messages` | `messages` | privé-berichten (max 200) |
| `/xodeon-api?path=apps` | `apps` | apps met NGC-code |

## Veiligheid
- `xak_…` keys **alleen** in edge function secrets, nooit in frontend bundle.
- Access tokens 30 dagen geldig.
- Alle aanroepen worden gelogd en zichtbaar in **Admin → Connecties** op Xodeon.

## Debuggen
Als je 4xx krijgt op `xodeon-oauth-token`:
- `invalid_client` (401) → `api_key` matcht geen actieve app. App aangemaakt? Key correct gekopieerd?
- `invalid_grant` (400) → code verlopen (>5 min), al gebruikt, of `redirect_uri` mismatcht.
- `invalid_request` (400) → één van `api_key`, `code`, `redirect_uri` ontbreekt in de body.
