import { useEffect, useState, useCallback } from 'react';

export type AppMode = 'default' | 'developer' | 'gamer';

const KEY = 'app_mode_v1';
const EVENT = 'app-mode-changed';

export function getAppMode(): AppMode {
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'developer' || v === 'gamer') return v;
  } catch { /* noop */ }
  return 'default';
}

export function setAppMode(mode: AppMode) {
  try {
    if (mode === 'default') localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, mode);
  } catch { /* noop */ }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: mode }));
  applyModeToDom(mode);
}

export function applyModeToDom(mode: AppMode) {
  const root = document.documentElement;
  root.classList.toggle('gamer-mode', mode === 'gamer');
  root.classList.toggle('developer-mode', mode === 'developer');
}

export function useAppMode(): [AppMode, (m: AppMode) => void] {
  const [mode, setMode] = useState<AppMode>(() => getAppMode());

  useEffect(() => {
    applyModeToDom(mode);
  }, [mode]);

  useEffect(() => {
    const onChange = () => setMode(getAppMode());
    window.addEventListener(EVENT, onChange);
    window.addEventListener('storage', onChange);
    return () => {
      window.removeEventListener(EVENT, onChange);
      window.removeEventListener('storage', onChange);
    };
  }, []);

  const update = useCallback((m: AppMode) => {
    setAppMode(m);
    setMode(m);
  }, []);

  return [mode, update];
}

/**
 * Gamer-mode woordvervangingen. Toegepast als hele woorden (case-insensitive).
 * Alles wat niét in deze lijst staat blijft de originele term (fallback).
 * NL/EN/FR door elkaar zodat de lijst werkt in elke taal.
 */
export const GAMER_WORD_MAP: Record<string, string> = {
  // Kern navigatie
  Dashboard: 'Base',
  Home: 'Base',
  Startpagina: 'Base',
  Accueil: 'Base',
  Berichten: 'Party Chat',
  Messages: 'Party Chat',
  Chat: 'Party Chat',
  Groepen: 'Squads',
  Groups: 'Squads',
  Groupes: 'Squads',
  Bedrijf: 'Guild',
  Organisatie: 'Guild',
  Organization: 'Guild',
  Company: 'Guild',
  Entreprise: 'Guild',
  Allianties: 'Clans',
  Alliances: 'Clans',
  Analytics: 'Stats',
  Statistieken: 'Stats',
  Statistiques: 'Stats',
  Templates: 'Loadouts',
  Sjablonen: 'Loadouts',
  Modèles: 'Loadouts',
  Upgrades: 'Power-ups',
  Verbeteringen: 'Power-ups',
  Améliorations: 'Power-ups',
  Tutorial: 'Training',
  Tutoriel: 'Training',
  Developers: 'Modders',
  Ontwikkelaars: 'Modders',
  Développeurs: 'Modders',
  Instellingen: 'Config',
  Settings: 'Config',
  Paramètres: 'Config',
  Profiel: 'Player Card',
  Profile: 'Player Card',
  Profil: 'Player Card',
  Meer: 'Extras',
  More: 'Extras',
  Plus: 'Extras',
  Producten: 'Arsenal',
  Products: 'Arsenal',
  Produits: 'Arsenal',
  Admin: 'GM',
  Beheer: 'GM',

  // Economie
  coins: 'XP',
  coin: 'XP',
  Coins: 'XP',
  saldo: 'HP',
  balance: 'HP',
  solde: 'HP',
  premie: 'loot',
  bonus: 'loot',
  reward: 'loot',
  beloning: 'loot',
  récompense: 'loot',
  aankoop: 'unlock',
  purchase: 'unlock',
  koop: 'unlock',
  buy: 'unlock',
  acheter: 'unlock',
  betalen: 'pay-up',
  betaal: 'pay-up',
  pay: 'pay-up',
  payer: 'pay-up',
  prijs: 'cost',
  price: 'cost',
  prix: 'cost',
  abonnement: 'season pass',
  subscription: 'season pass',
  plan: 'season pass',

  // Auth & account
  Inloggen: 'Enter arena',
  'Log in': 'Enter arena',
  Login: 'Enter arena',
  'Sign in': 'Enter arena',
  Connexion: 'Enter arena',
  Uitloggen: 'Log out arena',
  Logout: 'Log out arena',
  Déconnexion: 'Log out arena',
  Registreren: 'New player',
  'Sign up': 'New player',
  Register: 'New player',
  Inscription: 'New player',
  Account: 'Player',
  Compte: 'Player',
  Gebruiker: 'Player',
  User: 'Player',
  Utilisateur: 'Player',
  Gebruikers: 'Players',
  Users: 'Players',
  Utilisateurs: 'Players',
  Wachtwoord: 'Secret code',
  Password: 'Secret code',
  'Mot de passe': 'Secret code',
  Gebruikersnaam: 'Tag',
  Username: 'Tag',
  'Nom d’utilisateur': 'Tag',
  Email: 'Comm-link',
  'E-mail': 'Comm-link',
  Naam: 'Callsign',
  Name: 'Callsign',
  Nom: 'Callsign',
  Bio: 'Lore',

  // Sociale features
  Vriend: 'Ally',
  Vrienden: 'Allies',
  Friend: 'Ally',
  Friends: 'Allies',
  Ami: 'Ally',
  Amis: 'Allies',
  'Vriendschapsverzoek': 'Party invite',
  'Friend request': 'Party invite',
  Volgen: 'Track',
  Follow: 'Track',
  Suivre: 'Track',
  Ontvolgen: 'Untrack',
  Unfollow: 'Untrack',
  Blokkeren: 'Kick',
  Block: 'Kick',
  Bloquer: 'Kick',
  Rapporteren: 'Flag',
  Report: 'Flag',
  Signaler: 'Flag',

  // Editor / apps
  App: 'Build',
  Apps: 'Builds',
  Project: 'Build',
  Projet: 'Build',
  Publiceren: 'Deploy',
  Publish: 'Deploy',
  Publier: 'Deploy',
  Delen: 'Broadcast',
  Share: 'Broadcast',
  Partager: 'Broadcast',
  Downloaden: 'Grab',
  Download: 'Grab',
  Télécharger: 'Grab',
  Uploaden: 'Beam up',
  Upload: 'Beam up',
  Téléverser: 'Beam up',
  Aanmaken: 'Spawn',
  Create: 'Spawn',
  Nieuw: 'Spawn',
  New: 'Spawn',
  Nouveau: 'Spawn',
  Verwijderen: 'Destroy',
  Delete: 'Destroy',
  Supprimer: 'Destroy',
  Bewerken: 'Modify',
  Edit: 'Modify',
  Modifier: 'Modify',
  Opslaan: 'Save state',
  Save: 'Save state',
  Enregistrer: 'Save state',
  Annuleren: 'Bail',
  Cancel: 'Bail',
  Annuler: 'Bail',
  Bevestigen: 'Lock in',
  Confirm: 'Lock in',
  Confirmer: 'Lock in',
  Zoeken: 'Scan',
  Search: 'Scan',
  Rechercher: 'Scan',
  Filter: 'Recon',
  Filtre: 'Recon',
  Sorteren: 'Rank',
  Sort: 'Rank',
  Trier: 'Rank',

  // Status / feedback
  Laden: 'Loading',
  Loading: 'Loading',
  Chargement: 'Loading',
  Bezig: 'Grinding',
  Klaar: 'Ready',
  Ready: 'Ready',
  Prêt: 'Ready',
  Gelukt: 'GG',
  Success: 'GG',
  Succès: 'GG',
  Fout: 'Rekt',
  Error: 'Rekt',
  Erreur: 'Rekt',
  Waarschuwing: 'Warning',
  Warning: 'Warning',
  Avertissement: 'Warning',
  Mislukt: 'Wiped',
  Failed: 'Wiped',
  Échec: 'Wiped',
  Online: 'Online',
  Offline: 'AFK',
  Actief: 'Active',
  Active: 'Active',
  Actif: 'Active',
  Inactief: 'AFK',
  Inactive: 'AFK',
  Inactif: 'AFK',

  // Levels / progressie
  Level: 'Rank',
  Niveau: 'Rank',
  Punten: 'Score',
  Points: 'Score',
  Score: 'Score',
  Ervaring: 'XP',
  Experience: 'XP',
  Expérience: 'XP',
  Achievement: 'Trophy',
  Prestaties: 'Trophies',
  Achievements: 'Trophies',
  
  Leaderboard: 'Hall of fame',
  Ranglijst: 'Hall of fame',
  Classement: 'Hall of fame',

  // Overig
  Welkom: 'GLHF',
  Welcome: 'GLHF',
  Bienvenue: 'GLHF',
  Help: 'Cheat sheet',
  Hulp: 'Cheat sheet',
  Aide: 'Cheat sheet',
  Nieuws: 'Patch notes',
  News: 'Patch notes',
  Actualités: 'Patch notes',
  Update: 'Patch',
  Updates: 'Patches',
  'Mise à jour': 'Patch',
  Versie: 'Build no.',
  Version: 'Build no.',
  Taal: 'Loc',
  Language: 'Loc',
  Langue: 'Loc',
  Modus: 'Mode',
  Mode: 'Mode',
};

const GAMER_ENTRIES: Array<[RegExp, string]> = Object.entries(GAMER_WORD_MAP).map(([src, dst]) => {
  const escaped = src.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return [new RegExp(`\\b${escaped}\\b`, 'gi'), dst];
});

/** Vervang gamer-woorden. Woorden zonder mapping blijven ongewijzigd (fallback = origineel). */
export function gamerize(text: string, mode: AppMode): string {
  if (mode !== 'gamer' || !text) return text;
  let out = text;
  for (const [re, rep] of GAMER_ENTRIES) out = out.replace(re, rep);
  return out;
}

