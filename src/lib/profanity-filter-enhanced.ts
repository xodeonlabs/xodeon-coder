/**
 * Enhanced profanity filter with multiple strategies
 */

const BANNED_WORDS = [
  // Add common profanity here
  // This is a placeholder list
  'badword1',
  'badword2',
];

const LEETSPEAK_MAP: Record<string, string> = {
  '4': 'a',
  '3': 'e',
  '1': 'i',
  '0': 'o',
  '5': 's',
  '7': 't',
  '!': 'i',
  '@': 'a',
  '$': 's',
};

/**
 * Convert leetspeak to regular text
 */
function decodeLeetspeak(text: string): string {
  let result = text;
  for (const [char, replacement] of Object.entries(LEETSPEAK_MAP)) {
    result = result.replaceAll(new RegExp(char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), replacement);
  }
  return result;
}

/**
 * Check if text contains profanity
 */
export function containsProfanity(text: string): boolean {
  const normalizedText = text
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^\w]/g, '');

  const leetDecoded = decodeLeetspeak(normalizedText);

  return BANNED_WORDS.some(word => normalizedText.includes(word) || leetDecoded.includes(word));
}

/**
 * Censor profanity in text
 */
export function censorText(text: string, replacement = '*'): string {
  let result = text;
  const normalizedText = text.toLowerCase();

  BANNED_WORDS.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    result = result.replace(regex, replacement.repeat(word.length));
  });

  return result;
}

/**
 * Check message safety with detailed result
 */
export interface SafetyCheckResult {
  isSafe: boolean;
  hasProfanity: boolean;
  isTooShort: boolean;
  isTooLong: boolean;
  reasons: string[];
}

export function checkMessageSafety(
  text: string,
  minLength = 1,
  maxLength = 2000
): SafetyCheckResult {
  const reasons: string[] = [];

  const isTooShort = text.trim().length < minLength;
  const isTooLong = text.length > maxLength;
  const hasProfanity = containsProfanity(text);

  if (isTooShort) reasons.push('Message is too short');
  if (isTooLong) reasons.push('Message is too long');
  if (hasProfanity) reasons.push('Message contains inappropriate language');

  return {
    isSafe: reasons.length === 0,
    hasProfanity,
    isTooShort,
    isTooLong,
    reasons,
  };
}
