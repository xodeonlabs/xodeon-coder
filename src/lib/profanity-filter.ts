/**
 * Profanity filter for Dutch, French, and English.
 * Replaces bad words with asterisks while preserving first letter.
 */

const PROFANITY_WORDS: string[] = [
  // English
  'fuck', 'fucking', 'fucked', 'fucker', 'motherfucker', 'shit', 'shitty', 'bullshit',
  'ass', 'asshole', 'bitch', 'bitches', 'bastard', 'damn', 'damned', 'dick', 'dickhead',
  'cock', 'cunt', 'pussy', 'whore', 'slut', 'nigger', 'nigga', 'faggot', 'fag',
  'retard', 'retarded', 'crap', 'piss', 'pissed', 'wanker', 'twat', 'bollocks',
  'arsehole', 'tosser', 'shag', 'knob',

  // Dutch
  'kut', 'kanker', 'tering', 'tyfus', 'godverdomme', 'godver', 'klootzak', 'lul',
  'hoer', 'slet', 'mongool', 'debiel', 'eikel', 'sukkel', 'flikker', 'homo',
  'kutwijf', 'teringlijer', 'kankerlijer', 'kankerjoch', 'tyfuslijer',
  'opkankeren', 'optiffen', 'optiefen', 'pleur', 'pleurus', 'kolere',
  'godsamme', 'verdomme', 'verdomd', 'schijt', 'poep', 'reet', 'neuk', 'neuken',
  'pik', 'muts', 'trut', 'rotwijf', 'klerelijer', 'klere',

  // French
  'merde', 'putain', 'connard', 'connasse', 'salaud', 'salope', 'enculé',
  'enculer', 'bordel', 'foutre', 'nique', 'niquer', 'bâtard', 'batard',
  'couille', 'couilles', 'bite', 'chier', 'con', 'pute', 'fils de pute',
  'fdp', 'ntm', 'ta gueule', 'ferme ta gueule', 'branleur', 'branleuse',
  'pétasse', 'petasse', 'trou du cul', 'encule', 'pd',
];

// Build regex: match whole words, case-insensitive
const pattern = new RegExp(
  '\\b(' + PROFANITY_WORDS
    .map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .sort((a, b) => b.length - a.length) // longest first
    .join('|') + ')\\b',
  'gi'
);

/**
 * Censors profanity in a string. Keeps the first letter, replaces rest with asterisks.
 * Example: "fuck" → "f***"
 */
export function censorText(text: string): string {
  return text.replace(pattern, (match) => {
    if (match.length <= 1) return match;
    return match[0] + '*'.repeat(match.length - 1);
  });
}
