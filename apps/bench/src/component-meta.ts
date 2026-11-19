import { BLOCK_CATALOG, type BlockSpec } from './catalog.tsx';

export type ComponentPillarId =
  | 'ai'
  | 'foundation'
  | 'radix'
  | 'base-ui'
  | 'portal'
  | 'media'
  | 'tactile';

export type ComponentSubpath = '@tokenroll/juice/blocks' | '@tokenroll/juice/primitives';

export type ComponentViewTarget = 'overview' | string;

export const DEFAULT_COMPONENT_ID = 'thinking-morph';

export const PILLAR_DEFINITIONS: ReadonlyArray<{
  id: ComponentPillarId;
  label: string;
  description: string;
}> = [
  {
    id: 'ai',
    label: 'AI Chat & Agents',
    description: 'Reasoning traces, slash composers, grounded citations, HITL gates, and agent swarms.',
  },
  {
    id: 'foundation',
    label: 'Everyday Foundation',
    description: 'Concentric buttons, inputs, searchable comboboxes, choice cards, menus, and dialogs.',
  },
  {
    id: 'radix',
    label: 'Radix Primitives',
    description: 'WAI-ARIA context menus, menubars, mega-menus, toolbars, scroll areas, and alert dialogs.',
  },
  {
    id: 'base-ui',
    label: 'Base UI Compound',
    description: 'Compound fieldsets, free-text autocomplete, 3-state checkbox groups, scrub fields, and meters.',
  },
  {
    id: 'portal',
    label: 'Portal & Studio',
    description: 'Collision-aware floating popovers, hover previews, adaptive toolbars, and property sheets.',
  },
  {
    id: 'media',
    label: 'Media & Workbench',
    description: 'Transport docks, auto-hide pills, magnetic corner orbs, task rings, and secret vaults.',
  },
  {
    id: 'tactile',
    label: 'Tactile & Workspace',
    description: 'Spring state machines, scrub panels, dynamic islands, data grids, splitters, and file trees.',
  },
];

type RawMetaEntry = {
  title: string;
  pillar: ComponentPillarId;
  order: number;
  primitives?: readonly string[];
};

const COMPONENT_META_MAP: Record<string, RawMetaEntry> = {
  // 1. AI Chat & Agents
  'thinking-morph': { title: 'Thinking Morph', pillar: 'ai', order: 1 },
  'slash-mention-composer': { title: 'Slash Mention Composer', pillar: 'ai', order: 2 },
  composer: { title: 'Prompt Composer', pillar: 'ai', order: 3 },
  'model-effort-picker': { title: 'Model Effort Picker', pillar: 'ai', order: 4 },
  'context-budget-meter': { title: 'Context Budget Meter', pillar: 'ai', order: 5 },
  'grounded-answer': { title: 'Grounded Answer', pillar: 'ai', order: 6 },
  'message-branch-thread': { title: 'Message Branch Thread', pillar: 'ai', order: 7 },
  'model-arena-compare': { title: 'Model Arena Compare', pillar: 'ai', order: 8 },
  'vision-region-ask': { title: 'Vision Region Ask', pillar: 'ai', order: 9 },
  'voice-orb-session': { title: 'Voice Orb Session', pillar: 'ai', order: 10 },
  'tool-approval-gate': { title: 'Tool Approval Gate', pillar: 'ai', order: 11 },
  'subagent-swarm-board': { title: 'Subagent Swarm Board', pillar: 'ai', order: 12 },
  'agent-plan-checklist': { title: 'Agent Plan Checklist', pillar: 'ai', order: 13 },
  'artifact-canvas': { title: 'Artifact Canvas', pillar: 'ai', order: 14 },
  'agent-memory-store': { title: 'Agent Memory Store', pillar: 'ai', order: 15 },
  'terminal-stream-card': { title: 'Terminal Stream Card', pillar: 'ai', order: 16 },
  'rate-limit-banner': { title: 'Rate Limit Banner', pillar: 'ai', order: 17 },
  'mcp-server-roster': { title: 'MCP Server Roster', pillar: 'ai', order: 18 },
  'code-diff-reveal': { title: 'Code Diff Reveal', pillar: 'ai', order: 19 },
  'audio-wave-trim': { title: 'Audio Wave Trim', pillar: 'ai', order: 20 },
  'skeleton-morph': { title: 'Skeleton Morph', pillar: 'ai', order: 21 },
  'radial-dial': { title: 'Radial Dial', pillar: 'ai', order: 22 },
  'transfer-list': { title: 'Transfer List', pillar: 'ai', order: 23 },

  // 2. Everyday Foundation (16)
  'button-kit': {
    title: 'Button',
    pillar: 'foundation',
    order: 1,
    primitives: ['Button', 'IconButton'],
  },
  'input-fields': {
    title: 'Input Fields',
    pillar: 'foundation',
    order: 2,
    primitives: ['TextField'],
  },
  'select-combobox': {
    title: 'Select Combobox',
    pillar: 'foundation',
    order: 3,
    primitives: ['Select'],
  },
  'choice-cards': {
    title: 'Choice Cards',
    pillar: 'foundation',
    order: 4,
    primitives: ['RadioCard', 'Checkbox'],
  },
  'range-number-kit': {
    title: 'Range & Number',
    pillar: 'foundation',
    order: 5,
    primitives: ['NumberField', 'Slider'],
  },
  'tag-calendar-kit': { title: 'Tag & Calendar', pillar: 'foundation', order: 6 },
  'settings-rows': {
    title: 'Settings Rows',
    pillar: 'foundation',
    order: 7,
    primitives: ['Switch'],
  },
  'file-dropzone': { title: 'File Dropzone', pillar: 'foundation', order: 8 },
  'dialog-modal': { title: 'Dialog Modal', pillar: 'foundation', order: 9 },
  'dropdown-menu-kit': { title: 'Dropdown Menu', pillar: 'foundation', order: 10 },
  'popover-tooltip-kit': {
    title: 'Popover & Tooltip',
    pillar: 'foundation',
    order: 11,
    primitives: ['FloatingPopover', 'Tooltip'],
  },
  'accordion-kit': { title: 'Accordion', pillar: 'foundation', order: 12 },
  'nav-pagination': {
    title: 'Breadcrumbs & Pagination',
    pillar: 'foundation',
    order: 13,
    primitives: ['Breadcrumbs', 'Pagination'],
  },
  'alert-progress': {
    title: 'Alert & Progress',
    pillar: 'foundation',
    order: 14,
    primitives: ['Alert', 'Progress'],
  },
  'avatar-profile': { title: 'Avatar Profile', pillar: 'foundation', order: 15 },
  'empty-state-card': { title: 'Empty State Card', pillar: 'foundation', order: 16 },

  // 3. Radix Primitives (8)
  'context-menu-kit': {
    title: 'Context Menu',
    pillar: 'radix',
    order: 1,
    primitives: ['ContextMenu'],
  },
  'menubar-kit': {
    title: 'Menubar',
    pillar: 'radix',
    order: 2,
    primitives: ['Menubar'],
  },
  'navigation-menu-kit': {
    title: 'Navigation Menu',
    pillar: 'radix',
    order: 3,
    primitives: ['NavigationMenu'],
  },
  'toggle-toolbar-kit': {
    title: 'Toggle & Toolbar',
    pillar: 'radix',
    order: 4,
    primitives: ['Toolbar', 'ToolbarButton', 'ToggleGroup', 'Toggle'],
  },
  'scroll-area-kit': {
    title: 'Scroll Area',
    pillar: 'radix',
    order: 5,
    primitives: ['ScrollArea'],
  },
  'aspect-ratio-kit': {
    title: 'Aspect Ratio',
    pillar: 'radix',
    order: 6,
    primitives: ['AspectRatio'],
  },
  'alert-dialog-kit': {
    title: 'Alert Dialog',
    pillar: 'radix',
    order: 7,
    primitives: ['AlertDialog'],
  },
  'collapsible-range-kit': {
    title: 'Collapsible & Dual Range',
    pillar: 'radix',
    order: 8,
    primitives: ['Collapsible', 'DualRangeSlider', 'RangeSlider'],
  },

  // 4. Base UI Compound (6)
  'fieldset-form-kit': {
    title: 'Fieldset & Form',
    pillar: 'base-ui',
    order: 1,
    primitives: ['Form', 'Fieldset', 'Field'],
  },
  'autocomplete-kit': {
    title: 'Autocomplete',
    pillar: 'base-ui',
    order: 2,
    primitives: ['Autocomplete'],
  },
  'checkbox-group-kit': {
    title: 'Checkbox Group',
    pillar: 'base-ui',
    order: 3,
    primitives: ['CheckboxGroup'],
  },
  'number-scrub-field-kit': {
    title: 'Scrub Number Field',
    pillar: 'base-ui',
    order: 4,
    primitives: ['ScrubNumberField'],
  },
  'meter-progress-kit': {
    title: 'Meter & Progress',
    pillar: 'base-ui',
    order: 5,
    primitives: ['Meter', 'Progress'],
  },
  'preview-card-kit': {
    title: 'Preview Card',
    pillar: 'base-ui',
    order: 6,
    primitives: ['PreviewCard'],
  },

  // 5. Portal & Studio (6)
  'floating-popover-kit': {
    title: 'Floating Popover',
    pillar: 'portal',
    order: 1,
    primitives: ['FloatingPopover', 'placeFloating'],
  },
  'hover-preview-list': {
    title: 'Hover Preview List',
    pillar: 'portal',
    order: 2,
    primitives: ['Tooltip'],
  },
  'breadcrumb-dropdown-bar': {
    title: 'Breadcrumb Dropdown',
    pillar: 'portal',
    order: 3,
    primitives: ['BreadcrumbSelect'],
  },
  'adaptive-toolbar-kit': {
    title: 'Adaptive Toolbar',
    pillar: 'portal',
    order: 4,
    primitives: ['AdaptiveToolbar'],
  },
  'swatch-preview-matrix': {
    title: 'Swatch Preview Matrix',
    pillar: 'portal',
    order: 5,
    primitives: ['SwatchGridPicker'],
  },
  'floating-inspector-sheet': {
    title: 'Floating Inspector Sheet',
    pillar: 'portal',
    order: 6,
    primitives: ['InspectorSheet'],
  },

  // 6. Media & Workbench (6)
  'media-transport-dock': {
    title: 'Media Transport Dock',
    pillar: 'media',
    order: 1,
    primitives: ['MediaTransport', 'StepTimeline'],
  },
  'idle-fullscreen-pill': {
    title: 'Idle Fullscreen Pill',
    pillar: 'media',
    order: 2,
    primitives: ['IdleAutoHideBar'],
  },
  'draggable-snap-orb': {
    title: 'Draggable Snap Orb',
    pillar: 'media',
    order: 3,
    primitives: ['CornerSnapOrb'],
  },
  'background-task-menu': {
    title: 'Background Task Menu',
    pillar: 'media',
    order: 4,
    primitives: ['ProgressRing', 'TaskProgressCard'],
  },
  'copy-snippet-flash': {
    title: 'Copy Snippet',
    pillar: 'media',
    order: 5,
    primitives: ['CopySnippet'],
  },
  'masked-secret-manager': {
    title: 'Masked Secret Manager',
    pillar: 'media',
    order: 6,
    primitives: ['MaskedSecretInput'],
  },

  // 7. Tactile & Workspace (23)
  'state-button': { title: 'State Button', pillar: 'tactile', order: 1 },
  'scrub-panel': { title: 'Scrub Panel', pillar: 'tactile', order: 2 },
  'slide-confirm': { title: 'Slide Confirm', pillar: 'tactile', order: 3 },
  'dynamic-island': { title: 'Dynamic Island', pillar: 'tactile', order: 4 },
  'morph-card': { title: 'Morph Card', pillar: 'tactile', order: 5 },
  'metric-ribbon': { title: 'Metric Ribbon', pillar: 'tactile', order: 6 },
  'command-palette': { title: 'Command Palette', pillar: 'tactile', order: 7 },
  'toast-stack': { title: 'Toast Stack', pillar: 'tactile', order: 8 },
  'split-compare': { title: 'Split Compare', pillar: 'tactile', order: 9 },
  'rolling-number': {
    title: 'Rolling Number',
    pillar: 'tactile',
    order: 10,
    primitives: ['RollingNumber'],
  },
  'otp-field': { title: 'OTP Field', pillar: 'tactile', order: 11 },
  'pass-strength': { title: 'Password Strength', pillar: 'tactile', order: 12 },
  'time-slot-picker': { title: 'Time Slot Picker', pillar: 'tactile', order: 13 },
  'swipe-card': { title: 'Swipe Card', pillar: 'tactile', order: 14 },
  'selection-toolbar': { title: 'Selection Toolbar', pillar: 'tactile', order: 15 },
  'data-grid': { title: 'Data Grid', pillar: 'tactile', order: 16 },
  'tree-explorer': { title: 'Tree Explorer', pillar: 'tactile', order: 17 },
  'resizable-split': { title: 'Resizable Split', pillar: 'tactile', order: 18 },
  'filter-bar': { title: 'Filter Bar', pillar: 'tactile', order: 19 },
  'drawer-sheet': { title: 'Drawer Sheet', pillar: 'tactile', order: 20 },
  'tabs-morph': { title: 'Tabs Morph', pillar: 'tactile', order: 21 },
};

export type EnrichedComponentEntry = {
  block: BlockSpec;
  title: string;
  pillarId: ComponentPillarId;
  pillarLabel: string;
  subpath: ComponentSubpath;
  primitives: readonly string[];
  order: number;
};

function humanizeSymbol(symbol: string): string {
  return symbol
    .replace(/Kit$/, '')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .trim();
}

function inferPillar(block: BlockSpec): ComponentPillarId {
  switch (block.source.module) {
    case 'components-foundation-forms':
    case 'components-foundation-nav':
      return 'foundation';
    case 'components-radix-primitives':
      return 'radix';
    case 'components-base-ui':
      return 'base-ui';
    case 'components-portal-floating':
      return 'portal';
    case 'components-media-workbench':
      return 'media';
    default:
      return block.gesture === 'ai' ? 'ai' : 'tactile';
  }
}

export function getEnrichedComponent(block: BlockSpec): EnrichedComponentEntry {
  const mapped = COMPONENT_META_MAP[block.id];
  const pillarId = mapped?.pillar ?? inferPillar(block);
  const pillarDef = PILLAR_DEFINITIONS.find((p) => p.id === pillarId) ?? PILLAR_DEFINITIONS[0]!;
  const primitives = mapped?.primitives ?? [];
  const subpath: ComponentSubpath =
    primitives.length > 0 ? '@tokenroll/juice/primitives' : '@tokenroll/juice/blocks';

  return {
    block,
    title: mapped?.title ?? humanizeSymbol(block.source.symbol),
    pillarId,
    pillarLabel: pillarDef.label,
    subpath,
    primitives,
    order: mapped?.order ?? 999,
  };
}

export type PillarGroup = {
  id: ComponentPillarId;
  label: string;
  description: string;
  entries: EnrichedComponentEntry[];
};

export const PILLAR_GROUPS: readonly PillarGroup[] = PILLAR_DEFINITIONS.map((pillar) => {
  const entries = BLOCK_CATALOG.map(getEnrichedComponent)
    .filter((entry) => entry.pillarId === pillar.id)
    .sort((a, b) => a.order - b.order);
  return {
    id: pillar.id,
    label: pillar.label,
    description: pillar.description,
    entries,
  };
});

export const ORDERED_COMPONENTS: readonly EnrichedComponentEntry[] = PILLAR_GROUPS.flatMap(
  (group) => group.entries,
);

const BY_ID_MAP = new Map<string, EnrichedComponentEntry>();
for (const entry of ORDERED_COMPONENTS) {
  BY_ID_MAP.set(entry.block.id, entry);
  if (entry.block.demoId) {
    BY_ID_MAP.set(entry.block.demoId, entry);
  }
}

export function findComponentEntry(idOrDemoId: string | null | undefined): EnrichedComponentEntry | null {
  if (!idOrDemoId) return null;
  return BY_ID_MAP.get(idOrDemoId) ?? null;
}

export function resolveComponentView(raw: string | null | undefined): ComponentViewTarget {
  if (!raw) return DEFAULT_COMPONENT_ID;
  if (raw === 'overview') return 'overview';
  const match = findComponentEntry(raw);
  return match ? match.block.id : DEFAULT_COMPONENT_ID;
}

export function buildReactExampleCode(entry: EnrichedComponentEntry): string {
  const { block, primitives } = entry;
  const { symbol } = block.source;
  const rawBody = block.reactCode.trim();
  const jsxTags = Array.from(
    new Set(Array.from(rawBody.matchAll(/<([A-Z][A-Za-z0-9]*)/g), (m) => m[1]!)),
  );

  const usesBlockSymbol = jsxTags.includes(symbol) && block.id !== 'rolling-number';
  const importSpecifiers = usesBlockSymbol
    ? [symbol]
    : jsxTags.length > 0
      ? jsxTags
      : primitives.length > 0
        ? [primitives[0]!]
        : [symbol];
  const importSubpath: ComponentSubpath = usesBlockSymbol
    ? '@tokenroll/juice/blocks'
    : primitives.length > 0
      ? '@tokenroll/juice/primitives'
      : '@tokenroll/juice/blocks';

  const topLevelStarts = rawBody.split('\n').filter((line) => /^<[A-Z]/.test(line)).length;
  const needsFragment = topLevelStarts > 1;
  const indentedBody = rawBody
    .split('\n')
    .map((line) => (needsFragment ? `      ${line}` : `    ${line}`))
    .join('\n');

  const returnBody = needsFragment
    ? `    <>\n${indentedBody}\n    </>`
    : indentedBody;

  return `import '@tokenroll/juice/styles.css';
import { ${importSpecifiers.join(', ')} } from '${importSubpath}';

export default function Example() {
  return (
${returnBody}
  );
}`;
}

export function buildNpmImportCode(entry: EnrichedComponentEntry): string {
  const { block, primitives } = entry;
  const { symbol } = block.source;

  if (primitives.length > 0) {
    const primList = primitives.join(', ');
    if (primitives.length === 1 && primitives[0] === symbol) {
      return `import '@tokenroll/juice/styles.css';\nimport { ${primList} } from '@tokenroll/juice/primitives';`;
    }
    return `import '@tokenroll/juice/styles.css';\nimport { ${primList} } from '@tokenroll/juice/primitives';\n// Or import the composed block:\nimport { ${symbol} } from '@tokenroll/juice/blocks';`;
  }

  return `import '@tokenroll/juice/styles.css';\nimport { ${symbol} } from '@tokenroll/juice/blocks';`;
}
