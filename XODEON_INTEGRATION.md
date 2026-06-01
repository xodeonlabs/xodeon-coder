# Xodeon Account & Data API — Integratie-prompt voor andere Lovable-apps

Plak deze prompt in een andere Lovable-app om "Login met Xodeon" toe te voegen en profiel/vrienden/berichten/apps te synchroniseren.

---

**Prompt voor de AI:**

> Bouw een "Login met Xodeon"-integratie in deze app. Gebruik het volgende OAuth + REST systeem.
>
> ## 1. Configuratie
> Voeg deze secrets toe via Lovable Cloud:
> - `XODEON_API_KEY` — de API-sleutel die ik op https://xodeon-coder.lovable.app/developers heb aangemaakt (begint met `xak_`)
> - `XODEON_CLIENT_ID` — het app-id (uuid) dat naast de sleutel staat
>
> Constanten in de frontend:
> - `XODEON_ORIGIN = "https://xodeon-coder.lovable.app"`
> - `XODEON_API = "https://xgnewppkivznltxugzcu.supabase.co/functions/v1"`
> - `REDIRECT_URI = window.location.origin + "/oauth/callback"`
>   (Voeg deze redirect URI ook toe aan de app in het Xodeon Developers-paneel.)
>
> ## 2. Login-knop
> Stuur de gebruiker naar:
> ```
> {XODEON_ORIGIN}/oauth/authorize?client_id={CLIENT_ID}&redirect_uri={encodeURIComponent(REDIRECT_URI)}&scopes=profile,friends,messages,apps&state={random}
> ```
>
> ## 3. Callback-pagina `/oauth/callback`
> - Lees `code` uit de URL
> - Roep een edge function aan die POST doet naar `{XODEON_API}/xodeon-oauth-token` met body `{ api_key, code, redirect_uri }` (api_key uit secrets — nooit in de browser)
> - Sla het terugkomende `access_token` op in een eigen `xodeon_connections` tabel gekoppeld aan de huidige user
>
> ## 4. Data ophalen (server-side edge function)
> Alle calls naar:
> ```
> GET {XODEON_API}/xodeon-api?path=<endpoint>
> Headers:
>   x-api-key: {XODEON_API_KEY}
>   Authorization: Bearer {access_token}
> ```
> Endpoints:
> - `me` → `{ user: { id, username, display_name, avatar_url, bio, banner_url, country } }`
> - `friends` → `{ friends: [{ id, username, display_name, avatar_url }] }`
> - `messages` → `{ messages: [{ id, sender_id, receiver_id, content, created_at, read_at }] }` (laatste 200)
> - `apps` → `{ apps: [{ id, name, ngc_code, icon, is_public, slug, ... }] }`
>
> ## 5. UI
> - Toon op profielscherm de gesyncte naam + avatar uit `/me`
> - Pagina "Vrienden" toont `/friends`
> - Pagina "Mijn Xodeon Apps" toont `/apps` en kan `ngc_code` renderen of doorlinken
>
> Werk RLS-veilig: tokens alleen in edge functions gebruiken, nooit naar de browser sturen.

---

## Endpoint-reference

| Pad | Scope | Geeft |
|---|---|---|
| `/me` | `profile` | profiel |
| `/friends` | `friends` | geaccepteerde vrienden |
| `/messages` | `messages` | privé-berichten (200) |
| `/apps` | `apps` | apps met NGC-code |

## Veiligheid
- `xak_…` API-sleutels altijd in edge function secrets.
- Access tokens 30 dagen geldig, in te trekken via Instellingen → Verbonden apps.
- Alle aanroepen worden gelogd en zichtbaar in Admin → Connecties.
