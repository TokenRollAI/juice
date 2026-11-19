import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = resolve(root, 'packages/juice/src');
const parts = [];
const main = readFileSync(resolve(srcDir, 'styles.css'), 'utf8').replace(
  /^@import ['"]\.\/(styles-[\w-]+\.css)['"];\s*/gm,
  (_, name) => {
    parts.push(`/* ── ${name} ── */\n${readFileSync(resolve(srcDir, name), 'utf8')}`);
    return '';
  },
);

// The source marks the end of the tokens and the start of the scoped base selector.
const globalBase = main.indexOf('/* @juice-global-base */');
const scopedBase = main.indexOf('/* @juice-scoped-base */');
if (globalBase < 0 || scopedBase <= globalBase) throw new Error('Missing Juice CSS entry-point markers');

const tokens = main.slice(0, globalBase).trimEnd();
const components = parts.join('\n\n').trimEnd();
const bundles = {
  'styles.css': `${main.trimEnd()}\n\n${components}\n`,
  'tokens.css': `${tokens}\n`,
  'scoped.css': `${tokens}\n\n${main.slice(scopedBase).trimEnd()}\n\n${components}\n`,
};

for (const pkg of ['juice', 'vue']) {
  const dir = resolve(root, 'packages', pkg, 'dist');
  mkdirSync(dir, { recursive: true });
  for (const [name, css] of Object.entries(bundles)) writeFileSync(resolve(dir, name), css);
}

console.log(`Bundled ${Object.keys(bundles).join(', ')} for Juice React and Vue`);
