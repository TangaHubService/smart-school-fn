import i18n from './config';

let dictionary: Record<string, string> = {};

/** Loads the UI dictionary for the current language. Must finish before any page module loads. */
export async function loadUiDictionary() {
  const lang = i18n.language?.slice(0, 2);
  if (lang === 'fr') {
    dictionary = (await import('./ui/fr.json')).default;
    tx.locale = 'fr-FR';
  }
  if (lang === 'rw') dictionary = (await import('./ui/rw.json')).default;
}

/**
 * Translates English UI text; unknown text is returned unchanged. Calls are inserted at
 * build time (scripts/i18n/auto-translate.mjs); call it directly only for text that
 * arrives at runtime, such as a status or a server message.
 */
export function tx(text: string, ...values: unknown[]): string {
  const found = dictionary[text] ?? text;
  return values.length ? found.replace(/\{\{(\d+)\}\}/g, (_, i) => String(values[Number(i)])) : found;
}

/** Date locale for dates written without one; undefined keeps the browser's. */
tx.locale = undefined as string | undefined;
