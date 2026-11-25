import i18n from 'i18next';

/** Tells the server which language to print PDFs in. */
export function languageHeader() {
  return { 'X-App-Language': i18n.language?.slice(0, 2) ?? 'en' };
}
