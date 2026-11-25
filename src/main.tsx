import { loadUiDictionary } from './i18n/tx';

// Pages read their text while loading, so the dictionary has to be there first.
void loadUiDictionary()
  .catch((error) => console.error('[i18n] could not load the dictionary; using English', error))
  .then(() => import('./bootstrap'));
