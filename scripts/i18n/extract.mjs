/** Lists UI text with no translation: `npm run i18n:extract [-- --json]`. Exits 1 when any is missing. */
import { transformSync } from '@babel/core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import autoTranslate from './auto-translate.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const keys = new Map();
(function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(file);
    else if (/\.tsx?$/.test(entry.name) && !/\.d\.ts$/.test(entry.name))
      transformSync(fs.readFileSync(file, 'utf8'), {
        filename: file,
        configFile: false,
        babelrc: false,
        code: false,
        parserOpts: { plugins: entry.name.endsWith('x') ? ['typescript', 'jsx'] : ['typescript'] },
        plugins: [[autoTranslate, { collect: (key, f) => keys.has(key) || keys.set(key, path.relative(root, f)) }]],
      });
  }
})(path.join(root, 'src'));

// Legal body text stays in English until a lawyer approves a translation.
const isLegal = ([k, f]) => /(privacy|terms|cookies)-page/.test(f) && k.length > 70;

let missing = 0;
for (const lang of ['fr', 'rw']) {
  const file = path.join(root, `src/i18n/ui/${lang}.json`);
  const dict = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
  const gaps = [...keys].filter(e => !(e[0] in dict) && !isLegal(e));
  missing += gaps.length;
  console.log(`${lang}: ${keys.size - gaps.length}/${keys.size} translated`);
  if (!process.argv.includes('--quiet')) for (const [k, f] of gaps.slice(0, 50)) console.log(`  [${f}] ${k}`);
}
if (process.argv.includes('--json')) fs.writeFileSync(path.join(root, 'i18n-keys.json'), JSON.stringify([...keys], null, 1));
process.exitCode = missing ? 1 : 0;
