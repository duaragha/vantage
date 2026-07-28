const MAX_TICKER_CANDIDATES = 12;
const TOKEN_RE = /(?<![A-Za-z])\$?[A-Za-z]{1,5}(?:\.[A-Za-z]{1,2})?(?![A-Za-z])/g;

const TICKER_STOPWORDS = new Set([
  'A',
  'ALL',
  'AN',
  'AND',
  'ARE',
  'AS',
  'AT',
  'BE',
  'BUT',
  'BY',
  'CAN',
  'DO',
  'FOR',
  'FROM',
  'GO',
  'HAD',
  'HAS',
  'HAVE',
  'HE',
  'HOW',
  'I',
  'IF',
  'IN',
  'IS',
  'IT',
  'ITS',
  'MAY',
  'MY',
  'NO',
  'NOT',
  'NOW',
  'OF',
  'ON',
  'OR',
  'OUR',
  'OUT',
  'SHE',
  'SO',
  'THAT',
  'THE',
  'THEY',
  'THIS',
  'TO',
  'TOO',
  'UP',
  'US',
  'WAS',
  'WAY',
  'WE',
  'WERE',
  'WHAT',
  'WHEN',
  'WHICH',
  'WHO',
  'WHY',
  'WITH',
  'WOULD',
  'YOU',
]);

const BEFORE_TICKER_CUE =
  /(?:about|analyse|analyze|bought|buying|check|compare|holding|into|look into|own|position in|research|shares? of|stock|tell me about|ticker)\s*$/i;
const AFTER_TICKER_CUE = /^\s+(?:position|shares?|stock|ticker)\b/i;

/**
 * Extract symbols only when the user writes an explicit ticker-like token.
 * Ordinary lowercase prose must not become market data requests: "all the
 * money" previously resolved to Allstate (ALL) and hijacked a SECZ follow-up.
 */
export function extractTickers(text: string): string[] {
  const out = new Set<string>();

  for (const match of text.matchAll(TOKEN_RE)) {
    const raw = match[0];
    const index = match.index ?? 0;
    const prefixed = raw.startsWith('$');
    const symbol = raw.replace(/^\$/, '').toUpperCase();
    const allUppercase = raw === raw.toUpperCase() && /[A-Z]/.test(raw);
    const before = text.slice(Math.max(0, index - 32), index);
    const after = text.slice(index + raw.length, index + raw.length + 20);
    const contextualBefore = BEFORE_TICKER_CUE.test(before);
    const contextualAfter = AFTER_TICKER_CUE.test(after);
    const stopword = TICKER_STOPWORDS.has(symbol);
    const explicitByContext =
      (!stopword && contextualBefore) ||
      (allUppercase && contextualAfter) ||
      (contextualBefore && contextualAfter);

    if (!prefixed && !explicitByContext && (!allUppercase || stopword)) continue;
    if (symbol.length < 2) continue;

    out.add(symbol);
    if (out.size >= MAX_TICKER_CANDIDATES) break;
  }

  return [...out];
}

/**
 * Current-message symbols win. When a follow-up omits the symbol, carry the
 * newest explicit ticker from the user's own prior turns.
 */
export function resolveConversationTickers(
  currentMessage: string,
  priorUserMessagesNewestFirst: readonly string[],
): string[] {
  const current = extractTickers(currentMessage);
  if (current.length > 0) return current;

  for (const message of priorUserMessagesNewestFirst) {
    const prior = extractTickers(message);
    if (prior.length > 0) return prior;
  }

  return [];
}
