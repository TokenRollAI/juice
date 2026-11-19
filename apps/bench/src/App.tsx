import { useMemo, useState, type ReactNode } from 'react';
import {
  AudioWaveTrim,
  Badge,
  CodeDiffReveal,
  CommandPalette,
  Composer,
  DataGrid,
  DrawerSheet,
  DynamicIsland,
  FilterBar,
  JUICE_SOUND_CATALOG,
  JuiceProvider,
  Kbd,
  MetricRibbon,
  MorphCard,
  OtpField,
  PassStrength,
  playJuiceSound,
  RadialDial,
  ResizableSplit,
  RollingNumber,
  ScrubPanel,
  SegmentedControl,
  SelectionToolbar,
  SkeletonMorph,
  SlideConfirm,
  SplitCompare,
  StateButton,
  SwipeCard,
  TabsMorph,
  ThinkingMorph,
  TimeSlotPicker,
  ToastStack,
  TransferList,
  TreeExplorer,
  useJuice,
  type JuiceAgentBridge,
  type JuiceSoundName,
} from '@juice-ui/react';
import {
  Check,
  Code2,
  Copy,
  Moon,
  Play,
  Search,
  Sliders,
  Sparkles,
  Sun,
  Volume2,
  VolumeX,
} from 'lucide-react';

type GestureCategory = 'all' | 'press' | 'drag' | 'hover' | 'type' | 'workspace' | 'ai';

type BlockSpec = {
  id: string;
  name: string;
  gesture: Exclude<GestureCategory, 'all'>;
  gestureLabel: string;
  summary: string;
  sounds: JuiceSoundName[];
  agentActions: Array<{ label: string; action: string; payload?: unknown }>;
  reactCode: string;
  joploCode: string;
  render: () => ReactNode;
};

const BLOCK_CATALOG: BlockSpec[] = [
  // ── 1-12: Core Micro-Interaction & AI Blocks ──────────────────────────
  {
    id: 'confirm-send',
    name: 'ConfirmSend',
    gesture: 'press',
    gestureLabel: 'Press · State Machine',
    summary: 'Multi-stage spring payment button (idle → confirming → pending → settled) with zero layout shift.',
    sounds: ['tap', 'latch', 'paid'],
    agentActions: [
      { label: 'Step: Press()', action: 'press' },
      { label: 'Force Settled', action: 'setStage', payload: 'success' },
      { label: 'Reset Idle', action: 'reset' },
    ],
    reactCode: `<StateButton
  id="confirm-send"
  title="Wire Transfer"
  recipient="studio@joplo.app"
  amount={1280}
/>`,
    joploCode: `flow('Approve wire transfer', { start: '/pay' })
  .click('confirm-send', 'Arm confirmation')
  .click('confirm-send', 'Commit transfer', done('Receipt #8841'))`,
    render: () => <StateButton id="confirm-send" />,
  },
  {
    id: 'scrub-panel',
    name: 'PathPanel',
    gesture: 'drag',
    gestureLabel: 'Drag · Scrub Rows',
    summary: 'Concentric 20px → 14px settings slab where the row itself is the slider track with dot ticks.',
    sounds: ['scrub', 'tick', 'pop', 'latch'],
    agentActions: [
      { label: 'Tension → 92%', action: 'setTension', payload: 92 },
      { label: 'Corner → 20px', action: 'setRadius', payload: 20 },
      { label: 'Signal → Emerald', action: 'setSwatch', payload: 'emerald' },
      { label: 'Toggle Snap', action: 'toggleSnap' },
    ],
    reactCode: `<ScrubPanel
  id="scrub-panel"
  defaultTension={72}
  defaultRadius={14}
  defaultSwatch="cobalt"
/>`,
    joploCode: `flow('Tune spring physics', { start: '/studio' })
  .drag('scrub-panel', 'Scrub tension to 92%', set($.ui.tension, 92))`,
    render: () => <ScrubPanel id="scrub-panel" />,
  },
  {
    id: 'slide-confirm',
    name: 'WakeSlider',
    gesture: 'drag',
    gestureLabel: 'Drag · High Consequence',
    summary: 'Drag-to-deploy track with spring snap-back on early release, keyboard Enter support, and chord chime.',
    sounds: ['lift', 'drop', 'landed'],
    agentActions: [
      { label: 'Commit Deploy', action: 'confirm' },
      { label: 'Reset Track', action: 'reset' },
    ],
    reactCode: `<SlideConfirm
  id="slide-confirm"
  label="Slide to deploy production"
  confirmedLabel="Production deployed · v2.4.0"
/>`,
    joploCode: `flow('Release to production', { start: '/deploy' })
  .drag('slide-confirm', 'Slide thumb to commit release', done('v2.4.0 live'))`,
    render: () => <SlideConfirm id="slide-confirm" />,
  },
  {
    id: 'dynamic-island',
    name: 'DynamicIsland',
    gesture: 'press',
    gestureLabel: 'Press · Spatial Morph',
    summary: '3-stage morphing capsule (compact → active → expanded) with static-safe equalizer bars.',
    sounds: ['tap', 'pop', 'paid'],
    agentActions: [
      { label: 'Mode: Compact', action: 'setMode', payload: 'compact' },
      { label: 'Mode: Active', action: 'setMode', payload: 'active' },
      { label: 'Mode: Expanded', action: 'setMode', payload: 'expanded' },
    ],
    reactCode: `<DynamicIsland
  id="dynamic-island"
  defaultMode="active"
/>`,
    joploCode: `flow('Expand live walkthrough capsule', { start: '/stage' })
  .click('dynamic-island', 'Expand active voice session')`,
    render: () => <DynamicIsland id="dynamic-island" />,
  },
  {
    id: 'morph-card',
    name: 'MorphCard',
    gesture: 'press',
    gestureLabel: 'Press · In-Place Disclosure',
    summary: 'Expands inline from a summary row into a budget cap editor without modal interruption.',
    sounds: ['pop', 'tick', 'paid'],
    agentActions: [
      { label: 'Expand Inline', action: 'open' },
      { label: 'Set Cap $5,000', action: 'setLimit', payload: 5000 },
      { label: 'Collapse', action: 'close' },
    ],
    reactCode: `<MorphCard
  id="morph-card"
  defaultOpened={false}
/>`,
    joploCode: `flow('Adjust worker spend cap inline', { start: '/billing' })
  .click('morph-card', 'Open inline spend inspector')`,
    render: () => <MorphCard id="morph-card" />,
  },
  {
    id: 'metric-ribbon',
    name: 'IncomeFlow',
    gesture: 'hover',
    gestureLabel: 'Hover · Rolling Odometer',
    summary: 'Interactive monthly volume bars paired with a per-digit rolling odometer and delta badge.',
    sounds: ['tick'],
    agentActions: [
      { label: 'Inspect Aug ($53.9k)', action: 'selectMonth', payload: 'Aug' },
      { label: 'Inspect Oct ($74.2k)', action: 'selectMonth', payload: 'Oct' },
      { label: 'Inspect Nov ($89.6k)', action: 'selectMonth', payload: 'Nov' },
    ],
    reactCode: `<MetricRibbon
  id="metric-ribbon"
  defaultMonth="Nov"
/>`,
    joploCode: `flow('Compare Q4 recurring volume', { start: '/metrics' })
  .hover('metric-ribbon', 'Scrub from August to November')`,
    render: () => <MetricRibbon id="metric-ribbon" />,
  },
  {
    id: 'ai-composer',
    name: 'AiComposer',
    gesture: 'type',
    gestureLabel: 'Type · Agent Native',
    summary: 'Multi-modal prompt composer with context attachment pills, model cycler, and quick polish chips.',
    sounds: ['tap', 'pop'],
    agentActions: [
      { label: 'Cycle Model', action: 'cycleModel' },
      {
        label: 'Fill Demo Prompt',
        action: 'type',
        payload: 'Convert modal into a concentric 20px -> 14px MorphCard',
      },
      { label: 'Dispatch Prompt', action: 'submit' },
    ],
    reactCode: `<Composer
  id="ai-composer"
  defaultModel="Claude 4.6"
/>`,
    joploCode: `flow('Ask agent to refine UI', { start: '/chat' })
  .type('ai-composer', 'Convert modal into an inline MorphCard')
  .click('ai-composer', 'Dispatch prompt')`,
    render: () => <Composer id="ai-composer" />,
  },
  {
    id: 'thinking-morph',
    name: 'ThinkingMorph',
    gesture: 'ai',
    gestureLabel: 'AI · Reasoning → Artifact',
    summary: 'Collapsible reasoning trace and tool execution steps that settle into a clickable artifact pill.',
    sounds: ['tap', 'paid'],
    agentActions: [
      { label: 'Step 1: Analyzing', action: 'setStep', payload: 0 },
      { label: 'Step 2: Patching', action: 'setStep', payload: 1 },
      { label: 'Step 3: Artifact Ready', action: 'setStep', payload: 2 },
    ],
    reactCode: `<ThinkingMorph
  id="thinking-morph"
  defaultStep={2}
/>`,
    joploCode: `flow('Stream agent reasoning into artifact', { start: '/agent' })
  .system('Tools complete', set($.ui.step, 2))`,
    render: () => <ThinkingMorph id="thinking-morph" />,
  },
  {
    id: 'command-palette',
    name: 'CommandPalette',
    gesture: 'type',
    gestureLabel: 'Type · Roving Focus',
    summary: 'Keyboard-navigable launcher with instant filtering, ↑/↓ roving highlight, and Kbd badges.',
    sounds: ['tick', 'pop'],
    agentActions: [
      { label: 'Filter "Audio"', action: 'search', payload: 'Audio' },
      { label: 'Clear Filter', action: 'search', payload: '' },
      { label: 'Execute Highlighted', action: 'execute' },
    ],
    reactCode: `<CommandPalette
  id="command-palette"
  onExecute={(cmd) => console.log(cmd)}
/>`,
    joploCode: `flow('Launch command via keyboard', { start: '/workspace' })
  .type('command-palette', 'Audio')
  .press('Enter', 'Trigger procedural sound synth')`,
    render: () => <CommandPalette id="command-palette" />,
  },
  {
    id: 'toast-stack',
    name: 'ToastStack',
    gesture: 'hover',
    gestureLabel: 'Hover · Z-Axis Stack',
    summary: 'Sonner-inspired 3D stacked notifications that fan out on hover with optimistic inline Undo.',
    sounds: ['pop', 'tap'],
    agentActions: [
      { label: '+ Push Event Toast', action: 'pushToast' },
      { label: 'Fan Out Stack', action: 'setExpanded', payload: true },
      { label: 'Collapse Stack', action: 'setExpanded', payload: false },
      { label: 'Undo Latest', action: 'undoTop' },
    ],
    reactCode: `<ToastStack id="toast-stack" />`,
    joploCode: `flow('Inspect stacked notifications & undo', { start: '/app' })
  .hover('toast-stack', 'Fan out recent events')`,
    render: () => <ToastStack id="toast-stack" />,
  },
  {
    id: 'split-compare',
    name: 'SplitCompare',
    gesture: 'drag',
    gestureLabel: 'Drag · Before / After',
    summary: 'Interactive before-and-after surface comparison comparing boxy wireframes vs Juice concentric slabs.',
    sounds: ['scrub'],
    agentActions: [
      { label: 'Reveal 25%', action: 'setSplit', payload: 25 },
      { label: 'Center 50%', action: 'setSplit', payload: 50 },
      { label: 'Reveal 80%', action: 'setSplit', payload: 80 },
    ],
    reactCode: `<SplitCompare
  id="split-compare"
  defaultSplit={54}
/>`,
    joploCode: `flow('Compare wireframe vs concentric craft', { start: '/review' })
  .drag('split-compare', 'Scrub comparison divider to 80%')`,
    render: () => <SplitCompare id="split-compare" />,
  },
  {
    id: 'rolling-odometer',
    name: 'RollingOdometer',
    gesture: 'ai',
    gestureLabel: 'AI & Data · Live Counter',
    summary: 'Standalone per-digit rolling odometer card with instant step buttons for live metric storytelling.',
    sounds: ['tick', 'pop'],
    agentActions: [],
    reactCode: `<RollingNumber value={148920} prefix="$" />`,
    joploCode: `flow('Update revenue counter', { start: '/dashboard' })
  .system('New enterprise seat added', set($.data.arr, 148920))`,
    render: () => <OdometerPlayground />,
  },

  // ── 13-28: Extended Tactile, Workspace & AI/Media Blocks ──────────────
  {
    id: 'otp-field',
    name: 'OneTimeCode',
    gesture: 'type',
    gestureLabel: 'Type · 6-Digit Verification',
    summary: 'Concentric 6-slot OTP verification with auto-advance, backspace roving, paste support, and verified chime.',
    sounds: ['tick', 'paid', 'tap'],
    agentActions: [
      { label: 'Paste 428-910', action: 'fill', payload: '428910' },
      { label: 'Clear Slots', action: 'clear' },
    ],
    reactCode: `<OtpField
  id="otp-field"
  defaultCode="4289"
/>`,
    joploCode: `flow('Verify 2FA code', { start: '/login/2fa' })
  .type('otp-field', '428910', done('2FA verified'))`,
    render: () => <OtpField id="otp-field" />,
  },
  {
    id: 'pass-strength',
    name: 'PassReveal',
    gesture: 'type',
    gestureLabel: 'Type · Optical Blur & Entropy',
    summary: 'Optical blur-to-clear password reveal with 4-bar live entropy gauge and rule verification pills.',
    sounds: ['pop', 'tap'],
    agentActions: [
      { label: 'Toggle Peek/Blur', action: 'toggleReveal' },
      { label: 'Weak Password', action: 'setPassword', payload: 'short' },
      { label: 'Vault Password', action: 'setPassword', payload: 'Juice#Craft2026!' },
    ],
    reactCode: `<PassStrength
  id="pass-strength"
  defaultValue="Juice#Craft2026!"
/>`,
    joploCode: `flow('Inspect signing key strength', { start: '/security' })
  .click('pass-strength', 'Unblur vault signing key')`,
    render: () => <PassStrength id="pass-strength" />,
  },
  {
    id: 'time-slot-picker',
    name: 'StandingCalendar',
    gesture: 'press',
    gestureLabel: 'Press · Day & Slot Matrix',
    summary: 'Compact 5-day strip and time slot grid with one-tap booking confirmation and instant reschedule.',
    sounds: ['tick', 'tap', 'paid'],
    agentActions: [
      { label: 'Select Thu 21', action: 'selectDay', payload: 'thu' },
      { label: 'Select 16:30 PST', action: 'selectSlot', payload: '16:30' },
      { label: 'Confirm Booking', action: 'book' },
    ],
    reactCode: `<TimeSlotPicker
  id="time-slot-picker"
  defaultDay="wed"
  defaultSlot="14:00"
/>`,
    joploCode: `flow('Book design review slot', { start: '/schedule' })
  .click('time-slot-picker', 'Hold 14:00 PST slot', done('Booked'))`,
    render: () => <TimeSlotPicker id="time-slot-picker" />,
  },
  {
    id: 'radial-dial',
    name: 'ContextGauge',
    gesture: 'drag',
    gestureLabel: 'Drag · Rotary Arc Gauge',
    summary: '270° SVG rotary gauge with pointer/keyboard scrub detents, semantic color zones, and rolling token readout.',
    sounds: ['tick'],
    agentActions: [
      { label: 'Optimal (32%)', action: 'setValue', payload: 32 },
      { label: 'Elevated (68%)', action: 'setValue', payload: 68 },
      { label: 'Critical (92%)', action: 'setValue', payload: 92 },
    ],
    reactCode: `<RadialDial
  id="radial-dial"
  defaultValue={68}
/>`,
    joploCode: `flow('Monitor context window pressure', { start: '/agent' })
  .drag('radial-dial', 'Scrub context load to 92%')`,
    render: () => <RadialDial id="radial-dial" />,
  },
  {
    id: 'swipe-card',
    name: 'SwipeActions',
    gesture: 'press',
    gestureLabel: 'Press & Swipe · Action Reveal',
    summary: 'Interactive PR inbox rows that slide to reveal concentric Approve/Archive actions with optimistic Undo.',
    sounds: ['swipe', 'paid', 'drop'],
    agentActions: [
      { label: 'Peek Approve', action: 'peekApprove' },
      { label: 'Merge First PR', action: 'approveFirst' },
      { label: 'Reset Rows', action: 'reset' },
    ],
    reactCode: `<SwipeCard id="swipe-card" />`,
    joploCode: `flow('Triage pull requests with undo', { start: '/inbox' })
  .click('swipe-card', 'Reveal approve action and merge PR #412')`,
    render: () => <SwipeCard id="swipe-card" />,
  },
  {
    id: 'selection-toolbar',
    name: 'FormatBar',
    gesture: 'press',
    gestureLabel: 'Press · Floating Toolbar Morph',
    summary: 'Floating dark action pill that morphs in-place between typography toggles and AI copy rewriting.',
    sounds: ['tap', 'pop', 'paid'],
    agentActions: [
      { label: 'Toggle Code Style', action: 'toggleFormat', payload: 'code' },
      { label: 'Morph to AI Rewrite', action: 'openAi' },
      { label: 'Apply AI Tighten', action: 'applyAiPolish' },
    ],
    reactCode: `<SelectionToolbar id="selection-toolbar" />`,
    joploCode: `flow('Rewrite selected copy inline', { start: '/editor' })
  .click('selection-toolbar', 'Morph toolbar into AI rewrite mode')`,
    render: () => <SelectionToolbar id="selection-toolbar" />,
  },
  {
    id: 'data-grid',
    name: 'InlineDataGrid',
    gesture: 'workspace',
    gestureLabel: 'Workspace · Inline-Edit Table',
    summary: 'High-density operator table with click-to-edit numeric cells, row selection, and contextual batch boost.',
    sounds: ['tap', 'latch', 'paid'],
    agentActions: [
      { label: 'Edit Row 2 Quota', action: 'editSecondRow' },
      { label: 'Commit 980 RPS', action: 'commitSecondRow' },
      { label: 'Batch +200 RPS', action: 'boostSelected' },
    ],
    reactCode: `<DataGrid id="data-grid" />`,
    joploCode: `flow('Edit worker RPS quota inline', { start: '/workers' })
  .click('data-grid', 'Edit juice-sync RPS cell')
  .type('data-grid', '980')`,
    render: () => <DataGrid id="data-grid" />,
  },
  {
    id: 'tree-explorer',
    name: 'TreeExplorer',
    gesture: 'workspace',
    gestureLabel: 'Workspace · File Tree',
    summary: 'Hierarchical source tree with collapsible folders, active file selection, and diff line badges.',
    sounds: ['tap', 'tick'],
    agentActions: [
      { label: 'Select behaviors.tsx', action: 'selectFile', payload: 'behaviors.tsx' },
      { label: 'Select sound.ts', action: 'selectFile', payload: 'sound.ts' },
      { label: 'Toggle src/ Folder', action: 'toggleFolder', payload: 'src' },
    ],
    reactCode: `<TreeExplorer id="tree-explorer" />`,
    joploCode: `flow('Navigate package source tree', { start: '/repo' })
  .click('tree-explorer', 'Inspect behaviors.tsx')`,
    render: () => <TreeExplorer id="tree-explorer" />,
  },
  {
    id: 'resizable-split',
    name: 'ResizablePanels',
    gesture: 'workspace',
    gestureLabel: 'Workspace · Split Layout',
    summary: 'Dual-pane workspace with draggable divider, keyboard arrow support, and double-click 50/50 reset.',
    sounds: ['tick', 'pop'],
    agentActions: [
      { label: 'Sidebar 28%', action: 'setRatio', payload: 28 },
      { label: 'Reset 50/50', action: 'reset50' },
      { label: 'Wide Nav 64%', action: 'setRatio', payload: 64 },
    ],
    reactCode: `<ResizableSplit
  id="resizable-split"
  defaultRatio={42}
/>`,
    joploCode: `flow('Resize workspace panels', { start: '/ide' })
  .drag('resizable-split', 'Expand main stage to 72%')`,
    render: () => <ResizableSplit id="resizable-split" />,
  },
  {
    id: 'filter-bar',
    name: 'FilterTokens',
    gesture: 'workspace',
    gestureLabel: 'Workspace · Faceted Search',
    summary: 'Segmented query tokens where clicking values cycles operators inline and updates live match counts.',
    sounds: ['tap', 'pop'],
    agentActions: [
      { label: 'Cycle Status', action: 'cycleStatus' },
      { label: 'Cycle p99 Latency', action: 'cycleLatency' },
      { label: 'Toggle Region Token', action: 'toggleRegion' },
    ],
    reactCode: `<FilterBar id="filter-bar" />`,
    joploCode: `flow('Filter edge deployments by latency', { start: '/deployments' })
  .click('filter-bar', 'Cycle status and latency tokens')`,
    render: () => <FilterBar id="filter-bar" />,
  },
  {
    id: 'drawer-sheet',
    name: 'VaulSheet',
    gesture: 'workspace',
    gestureLabel: 'Workspace · Scaled Backdrop Sheet',
    summary: 'Non-blocking bottom sheet that scales down the background stage card (0.93x) while preserving context.',
    sounds: ['pop', 'drop', 'paid'],
    agentActions: [
      { label: 'Open Rollback Sheet', action: 'open' },
      { label: 'Dismiss Sheet', action: 'close' },
    ],
    reactCode: `<DrawerSheet
  id="drawer-sheet"
  defaultOpen={false}
/>`,
    joploCode: `flow('Preview rollback in non-blocking sheet', { start: '/prod' })
  .click('drawer-sheet', 'Open rollback sheet over scaled stage')`,
    render: () => <DrawerSheet id="drawer-sheet" />,
  },
  {
    id: 'tabs-morph',
    name: 'WorkspaceTabs',
    gesture: 'workspace',
    gestureLabel: 'Workspace · Roving Tabs',
    summary: 'Multi-panel service inspector tabs with keyboard arrow roving and height-stable panel switching.',
    sounds: ['tap'],
    agentActions: [
      { label: 'Tab: Overview', action: 'setTab', payload: 'overview' },
      { label: 'Tab: Bindings', action: 'setTab', payload: 'bindings' },
      { label: 'Tab: Live Tail', action: 'setTab', payload: 'logs' },
    ],
    reactCode: `<TabsMorph id="tabs-morph" />`,
    joploCode: `flow('Switch between service overview and live logs', { start: '/worker' })
  .select('tabs-morph', 'Live Tail')`,
    render: () => <TabsMorph id="tabs-morph" />,
  },
  {
    id: 'audio-wave-trim',
    name: 'WaveTrim',
    gesture: 'ai',
    gestureLabel: 'AI & Media · Waveform Trimmer',
    summary: '24-bar static-safe audio waveform with adjustable in/out trim window and synthesized slice preview.',
    sounds: ['scrub', 'chime'],
    agentActions: [
      { label: 'Tighten Trim (5.6s→12.8s)', action: 'tightenTrim' },
      { label: 'Reset Full Window', action: 'resetTrim' },
    ],
    reactCode: `<AudioWaveTrim id="audio-wave-trim" />`,
    joploCode: `flow('Trim voiceover take', { start: '/voice' })
  .click('audio-wave-trim', 'Tighten voiceover trim window')`,
    render: () => <AudioWaveTrim id="audio-wave-trim" />,
  },
  {
    id: 'code-diff-reveal',
    name: 'CodePatchMorph',
    gesture: 'ai',
    gestureLabel: 'AI & Media · Patch Apply Morph',
    summary: 'Unified AI code diff card that collapses deleted lines into clean applied CSS with one-click Undo.',
    sounds: ['paid', 'tap'],
    agentActions: [
      { label: 'Apply AI Patch', action: 'apply' },
      { label: 'Revert to Diff', action: 'revert' },
    ],
    reactCode: `<CodeDiffReveal
  id="code-diff-reveal"
  defaultApplied={false}
/>`,
    joploCode: `flow('Accept AI code patch', { start: '/review' })
  .click('code-diff-reveal', 'Apply tokens.css patch')`,
    render: () => <CodeDiffReveal id="code-diff-reveal" />,
  },
  {
    id: 'skeleton-morph',
    name: 'SkeletonMorph',
    gesture: 'ai',
    gestureLabel: 'AI & Media · Shimmer → Card',
    summary: 'Geometry-matched shimmer skeleton that resolves smoothly into a high-density cluster status card.',
    sounds: ['tap', 'pop'],
    agentActions: [
      { label: 'Show Loading Shimmer', action: 'setLoading', payload: true },
      { label: 'Resolve Loaded Card', action: 'setLoading', payload: false },
    ],
    reactCode: `<SkeletonMorph
  id="skeleton-morph"
  defaultLoading={false}
/>`,
    joploCode: `flow('Transition from loading shimmer to live data', { start: '/cluster' })
  .system('Cluster status fetched', set($.ui.loading, false))`,
    render: () => <SkeletonMorph id="skeleton-morph" />,
  },
  {
    id: 'transfer-list',
    name: 'SourceTransfer',
    gesture: 'workspace',
    gestureLabel: 'Workspace · Dual-Bucket Transfer',
    summary: 'One-click transfer between Available and Active MCP data bindings with live connection counter.',
    sounds: ['pop', 'tap', 'paid'],
    agentActions: [
      { label: 'Toggle Postgres', action: 'toggleSource', payload: 'Postgres' },
      { label: 'Connect All Sources', action: 'connectAll' },
    ],
    reactCode: `<TransferList id="transfer-list" />`,
    joploCode: `flow('Bind Postgres MCP source', { start: '/integrations' })
  .click('transfer-list', 'Move Postgres into Active bindings')`,
    render: () => <TransferList id="transfer-list" />,
  },
];

function OdometerPlayground() {
  const { playSound } = useJuice();
  const [val, setVal] = useState(148920);
  return (
    <div className="j-slab" style={{ width: 304, padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: 'var(--juice-mute)' }}>Annual Recurring Revenue</span>
        <Badge tone="ok">+24.8% YoY</Badge>
      </div>
      <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: '-0.03em' }}>
        <RollingNumber value={val} prefix="$" />
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        {[
          { label: '-$1,250', delta: -1250 },
          { label: '+$4,800', delta: 4800 },
          { label: '+$25,000', delta: 25000 },
        ].map((btn) => (
          <button
            key={btn.label}
            type="button"
            className="j-chip"
            style={{ flex: 1, justifyContent: 'center' }}
            onClick={() => {
              playSound('pop');
              setVal((v) => Math.max(0, v + btn.delta));
            }}
          >
            {btn.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function BenchInner() {
  const { theme, fill, sound, animate, setTheme, setFill, setSound, setAnimate } = useJuice();
  const [category, setCategory] = useState<GestureCategory>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedId, setSelectedId] = useState<string>('scrub-panel');
  const [showSoundStrip, setShowSoundStrip] = useState<boolean>(true);
  const [codeTab, setCodeTab] = useState<'react' | 'joplo'>('react');
  const [copied, setCopied] = useState<boolean>(false);
  const [agentTick, setAgentTick] = useState<number>(0);

  const filteredBlocks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return BLOCK_CATALOG.filter((b) => {
      const catMatch = category === 'all' || b.gesture === category;
      const searchMatch =
        !q ||
        b.name.toLowerCase().includes(q) ||
        b.gestureLabel.toLowerCase().includes(q) ||
        b.summary.toLowerCase().includes(q);
      return catMatch && searchMatch;
    });
  }, [category, searchQuery]);

  const selectedBlock = useMemo(
    () => BLOCK_CATALOG.find((b) => b.id === selectedId) ?? BLOCK_CATALOG[0]!,
    [selectedId],
  );

  const liveSnapshot = useMemo(() => {
    void agentTick;
    if (typeof window === 'undefined') return null;
    const bridge = (window as unknown as { __juiceAgent?: JuiceAgentBridge }).__juiceAgent;
    const all = bridge?.snapshot();
    return all?.[selectedBlock.id]?.state ?? null;
  }, [selectedBlock.id, agentTick]);

  const triggerAgentAction = (action: string, payload?: unknown) => {
    const bridge = (window as unknown as { __juiceAgent?: JuiceAgentBridge }).__juiceAgent;
    bridge?.act(selectedBlock.id, action, payload);
    setAgentTick((t) => t + 1);
  };

  const copySnippet = () => {
    const text = codeTab === 'react' ? selectedBlock.reactCode : selectedBlock.joploCode;
    navigator.clipboard?.writeText(text).catch(() => {});
    playJuiceSound('tap');
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };

  return (
    <div className="bench-shell">
      {/* Sticky Header */}
      <header className="bench-topbar">
        <div className="bench-topbar-inner">
          <div className="bench-brand">
            <div className="bench-logo">J</div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="bench-title">Juice</span>
                <Badge tone="signal">v0.2 · 28 Blocks</Badge>
              </div>
              <div className="bench-subtitle">
                Tactile React UI Blocks · Headless Behaviors · 3KB Web Audio Synth · Joplo Ready
              </div>
            </div>
          </div>

          <div className="bench-controls">
            {/* Fill Tone: Slab vs Solid */}
            <SegmentedControl
              options={[
                { value: 'slab', label: 'Slab' },
                { value: 'solid', label: 'Solid' },
              ]}
              value={fill}
              onChange={(v) => setFill(v)}
            />

            {/* Motion vs Static Frame (Joplo Storyboard Determinism Mode) */}
            <SegmentedControl
              options={[
                { value: 'spring', label: 'Spring' },
                { value: 'static', label: 'Static Frame' },
              ]}
              value={animate ? 'spring' : 'static'}
              onChange={(v) => setAnimate(v === 'spring')}
            />

            {/* Sound Synth Strip Toggle */}
            <button
              type="button"
              className="j-chip"
              onClick={() => {
                playJuiceSound('tap', true);
                setShowSoundStrip((s) => !s);
              }}
              style={{
                height: 32,
                padding: '0 11px',
                background: showSoundStrip ? 'var(--juice-ink)' : 'var(--juice-w6)',
                color: showSoundStrip ? 'var(--juice-bg)' : 'var(--juice-ink)',
              }}
            >
              <Volume2 size={14} />
              <span>Synth Pad (12)</span>
            </button>

            {/* Mute / Unmute */}
            <button
              type="button"
              className="j-chip"
              aria-label={sound ? 'Mute UI sounds' : 'Enable UI sounds'}
              onClick={() => setSound(!sound)}
              style={{ height: 32, padding: '0 10px' }}
            >
              {sound ? <Volume2 size={14} /> : <VolumeX size={14} />}
              <span>{sound ? 'Audio On' : 'Muted'}</span>
            </button>

            {/* Light / Dark Theme */}
            <button
              type="button"
              className="j-chip"
              aria-label="Toggle color theme"
              onClick={() => {
                playJuiceSound('tap');
                setTheme(theme === 'light' ? 'dark' : 'light');
              }}
              style={{ height: 32, padding: '0 11px' }}
            >
              {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
              <span>{theme === 'light' ? 'Dark' : 'Light'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Expandable Procedural Web Audio Synth Pad Strip */}
      {showSoundStrip && (
        <section className="bench-sound-strip" aria-label="Procedural Web Audio Sound Synthesizer">
          <div className="bench-sound-strip-inner">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Badge tone="neutral">Web Audio Synth</Badge>
              <span style={{ fontSize: 12.5, color: 'var(--juice-mute)' }}>
                Zero MP3 assets · Click any pad to synthesize oscillator + filter envelope live:
              </span>
            </div>
            <div className="bench-sound-pads">
              {(Object.keys(JUICE_SOUND_CATALOG) as JuiceSoundName[]).map((name) => {
                const spec = JUICE_SOUND_CATALOG[name];
                const firstLayer = spec.layers[0]!;
                return (
                  <button
                    key={name}
                    type="button"
                    className="bench-sound-pad"
                    onClick={() => playJuiceSound(name, true)}
                  >
                    <span>{spec.label}</span>
                    <span className="bench-sound-pad-hz">{Math.round(firstLayer.hz)}Hz</span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Main Workspace: Filter Bar + Live Block Grid + Lateral Inspector */}
      <div className="bench-workspace">
        <main className="bench-main">
          <div className="bench-filter-bar">
            <SegmentedControl<GestureCategory>
              options={[
                { value: 'all', label: `All (${BLOCK_CATALOG.length})` },
                { value: 'press', label: 'Press' },
                { value: 'drag', label: 'Drag' },
                { value: 'hover', label: 'Hover' },
                { value: 'type', label: 'Type' },
                { value: 'workspace', label: 'Workspace' },
                { value: 'ai', label: 'AI & Media' },
              ]}
              value={category}
              onChange={setCategory}
            />

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                height: 32,
                padding: '0 10px',
                borderRadius: 10,
                background: 'var(--juice-w6)',
                minWidth: 210,
              }}
            >
              <Search size={13} style={{ color: 'var(--juice-mute)' }} />
              <input
                type="text"
                aria-label="Filter blocks"
                placeholder="Filter 28 blocks…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  border: 0,
                  background: 'transparent',
                  color: 'var(--juice-ink)',
                  font: 'inherit',
                  fontSize: 12.5,
                  outline: 'none',
                  width: '100%',
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  style={{
                    border: 0,
                    background: 'transparent',
                    color: 'var(--juice-mute)',
                    cursor: 'pointer',
                    fontSize: 11,
                  }}
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          <div className="bench-grid">
            {filteredBlocks.map((block) => {
              const isSelected = block.id === selectedBlock.id;
              return (
                <article
                  key={block.id}
                  className="bench-cell"
                  data-selected={isSelected ? 'true' : undefined}
                  onClick={() => setAgentTick((t) => t + 1)}
                >
                  <div className="bench-cell-stage">{block.render()}</div>

                  <div className="bench-cell-footer">
                    <div>
                      <div className="bench-cell-name">{block.name}</div>
                      <div className="bench-cell-gesture">{block.gestureLabel}</div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {block.sounds.slice(0, 2).map((snd) => (
                        <button
                          key={snd}
                          type="button"
                          className="j-chip"
                          title={`Audition ${snd} sound`}
                          style={{ height: 24, padding: '0 7px', fontSize: 11 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            playJuiceSound(snd, true);
                          }}
                        >
                          <Volume2 size={11} />
                          <span>{snd}</span>
                        </button>
                      ))}
                      <button
                        type="button"
                        className="bench-inspect-btn"
                        data-active={isSelected ? 'true' : undefined}
                        onClick={() => {
                          playJuiceSound('tap');
                          setSelectedId(block.id);
                          setAgentTick((t) => t + 1);
                        }}
                      >
                        <Sliders size={12} />
                        <span>Inspect</span>
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </main>

        {/* Non-blocking Contextual Lateral Inspector */}
        <aside className="bench-inspector" aria-label="Component & Agent Bridge Inspector">
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 16, fontWeight: 650, letterSpacing: '-0.02em' }}>
                  {selectedBlock.name}
                </span>
                <Badge tone="signal">{selectedBlock.gestureLabel}</Badge>
              </div>
              <p style={{ margin: '6px 0 0', fontSize: 12.5, color: 'var(--juice-mute)', lineHeight: 1.45 }}>
                {selectedBlock.summary}
              </p>
            </div>
          </div>

          {/* 1. Agent Bridge & Joplo Programmatic Driver */}
          {selectedBlock.agentActions.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, fontWeight: 600 }}>
                  Agent &amp; Joplo Step Driver (<Kbd>act()</Kbd>)
                </span>
                <span style={{ fontSize: 11, color: 'var(--juice-mute)' }}>Programmatic control</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {selectedBlock.agentActions.map((actItem) => (
                  <button
                    key={actItem.label}
                    type="button"
                    className="j-chip"
                    onClick={() => triggerAgentAction(actItem.action, actItem.payload)}
                  >
                    <Play size={11} />
                    <span>{actItem.label}</span>
                  </button>
                ))}
              </div>
              {liveSnapshot && (
                <pre
                  className="bench-code-box"
                  style={{ fontSize: 11, padding: '8px 10px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                >
                  {`snapshot("${selectedBlock.id}") → ${JSON.stringify(liveSnapshot)}`}
                </pre>
              )}
            </div>
          )}

          {/* 2. Concentric Tonal Ramp Live Preview */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <span style={{ fontWeight: 600 }}>Concentric color-mix Ramp</span>
              <span style={{ color: 'var(--juice-mute)', fontSize: 11 }}>20px → 14px → 10px</span>
            </div>
            <div className="bench-token-ramp">
              {[
                { name: 'w4', bg: 'var(--juice-w4)' },
                { name: 'w6', bg: 'var(--juice-w6)' },
                { name: 'w12', bg: 'var(--juice-w12)' },
                { name: 'w20', bg: 'var(--juice-w20)' },
                { name: 'faint', bg: 'var(--juice-faint)' },
                { name: 'mute', bg: 'var(--juice-mute)' },
              ].map((tok) => (
                <div
                  key={tok.name}
                  className="bench-token-swatch"
                  style={{ background: tok.bg, color: 'var(--juice-ink)' }}
                >
                  {tok.name}
                </div>
              ))}
            </div>
          </div>

          {/* 3. Code Snippets: Standalone React vs Joplo Flow */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <SegmentedControl
                options={[
                  { value: 'react', label: 'React TSX', icon: <Code2 size={12} /> },
                  { value: 'joplo', label: 'Joplo Flow', icon: <Sparkles size={12} /> },
                ]}
                value={codeTab}
                onChange={setCodeTab}
              />

              <button type="button" className="j-chip" onClick={copySnippet}>
                {copied ? <Check size={12} /> : <Copy size={12} />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            <pre className="bench-code-box">
              {codeTab === 'react' ? selectedBlock.reactCode : selectedBlock.joploCode}
            </pre>
          </div>
        </aside>
      </div>
    </div>
  );
}

export function App() {
  return (
    <JuiceProvider defaultTheme="light" defaultFill="slab" defaultSound={true} defaultAnimate={true}>
      <BenchInner />
    </JuiceProvider>
  );
}
