import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const bundlePath = path.join(projectRoot, 'node_modules', 'rwanda', 'dist', 'rwanda.umd.cjs');
const outputPath = path.join(
  projectRoot,
  'src',
  'features',
  'location',
  'rwanda-locations.generated.ts',
);

const bundleSource = fs.readFileSync(bundlePath, 'utf8');
const match = bundleSource.match(/const a=(\{.*\});function h/s);

if (!match) {
  throw new Error('Could not extract Rwanda location data from the installed package bundle.');
}

const locationTree = Function(`"use strict"; return (${match[1]});`)();

const outputSource = `/* eslint-disable */
// Auto-generated from the installed \`rwanda\` package bundle.
// Regenerate with: npm run generate:rwanda-data
export const RWANDA_LOCATION_TREE: Record<string, Record<string, Record<string, Record<string, string[]>>>> = ${JSON.stringify(locationTree, null, 2)};
`;

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, outputSource);

console.log(`Generated ${path.relative(projectRoot, outputPath)}`);
