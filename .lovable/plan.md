

# Volgende stappen voor NGC Studio

Op basis van de eerder goedgekeurde features, hier het implementatieplan in volgorde van prioriteit:

---

## 1. Responsive Preview Modes (kleinste effort, direct visueel resultaat)

Voeg een device-switcher toe aan `Preview.tsx` met drie modes: telefoon (375px), tablet (768px) en desktop (100%). De preview wordt in een iframe-achtige container geplaatst met een device frame eromheen.

**Bestanden:** `src/pages/Preview.tsx` (aanpassen)

---

## 2. Version Diff View (uitbreiding op bestaande functionaliteit)

Voeg aan `NGCVersionPanel.tsx` een zij-aan-zij diff view toe. Wanneer een versie geselecteerd is, toon de huidige code naast de geselecteerde versie met gehighlighte verschillen (toevoegingen in groen, verwijderingen in rood). Puur client-side, geen database wijzigingen nodig.

**Bestanden:** `src/components/NGCVersionPanel.tsx` (aanpassen), nieuw `src/components/NGCDiffView.tsx`

---

## 3. Dashboard Statistieken (bestaande data, nieuwe visualisatie)

De `app_views` tabel bestaat al. Voeg op het Dashboard mini-statistieken toe per app (totaal views) en breid de Analytics pagina uit met trendgrafieken (views per dag, per week). Recharts is al geïnstalleerd.

**Bestanden:** `src/pages/Dashboard.tsx`, `src/pages/Analytics.tsx` (aanpassen)

---

## 4. Template Marketplace (grootste feature, nieuwe tabel nodig)

Nieuwe `templates` tabel met velden: id, name, description, ngc_code, author_id, category, downloads, rating, is_published. Nieuwe pagina `/templates` met zoekfunctie, categorieën en een "Gebruik template" knop die een nieuwe app aanmaakt op basis van de template code.

**Bestanden:** Nieuwe migratie, nieuwe `src/pages/Templates.tsx`, route toevoegen in `App.tsx`

---

## Aanbevolen aanpak

Begin met **Responsive Preview** — het is de kleinste wijziging met direct zichtbaar resultaat. Daarna **Diff View**, dan **Dashboard Statistieken**, en tot slot de **Template Marketplace**.

