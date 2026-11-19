import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = resolve(root, 'packages/juice/src');

const parts = [
  'styles.css',
  'styles-ai.css',
  'styles-foundation.css',
  'styles-studio.css',
];

const mainCss = readFileSync(resolve(srcDir, 'styles.css'), 'utf8').replace(
  /@import\s+['"]\.\/styles-(?:ai|foundation|studio)\.css['"];\s*/g,
  '',
);
const subCss = parts
  .slice(1)
  .map((name) => `/* ── ${name} ── */\n${readFileSync(resolve(srcDir, name), 'utf8')}`)
  .join('\n\n');

const bundled = `${mainCss.trim()}\n\n${subCss.trim()}\n`;

for (const outPath of [
  resolve(root, 'packages/juice/dist/styles.css'),
  resolve(root, 'packages/vue/dist/styles.css'),
]) {
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, bundled, 'utf8');
}

console.log(`Bundled Juice styles.css (${(bundled.length / 1024).toFixed(1)} KB) -> packages/juice/dist & packages/vue/dist`);
