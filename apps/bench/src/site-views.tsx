import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Collapsible,
  CopySnippet,
  JUICE_SOUND_CATALOG,
  JuiceProvider,
  Kbd,
  playJuiceSound,
  RollingNumber,
  ScrubPanel,
  SegmentedControl,
  Separator,
  StateButton,
  Switch,
  TextField,
  type JuiceSoundName,
} from '@tokenroll/juice';
import {
  ArrowUpRight,
  BookOpen,
  Boxes,
  Code2,
  CornerDownLeft,
  Layers,
  Play,
  Search,
  Terminal,
  Volume2,
  X,
} from 'lucide-react';

export type SiteSection = 'playground' | 'docs' | 'api' | 'tokens';

export type BlockSummaryItem = {
  id: string;
  name: string;
  gesture: 'foundation' | 'ai' | 'press' | 'drag' | 'hover' | 'workspace';
  gestureLabel: string;
  summary: string;
  sounds: JuiceSoundName[];
};

type PkgManager = 'pnpm' | 'npm' | 'bun';
type ApiLayerId = 'all' | 'foundation' | 'base' | 'studio' | 'media' | 'ai' | 'tactile';

type ApiLayerSpec = {
  id: Exclude<ApiLayerId, 'all'>;
  title: string;
  subtitle: string;
  primitives: string[];
  blocks: Array<{ id: string; name: string; note: string }>;
};

const API_LAYERS: ApiLayerSpec[] = [
  {
    id: 'foundation',
    title: 'Layer 1 · Everyday Foundation & Radix Primitives',
    subtitle: 'Full WAI-ARIA keyboard roving, typeahead, popover menus, dialogs, and accessible form inputs.',
    primitives: [
      'Button', 'IconButton', 'TextField', 'Select', 'RadioCard', 'Checkbox', 'Switch', 'NumberField',
      'Slider', 'DualRangeSlider', 'Separator', 'AspectRatio', 'Label', 'Collapsible', 'ContextMenu',
      'Menubar', 'NavigationMenu', 'Toggle', 'ToggleGroup', 'Toolbar', 'AlertDialog', 'ScrollArea',
      'Alert', 'Breadcrumbs', 'Pagination', 'Badge', 'Kbd', 'SegmentedControl',
    ],
    blocks: [
      { id: 'button-kit', name: 'ButtonKit', note: '5 variants, 3 sizes, loading state' },
      { id: 'input-fields', name: 'InputFields', note: 'Prefix/suffix, validation, clearable' },
      { id: 'select-combobox', name: 'SelectCombobox', note: 'Searchable list & keyboard selection' },
      { id: 'choice-cards', name: 'ChoiceCards', note: 'Concentric radio cards & checkboxes' },
      { id: 'range-number-kit', name: 'RangeNumberKit', note: 'Slider + stepper numeric pair' },
      { id: 'settings-rows', name: 'SettingsRows', note: 'Inline toggle preference rows' },
      { id: 'tag-calendar-kit', name: 'TagCalendarKit', note: 'Tag chips + mini date grid' },
      { id: 'dialog-modal', name: 'DialogModal', note: 'Focus-trapped modal surface' },
      { id: 'dropdown-menu-kit', name: 'DropdownMenuKit', note: 'Keyboard-navigated menu popover' },
      { id: 'popover-tooltip-kit', name: 'PopoverTooltipKit', note: 'Non-blocking anchor overlays' },
      { id: 'accordion-kit', name: 'AccordionKit', note: 'Progressive disclosure rows' },
      { id: 'alert-progress', name: 'AlertProgress', note: 'Semantic banners + linear progress' },
      { id: 'nav-pagination', name: 'NavPagination', note: 'Breadcrumbs & page navigator' },
      { id: 'avatar-profile', name: 'AvatarProfile', note: 'Stacked avatars & presence dot' },
      { id: 'empty-state-card', name: 'EmptyStateCard', note: 'Quiet zero-data recovery state' },
      { id: 'file-dropzone', name: 'FileDropzone', note: 'Drag-and-drop upload zone' },
      { id: 'aspect-ratio-kit', name: 'AspectRatioKit', note: 'Concentric aspect ratio frame' },
      { id: 'collapsible-range-kit', name: 'CollapsibleRangeKit', note: 'Collapsible + dual range slider' },
      { id: 'context-menu-kit', name: 'ContextMenuKit', note: 'Right-click popover menu' },
      { id: 'menubar-kit', name: 'MenubarKit', note: 'Desktop-grade horizontal menubar' },
      { id: 'navigation-menu-kit', name: 'NavigationMenuKit', note: 'Multi-column viewport nav' },
      { id: 'toggle-toolbar-kit', name: 'ToggleToolbarKit', note: 'Formatting toggle group & toolbar' },
      { id: 'alert-dialog-kit', name: 'AlertDialogKit', note: 'High-risk confirmation modal' },
      { id: 'scroll-area-kit', name: 'ScrollAreaKit', note: 'Custom thumb scroll viewport' },
    ],
  },
  {
    id: 'base',
    title: 'Layer 2 · Base UI Compound Primitives',
    subtitle: 'Compound form validation, indeterminate checkbox trees, scrubbable numbers, meters, and hover previews.',
    primitives: [
      'Field', 'Fieldset', 'Form', 'Autocomplete', 'CheckboxGroup', 'ScrubNumberField',
      'Meter', 'Progress', 'PreviewCard',
    ],
    blocks: [
      { id: 'fieldset-form-kit', name: 'FieldsetFormKit', note: 'Field + Fieldset + Form validation' },
      { id: 'autocomplete-kit', name: 'AutocompleteKit', note: 'Typeahead suggestions & clear' },
      { id: 'checkbox-group-kit', name: 'CheckboxGroupKit', note: '3-state parent/child indeterminate' },
      { id: 'number-scrub-field-kit', name: 'NumberScrubFieldKit', note: 'Pointer-drag scrubbable number' },
      { id: 'meter-progress-kit', name: 'MeterProgressKit', note: 'Semantic meter + determinate bar' },
      { id: 'preview-card-kit', name: 'PreviewCardKit', note: 'Hover link preview card' },
    ],
  },
  {
    id: 'studio',
    title: 'Layer 3 · Portal, Floating & Studio Primitives',
    subtitle: 'Collision-aware floating placement (fullscreen-safe), adaptive toolbars, swatch preview matrices, and floating inspectors.',
    primitives: [
      'placeFloating', 'FloatingPopover', 'useTooltip', 'Tooltip', 'BreadcrumbSelect',
      'AdaptiveToolbar', 'SwatchGridPicker', 'InspectorSheet',
    ],
    blocks: [
      { id: 'floating-popover-kit', name: 'FloatingPopoverKit', note: 'Collision-aware fullscreen-safe popover' },
      { id: 'hover-preview-list', name: 'HoverPreviewList', note: 'Hover-synced detail preview rows' },
      { id: 'breadcrumb-dropdown-bar', name: 'BreadcrumbDropdownBar', note: 'Interactive path switcher bar' },
      { id: 'adaptive-toolbar-kit', name: 'AdaptiveToolbarKit', note: 'ResizeObserver overflow collapsing' },
      { id: 'swatch-preview-matrix', name: 'SwatchPreviewMatrix', note: 'Hover-preview & rollback palette grid' },
      { id: 'floating-inspector-sheet', name: 'FloatingInspectorSheet', note: 'Non-blocking side property inspector' },
    ],
  },
  {
    id: 'media',
    title: 'Layer 4 · Media, Timeline & Workbench Primitives',
    subtitle: 'Transport docks, step timelines, auto-hiding fullscreen pills, corner-snapping orbs, progress rings, and secret fields.',
    primitives: [
      'MediaTransport', 'StepTimeline', 'IdleAutoHideBar', 'CornerSnapOrb',
      'ProgressRing', 'TaskProgressCard', 'CopySnippet', 'MaskedSecretInput',
    ],
    blocks: [
      { id: 'media-transport-dock', name: 'MediaTransportDock', note: 'Play/pause transport + step timeline' },
      { id: 'idle-fullscreen-pill', name: 'IdleFullscreenPill', note: 'Auto-hide idle floating bar' },
      { id: 'draggable-snap-orb', name: 'DraggableSnapOrb', note: '4-corner magnetic floating orb' },
      { id: 'background-task-menu', name: 'BackgroundTaskMenu', note: 'SVG progress ring & task popover' },
      { id: 'copy-snippet-flash', name: 'CopySnippetFlash', note: 'One-click clipboard confirmation' },
      { id: 'masked-secret-manager', name: 'MaskedSecretManager', note: 'Reveal/rotate secret token manager' },
    ],
  },
  {
    id: 'ai',
    title: 'Layer 5 · Deep AI Chat & Agentic Workflows',
    subtitle: 'Purpose-built surfaces for multi-model chat, citations, HITL tool approvals, swarm boards, terminal streams, and context budgets.',
    primitives: [
      'Composer', 'SlashMentionComposer', 'ModelEffortPicker', 'ThinkingMorph', 'GroundedAnswer',
      'MessageBranchThread', 'VisionRegionAsk', 'VoiceOrbSession', 'ArtifactCanvas', 'ToolApprovalGate',
      'AgentPlanChecklist', 'TerminalStreamCard', 'SubagentSwarmBoard', 'McpServerRoster',
      'ContextBudgetMeter', 'AgentMemoryStore', 'ModelArenaCompare', 'RateLimitBanner',
      'AudioWaveTrim', 'CodeDiffReveal', 'SkeletonMorph',
    ],
    blocks: [
      { id: 'composer', name: 'Composer', note: 'Multi-modal prompt input & model switch' },
      { id: 'slash-mention-composer', name: 'SlashMentionComposer', note: 'Inline /command & @file mentions' },
      { id: 'model-effort-picker', name: 'ModelEffortPicker', note: 'Model tier + reasoning budget selector' },
      { id: 'thinking-morph', name: 'ThinkingMorph', note: 'Status dot + text shimmer reasoning trail' },
      { id: 'grounded-answer', name: 'GroundedAnswer', note: 'Inline citation pills & source drawer' },
      { id: 'message-branch-thread', name: 'MessageBranchThread', note: 'Fork & navigate response branches' },
      { id: 'vision-region-ask', name: 'VisionRegionAsk', note: 'Bounding-box visual region Q&A' },
      { id: 'voice-orb-session', name: 'VoiceOrbSession', note: 'Live duplex voice state orb' },
      { id: 'artifact-canvas', name: 'ArtifactCanvas', note: 'Preview / Code / Diff split canvas' },
      { id: 'tool-approval-gate', name: 'ToolApprovalGate', note: 'Human-in-the-loop tool risk gate' },
      { id: 'agent-plan-checklist', name: 'AgentPlanChecklist', note: 'Live multi-step agent execution plan' },
      { id: 'terminal-stream-card', name: 'TerminalStreamCard', note: 'Live stdout/stderr command stream' },
      { id: 'subagent-swarm-board', name: 'SubagentSwarmBoard', note: 'Parallel worker roster & status' },
      { id: 'mcp-server-roster', name: 'McpServerRoster', note: 'Connected MCP servers & tool counts' },
      { id: 'context-budget-meter', name: 'ContextBudgetMeter', note: 'Token breakdown + one-click compact' },
      { id: 'agent-memory-store', name: 'AgentMemoryStore', note: 'Inspectable persistent memory facts' },
      { id: 'model-arena-compare', name: 'ModelArenaCompare', note: 'Side-by-side model output voting' },
      { id: 'rate-limit-banner', name: 'RateLimitBanner', note: 'Cooldown countdown + fallback switch' },
      { id: 'audio-wave-trim', name: 'AudioWaveTrim', note: 'Waveform range scrub & trim' },
      { id: 'code-diff-reveal', name: 'CodeDiffReveal', note: 'Patch apply + undo morph' },
      { id: 'skeleton-morph', name: 'SkeletonMorph', note: 'Concentric shimmer to live card' },
    ],
  },
  {
    id: 'tactile',
    title: 'Layer 6 · Tactile Micro-Interactions, Workspace Surfaces & Core Engine',
    subtitle: 'Direct-manipulation blocks, high-density data surfaces, headless hooks, procedural Web Audio synth, and window.__juiceAgent.',
    primitives: [
      'JuiceProvider', 'useJuice', 'useJuiceAgentNode', 'useControllableState', 'useScrubDrag',
      'useRovingFocus', 'playJuiceSound', 'JUICE_SOUND_CATALOG', 'registerJuiceAgentNode',
      'StateButton', 'ScrubPanel', 'SlideConfirm', 'DynamicIsland', 'MorphCard', 'SplitCompare',
      'OtpField', 'PassStrength', 'TimeSlotPicker', 'RadialDial', 'SwipeCard', 'SelectionToolbar',
      'CommandPalette', 'ToastStack', 'DataGrid', 'TreeExplorer', 'ResizableSplit', 'FilterBar',
      'DrawerSheet', 'TabsMorph', 'TransferList', 'RollingNumber', 'MetricRibbon',
    ],
    blocks: [
      { id: 'state-button', name: 'StateButton', note: 'Confirm -> Pending -> Success morph' },
      { id: 'scrub-panel', name: 'ScrubPanel', note: 'Concentric horizontal drag rows' },
      { id: 'slide-confirm', name: 'SlideConfirm', note: 'Drag-to-commit safety track' },
      { id: 'dynamic-island', name: 'DynamicIsland', note: 'Zero-glitch capsule radius morph' },
      { id: 'morph-card', name: 'MorphCard', note: 'In-place inline inspector expansion' },
      { id: 'rolling-number', name: 'RollingNumber', note: 'Tabular odometer digit transition' },
      { id: 'metric-ribbon', name: 'MetricRibbon', note: 'Odometer RollingNumber + interactive bars' },
      { id: 'command-palette', name: 'CommandPalette', note: 'Roving-focus keyboard palette' },
      { id: 'toast-stack', name: 'ToastStack', note: 'Z-axis layered notification stack' },
      { id: 'split-compare', name: 'SplitCompare', note: 'Before/after draggable divider' },
      { id: 'otp-field', name: 'OtpField', note: 'Auto-advancing 6-digit passcode' },
      { id: 'pass-strength', name: 'PassStrength', note: 'Blur-to-clear entropy meter' },
      { id: 'time-slot-picker', name: 'TimeSlotPicker', note: 'Day strip + tabular slot matrix' },
      { id: 'radial-dial', name: 'RadialDial', note: 'Rotary arc scrub gauge' },
      { id: 'swipe-card', name: 'SwipeCard', note: 'Directional inbox action reveal' },
      { id: 'selection-toolbar', name: 'SelectionToolbar', note: 'Contextual floating format bar' },
      { id: 'data-grid', name: 'DataGrid', note: 'Inline-editable operator table' },
      { id: 'tree-explorer', name: 'TreeExplorer', note: 'Keyboard-driven hierarchical tree' },
      { id: 'resizable-split', name: 'ResizableSplit', note: 'Dual-pane draggable splitter' },
      { id: 'filter-bar', name: 'FilterBar', note: 'Faceted token filter cycler' },
      { id: 'drawer-sheet', name: 'DrawerSheet', note: 'Scaled backdrop bottom sheet' },
      { id: 'tabs-morph', name: 'TabsMorph', note: 'Shared pill indicator tabs' },
      { id: 'transfer-list', name: 'TransferList', note: 'Dual-bucket connector transfer' },
    ],
  },
];

export function GetStartedView({ onOpenPlayground }: { onOpenPlayground: () => void }) {
  const [pkgMgr, setPkgMgr] = useState<PkgManager>('pnpm');
  const [framework, setFramework] = useState<'react' | 'vue'>('react');
  const [liveAnimate, setLiveAnimate] = useState(true);

  const installCmd = useMemo(() => {
    const pkg = framework === 'react' ? '@tokenroll/juice lucide-react' : '@tokenroll/juice-vue';
    if (pkgMgr === 'npm') return `npm install ${pkg}`;
    if (pkgMgr === 'bun') return `bun add ${pkg}`;
    return `pnpm add ${pkg}`;
  }, [pkgMgr, framework]);

  const reactUsageCode = `import '@tokenroll/juice/styles.css';
import {
  JuiceProvider,
  StateButton,
  ScrubPanel,
  ToolApprovalGate,
} from '@tokenroll/juice';

export function App() {
  return (
    <JuiceProvider defaultTheme="light" defaultFill="slab" defaultSound={true}>
      <StateButton id="deploy-action" amount={420} />
      <ScrubPanel id="physics-panel" />
      <ToolApprovalGate id="shell-gate" />
    </JuiceProvider>
  );
}`;

  const vueUsageCode = `<script setup lang="ts">
import '@tokenroll/juice-vue/styles.css';
import { JProvider, JStateButton, JToolApprovalGate } from '@tokenroll/juice-vue';
</script>

<template>
  <JProvider theme="light" fill="slab" :sound="true">
    <JStateButton id="deploy-action" :amount="420" />
    <JToolApprovalGate id="shell-gate" />
  </JProvider>
</template>`;

  const agentBridgeCode = `// Inspect every mounted Juice block at runtime
const tree = window.__juiceAgent.snapshot();

// Drive any block deterministically from an AI agent or Joplo storyboard
window.__juiceAgent.act('docs-demo-btn', 'press');
window.__juiceAgent.act('docs-demo-scrub', 'setTension', 84);

// Render static deterministic frames (0ms springs) for screenshots
<JuiceProvider animate={false}>...</JuiceProvider>`;

  const themeOverrideCode = `/* Override just 2 tokens — the entire 6-step color-mix ramp adapts */
.my-brand-surface {
  --fill-on: #141926;
  --fill-slab: #f8f9fc;
  --juice-signal: #2231dd;
}`;

  return (
    <div className="site-doc-container">
      <div className="site-section-head">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h1 className="site-h1">Get Started with Juice UI</h1>
            <Badge tone="signal">@tokenroll/juice v0.1.0</Badge>
          </div>
          <p className="site-lead">
            Drop-in React 18/19 and Vue 3 primitives with zero-border concentric geometry, 12 procedural Web Audio sounds,
            and a runtime Agent Bridge. Zero external CSS frameworks required.
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={onOpenPlayground} rightIcon={<ArrowUpRight size={14} />}>
          Explore 86 Live Blocks
        </Button>
      </div>

      {/* Install Paths Grid */}
      <div className="site-two-col">
        <section className="j-slab site-panel">
          <div className="site-panel-head">
            <div>
              <div className="site-panel-title">1. Install Package</div>
              <div className="site-panel-sub">Tree-shakeable ESM + TypeScript declarations + single bundled CSS</div>
            </div>
            <SegmentedControl
              options={[
                { value: 'react', label: 'React' },
                { value: 'vue', label: 'Vue 3' },
              ]}
              value={framework}
              onChange={(v) => setFramework(v as 'react' | 'vue')}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <SegmentedControl
              options={[
                { value: 'pnpm', label: 'pnpm' },
                { value: 'npm', label: 'npm' },
                { value: 'bun', label: 'bun' },
              ]}
              value={pkgMgr}
              onChange={(v) => setPkgMgr(v as PkgManager)}
            />
            <Badge tone="neutral">{framework === 'react' ? '182 exports · 0 assets' : 'Vue 3 Composition API'}</Badge>
          </div>

          <CopySnippet code={installCmd} label="Install command" />
        </section>

        <section className="j-slab site-panel">
          <div className="site-panel-head">
            <div>
              <div className="site-panel-title">2. Install AI Agent Skill</div>
              <div className="site-panel-sub">Teach Antigravity, Claude Code, and Codex Juice&apos;s exact tokens &amp; catalog</div>
            </div>
            <Badge tone="ok">SKILL.md Ready</Badge>
          </div>

          <p className="site-body-copy">
            Installing the Juice skill gives coding agents the full 86-block decision matrix, concentric <code>color-mix</code>{' '}
            invariants, and <code>window.__juiceAgent</code> verification protocol automatically.
          </p>

          <CopySnippet code="npx skills add TokenRollAI/juice" label="Install Agent Skill" />
        </section>
      </div>

      {/* Live Code + Interactive Sandbox Side-by-Side */}
      <section className="j-slab site-panel">
        <div className="site-panel-head">
          <div>
            <div className="site-panel-title">3. Wrap Once &amp; Compose Anywhere</div>
            <div className="site-panel-sub">
              Import the bundled stylesheet once, wrap your app in <code>&lt;JuiceProvider&gt;</code>, and compose any primitive.
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--juice-mute)' }}>Live Spring Motion</span>
            <Switch checked={liveAnimate} onChange={setLiveAnimate} aria-label="Toggle live demo motion" />
          </div>
        </div>

        <div className="site-two-col" style={{ alignItems: 'stretch' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <pre className="bench-code-box" style={{ flex: 1 }}>
              {framework === 'react' ? reactUsageCode : vueUsageCode}
            </pre>
            <CopySnippet
              code={framework === 'react' ? "import '@tokenroll/juice/styles.css';" : "import '@tokenroll/juice-vue/styles.css';"}
              label="Stylesheet import"
            />
          </div>

          <div className="site-live-stage">
            <JuiceProvider animate={liveAnimate} defaultTheme="light" defaultFill="slab">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center', width: '100%' }}>
                <StateButton id="docs-demo-btn" amount={420} />
                <ScrubPanel id="docs-demo-scrub" />
              </div>
            </JuiceProvider>
          </div>
        </div>
      </section>

      {/* Agent Bridge + Token Customization */}
      <div className="site-two-col">
        <section className="j-slab site-panel">
          <div className="site-panel-head">
            <div>
              <div className="site-panel-title">4. Programmatic Agent Bridge &amp; Joplo Frames</div>
              <div className="site-panel-sub">Drive state deterministically from AI agents or storyboard timelines</div>
            </div>
            <Badge tone="neutral">window.__juiceAgent</Badge>
          </div>
          <pre className="bench-code-box">{agentBridgeCode}</pre>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Button
              size="sm"
              variant="secondary"
              leftIcon={<Play size={12} />}
              onClick={() => {
                const bridge = (window as unknown as { __juiceAgent?: { act: (id: string, a: string, p?: unknown) => boolean } }).__juiceAgent;
                bridge?.act('docs-demo-btn', 'press');
              }}
            >
              Run act(&apos;docs-demo-btn&apos;, &apos;press&apos;)
            </Button>
            <Button
              size="sm"
              variant="secondary"
              leftIcon={<Play size={12} />}
              onClick={() => {
                const bridge = (window as unknown as { __juiceAgent?: { act: (id: string, a: string, p?: unknown) => boolean } }).__juiceAgent;
                bridge?.act('docs-demo-scrub', 'setTension', 84);
              }}
            >
              Run act(&apos;docs-demo-scrub&apos;, &apos;setTension&apos;, 84)
            </Button>
          </div>
        </section>

        <section className="j-slab site-panel">
          <div className="site-panel-head">
            <div>
              <div className="site-panel-title">5. Two-Variable Theme &amp; Joplo Token Mapping</div>
              <div className="site-panel-sub">Override --fill-on and --fill-slab; the 6-step ramp recalibrates live</div>
            </div>
            <Badge tone="neutral">color-mix(in srgb)</Badge>
          </div>
          <pre className="bench-code-box">{themeOverrideCode}</pre>
          <Alert tone="ok">
            Dark &amp; solid fills automatically step up tonal stops (<code>w6 → 8.5%</code>, <code>w12 → 17%</code>,{' '}
            <code>w20 → 27%</code>) so hierarchy stays crisp without adding 1px borders.
          </Alert>
        </section>
      </div>

      {/* Expandable Architecture Notes */}
      <section className="j-slab site-panel">
        <div className="site-panel-title">Common Integration Questions</div>
        <Separator />
        <Collapsible
          defaultOpen
          trigger={<span style={{ fontWeight: 500, fontSize: 13 }}>Does @tokenroll/juice require Tailwind CSS?</span>}
        >
          <p className="site-body-copy" style={{ margin: 0 }}>
            No. Importing <code>@tokenroll/juice/styles.css</code> loads a self-contained ~56KB CSS token &amp; component
            sheet using native CSS custom properties and <code>color-mix()</code>. It works alongside Tailwind, CSS Modules,
            or plain CSS without collisions (all classes are prefixed <code>.j-*</code>).
          </p>
        </Collapsible>
        <Collapsible
          trigger={<span style={{ fontWeight: 500, fontSize: 13 }}>Can I use the sound synth or Agent Bridge without React?</span>}
        >
          <p className="site-body-copy" style={{ margin: 0 }}>
            Yes. Import from <code>@tokenroll/juice/core</code> for the zero-React Web Audio procedural synth
            (<code>playJuiceSound</code>, <code>JUICE_SOUND_CATALOG</code>) and <code>registerJuiceAgentNode</code> runtime.
          </p>
        </Collapsible>
      </section>
    </div>
  );
}

export function PrimitivesApiView({
  onJumpToBlock,
}: {
  onJumpToBlock: (blockId: string) => void;
}) {
  const [layerFilter, setLayerFilter] = useState<ApiLayerId>('all');
  const [query, setQuery] = useState('');

  const visibleLayers = useMemo(() => {
    const q = query.trim().toLowerCase();
    return API_LAYERS.filter((layer) => layerFilter === 'all' || layer.id === layerFilter)
      .map((layer) => {
        if (!q) return layer;
        const matchedPrimitives = layer.primitives.filter((p) => p.toLowerCase().includes(q));
        const matchedBlocks = layer.blocks.filter(
          (b) => b.name.toLowerCase().includes(q) || b.note.toLowerCase().includes(q) || b.id.includes(q),
        );
        if (
          matchedPrimitives.length === 0 &&
          matchedBlocks.length === 0 &&
          !layer.title.toLowerCase().includes(q)
        ) {
          return null;
        }
        return {
          ...layer,
          primitives: matchedPrimitives.length ? matchedPrimitives : layer.primitives,
          blocks: matchedBlocks.length ? matchedBlocks : layer.blocks,
        };
      })
      .filter((x): x is ApiLayerSpec => x !== null);
  }, [layerFilter, query]);

  return (
    <div className="site-doc-container">
      <div className="site-section-head">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h1 className="site-h1">Primitives &amp; Architecture API</h1>
            <Badge tone="neutral">6 Layers · 182 Exports · 86 Live Blocks</Badge>
          </div>
          <p className="site-lead">
            Search every exported primitive, headless hook, and interactive block. Click any block row to jump directly
            into the live Playground with its Inspector open.
          </p>
        </div>
      </div>

      <div className="site-api-toolbar">
        <SegmentedControl<ApiLayerId>
          options={[
            { value: 'all', label: 'All Layers' },
            { value: 'foundation', label: 'Foundation & Radix' },
            { value: 'base', label: 'Base UI' },
            { value: 'studio', label: 'Portal & Studio' },
            { value: 'media', label: 'Media' },
            { value: 'ai', label: 'AI & Agents' },
            { value: 'tactile', label: 'Tactile & Core' },
          ]}
          value={layerFilter}
          onChange={setLayerFilter}
        />

        <div style={{ minWidth: 240, flex: '0 1 280px' }}>
          <TextField
            aria-label="Search primitives or blocks"
            value={query}
            onChange={setQuery}
            placeholder="Search primitives or blocks…"
            prefix={<Search size={13} />}
            clearable
          />
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {visibleLayers.map((layer) => (
          <section key={layer.id} className="j-slab site-panel">
            <div className="site-panel-head">
              <div>
                <div className="site-panel-title">{layer.title}</div>
                <div className="site-panel-sub">{layer.subtitle}</div>
              </div>
              <Badge tone="neutral">
                {layer.blocks.length} blocks · {layer.primitives.length} exports
              </Badge>
            </div>

            {/* Exported Primitive Pills */}
            <div className="site-export-chips">
              {layer.primitives.map((prim) => (
                <code key={prim} className="site-export-chip">
                  {prim}
                </code>
              ))}
            </div>

            <Separator />

            {/* Interactive Block Jump Matrix */}
            <div className="site-api-grid">
              {layer.blocks.map((block) => (
                <button
                  key={block.id}
                  type="button"
                  className="site-api-row"
                  onClick={() => {
                    playJuiceSound('tap');
                    onJumpToBlock(block.id);
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div className="site-api-row-name">{block.name}</div>
                    <div className="site-api-row-note">{block.note}</div>
                  </div>
                  <span className="site-api-jump">
                    <span>Try</span>
                    <ArrowUpRight size={12} />
                  </span>
                </button>
              ))}
            </div>
          </section>
        ))}

        {visibleLayers.length === 0 && (
          <div className="j-slab site-panel" style={{ alignItems: 'center', padding: 28 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600 }}>No primitives match &ldquo;{query}&rdquo;</div>
            <Button size="sm" variant="secondary" onClick={() => { setQuery(''); setLayerFilter('all'); }}>
              Reset filters
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export function TokensSoundLabView() {
  const [selectedSound, setSelectedSound] = useState<JuiceSoundName>('paid');
  const soundSpec = JUICE_SOUND_CATALOG[selectedSound];

  const rampTokens = [
    { token: '--juice-w4', label: 'w4', role: 'Subtle tint' },
    { token: '--juice-w6', label: 'w6', role: 'Row track / input' },
    { token: '--juice-w12', label: 'w12', role: 'Hover / active fill' },
    { token: '--juice-w20', label: 'w20', role: 'Pressed / selected' },
    { token: '--juice-faint', label: 'faint', role: 'Ticks & placeholders' },
    { token: '--juice-mute', label: 'mute', role: 'Secondary copy' },
    { token: '--juice-soft', label: 'soft', role: 'Body ink' },
  ];

  const surfaceModes: Array<{ title: string; theme: 'light' | 'dark'; fill: 'slab' | 'solid' }> = [
    { title: 'Light · Slab', theme: 'light', fill: 'slab' },
    { title: 'Light · Solid', theme: 'light', fill: 'solid' },
    { title: 'Dark · Slab', theme: 'dark', fill: 'slab' },
    { title: 'Dark · Solid', theme: 'dark', fill: 'solid' },
  ];

  return (
    <div className="site-doc-container">
      <div className="site-section-head">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h1 className="site-h1">Concentric Tokens &amp; Web Audio Synth Lab</h1>
            <Badge tone="neutral">3KB Synth · 0 Audio Files</Badge>
          </div>
          <p className="site-lead">
            Audition every procedural oscillator recipe in real time and compare Juice&apos;s two-variable{' '}
            <code>color-mix</code> tonal ramp across all four Light/Dark × Slab/Solid surface combinations.
          </p>
        </div>
      </div>

      {/* 12-Pad Sound Synthesizer Studio */}
      <section className="j-slab site-panel">
        <div className="site-panel-head">
          <div>
            <div className="site-panel-title">Procedural Web Audio Synthesizer (12 Sounds)</div>
            <div className="site-panel-sub">Click any pad to synthesize oscillators + filter envelopes live in browser memory</div>
          </div>
          <Button
            size="sm"
            variant="primary"
            leftIcon={<Volume2 size={13} />}
            onClick={() => playJuiceSound(selectedSound, true)}
          >
            Play &ldquo;{soundSpec.label}&rdquo;
          </Button>
        </div>

        <div className="site-sound-grid">
          {(Object.keys(JUICE_SOUND_CATALOG) as JuiceSoundName[]).map((name) => {
            const spec = JUICE_SOUND_CATALOG[name];
            const first = spec.layers[0]!;
            const active = name === selectedSound;
            return (
              <button
                key={name}
                type="button"
                className="site-sound-card"
                data-active={active ? 'true' : undefined}
                onClick={() => {
                  setSelectedSound(name);
                  playJuiceSound(name, true);
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{spec.label}</span>
                  <span className="site-mono-xs">{Math.round(first.hz)}Hz</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                  <span style={{ fontSize: 11, color: 'var(--juice-mute)' }}>
                    {spec.category} · {first.wave ?? (first.noise ? `noise(${first.noise})` : 'sine')}
                  </span>
                  <span className="site-mono-xs">
                    {spec.layers.length} {spec.layers.length === 1 ? 'layer' : 'layers'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="site-two-col" style={{ alignItems: 'center' }}>
          <div className="j-ai-mono-box">
            <div style={{ fontWeight: 600, color: 'var(--fill-on)', marginBottom: 4 }}>
              Recipe: {soundSpec.label} ({selectedSound} · {soundSpec.category})
            </div>
            {soundSpec.layers.map((layer, idx) => (
              <div key={idx}>
                {`layer[${idx}]: ${(layer.wave ?? (layer.noise ? `noise` : 'sine')).padEnd(8)} ${Math.round(layer.hz)}Hz${layer.to ? ` -> ${Math.round(layer.to)}Hz` : ''} · ${layer.ms}ms · gain ${layer.gain}`}
              </div>
            ))}
          </div>
          <CopySnippet code={`import { playJuiceSound } from '@tokenroll/juice';\nplayJuiceSound('${selectedSound}');`} label="Sound snippet" />
        </div>
      </section>

      {/* 4-Surface Concentric Color-Mix Comparison */}
      <section className="j-slab site-panel">
        <div className="site-panel-head">
          <div>
            <div className="site-panel-title">Concentric Geometry &amp; 4-Mode Tonal Calibration</div>
            <div className="site-panel-sub">Outer card 20px, padding 6px → inner row 14px → inner control 10px</div>
          </div>
          <Badge tone="neutral">20px → 14px → 10px</Badge>
        </div>

        <div className="site-surface-grid">
          {surfaceModes.map((mode) => (
            <JuiceProvider key={mode.title} theme={mode.theme} fill={mode.fill}>
              <div
                style={{
                  background: 'var(--juice-canvas)',
                  padding: 12,
                  borderRadius: 20,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px' }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--juice-ink)' }}>{mode.title}</span>
                  <span style={{ fontSize: 11, fontFamily: 'var(--juice-font-mono)', color: 'var(--juice-mute)' }}>
                    {mode.fill === 'solid' || mode.theme === 'dark' ? 'step-up ramp' : 'base ramp'}
                  </span>
                </div>
                <div className="j-slab" style={{ width: '100%', padding: 6, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div
                    style={{
                      borderRadius: 'var(--juice-r-inner)',
                      background: 'var(--juice-w6)',
                      padding: '8px 10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span style={{ fontSize: 12.5, fontWeight: 500 }}>Inner Row (14px)</span>
                    <Badge tone="ok">Legible</Badge>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
                    {rampTokens.map((t) => (
                      <div
                        key={t.label}
                        title={`${t.token}: ${t.role}`}
                        style={{
                          height: 24,
                          borderRadius: 6,
                          background: `var(${t.token})`,
                          boxShadow: 'inset 0 0 0 1px var(--juice-edge)',
                          display: 'grid',
                          placeItems: 'center',
                          fontSize: 9,
                          fontFamily: 'var(--juice-font-mono)',
                          color: t.label === 'soft' || t.label === 'mute' ? 'var(--fill-slab)' : 'var(--fill-on)',
                        }}
                      >
                        {t.label}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </JuiceProvider>
          ))}
        </div>
      </section>
    </div>
  );
}

export function QuickJumpModal({
  open,
  onClose,
  blocks,
  onSelectBlock,
  onSelectSection,
}: {
  open: boolean;
  onClose: () => void;
  blocks: BlockSummaryItem[];
  onSelectBlock: (id: string) => void;
  onSelectSection: (section: SiteSection) => void;
}) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  type JumpEntry =
    | { kind: 'section'; id: SiteSection; label: string; hint: string }
    | { kind: 'block'; id: string; label: string; hint: string };

  const entries = useMemo<JumpEntry[]>(() => {
    const sections: JumpEntry[] = [
      { kind: 'section', id: 'playground', label: 'Playground (86 Live Blocks)', hint: 'Interactive Workbench' },
      { kind: 'section', id: 'docs', label: 'Get Started & Usage', hint: 'Install · Skill · Agent Bridge' },
      { kind: 'section', id: 'api', label: 'Primitives & API (182)', hint: '6-Layer Reference' },
      { kind: 'section', id: 'tokens', label: 'Tokens & Sound Lab', hint: '12 Synth Sounds · Color-Mix' },
    ];
    const q = query.trim().toLowerCase();
    const matchedSections = q
      ? sections.filter((s) => s.label.toLowerCase().includes(q) || s.hint.toLowerCase().includes(q))
      : sections;
    const matchedBlocks: JumpEntry[] = blocks
      .filter((b) => !q || b.name.toLowerCase().includes(q) || b.gestureLabel.toLowerCase().includes(q) || b.summary.toLowerCase().includes(q))
      .slice(0, q ? 12 : 8)
      .map((b) => ({ kind: 'block', id: b.id, label: b.name, hint: b.gestureLabel }));
    return [...matchedSections, ...matchedBlocks];
  }, [blocks, query]);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setActiveIndex(0);
    window.setTimeout(() => inputRef.current?.focus(), 10);
  }, [open]);

  useEffect(() => {
    if (activeIndex >= entries.length) setActiveIndex(0);
  }, [activeIndex, entries.length]);

  if (!open) return null;

  const commit = (entry: JumpEntry | undefined) => {
    if (!entry) return;
    playJuiceSound('tap');
    if (entry.kind === 'section') {
      onSelectSection(entry.id);
    } else {
      onSelectBlock(entry.id);
    }
    onClose();
  };

  return (
    <div
      className="site-cmd-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Quick Jump Palette"
      onClick={onClose}
    >
      <div className="j-slab site-cmd-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="j-cmd-input-row" style={{ marginBottom: 8 }}>
          <Search size={14} style={{ color: 'var(--juice-mute)' }} />
          <input
            ref={inputRef}
            className="j-cmd-input"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
              } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActiveIndex((i) => (entries.length ? (i + 1) % entries.length : 0));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActiveIndex((i) => (entries.length ? (i - 1 + entries.length) % entries.length : 0));
              } else if (e.key === 'Enter') {
                e.preventDefault();
                commit(entries[activeIndex]);
              }
            }}
            placeholder="Jump to any of 86 blocks, docs, API, or sound lab…"
          />
          <button
            type="button"
            className="j-chip"
            style={{ height: 22, padding: '0 6px' }}
            onClick={onClose}
            aria-label="Close quick jump"
          >
            <X size={12} />
          </button>
        </div>

        <div className="j-cmd-list" style={{ maxHeight: 340, overflowY: 'auto' }}>
          {entries.map((entry, idx) => (
            <button
              key={`${entry.kind}-${entry.id}`}
              type="button"
              className="j-cmd-item"
              data-highlighted={idx === activeIndex ? 'true' : undefined}
              onMouseEnter={() => setActiveIndex(idx)}
              onClick={() => commit(entry)}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                {entry.kind === 'section' ? (
                  entry.id === 'docs' ? <BookOpen size={13} /> : entry.id === 'api' ? <Code2 size={13} /> : entry.id === 'tokens' ? <Volume2 size={13} /> : <Boxes size={13} />
                ) : (
                  <Layers size={13} />
                )}
                <span>{entry.label}</span>
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--juice-mute)' }}>
                <span>{entry.hint}</span>
                {idx === activeIndex && <CornerDownLeft size={12} />}
              </span>
            </button>
          ))}
          {entries.length === 0 && (
            <div style={{ padding: '16px 10px', textAlign: 'center', fontSize: 12.5, color: 'var(--juice-mute)' }}>
              No matching blocks or pages
            </div>
          )}
        </div>

        <div className="site-cmd-footer">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd>
            <span>Navigate</span>
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Kbd>Enter</Kbd>
            <span>Open</span>
            <Kbd>Esc</Kbd>
            <span>Close</span>
          </span>
        </div>
      </div>
    </div>
  );
}

export function QuickInstallRibbon({
  blockCount,
  onOpenDocs,
}: {
  blockCount: number;
  onOpenDocs: () => void;
}) {
  return (
    <section className="site-ribbon" aria-label="Juice UI Quick Install & Live Metrics">
      <div className="site-ribbon-metrics">
        <div className="site-metric-pill">
          <RollingNumber value={blockCount} style={{ fontSize: 18 }} />
          <span>Interactive Blocks</span>
        </div>
        <div className="site-metric-pill">
          <RollingNumber value={182} style={{ fontSize: 18 }} />
          <span>Exported Primitives</span>
        </div>
        <div className="site-metric-pill">
          <RollingNumber value={12} style={{ fontSize: 18 }} />
          <span>Web Audio Sounds</span>
        </div>
        <div className="site-metric-pill">
          <RollingNumber value={0} style={{ fontSize: 18 }} />
          <span>External Assets</span>
        </div>
      </div>

      <div className="site-ribbon-installs">
        <div className="site-ribbon-snippet">
          <CopySnippet code="pnpm add @tokenroll/juice lucide-react" label="Install React package" />
        </div>
        <div className="site-ribbon-snippet">
          <CopySnippet code="npx skills add TokenRollAI/juice" label="Install Agent Skill" />
        </div>
        <Button size="sm" variant="secondary" leftIcon={<Terminal size={13} />} onClick={onOpenDocs}>
          Usage Guide
        </Button>
      </div>
    </section>
  );
}
