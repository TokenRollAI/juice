#!/usr/bin/env node
/**
 * Juice UI CLI (`npx @tokenroll/juice`)
 *
 * Commands:
 *   npx @tokenroll/juice list [--json]
 *   npx @tokenroll/juice init [--dir src/components/juice] [--force]
 *   npx @tokenroll/juice add <name...> [--dir src/components/juice] [--force] [--dry-run]
 *
 * Zero external runtime dependencies (Node.js >= 22).
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const pkgRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = resolve(pkgRoot, 'src');
const distCssPath = resolve(pkgRoot, 'dist/styles.css');

const CORE_FILES = ['sound.ts', 'bridge.ts', 'behaviors.tsx'];

const MODULES = [
  {
    id: 'tactile',
    aliases: ['core-blocks', 'components'],
    file: 'components.tsx',
    category: 'Core Primitives & Tactile Blocks',
    description: 'Kbd, Badge, SegmentedControl, Switch, Checkbox, RollingNumber, StateButton, ScrubPanel, SlideConfirm, DynamicIsland, MorphCard, MetricRibbon, Composer, ThinkingMorph, CommandPalette, ToastStack, SplitCompare',
  },
  {
    id: 'extended',
    aliases: ['workspace'],
    file: 'components-extended.tsx',
    category: 'Extended Workspace & Direct Manipulation',
    description: 'OtpField, PassStrength, TimeSlotPicker, RadialDial, SwipeCard, SelectionToolbar, DataGrid, TreeExplorer, ResizableSplit, FilterBar, DrawerSheet, TabsMorph, AudioWaveTrim, CodeDiffReveal, SkeletonMorph, TransferList',
  },
  {
    id: 'foundation-forms',
    aliases: ['forms'],
    file: 'components-foundation-forms.tsx',
    category: 'Everyday Foundation · Forms',
    description: 'Button, IconButton, TextField, Textarea, Select, RadioCard, NumberField, Slider + ButtonKit, InputFields, SelectCombobox, ChoiceCards, RangeNumberKit, TagCalendarKit, SettingsRows, FileDropzone',
  },
  {
    id: 'foundation-nav',
    aliases: ['nav', 'navigation'],
    file: 'components-foundation-nav.tsx',
    category: 'Everyday Foundation · Nav & Feedback',
    description: 'Breadcrumbs, Pagination, Alert, Skeleton, Spinner + DialogModal, DropdownMenuKit, PopoverTooltipKit, AccordionKit, NavPagination, AlertProgress, AvatarProfile, EmptyStateCard',
  },
  {
    id: 'composable',
    aliases: ['compound', 'dialog', 'sheet', 'dropdown', 'tabs', 'toast', 'table', 'avatar', 'chart', 'otp', 'accordion'],
    file: 'components-composable.tsx',
    category: 'Composable App & SaaS Primitives',
    description: 'Dialog, Sheet, DropdownMenu, Tabs, Accordion, ToastProvider/ToastViewport/createToastManager, Table, Avatar, ChartTooltipContent, ChartLegendContent, OtpInput',
  },
  {
    id: 'radix-primitives',
    aliases: ['radix'],
    file: 'components-radix-primitives.tsx',
    category: 'Radix WAI-ARIA Primitives',
    description: 'Separator, AspectRatio, Label, Collapsible, ContextMenu, Menubar, NavigationMenu, Toggle, Toolbar, ToggleGroup, AlertDialog, ScrollArea, DualRangeSlider + *Kit',
  },
  {
    id: 'base-ui',
    aliases: ['base'],
    file: 'components-base-ui.tsx',
    category: 'Base UI Compound Primitives',
    description: 'Form, Fieldset, Field, Meter, Progress, Autocomplete, CheckboxGroup (3-state), ScrubNumberField, PreviewCard + *Kit',
  },
  {
    id: 'portal-floating',
    aliases: ['portal', 'floating', 'studio'],
    file: 'components-portal-floating.tsx',
    category: 'Portal, Floating & Studio Primitives',
    description: 'placeFloating, FloatingPopover, CenterPopover, useTooltip, Tooltip, HoverPreviewList, BreadcrumbSelect, AdaptiveToolbar, SwatchGridPicker, InspectorSheet + *Kit',
  },
  {
    id: 'media-workbench',
    aliases: ['media', 'workbench', 'timeline'],
    file: 'components-media-workbench.tsx',
    category: 'Media, Timeline & Workbench Primitives',
    description: 'ProgressRing, CopySnippet, MediaTransport, StepTimeline, useIdleVisibility, IdleAutoHideBar, CornerSnapOrb, TaskProgressCard, MaskedSecretField, MaskedSecretInput + showcase blocks',
  },
  {
    id: 'ai-chat',
    aliases: ['chat'],
    file: 'components-ai-chat.tsx',
    category: 'Deep AI Chat Workflows',
    description: 'SlashMentionComposer, ModelEffortPicker, ContextBudgetMeter, GroundedAnswer, MessageBranchThread, ModelArenaCompare, VisionRegionAsk, VoiceOrbSession',
  },
  {
    id: 'ai-agents',
    aliases: ['agents', 'agent'],
    file: 'components-ai-agents.tsx',
    category: 'Deep AI Agent Workflows',
    description: 'ToolApprovalGate, SubagentSwarmBoard, AgentPlanChecklist, ArtifactCanvas, AgentMemoryStore, TerminalStreamCard, RateLimitBanner, McpServerRoster',
  },
];

function toKebab(name) {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[_\s]+/g, '-')
    .toLowerCase();
}

function normalizeKey(input) {
  return toKebab(input.trim()).replace(/[^a-z0-9-]/g, '');
}

function extractExports(fileName) {
  const txt = readFileSync(resolve(srcDir, fileName), 'utf8');
  const values = [...txt.matchAll(/^export\s+(?:function|const|class)\s+([A-Za-z0-9_]+)/gm)].map((m) => m[1]);
  const localDeps = [...txt.matchAll(/from\s+['"]\.\/([^'"]+)['"]/g)].map((m) => m[1]);
  const extDeps = [...txt.matchAll(/from\s+['"]([^./][^'"]+)['"]/g)].map((m) => {
    const raw = m[1];
    if (raw.startsWith('@')) return raw.split('/').slice(0, 2).join('/');
    return raw.split('/')[0];
  });
  return {
    values,
    localDeps: [...new Set(localDeps)],
    extDeps: [...new Set(extDeps)].filter((d) => d !== 'react' && d !== 'react-dom'),
  };
}

function buildRegistryIndex() {
  const byFile = new Map();
  const byToken = new Map();

  for (const mod of MODULES) {
    const meta = extractExports(mod.file);
    const entry = { ...mod, ...meta };
    byFile.set(mod.file, entry);

    for (const key of [mod.id, ...mod.aliases, mod.file.replace(/\.tsx?$/, '')]) {
      byToken.set(normalizeKey(key), { module: entry, symbol: null });
    }
    for (const sym of meta.values) {
      byToken.set(normalizeKey(sym), { module: entry, symbol: sym });
    }
  }

  return { byFile, byToken };
}

function readBundledCss() {
  if (existsSync(distCssPath)) {
    return readFileSync(distCssPath, 'utf8');
  }
  const mainCss = readFileSync(resolve(srcDir, 'styles.css'), 'utf8').replace(
    /@import\s+['"]\.\/styles-(?:ai|foundation|studio)\.css['"];\s*/g,
    '',
  );
  const subParts = ['styles-ai.css', 'styles-foundation.css', 'styles-studio.css']
    .map((f) => `/* ── ${f} ── */\n${readFileSync(resolve(srcDir, f), 'utf8')}`)
    .join('\n\n');
  return `${mainCss.trim()}\n\n${subParts.trim()}\n`;
}

function transformSourceForConsumer(source) {
  // Strip explicit .ts/.tsx extensions on relative local imports so files compile
  // cleanly in Next.js, Vite, Remix, Astro, and standard tsconfig setups.
  return source.replace(/(from\s+['"]\.\/[^'"]+?)\.tsx?(['"])/g, '$1$2');
}

function resolveTransitiveFiles(initialFiles) {
  const visited = new Set();
  const ordered = [];

  function visit(fileName) {
    if (visited.has(fileName)) return;
    visited.add(fileName);
    const fullPath = resolve(srcDir, fileName);
    if (!existsSync(fullPath)) return;
    const txt = readFileSync(fullPath, 'utf8');
    const deps = [...txt.matchAll(/from\s+['"]\.\/([^'"]+)['"]/g)].map((m) => m[1]);
    for (const dep of deps) {
      visit(dep);
    }
    ordered.push(fileName);
  }

  for (const f of CORE_FILES) visit(f);
  for (const f of initialFiles) visit(f);
  return ordered;
}

function collectPeerPackages(files) {
  const pkgs = new Set();
  for (const f of files) {
    const txt = readFileSync(resolve(srcDir, f), 'utf8');
    for (const m of txt.matchAll(/from\s+['"]([^./][^'"]+)['"]/g)) {
      const raw = m[1];
      const pkg = raw.startsWith('@') ? raw.split('/').slice(0, 2).join('/') : raw.split('/')[0];
      if (pkg !== 'react' && pkg !== 'react-dom') pkgs.add(pkg);
    }
  }
  return [...pkgs].sort();
}

function writeTargetFile(targetDir, fileName, content, { force, dryRun }) {
  const dest = resolve(targetDir, fileName);
  const existed = existsSync(dest);
  if (existed && !force) {
    return { file: fileName, status: 'skipped' };
  }
  if (!dryRun) {
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, content, 'utf8');
  }
  return { file: fileName, status: existed ? 'overwritten' : 'created' };
}

function parseArgs(argv) {
  const positional = [];
  let dir = 'src/components/juice';
  let force = false;
  let dryRun = false;
  let json = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--dir' || arg === '-d') {
      dir = argv[++i] ?? dir;
    } else if (arg.startsWith('--dir=')) {
      dir = arg.slice('--dir='.length);
    } else if (arg === '--force' || arg === '-f') {
      force = true;
    } else if (arg === '--dry-run') {
      dryRun = true;
    } else if (arg === '--json') {
      json = true;
    } else if (arg === '--help' || arg === '-h') {
      return { command: 'help', positional: [], dir, force, dryRun, json };
    } else {
      positional.push(arg);
    }
  }

  const [command = 'help', ...rest] = positional;
  return { command, positional: rest, dir, force, dryRun, json };
}

function printHelp() {
  console.log(`
Juice UI CLI (@tokenroll/juice)

Usage:
  npx @tokenroll/juice list [--json]
  npx @tokenroll/juice init [--dir src/components/juice] [--force]
  npx @tokenroll/juice add <name...> [--dir src/components/juice] [--force] [--dry-run]

Examples:
  npx @tokenroll/juice list
  npx @tokenroll/juice init --dir src/components/juice
  npx @tokenroll/juice add tool-approval-gate slash-mention-composer
  npx @tokenroll/juice add floating-popover media-workbench
  npx @tokenroll/juice add all
`);
}

function cmdList({ json }) {
  const { byFile } = buildRegistryIndex();
  const modules = MODULES.map((m) => {
    const info = byFile.get(m.file);
    return {
      id: m.id,
      aliases: m.aliases,
      file: m.file,
      category: m.category,
      exports: info.values,
      peerDeps: info.extDeps,
    };
  });

  if (json) {
    console.log(JSON.stringify({ core: CORE_FILES, modules }, null, 2));
    return;
  }

  const totalExports = modules.reduce((acc, m) => acc + m.exports.length, 0);
  console.log(`\nJuice UI Registry · ${modules.length} modules · ${totalExports} component exports\n`);
  for (const m of modules) {
    console.log(`  ${m.id.padEnd(18)} ${m.category} (${m.exports.length} exports)`);
    console.log(`    ${m.exports.slice(0, 8).join(', ')}${m.exports.length > 8 ? `, +${m.exports.length - 8} more` : ''}`);
  }
  console.log(`\nAdd by module or any component name (kebab-case or PascalCase):`);
  console.log(`  npx @tokenroll/juice add tool-approval-gate floating-popover\n`);
}

function cmdInit({ dir, force, dryRun }) {
  const targetDir = resolve(process.cwd(), dir);
  const relDir = relative(process.cwd(), targetDir) || '.';
  const results = [];

  results.push(writeTargetFile(targetDir, 'juice.css', readBundledCss(), { force, dryRun }));
  for (const f of CORE_FILES) {
    const content = transformSourceForConsumer(readFileSync(resolve(srcDir, f), 'utf8'));
    results.push(writeTargetFile(targetDir, f, content, { force, dryRun }));
  }

  console.log(`\nJuice UI initialized in ${relDir}/${dryRun ? ' (dry-run)' : ''}\n`);
  for (const r of results) {
    const tag = r.status === 'created' ? '+' : r.status === 'overwritten' ? '~' : '=';
    console.log(`  ${tag} ${relDir}/${r.file} (${r.status})`);
  }

  console.log(`
Next steps:
  1. Import the stylesheet once in your app entry:
       import './${relDir.replace(/^\.?\//, '')}/juice.css';

  2. Optional — map your app's brand ink & surface tokens (entire 6-step ramp adapts):
       :root {
         --fill-on: #17181a;
         --fill-slab: #ffffff;
         --juice-signal: #2231dd;
       }

  3. Add any component or module with full source ownership:
       npx @tokenroll/juice add button floating-popover tool-approval-gate --dir ${relDir}
`);
}

function cmdAdd({ positional, dir, force, dryRun }) {
  if (positional.length === 0) {
    console.error('Error: Please specify at least one component or module name (or "all").');
    console.error('Run `npx @tokenroll/juice list` to see available modules and components.');
    process.exit(1);
  }

  const { byToken } = buildRegistryIndex();
  const targetModules = new Set();
  const matchedSymbols = [];
  const unknown = [];

  for (const rawName of positional) {
    const key = normalizeKey(rawName);
    if (key === 'all') {
      for (const m of MODULES) targetModules.add(m.file);
      continue;
    }
    const hit = byToken.get(key);
    if (!hit) {
      unknown.push(rawName);
      continue;
    }
    targetModules.add(hit.module.file);
    if (hit.symbol) {
      matchedSymbols.push({ symbol: hit.symbol, file: hit.module.file });
    }
  }

  if (unknown.length > 0) {
    console.error(`Unknown Juice component or module: ${unknown.join(', ')}`);
    console.error('Run `npx @tokenroll/juice list` to see all available names.');
    process.exit(1);
  }

  const allFiles = resolveTransitiveFiles([...targetModules]);
  const peerPkgs = collectPeerPackages(allFiles);
  const targetDir = resolve(process.cwd(), dir);
  const relDir = relative(process.cwd(), targetDir) || '.';
  const results = [];

  results.push(writeTargetFile(targetDir, 'juice.css', readBundledCss(), { force, dryRun }));
  for (const f of allFiles) {
    const content = transformSourceForConsumer(readFileSync(resolve(srcDir, f), 'utf8'));
    results.push(writeTargetFile(targetDir, f, content, { force, dryRun }));
  }

  console.log(`\nAdded Juice UI source files into ${relDir}/${dryRun ? ' (dry-run)' : ''}\n`);
  for (const r of results) {
    const tag = r.status === 'created' ? '+' : r.status === 'overwritten' ? '~' : '=';
    console.log(`  ${tag} ${relDir}/${r.file} (${r.status})`);
  }

  if (peerPkgs.length > 0) {
    console.log(`\nRequired packages:\n  pnpm add ${peerPkgs.join(' ')}`);
  }

  const sample = matchedSymbols[0];
  if (sample) {
    const modPath = `./${relDir.replace(/^\.?\//, '')}/${sample.file.replace(/\.tsx?$/, '')}`;
    console.log(`\nImport example (no <JuiceProvider> required):\n  import './${relDir.replace(/^\.?\//, '')}/juice.css';\n  import { ${sample.symbol} } from '${modPath}';\n`);
  } else {
    console.log(`\nImport './${relDir.replace(/^\.?\//, '')}/juice.css' once, then import components directly (no <JuiceProvider> required).\n`);
  }
}

const args = parseArgs(process.argv.slice(2));
if (args.command === 'list') {
  cmdList(args);
} else if (args.command === 'init') {
  cmdInit(args);
} else if (args.command === 'add') {
  cmdAdd(args);
} else {
  printHelp();
}
