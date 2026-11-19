import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  AccordionKit,
  AdaptiveToolbarKit,
  AgentMemoryStore,
  AgentPlanChecklist,
  AlertDialogKit,
  AlertProgress,
  ArtifactCanvas,
  AspectRatioKit,
  AudioWaveTrim,
  AutocompleteKit,
  AvatarProfile,
  BackgroundTaskMenu,
  Badge,
  BreadcrumbDropdownBar,
  Button,
  ButtonKit,
  CheckboxGroupKit,
  ChoiceCards,
  CodeDiffReveal,
  CollapsibleRangeKit,
  CommandPalette,
  Composer,
  ContextBudgetMeter,
  ContextMenuKit,
  CopySnippet,
  CopySnippetFlash,
  DataGrid,
  DialogModal,
  DraggableSnapOrb,
  DrawerSheet,
  DropdownMenuKit,
  DynamicIsland,
  EmptyStateCard,
  FieldsetFormKit,
  FileDropzone,
  FilterBar,
  FloatingInspectorSheet,
  FloatingPopoverKit,
  GroundedAnswer,
  HoverPreviewList,
  IdleFullscreenPill,
  InputFields,
  JUICE_SOUND_CATALOG,
  JuiceProvider,
  Kbd,
  MaskedSecretManager,
  McpServerRoster,
  MediaTransportDock,
  MenubarKit,
  MessageBranchThread,
  MeterProgressKit,
  MetricRibbon,
  ModelArenaCompare,
  ModelEffortPicker,
  MorphCard,
  NavigationMenuKit,
  NavPagination,
  NumberScrubFieldKit,
  OtpField,
  PassStrength,
  playJuiceSound,
  PopoverTooltipKit,
  PreviewCardKit,
  RadialDial,
  RangeNumberKit,
  RateLimitBanner,
  ResizableSplit,
  RollingNumber,
  ScrollAreaKit,
  ScrubPanel,
  SegmentedControl,
  SelectCombobox,
  SelectionToolbar,
  SettingsRows,
  SkeletonMorph,
  SlashMentionComposer,
  SlideConfirm,
  SplitCompare,
  StateButton,
  SubagentSwarmBoard,
  SwatchPreviewMatrix,
  SwipeCard,
  TabsMorph,
  TagCalendarKit,
  TerminalStreamCard,
  TextField,
  ThinkingMorph,
  TimeSlotPicker,
  ToastStack,
  ToggleToolbarKit,
  ToolApprovalGate,
  TransferList,
  TreeExplorer,
  useJuice,
  VisionRegionAsk,
  VoiceOrbSession,
  type JuiceAgentBridge,
  type JuiceSoundName,
} from '@tokenroll/juice';
import {
  ArrowUpRight,
  Moon,
  Play,
  Search,
  Sliders,
  Sun,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  GetStartedView,
  PrimitivesApiView,
  QuickInstallRibbon,
  QuickJumpModal,
  TokensSoundLabView,
  type InstallTrack,
  type SiteSection,
} from './site-views.tsx';

type GestureCategory = 'all' | 'foundation' | 'ai' | 'press' | 'drag' | 'hover' | 'workspace';

type CodeTab = 'react' | 'vue' | 'cli' | 'joplo';

type BlockSpec = {
  id: string;
  demoId?: string;
  source: { symbol: keyof typeof import('@tokenroll/juice'); module: string };
  name: string;
  gesture: Exclude<GestureCategory, 'all'>;
  gestureLabel: string;
  summary: string;
  sounds: JuiceSoundName[];
  agentActions: Array<{ label: string; action: string; payload?: unknown }>;
  reactCode: string;
  vueCode?: string;
  joploCode: string;
  render: () => ReactNode;
};

function deriveVueSnippet(block: BlockSpec): string {
  if (block.vueCode) return block.vueCode;
  const tagMap: Record<string, string> = {
    StateButton: 'JStateButton',
    ScrubPanel: 'JScrubPanel',
    SlideConfirm: 'JSlideConfirm',
    DynamicIsland: 'JDynamicIsland',
    MorphCard: 'JMorphCard',
    ToastStack: 'JToastStack',
    Composer: 'JComposer',
    ThinkingMorph: 'JThinkingMorph',
    ToolApprovalGate: 'JToolApprovalGate',
    GroundedAnswer: 'JGroundedAnswer',
    ContextBudgetMeter: 'JContextBudgetMeter',
    SubagentSwarmBoard: 'JSubagentSwarmBoard',
    RollingNumber: 'JRollingNumber',
  };
  let sfc = block.reactCode;
  for (const [reactTag, vueTag] of Object.entries(tagMap)) {
    sfc = sfc.replace(new RegExp(`<${reactTag}\\b`, 'g'), `<${vueTag}`);
  }
  // Convert JSX prop={val} to Vue :prop="val"
  sfc = sfc.replace(/(\w+)=\{([^}]+)\}/g, ':$1="$2"');
  return `<script setup lang="ts">\nimport { JProvider } from '@tokenroll/juice-vue';\nimport '@tokenroll/juice-vue/styles.css';\n</script>\n\n<template>\n  <JProvider>\n    ${sfc.split('\n').join('\n    ')}\n  </JProvider>\n</template>`;
}

const BLOCK_CATALOG: BlockSpec[] = [
  // ═══════════════════════════════════════════════════════════════════════
  // I. Everyday Foundation UI Components (16 Complete Families)
  // ═══════════════════════════════════════════════════════════════════════
  {
    id: 'button-kit',
    source: { symbol: 'ButtonKit', module: 'components-foundation-forms' },
    name: 'ButtonKit',
    gesture: 'foundation',
    gestureLabel: 'Foundation · Buttons & Variants',
    summary: '5 concentric button variants (primary, secondary, outline, ghost, danger), 3 sizes, and live loading state.',
    sounds: ['tap'],
    agentActions: [
      { label: 'Variant: Primary', action: 'setVariant', payload: 'primary' },
      { label: 'Variant: Danger', action: 'setVariant', payload: 'danger' },
      { label: 'Toggle Loading', action: 'toggleLoading' },
      { label: 'Trigger Press', action: 'triggerPress' },
    ],
    reactCode: `<Button variant="primary" size="md" loading={false}>\n  Deploy Production\n</Button>`,
    joploCode: `flow('Click primary deploy button', { start: '/deploy' })\n  .click('button-kit', 'Trigger deploy action')`,
    render: () => <ButtonKit id="button-kit" />,
  },
  {
    id: 'input-fields',
    source: { symbol: 'InputFields', module: 'components-foundation-forms' },
    name: 'InputFields',
    gesture: 'foundation',
    gestureLabel: 'Foundation · Text & Secret Inputs',
    summary: 'Standard TextField with live slug validation error state, password field, clear button, and Kbd shortcut.',
    sounds: ['tap'],
    agentActions: [
      { label: 'Trigger Validation Error', action: 'triggerError' },
      { label: 'Reset Valid Slug', action: 'resetValid' },
      { label: 'Set Slug "juice-ui"', action: 'setSlug', payload: 'juice-ui' },
    ],
    reactCode: `<TextField\n  label="Project Slug"\n  value={slug}\n  onChange={setSlug}\n  error={error}\n/>`,
    joploCode: `flow('Validate project slug input', { start: '/settings' })\n  .type('input-fields', 'invalid slug')`,
    render: () => <InputFields id="input-fields" />,
  },
  {
    id: 'select-combobox',
    source: { symbol: 'SelectCombobox', module: 'components-foundation-forms' },
    name: 'SelectCombobox',
    gesture: 'foundation',
    gestureLabel: 'Foundation · Searchable Select',
    summary: 'Searchable region combobox with keyboard ↑/↓ roving focus, instant filter, and active check indicator.',
    sounds: ['tap', 'tick'],
    agentActions: [
      { label: 'Filter "Tokyo"', action: 'filterQuery', payload: 'Tokyo' },
      { label: 'Select Frankfurt', action: 'selectRegion', payload: 'eu-central-1' },
      { label: 'Select Virginia', action: 'selectRegion', payload: 'us-east-1' },
    ],
    reactCode: `<Select\n  label="Deployment Region"\n  options={regions}\n  value={region}\n  onChange={setRegion}\n/>`,
    joploCode: `flow('Select deployment region', { start: '/new' })\n  .select('select-combobox', 'eu-central-1 · Frankfurt')`,
    render: () => <SelectCombobox id="select-combobox" />,
  },
  {
    id: 'choice-cards',
    source: { symbol: 'ChoiceCards', module: 'components-foundation-forms' },
    name: 'ChoiceCards',
    gesture: 'foundation',
    gestureLabel: 'Foundation · Radio & Checkbox Group',
    summary: 'Concentric selectable RadioCards paired with a custom Checkbox group and Select-All parent toggle.',
    sounds: ['latch', 'tap'],
    agentActions: [
      { label: 'Plan: Pro ($20)', action: 'selectPlan', payload: 'pro' },
      { label: 'Plan: Enterprise', action: 'selectPlan', payload: 'enterprise' },
      { label: 'Toggle Edge Cache', action: 'toggleAddon', payload: 'edge-cache' },
      { label: 'Toggle DDoS Shield', action: 'toggleAddon', payload: 'ddos-shield' },
    ],
    reactCode: `<RadioCard\n  name="plan"\n  checked={plan === 'pro'}\n  label="Pro · $20"\n  onChange={() => setPlan('pro')}\n/>`,
    joploCode: `flow('Select Pro plan and add-ons', { start: '/billing' })\n  .click('choice-cards', 'Choose Pro plan and Edge Cache')`,
    render: () => <ChoiceCards id="choice-cards" />,
  },
  {
    id: 'range-number-kit',
    source: { symbol: 'RangeNumberKit', module: 'components-foundation-forms' },
    name: 'RangeNumberKit',
    gesture: 'foundation',
    gestureLabel: 'Foundation · Stepper & Slider',
    summary: 'Tabular NumberField with -/+ steppers paired with a continuous pointer/keyboard scrubbable Slider.',
    sounds: ['tap'],
    agentActions: [
      { label: 'Instances → 16', action: 'setInstances', payload: 16 },
      { label: 'Memory → 4096 MB', action: 'setMemory', payload: 4096 },
      { label: 'Memory → 1024 MB', action: 'setMemory', payload: 1024 },
    ],
    reactCode: `<NumberField label="Max Instances" min={1} max={32} value={8} />\n<Slider label="Memory Allocation" min={512} max={8192} value={2048} unit="MB" />`,
    joploCode: `flow('Scale instance count and memory', { start: '/scale' })\n  .drag('range-number-kit', 'Increase memory to 4096 MB')`,
    render: () => <RangeNumberKit id="range-number-kit" />,
  },
  {
    id: 'tag-calendar-kit',
    source: { symbol: 'TagCalendarKit', module: 'components-foundation-forms' },
    name: 'TagCalendarKit',
    gesture: 'foundation',
    gestureLabel: 'Foundation · Tags & Date Range',
    summary: 'Removable tag chips with inline add input paired with a 7-day range selection calendar strip.',
    sounds: ['latch', 'tap'],
    agentActions: [
      { label: '+ Add Tag "cloudflare"', action: 'addTag', payload: 'cloudflare' },
      { label: 'Remove "vue"', action: 'removeTag', payload: 'vue' },
      { label: 'Pick Nov 20', action: 'selectDate', payload: 20 },
    ],
    reactCode: `<TagCalendarKit id="tag-calendar-kit" />`,
    joploCode: `flow('Add framework tag and date window', { start: '/filter' })\n  .click('tag-calendar-kit', 'Add cloudflare tag')`,
    render: () => <TagCalendarKit id="tag-calendar-kit" />,
  },
  {
    id: 'settings-rows',
    source: { symbol: 'SettingsRows', module: 'components-foundation-forms' },
    name: 'SettingsRows',
    gesture: 'foundation',
    gestureLabel: 'Foundation · Switch Field List',
    summary: 'High-density settings switch rows with live active counter and mechanical latch audio feedback.',
    sounds: ['latch', 'tap'],
    agentActions: [
      { label: 'Toggle Preview Comments', action: 'toggleSetting', payload: 'preview-comments' },
      { label: 'Enable All Settings', action: 'enableAll' },
    ],
    reactCode: `<SettingsRows id="settings-rows" />`,
    joploCode: `flow('Enable all deployment safeguards', { start: '/settings' })\n  .toggle('settings-rows', true)`,
    render: () => <SettingsRows id="settings-rows" />,
  },
  {
    id: 'file-dropzone',
    source: { symbol: 'FileDropzone', module: 'components-foundation-forms' },
    name: 'FileDropzone',
    gesture: 'foundation',
    gestureLabel: 'Foundation · Upload & Progress',
    summary: 'Drag-and-drop file uploader with simulated upload progress bar, file size badges, and item removal.',
    sounds: ['tap'],
    agentActions: [
      { label: 'Simulate Upload', action: 'simulateUpload' },
      { label: 'Clear Files', action: 'clearFiles' },
    ],
    reactCode: `<FileDropzone id="file-dropzone" />`,
    joploCode: `flow('Upload schema and token assets', { start: '/import' })\n  .click('file-dropzone', 'Upload project assets')`,
    render: () => <FileDropzone id="file-dropzone" />,
  },
  {
    id: 'dialog-modal',
    source: { symbol: 'DialogModal', module: 'components-foundation-nav' },
    name: 'DialogModal',
    gesture: 'foundation',
    gestureLabel: 'Foundation · Inline Dialog Card',
    summary: 'Stage-contained confirmation dialog with Escape dismissal, focus recovery, and post-confirm reopen.',
    sounds: ['paid', 'tap'],
    agentActions: [
      { label: 'Confirm Archive', action: 'confirmArchive' },
      { label: 'Close Dialog', action: 'closeDialog' },
      { label: 'Reopen Dialog', action: 'openDialog' },
    ],
    reactCode: `<DialogModal id="dialog-modal" />`,
    joploCode: `flow('Confirm project archival', { start: '/settings' })\n  .click('dialog-modal', 'Confirm archive')`,
    render: () => <DialogModal id="dialog-modal" />,
  },
  {
    id: 'dropdown-menu-kit',
    demoId: 'dropdown-menu',
    source: { symbol: 'DropdownMenuKit', module: 'components-foundation-nav' },
    name: 'DropdownMenuKit',
    gesture: 'foundation',
    gestureLabel: 'Foundation · Roving Menu & Kbd',
    summary: 'Keyboard-navigable dropdown menu with checkable items, right-aligned Kbd shortcuts, and danger row.',
    sounds: ['tap', 'tick'],
    agentActions: [
      { label: 'Toggle Grid Guides', action: 'toggleGuides' },
      { label: 'Run Duplicate (⌘D)', action: 'selectItem', payload: 'duplicate' },
      { label: 'Run Delete (⌫)', action: 'selectItem', payload: 'delete' },
    ],
    reactCode: `<DropdownMenuKit id="dropdown-menu" />`,
    joploCode: `flow('Trigger duplicate from context menu', { start: '/canvas' })\n  .click('dropdown-menu', 'Duplicate block')`,
    render: () => <DropdownMenuKit id="dropdown-menu" />,
  },
  {
    id: 'popover-tooltip-kit',
    demoId: 'popover-tooltip',
    source: { symbol: 'PopoverTooltipKit', module: 'components-foundation-nav' },
    name: 'PopoverTooltipKit',
    gesture: 'foundation',
    gestureLabel: 'Foundation · Popover & Tooltip',
    summary: 'Non-blocking quick-share popover (public link switch, role selector, copy URL) paired with a Kbd tooltip.',
    sounds: ['latch', 'tap', 'pop'],
    agentActions: [
      { label: 'Toggle Public Link', action: 'togglePublic' },
      { label: 'Role: Editor', action: 'setRole', payload: 'Editor' },
      { label: 'Copy Share URL', action: 'copyLink' },
    ],
    reactCode: `<PopoverTooltipKit id="popover-tooltip" />`,
    joploCode: `flow('Enable public share link', { start: '/share' })\n  .click('popover-tooltip', 'Toggle public access and copy link')`,
    render: () => <PopoverTooltipKit id="popover-tooltip" />,
  },
  {
    id: 'accordion-kit',
    source: { symbol: 'AccordionKit', module: 'components-foundation-nav' },
    name: 'AccordionKit',
    gesture: 'foundation',
    gestureLabel: 'Foundation · Disclosure Accordion',
    summary: '3-item concentric disclosure accordion with smooth chevron rotation and Expand/Collapse All toggle.',
    sounds: ['tap'],
    agentActions: [
      { label: 'Open Procedural Audio', action: 'openItem', payload: 'audio' },
      { label: 'Open Agent Bridge', action: 'openItem', payload: 'bridge' },
      { label: 'Toggle All Items', action: 'toggleAll' },
    ],
    reactCode: `<AccordionKit id="accordion-kit" />`,
    joploCode: `flow('Inspect architecture sections', { start: '/docs' })\n  .click('accordion-kit', 'Expand Agent Bridge section')`,
    render: () => <AccordionKit id="accordion-kit" />,
  },
  {
    id: 'nav-pagination',
    source: { symbol: 'NavPagination', module: 'components-foundation-nav' },
    name: 'NavPagination',
    gesture: 'foundation',
    gestureLabel: 'Foundation · Breadcrumbs & Pager',
    summary: 'Clickable path breadcrumbs paired with a 5-page pagination bar and RollingNumber item range readout.',
    sounds: ['tap', 'tick'],
    agentActions: [
      { label: 'Next Page →', action: 'nextPage' },
      { label: '← Prev Page', action: 'prevPage' },
      { label: 'Jump to Page 4', action: 'setPage', payload: 4 },
    ],
    reactCode: `<Breadcrumbs segments={['Workspace', 'Packages', '@tokenroll']} current="juice" />\n<Pagination page={1} pageCount={5} onChange={setPage} />`,
    joploCode: `flow('Page through package directory', { start: '/packages' })\n  .click('nav-pagination', 'Advance to page 2')`,
    render: () => <NavPagination id="nav-pagination" />,
  },
  {
    id: 'alert-progress',
    source: { symbol: 'AlertProgress', module: 'components-foundation-nav' },
    name: 'AlertProgress',
    gesture: 'foundation',
    gestureLabel: 'Foundation · Quota Meter & Alert',
    summary: 'Multi-segment storage meter that dynamically shifts the inline Alert callout from OK to Warning/Danger.',
    sounds: ['tap', 'paid'],
    agentActions: [
      { label: 'Normal Quota (66%)', action: 'setUsage', payload: 66 },
      { label: 'Warning Quota (84%)', action: 'setUsage', payload: 84 },
      { label: 'Critical Quota (95%)', action: 'setUsage', payload: 95 },
    ],
    reactCode: `<AlertProgress id="alert-progress" />`,
    joploCode: `flow('Trigger high storage alert', { start: '/usage' })\n  .system('Storage crosses 80% threshold', set($.data.usage, 84))`,
    render: () => <AlertProgress id="alert-progress" />,
  },
  {
    id: 'avatar-profile',
    source: { symbol: 'AvatarProfile', module: 'components-foundation-nav' },
    name: 'AvatarProfile',
    gesture: 'foundation',
    gestureLabel: 'Foundation · Avatar Stack & Card',
    summary: 'Overlapping AvatarGroup stack with interactive member selection, status indicator, and reviewer assignment.',
    sounds: ['tap', 'latch'],
    agentActions: [
      { label: 'Select RF (Rauno)', action: 'selectMember', payload: 'RF' },
      { label: 'Select EK (Emil)', action: 'selectMember', payload: 'EK' },
      { label: 'Toggle Reviewer', action: 'toggleReviewer' },
    ],
    reactCode: `<AvatarProfile id="avatar-profile" />`,
    joploCode: `flow('Assign Rauno as design reviewer', { start: '/team' })\n  .click('avatar-profile', 'Select RF and assign reviewer')`,
    render: () => <AvatarProfile id="avatar-profile" />,
  },
  {
    id: 'empty-state-card',
    demoId: 'empty-state',
    source: { symbol: 'EmptyStateCard', module: 'components-foundation-nav' },
    name: 'EmptyStateCard',
    gesture: 'foundation',
    gestureLabel: 'Foundation · Zero-Slop Empty State',
    summary: 'Minimalist empty state that transitions into a populated live webhook row with one-click reset.',
    sounds: ['paid', 'tap'],
    agentActions: [
      { label: '+ Populate Webhook', action: 'populate' },
      { label: 'Reset to Empty', action: 'resetEmpty' },
    ],
    reactCode: `<EmptyStateCard id="empty-state" />`,
    joploCode: `flow('Create first project webhook from empty state', { start: '/webhooks' })\n  .click('empty-state', 'Create webhook endpoint')`,
    render: () => <EmptyStateCard id="empty-state" />,
  },

  // ═══════════════════════════════════════════════════════════════════════
  // II. Deep AI Chat, Grounding, Multimodal & Agentic Workflow Suite (16 New)
  // ═══════════════════════════════════════════════════════════════════════
  {
    id: 'slash-mention-composer',
    source: { symbol: 'SlashMentionComposer', module: 'components-ai-chat' },
    name: 'SlashMentionComposer',
    gesture: 'ai',
    gestureLabel: 'AI Chat · /Skills & @Mentions',
    summary: 'Prompt composer with interactive /skill commands (/architect, /review), @file context pills, and attachment tray.',
    sounds: ['tap', 'pop'],
    agentActions: [
      { label: 'Skill: /architect', action: 'selectSkill', payload: '/architect' },
      { label: 'Skill: /review', action: 'selectSkill', payload: '/review' },
      { label: 'Toggle @styles.css', action: 'toggleMention', payload: 'styles.css' },
      { label: 'Dispatch Prompt', action: 'submit' },
    ],
    reactCode: `<SlashMentionComposer id="slash-mention-composer" />`,
    joploCode: `flow('Invoke /architect skill with @styles.css', { start: '/chat' })\n  .click('slash-mention-composer', 'Select /architect and send')`,
    render: () => <SlashMentionComposer id="slash-mention-composer" />,
  },
  {
    id: 'model-effort-picker',
    source: { symbol: 'ModelEffortPicker', module: 'components-ai-chat' },
    name: 'ModelEffortPicker',
    gesture: 'ai',
    gestureLabel: 'AI Chat · Model & Thinking Effort',
    summary: 'Switch model families (Claude 4.6 Opus, Gemini 4 Carbon, GPT-6.2 Sol) and calibrate reasoning effort (Low → Max).',
    sounds: ['tap', 'tick'],
    agentActions: [
      { label: 'Model: Gemini 4 Carbon', action: 'setModel', payload: 'Gemini 4 Carbon' },
      { label: 'Model: GPT-6.2 Sol', action: 'setModel', payload: 'GPT-6.2 Sol' },
      { label: 'Effort: High', action: 'setEffort', payload: 'high' },
      { label: 'Effort: Max', action: 'setEffort', payload: 'max' },
    ],
    reactCode: `<ModelEffortPicker\n  id="model-effort-picker"\n  defaultModel="Claude 4.6 Opus"\n  defaultEffort="high"\n/>`,
    joploCode: `flow('Switch to Gemini 4 Carbon at Max effort', { start: '/chat' })\n  .select('model-effort-picker', 'max')`,
    render: () => <ModelEffortPicker id="model-effort-picker" />,
  },
  {
    id: 'context-budget-meter',
    source: { symbol: 'ContextBudgetMeter', module: 'components-ai-chat' },
    name: 'ContextBudgetMeter',
    gesture: 'ai',
    gestureLabel: 'AI Chat · Context Compaction',
    summary: '4-segment token budget visualizer (System, Files, Chat, Reserve) with one-click /compact compression (94k → 42k).',
    sounds: ['paid', 'tap'],
    agentActions: [
      { label: 'Run /compact (94k → 42k)', action: 'compact' },
      { label: 'Restore Full Context', action: 'restore' },
    ],
    reactCode: `<ContextBudgetMeter id="context-budget-meter" />`,
    joploCode: `flow('Compact conversation context window', { start: '/session' })\n  .click('context-budget-meter', 'Compact 94k tokens to 42k')`,
    render: () => <ContextBudgetMeter id="context-budget-meter" />,
  },
  {
    id: 'grounded-answer',
    source: { symbol: 'GroundedAnswer', module: 'components-ai-chat' },
    name: 'GroundedAnswer',
    gesture: 'ai',
    gestureLabel: 'AI Answers · Inline Citations [1..3]',
    summary: 'Grounded AI response with interactive [1][2][3] citation pills that morph open verified source snippets.',
    sounds: ['tick'],
    agentActions: [
      { label: 'Cite [1] bencho.dev', action: 'selectCitation', payload: 1 },
      { label: 'Cite [2] ui-sdk.dev', action: 'selectCitation', payload: 2 },
      { label: 'Cite [3] aisdkagents.com', action: 'selectCitation', payload: 3 },
    ],
    reactCode: `<GroundedAnswer id="grounded-answer" defaultCitation={1} />`,
    joploCode: `flow('Inspect grounded citation source', { start: '/answer' })\n  .click('grounded-answer', 'Verify citation [2] from ui-sdk.dev')`,
    render: () => <GroundedAnswer id="grounded-answer" />,
  },
  {
    id: 'message-branch-thread',
    source: { symbol: 'MessageBranchThread', module: 'components-ai-chat' },
    name: 'MessageBranchThread',
    gesture: 'ai',
    gestureLabel: 'AI Answers · Branches & Resume',
    summary: 'Assistant reply with version history pager (1/3 .. 3/3) and Interrupted Stream recovery banner.',
    sounds: ['tap', 'paid'],
    agentActions: [
      { label: 'Branch 1/3', action: 'setBranch', payload: 1 },
      { label: 'Branch 2/3', action: 'setBranch', payload: 2 },
      { label: 'Simulate Interrupt', action: 'interruptStream' },
      { label: 'Continue Stream', action: 'continueStream' },
    ],
    reactCode: `<MessageBranchThread id="message-branch-thread" />`,
    joploCode: `flow('Resume interrupted stream and browse branches', { start: '/thread' })\n  .click('message-branch-thread', 'Continue generating response')`,
    render: () => <MessageBranchThread id="message-branch-thread" />,
  },
  {
    id: 'model-arena-compare',
    source: { symbol: 'ModelArenaCompare', module: 'components-ai-chat' },
    name: 'ModelArenaCompare',
    gesture: 'ai',
    gestureLabel: 'AI Answers · Side-by-Side Eval',
    summary: 'Dual-column model arena comparing latency, tok/s throughput, and output quality with one-click winner vote.',
    sounds: ['paid', 'tap'],
    agentActions: [
      { label: 'Vote Model A (Claude)', action: 'pickWinner', payload: 'A' },
      { label: 'Vote Model B (Sol)', action: 'pickWinner', payload: 'B' },
      { label: 'Reset Vote', action: 'pickWinner', payload: null },
    ],
    reactCode: `<ModelArenaCompare id="model-arena-compare" />`,
    joploCode: `flow('Evaluate side-by-side model outputs', { start: '/arena' })\n  .click('model-arena-compare', 'Vote Model A as winner')`,
    render: () => <ModelArenaCompare id="model-arena-compare" />,
  },
  {
    id: 'vision-region-ask',
    source: { symbol: 'VisionRegionAsk', module: 'components-ai-chat' },
    name: 'VisionRegionAsk',
    gesture: 'ai',
    gestureLabel: 'AI Vision · Point-and-Ask Boxes',
    summary: 'Interactive visual inspection canvas with bounding boxes (Header, CTA, Contrast Warn) and localized Auto-Fix.',
    sounds: ['pop', 'paid'],
    agentActions: [
      { label: 'Inspect Contrast Box', action: 'selectRegion', payload: 'contrast' },
      { label: 'Inspect CTA Box', action: 'selectRegion', payload: 'cta' },
      { label: 'Auto-Fix Region', action: 'fixRegion' },
    ],
    reactCode: `<VisionRegionAsk id="vision-region-ask" />`,
    joploCode: `flow('Select low-contrast region and apply vision fix', { start: '/vision' })\n  .click('vision-region-ask', 'Fix contrast region')`,
    render: () => <VisionRegionAsk id="vision-region-ask" />,
  },
  {
    id: 'voice-orb-session',
    source: { symbol: 'VoiceOrbSession', module: 'components-ai-chat' },
    name: 'VoiceOrbSession',
    gesture: 'ai',
    gestureLabel: 'AI Voice · Live Waveform & Transcript',
    summary: 'Real-time voice session card with 12 static-safe equalizer bars, state switcher, and live dialogue transcript.',
    sounds: ['tap', 'pop'],
    agentActions: [
      { label: 'State: Listening', action: 'setVoiceState', payload: 'listening' },
      { label: 'State: Thinking', action: 'setVoiceState', payload: 'thinking' },
      { label: 'State: Speaking', action: 'setVoiceState', payload: 'speaking' },
      { label: 'Toggle Mute', action: 'toggleMute' },
    ],
    reactCode: `<VoiceOrbSession id="voice-orb-session" />`,
    joploCode: `flow('Transition voice agent from listening to speaking', { start: '/voice' })\n  .click('voice-orb-session', 'Switch to speaking state')`,
    render: () => <VoiceOrbSession id="voice-orb-session" />,
  },
  {
    id: 'tool-approval-gate',
    source: { symbol: 'ToolApprovalGate', module: 'components-ai-agents' },
    name: 'ToolApprovalGate',
    gesture: 'ai',
    gestureLabel: 'AI Agents · HITL Safety Gate',
    summary: 'Human-in-the-loop approval gate for destructive SQL/shell tool calls with Dry-Run toggle, Approve, and Deny.',
    sounds: ['paid', 'deny', 'tap'],
    agentActions: [
      { label: 'Approve Migration', action: 'approve' },
      { label: 'Deny Tool Call', action: 'deny' },
      { label: 'Reset Gate', action: 'reset' },
    ],
    reactCode: `<ToolApprovalGate\n  id="tool-approval-gate"\n  tool="db.migrate"\n  command="ALTER TABLE users DROP COLUMN legacy_token;"\n/>`,
    joploCode: `flow('Review and approve database migration tool call', { start: '/agent' })\n  .click('tool-approval-gate', 'Approve migration execution')`,
    render: () => <ToolApprovalGate id="tool-approval-gate" />,
  },
  {
    id: 'subagent-swarm-board',
    source: { symbol: 'SubagentSwarmBoard', module: 'components-ai-agents' },
    name: 'SubagentSwarmBoard',
    gesture: 'ai',
    gestureLabel: 'AI Agents · Multi-Agent Swarm',
    summary: 'Coordinator swarm board tracking parallel workers (Carbon, Sol-1, Sol-2) with live progress and log inspector.',
    sounds: ['tap', 'landed'],
    agentActions: [
      { label: 'Complete All Workers', action: 'completeAll' },
      { label: 'Reset Swarm', action: 'resetSwarm' },
      { label: 'Inspect Sol-1', action: 'selectWorker', payload: 'sol-1' },
    ],
    reactCode: `<SubagentSwarmBoard id="subagent-swarm-board" />`,
    joploCode: `flow('Coordinate 3 parallel worker agents', { start: '/swarm' })\n  .click('subagent-swarm-board', 'Consolidate completed swarm')`,
    render: () => <SubagentSwarmBoard id="subagent-swarm-board" />,
  },
  {
    id: 'agent-plan-checklist',
    source: { symbol: 'AgentPlanChecklist', module: 'components-ai-agents' },
    name: 'AgentPlanChecklist',
    gesture: 'ai',
    gestureLabel: 'AI Agents · Executable Step Plan',
    summary: '4-step agent execution plan with clickable step completion, live progress bar, and RollingNumber %.',
    sounds: ['latch', 'paid'],
    agentActions: [
      { label: 'Advance Next Step', action: 'advanceStep' },
      { label: 'Complete All (4/4)', action: 'setProgressStep', payload: 4 },
      { label: 'Reset Plan', action: 'resetPlan' },
    ],
    reactCode: `<AgentPlanChecklist id="agent-plan-checklist" />`,
    joploCode: `flow('Step through agent implementation plan', { start: '/plan' })\n  .click('agent-plan-checklist', 'Advance plan to completion')`,
    render: () => <AgentPlanChecklist id="agent-plan-checklist" />,
  },
  {
    id: 'artifact-canvas',
    source: { symbol: 'ArtifactCanvas', module: 'components-ai-agents' },
    name: 'ArtifactCanvas',
    gesture: 'ai',
    gestureLabel: 'AI Agents · Preview / Code / Diff',
    summary: 'Multi-version side artifact with instant switching between live interactive Preview, TSX Code, and v1→v2 Diff.',
    sounds: ['tap', 'tick'],
    agentActions: [
      { label: 'View: Preview', action: 'setView', payload: 'preview' },
      { label: 'View: TSX Code', action: 'setView', payload: 'code' },
      { label: 'View: v1→v2 Diff', action: 'setView', payload: 'diff' },
      { label: 'Version: v3', action: 'setVersion', payload: 'v3' },
    ],
    reactCode: `<ArtifactCanvas id="artifact-canvas" />`,
    joploCode: `flow('Inspect generated artifact diff and live preview', { start: '/artifact' })\n  .select('artifact-canvas', 'diff')`,
    render: () => <ArtifactCanvas id="artifact-canvas" />,
  },
  {
    id: 'agent-memory-store',
    source: { symbol: 'AgentMemoryStore', module: 'components-ai-agents' },
    name: 'AgentMemoryStore',
    gesture: 'ai',
    gestureLabel: 'AI Agents · Persistent Memory',
    summary: 'Inspect, pin, delete, or append extracted long-term user preferences and project rules.',
    sounds: ['pop', 'tap'],
    agentActions: [
      { label: '+ Add Memory Fact', action: 'addMemory', payload: 'Support both React 19 and Vue 3' },
      { label: 'Reset Memories', action: 'resetMemories' },
    ],
    reactCode: `<AgentMemoryStore id="agent-memory-store" />`,
    joploCode: `flow('Persist new architectural rule to agent memory', { start: '/memory' })\n  .click('agent-memory-store', 'Add memory fact')`,
    render: () => <AgentMemoryStore id="agent-memory-store" />,
  },
  {
    id: 'terminal-stream-card',
    source: { symbol: 'TerminalStreamCard', module: 'components-ai-agents' },
    name: 'TerminalStreamCard',
    gesture: 'ai',
    gestureLabel: 'AI Agents · CLI Stream & Exit Code',
    summary: 'Live command execution card with stdout lines, exit 0 / exit 1 status badge, and one-click Auto-Fix rerun.',
    sounds: ['paid', 'deny', 'tap'],
    agentActions: [
      { label: 'Simulate Fail (Exit 1)', action: 'runFail' },
      { label: 'Simulate Pass (Exit 0)', action: 'runPass' },
      { label: 'Rerun Command', action: 'rerun' },
    ],
    reactCode: `<TerminalStreamCard id="terminal-stream-card" />`,
    joploCode: `flow('Recover from failing CLI test run', { start: '/terminal' })\n  .click('terminal-stream-card', 'Auto-fix and rerun vitest')`,
    render: () => <TerminalStreamCard id="terminal-stream-card" />,
  },
  {
    id: 'rate-limit-banner',
    source: { symbol: 'RateLimitBanner', module: 'components-ai-agents' },
    name: 'RateLimitBanner',
    gesture: 'ai',
    gestureLabel: 'AI Agents · 429 Quota Fallback',
    summary: 'Non-blocking quota exhaustion card with live countdown timer and instant fallback to Gemini 4 Carbon.',
    sounds: ['paid', 'tap'],
    agentActions: [
      { label: 'Fallback → Gemini 4 Carbon', action: 'triggerFallback' },
      { label: 'Simulate 429 Limit', action: 'resetLimit' },
    ],
    reactCode: `<RateLimitBanner id="rate-limit-banner" />`,
    joploCode: `flow('Switch to fallback model on 429 rate limit', { start: '/chat' })\n  .click('rate-limit-banner', 'Switch to Gemini 4 Carbon')`,
    render: () => <RateLimitBanner id="rate-limit-banner" />,
  },
  {
    id: 'mcp-server-roster',
    source: { symbol: 'McpServerRoster', module: 'components-ai-agents' },
    name: 'McpServerRoster',
    gesture: 'ai',
    gestureLabel: 'AI Agents · MCP Server Registry',
    summary: 'Manage connected MCP servers (github-mcp, cloudflare, ego-browser) with health status and tool count odometer.',
    sounds: ['latch', 'tap'],
    agentActions: [
      { label: 'Toggle cloudflare-workers', action: 'toggleServer', payload: 'cloudflare-workers' },
      { label: 'Enable All MCP Servers', action: 'enableAll' },
    ],
    reactCode: `<McpServerRoster id="mcp-server-roster" />`,
    joploCode: `flow('Enable Cloudflare MCP tool server', { start: '/mcp' })\n  .click('mcp-server-roster', 'Enable all MCP servers')`,
    render: () => <McpServerRoster id="mcp-server-roster" />,
  },

  // ═══════════════════════════════════════════════════════════════════════
  // III. Tactile Micro-Interaction, Workspace & Media Blocks (Original 28)
  // ═══════════════════════════════════════════════════════════════════════
  {
    id: 'state-button',
    demoId: 'confirm-send',
    source: { symbol: 'StateButton', module: 'components' },
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
    reactCode: `<StateButton\n  id="confirm-send"\n  title="Wire Transfer"\n  recipient="studio@joplo.app"\n  amount={1280}\n/>`,
    joploCode: `flow('Approve wire transfer', { start: '/pay' })\n  .click('confirm-send', 'Arm confirmation')\n  .click('confirm-send', 'Commit transfer', done('Receipt #8841'))`,
    render: () => <StateButton id="confirm-send" />,
  },
  {
    id: 'scrub-panel',
    source: { symbol: 'ScrubPanel', module: 'components' },
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
    reactCode: `<ScrubPanel\n  id="scrub-panel"\n  defaultTension={72}\n  defaultRadius={14}\n  defaultSwatch="cobalt"\n/>`,
    joploCode: `flow('Tune spring physics', { start: '/studio' })\n  .drag('scrub-panel', 'Scrub tension to 92%', set($.ui.tension, 92))`,
    render: () => <ScrubPanel id="scrub-panel" />,
  },
  {
    id: 'slide-confirm',
    source: { symbol: 'SlideConfirm', module: 'components' },
    name: 'WakeSlider',
    gesture: 'drag',
    gestureLabel: 'Drag · High Consequence',
    summary: 'Drag-to-deploy track with spring snap-back on early release, keyboard Enter support, and chord chime.',
    sounds: ['lift', 'drop', 'landed'],
    agentActions: [
      { label: 'Commit Deploy', action: 'confirm' },
      { label: 'Reset Track', action: 'reset' },
    ],
    reactCode: `<SlideConfirm\n  id="slide-confirm"\n  label="Slide to deploy production"\n  confirmedLabel="Production deployed · v2.4.0"\n/>`,
    joploCode: `flow('Release to production', { start: '/deploy' })\n  .drag('slide-confirm', 'Slide thumb to commit release', done('v2.4.0 live'))`,
    render: () => <SlideConfirm id="slide-confirm" />,
  },
  {
    id: 'dynamic-island',
    source: { symbol: 'DynamicIsland', module: 'components' },
    name: 'DynamicIsland',
    gesture: 'press',
    gestureLabel: 'Press · Spatial Morph',
    summary: '3-stage morphing capsule (compact → active → expanded) with exact geometric corner radius transitions.',
    sounds: ['tap', 'pop', 'paid'],
    agentActions: [
      { label: 'Mode: Compact', action: 'setMode', payload: 'compact' },
      { label: 'Mode: Active', action: 'setMode', payload: 'active' },
      { label: 'Mode: Expanded', action: 'setMode', payload: 'expanded' },
    ],
    reactCode: `<DynamicIsland\n  id="dynamic-island"\n  defaultMode="active"\n/>`,
    joploCode: `flow('Expand live walkthrough capsule', { start: '/stage' })\n  .click('dynamic-island', 'Expand active voice session')`,
    render: () => <DynamicIsland id="dynamic-island" />,
  },
  {
    id: 'morph-card',
    source: { symbol: 'MorphCard', module: 'components' },
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
    reactCode: `<MorphCard\n  id="morph-card"\n  defaultOpened={false}\n/>`,
    joploCode: `flow('Adjust worker spend cap inline', { start: '/billing' })\n  .click('morph-card', 'Open inline spend inspector')`,
    render: () => <MorphCard id="morph-card" />,
  },
  {
    id: 'metric-ribbon',
    source: { symbol: 'MetricRibbon', module: 'components' },
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
    reactCode: `<MetricRibbon\n  id="metric-ribbon"\n  defaultMonth="Nov"\n/>`,
    joploCode: `flow('Compare Q4 recurring volume', { start: '/metrics' })\n  .hover('metric-ribbon', 'Scrub from August to November')`,
    render: () => <MetricRibbon id="metric-ribbon" />,
  },
  {
    id: 'composer',
    demoId: 'ai-composer',
    source: { symbol: 'Composer', module: 'components' },
    name: 'AiComposer',
    gesture: 'ai',
    gestureLabel: 'AI Chat · Multi-Modal Input',
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
    reactCode: `<Composer\n  id="ai-composer"\n  defaultModel="Claude 4.6"\n/>`,
    joploCode: `flow('Ask agent to refine UI', { start: '/chat' })\n  .type('ai-composer', 'Convert modal into an inline MorphCard')\n  .click('ai-composer', 'Dispatch prompt')`,
    render: () => <Composer id="ai-composer" />,
  },
  {
    id: 'thinking-morph',
    source: { symbol: 'ThinkingMorph', module: 'components' },
    name: 'ThinkingMorph',
    gesture: 'ai',
    gestureLabel: 'AI Agents · Shimmer Reasoning',
    summary: 'Prompt-Kit style shimmer reasoning trace and vertical step spine that settles into an artifact pill.',
    sounds: ['tap', 'paid'],
    agentActions: [
      { label: 'Step 1: Analyzing', action: 'setStep', payload: 0 },
      { label: 'Step 2: Patching', action: 'setStep', payload: 1 },
      { label: 'Step 3: Artifact Ready', action: 'setStep', payload: 2 },
    ],
    reactCode: `<ThinkingMorph\n  id="thinking-morph"\n  defaultStep={2}\n/>`,
    joploCode: `flow('Stream agent reasoning into artifact', { start: '/agent' })\n  .system('Tools complete', set($.ui.step, 2))`,
    render: () => <ThinkingMorph id="thinking-morph" />,
  },
  {
    id: 'command-palette',
    source: { symbol: 'CommandPalette', module: 'components' },
    name: 'CommandPalette',
    gesture: 'hover',
    gestureLabel: 'Type · Roving Focus',
    summary: 'Keyboard-navigable launcher with instant filtering, ↑/↓ roving highlight, and Kbd badges.',
    sounds: ['tick', 'pop'],
    agentActions: [
      { label: 'Filter "Audio"', action: 'search', payload: 'Audio' },
      { label: 'Clear Filter', action: 'search', payload: '' },
      { label: 'Execute Highlighted', action: 'execute' },
    ],
    reactCode: `<CommandPalette\n  id="command-palette"\n  onExecute={(cmd) => console.log(cmd)}\n/>`,
    joploCode: `flow('Launch command via keyboard', { start: '/workspace' })\n  .type('command-palette', 'Audio')\n  .press('Enter', 'Trigger procedural sound synth')`,
    render: () => <CommandPalette id="command-palette" />,
  },
  {
    id: 'toast-stack',
    source: { symbol: 'ToastStack', module: 'components' },
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
    joploCode: `flow('Inspect stacked notifications & undo', { start: '/app' })\n  .hover('toast-stack', 'Fan out recent events')`,
    render: () => <ToastStack id="toast-stack" />,
  },
  {
    id: 'split-compare',
    source: { symbol: 'SplitCompare', module: 'components' },
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
    reactCode: `<SplitCompare\n  id="split-compare"\n  defaultSplit={54}\n/>`,
    joploCode: `flow('Compare wireframe vs concentric craft', { start: '/review' })\n  .drag('split-compare', 'Scrub comparison divider to 80%')`,
    render: () => <SplitCompare id="split-compare" />,
  },
  {
    id: 'rolling-number',
    demoId: 'rolling-odometer',
    source: { symbol: 'RollingNumber', module: 'components' },
    name: 'RollingOdometer',
    gesture: 'press',
    gestureLabel: 'Press · Live Odometer',
    summary: 'Standalone per-digit rolling odometer card with instant step buttons for live metric storytelling.',
    sounds: ['tick', 'pop'],
    agentActions: [],
    reactCode: `<RollingNumber value={148920} prefix="$" />`,
    joploCode: `flow('Update revenue counter', { start: '/dashboard' })\n  .system('New enterprise seat added', set($.data.arr, 148920))`,
    render: () => <OdometerPlayground />,
  },
  {
    id: 'otp-field',
    source: { symbol: 'OtpField', module: 'components-extended' },
    name: 'OneTimeCode',
    gesture: 'hover',
    gestureLabel: 'Type · 6-Digit Verification',
    summary: 'Concentric 6-slot OTP verification with auto-advance, backspace roving, paste support, and verified chime.',
    sounds: ['tick', 'paid', 'tap'],
    agentActions: [
      { label: 'Paste 428-910', action: 'fill', payload: '428910' },
      { label: 'Clear Slots', action: 'clear' },
    ],
    reactCode: `<OtpField\n  id="otp-field"\n  defaultCode="4289"\n/>`,
    joploCode: `flow('Verify 2FA code', { start: '/login/2fa' })\n  .type('otp-field', '428910', done('2FA verified'))`,
    render: () => <OtpField id="otp-field" />,
  },
  {
    id: 'pass-strength',
    source: { symbol: 'PassStrength', module: 'components-extended' },
    name: 'PassReveal',
    gesture: 'hover',
    gestureLabel: 'Type · Optical Blur & Entropy',
    summary: 'Optical blur-to-clear password reveal with 4-bar live entropy gauge and rule verification pills.',
    sounds: ['pop', 'tap'],
    agentActions: [
      { label: 'Toggle Peek/Blur', action: 'toggleReveal' },
      { label: 'Weak Password', action: 'setPassword', payload: 'short' },
      { label: 'Vault Password', action: 'setPassword', payload: 'Juice#Craft2026!' },
    ],
    reactCode: `<PassStrength\n  id="pass-strength"\n  defaultValue="Juice#Craft2026!"\n/>`,
    joploCode: `flow('Inspect signing key strength', { start: '/security' })\n  .click('pass-strength', 'Unblur vault signing key')`,
    render: () => <PassStrength id="pass-strength" />,
  },
  {
    id: 'time-slot-picker',
    source: { symbol: 'TimeSlotPicker', module: 'components-extended' },
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
    reactCode: `<TimeSlotPicker\n  id="time-slot-picker"\n  defaultDay="wed"\n  defaultSlot="14:00"\n/>`,
    joploCode: `flow('Book design review slot', { start: '/schedule' })\n  .click('time-slot-picker', 'Hold 14:00 PST slot', done('Booked'))`,
    render: () => <TimeSlotPicker id="time-slot-picker" />,
  },
  {
    id: 'radial-dial',
    source: { symbol: 'RadialDial', module: 'components-extended' },
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
    reactCode: `<RadialDial\n  id="radial-dial"\n  defaultValue={68}\n/>`,
    joploCode: `flow('Monitor context window pressure', { start: '/agent' })\n  .drag('radial-dial', 'Scrub context load to 92%')`,
    render: () => <RadialDial id="radial-dial" />,
  },
  {
    id: 'swipe-card',
    source: { symbol: 'SwipeCard', module: 'components-extended' },
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
    joploCode: `flow('Triage pull requests with undo', { start: '/inbox' })\n  .click('swipe-card', 'Reveal approve action and merge PR #412')`,
    render: () => <SwipeCard id="swipe-card" />,
  },
  {
    id: 'selection-toolbar',
    source: { symbol: 'SelectionToolbar', module: 'components-extended' },
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
    joploCode: `flow('Rewrite selected copy inline', { start: '/editor' })\n  .click('selection-toolbar', 'Morph toolbar into AI rewrite mode')`,
    render: () => <SelectionToolbar id="selection-toolbar" />,
  },
  {
    id: 'data-grid',
    source: { symbol: 'DataGrid', module: 'components-extended' },
    name: 'InlineDataGrid',
    gesture: 'workspace',
    gestureLabel: 'Workspace · Inline-Edit Table',
    summary: 'High-density operator table with concentric Checkbox, click-to-edit numeric cells, and batch boost.',
    sounds: ['tap', 'latch', 'paid'],
    agentActions: [
      { label: 'Edit Row 2 Quota', action: 'editSecondRow' },
      { label: 'Commit 980 RPS', action: 'commitSecondRow' },
      { label: 'Batch +200 RPS', action: 'boostSelected' },
    ],
    reactCode: `<DataGrid id="data-grid" />`,
    joploCode: `flow('Edit worker RPS quota inline', { start: '/workers' })\n  .click('data-grid', 'Edit juice-sync RPS cell')\n  .type('data-grid', '980')`,
    render: () => <DataGrid id="data-grid" />,
  },
  {
    id: 'tree-explorer',
    source: { symbol: 'TreeExplorer', module: 'components-extended' },
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
    joploCode: `flow('Navigate package source tree', { start: '/repo' })\n  .click('tree-explorer', 'Inspect behaviors.tsx')`,
    render: () => <TreeExplorer id="tree-explorer" />,
  },
  {
    id: 'resizable-split',
    source: { symbol: 'ResizableSplit', module: 'components-extended' },
    name: 'ResizablePanels',
    gesture: 'drag',
    gestureLabel: 'Drag · Split Layout',
    summary: 'Dual-pane workspace with draggable divider, keyboard arrow support, and double-click 50/50 reset.',
    sounds: ['tick', 'pop'],
    agentActions: [
      { label: 'Sidebar 28%', action: 'setRatio', payload: 28 },
      { label: 'Reset 50/50', action: 'reset50' },
      { label: 'Wide Nav 64%', action: 'setRatio', payload: 64 },
    ],
    reactCode: `<ResizableSplit\n  id="resizable-split"\n  defaultRatio={42}\n/>`,
    joploCode: `flow('Resize workspace panels', { start: '/ide' })\n  .drag('resizable-split', 'Expand main stage to 72%')`,
    render: () => <ResizableSplit id="resizable-split" />,
  },
  {
    id: 'filter-bar',
    source: { symbol: 'FilterBar', module: 'components-extended' },
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
    joploCode: `flow('Filter edge deployments by latency', { start: '/deployments' })\n  .click('filter-bar', 'Cycle status and latency tokens')`,
    render: () => <FilterBar id="filter-bar" />,
  },
  {
    id: 'drawer-sheet',
    source: { symbol: 'DrawerSheet', module: 'components-extended' },
    name: 'VaulSheet',
    gesture: 'workspace',
    gestureLabel: 'Workspace · Scaled Backdrop Sheet',
    summary: 'Non-blocking bottom sheet that scales down the background stage card (0.93x) while preserving context.',
    sounds: ['pop', 'drop', 'paid'],
    agentActions: [
      { label: 'Open Rollback Sheet', action: 'open' },
      { label: 'Dismiss Sheet', action: 'close' },
    ],
    reactCode: `<DrawerSheet\n  id="drawer-sheet"\n  defaultOpen={false}\n/>`,
    joploCode: `flow('Preview rollback in non-blocking sheet', { start: '/prod' })\n  .click('drawer-sheet', 'Open rollback sheet over scaled stage')`,
    render: () => <DrawerSheet id="drawer-sheet" />,
  },
  {
    id: 'tabs-morph',
    source: { symbol: 'TabsMorph', module: 'components-extended' },
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
    joploCode: `flow('Switch between service overview and live logs', { start: '/worker' })\n  .select('tabs-morph', 'Live Tail')`,
    render: () => <TabsMorph id="tabs-morph" />,
  },
  {
    id: 'audio-wave-trim',
    source: { symbol: 'AudioWaveTrim', module: 'components-extended' },
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
    joploCode: `flow('Trim voiceover take', { start: '/voice' })\n  .click('audio-wave-trim', 'Tighten voiceover trim window')`,
    render: () => <AudioWaveTrim id="audio-wave-trim" />,
  },
  {
    id: 'code-diff-reveal',
    source: { symbol: 'CodeDiffReveal', module: 'components-extended' },
    name: 'CodePatchMorph',
    gesture: 'ai',
    gestureLabel: 'AI & Media · Patch Apply Morph',
    summary: 'Unified AI code diff card that collapses deleted lines into clean applied CSS with one-click Undo.',
    sounds: ['paid', 'tap'],
    agentActions: [
      { label: 'Apply AI Patch', action: 'apply' },
      { label: 'Revert to Diff', action: 'revert' },
    ],
    reactCode: `<CodeDiffReveal\n  id="code-diff-reveal"\n  defaultApplied={false}\n/>`,
    joploCode: `flow('Accept AI code patch', { start: '/review' })\n  .click('code-diff-reveal', 'Apply tokens.css patch')`,
    render: () => <CodeDiffReveal id="code-diff-reveal" />,
  },
  {
    id: 'skeleton-morph',
    source: { symbol: 'SkeletonMorph', module: 'components-extended' },
    name: 'SkeletonMorph',
    gesture: 'ai',
    gestureLabel: 'AI & Media · Shimmer → Card',
    summary: 'Geometry-matched shimmer skeleton that resolves smoothly into a high-density cluster status card.',
    sounds: ['tap', 'pop'],
    agentActions: [
      { label: 'Show Loading Shimmer', action: 'setLoading', payload: true },
      { label: 'Resolve Loaded Card', action: 'setLoading', payload: false },
    ],
    reactCode: `<SkeletonMorph\n  id="skeleton-morph"\n  defaultLoading={false}\n/>`,
    joploCode: `flow('Transition from loading shimmer to live data', { start: '/cluster' })\n  .system('Cluster status fetched', set($.ui.loading, false))`,
    render: () => <SkeletonMorph id="skeleton-morph" />,
  },
  {
    id: 'transfer-list',
    source: { symbol: 'TransferList', module: 'components-extended' },
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
    joploCode: `flow('Bind Postgres MCP source', { start: '/integrations' })\n  .click('transfer-list', 'Move Postgres into Active bindings')`,
    render: () => <TransferList id="transfer-list" />,
  },

  // ── 7. RADIX PRIMITIVES (8 Blocks) ────────────────────────────
  {
    id: 'context-menu-kit',
    source: { symbol: 'ContextMenuKit', module: 'components-radix-primitives' },
    name: 'ContextMenuKit',
    gesture: 'foundation',
    gestureLabel: 'Radix · Right-Click Context Menu',
    summary: 'WAI-ARIA context menu with checkbox item, radio zoom sub-group, typeahead keyboard navigation, and destructive row.',
    sounds: ['pop', 'tap', 'latch'],
    agentActions: [
      { label: 'Open Context Menu', action: 'openContextMenu' },
      { label: 'Toggle Grid Overlay', action: 'toggleGrid' },
      { label: 'Set Zoom 200%', action: 'setZoomLevel', payload: '200%' },
    ],
    reactCode: `<ContextMenuKit id="context-menu-kit" />`,
    joploCode: `flow('Inspect layer context menu', { start: '/canvas' })\n  .click('context-menu-kit', 'Open layer context menu and toggle grid')`,
    render: () => <ContextMenuKit id="context-menu-kit" />,
  },
  {
    id: 'menubar-kit',
    source: { symbol: 'MenubarKit', module: 'components-radix-primitives' },
    name: 'MenubarKit',
    gesture: 'foundation',
    gestureLabel: 'Radix · Desktop Application Menubar',
    summary: 'Horizontal desktop menubar (File · Edit · View · Profiles) with roving Left/Right switching and shortcut badges.',
    sounds: ['tap', 'pop'],
    agentActions: [
      { label: 'Open File Menu', action: 'openMenu', payload: 'File' },
      { label: 'Toggle Rulers', action: 'runCommand', payload: 'toggle-rulers' },
      { label: 'New Window (⌘N)', action: 'runCommand', payload: 'new-window' },
    ],
    reactCode: `<MenubarKit id="menubar-kit" />`,
    joploCode: `flow('Navigate desktop application menubar', { start: '/studio' })\n  .click('menubar-kit', 'Open View menu and toggle canvas rulers')`,
    render: () => <MenubarKit id="menubar-kit" />,
  },
  {
    id: 'navigation-menu-kit',
    source: { symbol: 'NavigationMenuKit', module: 'components-radix-primitives' },
    name: 'NavigationMenuKit',
    gesture: 'foundation',
    gestureLabel: 'Radix · Animated Mega-Menu Viewport',
    summary: 'Top-level site navigation bar with shared morphing viewport card, roving triggers, and 2-column rich link cards.',
    sounds: ['tap', 'swipe'],
    agentActions: [
      { label: 'Open Primitives', action: 'selectSection', payload: 'Primitives' },
      { label: 'Open Patterns', action: 'selectSection', payload: 'Patterns' },
      { label: 'Collapse Viewport', action: 'selectSection', payload: null },
    ],
    reactCode: `<NavigationMenuKit id="navigation-menu-kit" />`,
    joploCode: `flow('Browse site mega-menu', { start: '/docs' })\n  .click('navigation-menu-kit', 'Expand Primitives navigation viewport')`,
    render: () => <NavigationMenuKit id="navigation-menu-kit" />,
  },
  {
    id: 'toggle-toolbar-kit',
    source: { symbol: 'ToggleToolbarKit', module: 'components-radix-primitives' },
    name: 'ToggleToolbarKit',
    gesture: 'foundation',
    gestureLabel: 'Radix · Toolbar + ToggleGroup',
    summary: 'Composable WAI-ARIA toolbar combining multi-select text formatting toggles, single-select alignment, and pin state.',
    sounds: ['tap', 'latch'],
    agentActions: [
      { label: 'Toggle Code Style', action: 'toggleStyle', payload: 'code' },
      { label: 'Align Center', action: 'setAlign', payload: 'center' },
      { label: 'Toggle Pin Toolbar', action: 'togglePin' },
    ],
    reactCode: `<ToggleToolbarKit id="toggle-toolbar-kit" />`,
    joploCode: `flow('Format block in toolbar', { start: '/editor' })\n  .click('toggle-toolbar-kit', 'Toggle inline code and center alignment')`,
    render: () => <ToggleToolbarKit id="toggle-toolbar-kit" />,
  },
  {
    id: 'scroll-area-kit',
    source: { symbol: 'ScrollAreaKit', module: 'components-radix-primitives' },
    name: 'ScrollAreaKit',
    gesture: 'foundation',
    gestureLabel: 'Radix · Custom Overlay Scrollbar',
    summary: 'Custom overlay scrollbar viewport with top/bottom scroll-shadow masks, live percentage odometer, and jump presets.',
    sounds: ['tap', 'scrub'],
    agentActions: [
      { label: 'Jump to Top', action: 'scrollToPos', payload: 'top' },
      { label: 'Jump to 50%', action: 'scrollToPos', payload: 'mid' },
      { label: 'Jump to Bottom', action: 'scrollToPos', payload: 'bottom' },
    ],
    reactCode: `<ScrollAreaKit id="scroll-area-kit" />`,
    joploCode: `flow('Scroll workspace event log', { start: '/logs' })\n  .click('scroll-area-kit', 'Jump to bottom of event stream')`,
    render: () => <ScrollAreaKit id="scroll-area-kit" />,
  },
  {
    id: 'aspect-ratio-kit',
    source: { symbol: 'AspectRatioKit', module: 'components-radix-primitives' },
    name: 'AspectRatioKit',
    gesture: 'foundation',
    gestureLabel: 'Radix · Responsive Aspect Ratio Frame',
    summary: 'Intrinsic aspect-ratio container switching cleanly across 16:9, 4:3, 1:1, and 9:16 with rule-of-thirds composition guides.',
    sounds: ['tap', 'pop'],
    agentActions: [
      { label: '16:9 Widescreen', action: 'setRatio', payload: '16:9' },
      { label: '1:1 Square', action: 'setRatio', payload: '1:1' },
      { label: '9:16 Vertical', action: 'setRatio', payload: '9:16' },
    ],
    reactCode: `<AspectRatioKit id="aspect-ratio-kit" />`,
    joploCode: `flow('Switch video export aspect ratio', { start: '/export' })\n  .click('aspect-ratio-kit', 'Switch frame ratio to 1:1 square')`,
    render: () => <AspectRatioKit id="aspect-ratio-kit" />,
  },
  {
    id: 'alert-dialog-kit',
    source: { symbol: 'AlertDialogKit', module: 'components-radix-primitives' },
    name: 'AlertDialogKit',
    gesture: 'foundation',
    gestureLabel: 'Radix · Non-Dismissible AlertDialog',
    summary: 'High-consequence confirmation dialog requiring explicit Cancel or Revoke action (ignores backdrop click by contract).',
    sounds: ['deny', 'tap'],
    agentActions: [
      { label: 'Open Revoke Alert', action: 'openAlert' },
      { label: 'Confirm Revocation', action: 'confirmRevoke' },
      { label: 'Cancel Alert', action: 'cancelAlert' },
    ],
    reactCode: `<AlertDialogKit id="alert-dialog-kit" />`,
    joploCode: `flow('Confirm production token revocation', { start: '/security' })\n  .click('alert-dialog-kit', 'Open alert dialog and confirm revocation')`,
    render: () => <AlertDialogKit id="alert-dialog-kit" />,
  },
  {
    id: 'collapsible-range-kit',
    source: { symbol: 'CollapsibleRangeKit', module: 'components-radix-primitives' },
    name: 'CollapsibleRangeKit',
    gesture: 'foundation',
    gestureLabel: 'Radix · Dual-Thumb Slider + Collapsible',
    summary: 'Two-thumb non-crossing latency range slider paired with a smooth collapsible disclosure drawer and semantic Label bindings.',
    sounds: ['scrub', 'tap', 'swipe'],
    agentActions: [
      { label: 'Set Band 20–75ms', action: 'setRange', payload: [20, 75] },
      { label: 'Toggle Threshold Drawer', action: 'toggleCollapsible' },
    ],
    reactCode: `<CollapsibleRangeKit id="collapsible-range-kit" />`,
    joploCode: `flow('Adjust p95 latency band', { start: '/alerts' })\n  .click('collapsible-range-kit', 'Narrow latency band and expand rules')`,
    render: () => <CollapsibleRangeKit id="collapsible-range-kit" />,
  },

  // ── 8. BASE UI COMPOUND PRIMITIVES (6 Blocks) ─────────────────
  {
    id: 'fieldset-form-kit',
    source: { symbol: 'FieldsetFormKit', module: 'components-base-ui' },
    name: 'FieldsetFormKit',
    gesture: 'foundation',
    gestureLabel: 'Base UI · Form + Fieldset + Field',
    summary: 'Compound Field.Root / Control / Description / Error with live dirty, touched, and server-error validation states.',
    sounds: ['tap', 'paid', 'deny'],
    agentActions: [
      { label: 'Validate & Submit', action: 'submitValid' },
      { label: 'Inject Server Error', action: 'injectError' },
      { label: 'Clear Errors', action: 'clearErrors' },
    ],
    reactCode: `<FieldsetFormKit id="fieldset-form-kit" />`,
    joploCode: `flow('Validate endpoint form', { start: '/settings' })\n  .click('fieldset-form-kit', 'Submit endpoint configuration')`,
    render: () => <FieldsetFormKit id="fieldset-form-kit" />,
  },
  {
    id: 'autocomplete-kit',
    source: { symbol: 'AutocompleteKit', module: 'components-base-ui' },
    name: 'AutocompleteKit',
    gesture: 'foundation',
    gestureLabel: 'Base UI · Free-Text Autocomplete',
    summary: 'Free-form text input with live substring suggestion popup, keyboard highlight, and custom value acceptance.',
    sounds: ['tick', 'tap', 'pop'],
    agentActions: [
      { label: 'Type Cache-Control', action: 'setInput', payload: 'Cache-Control' },
      { label: 'Accept HSTS Preset', action: 'acceptSuggestion', payload: 'Strict-Transport-Security' },
    ],
    reactCode: `<AutocompleteKit id="autocomplete-kit" />`,
    joploCode: `flow('Enter HTTP header rule', { start: '/headers' })\n  .click('autocomplete-kit', 'Select Strict-Transport-Security suggestion')`,
    render: () => <AutocompleteKit id="autocomplete-kit" />,
  },
  {
    id: 'checkbox-group-kit',
    source: { symbol: 'CheckboxGroupKit', module: 'components-base-ui' },
    name: 'CheckboxGroupKit',
    gesture: 'foundation',
    gestureLabel: 'Base UI · 3-State Indeterminate Group',
    summary: 'Parent "Select All" checkbox that automatically computes indeterminate dash state from child permission checkboxes.',
    sounds: ['latch', 'tap'],
    agentActions: [
      { label: 'Toggle Select All', action: 'toggleParent' },
      { label: 'Toggle Write Scope', action: 'togglePermission', payload: 'write' },
      { label: 'Select Partial Subset', action: 'selectSubset' },
    ],
    reactCode: `<CheckboxGroupKit id="checkbox-group-kit" />`,
    joploCode: `flow('Configure token permission scopes', { start: '/permissions' })\n  .click('checkbox-group-kit', 'Toggle parent indeterminate checkbox')`,
    render: () => <CheckboxGroupKit id="checkbox-group-kit" />,
  },
  {
    id: 'number-scrub-field-kit',
    source: { symbol: 'NumberScrubFieldKit', module: 'components-base-ui' },
    name: 'NumberScrubFieldKit',
    gesture: 'drag',
    gestureLabel: 'Base UI · NumberField + ScrubArea',
    summary: 'Compound NumberField with horizontal drag-to-scrub label handle, Shift×10 / Alt×0.1 modifiers, and frame budget telemetry.',
    sounds: ['scrub', 'tap'],
    agentActions: [
      { label: 'Set 120 FPS', action: 'setFps', payload: 120 },
      { label: 'Set 60 FPS', action: 'setFps', payload: 60 },
      { label: 'Set Damping 0.85', action: 'setDamping', payload: 0.85 },
    ],
    reactCode: `<NumberScrubFieldKit id="number-scrub-field-kit" />`,
    joploCode: `flow('Scrub physics frame rate', { start: '/motion' })\n  .drag('number-scrub-field-kit', 'Scrub target frame rate to 120 fps')`,
    render: () => <NumberScrubFieldKit id="number-scrub-field-kit" />,
  },
  {
    id: 'meter-progress-kit',
    source: { symbol: 'MeterProgressKit', module: 'components-base-ui' },
    name: 'MeterProgressKit',
    gesture: 'foundation',
    gestureLabel: 'Base UI · Semantic Meter vs Progress',
    summary: 'Side-by-side WAI-ARIA role="meter" (threshold-aware gauge) and role="progressbar" (determinate + indeterminate shimmer).',
    sounds: ['tap', 'deny', 'paid'],
    agentActions: [
      { label: 'Spike Meter to 92%', action: 'setMeterLoad', payload: 92 },
      { label: 'Indeterminate Progress', action: 'setProgressVal', payload: 'indeterminate' },
      { label: 'Complete Progress 100%', action: 'setProgressVal', payload: 100 },
    ],
    reactCode: `<MeterProgressKit id="meter-progress-kit" />`,
    joploCode: `flow('Monitor memory gauge and build progress', { start: '/telemetry' })\n  .click('meter-progress-kit', 'Simulate high memory load and complete build')`,
    render: () => <MeterProgressKit id="meter-progress-kit" />,
  },
  {
    id: 'preview-card-kit',
    source: { symbol: 'PreviewCardKit', module: 'components-base-ui' },
    name: 'PreviewCardKit',
    gesture: 'hover',
    gestureLabel: 'Base UI · Delayed Link PreviewCard',
    summary: 'Hover/focus link preview card with open/close grace delays so pointers can travel from trigger to card without flicker.',
    sounds: ['pop', 'tap'],
    agentActions: [
      { label: 'Preview @juice-ui/react', action: 'previewTarget', payload: '@juice-ui/react' },
      { label: 'Preview @juice-ui/vue', action: 'previewTarget', payload: '@juice-ui/vue' },
      { label: 'Preview joplo-core', action: 'previewTarget', payload: 'joplo-core' },
    ],
    reactCode: `<PreviewCardKit id="preview-card-kit" />`,
    joploCode: `flow('Hover package reference link', { start: '/docs' })\n  .hover('preview-card-kit', 'Inspect @juice-ui/vue metadata card')`,
    render: () => <PreviewCardKit id="preview-card-kit" />,
  },

  // ── 9. PORTAL, FLOATING & STUDIO PRIMITIVES (6 Blocks) ────────
  {
    id: 'floating-popover-kit',
    source: { symbol: 'FloatingPopoverKit', module: 'components-portal-floating' },
    name: 'FloatingPopoverKit',
    gesture: 'workspace',
    gestureLabel: 'Portal · Collision-Aware Floating Engine',
    summary: 'Viewport-clamped portal popover with automatic top/bottom flip, fullscreen root detection, and return-focus contract.',
    sounds: ['pop', 'tap'],
    agentActions: [
      { label: 'Open Floating Popover', action: 'openPopover' },
      { label: 'Flip to Top', action: 'setPlacement', payload: 'top' },
      { label: 'Close Popover', action: 'closePopover' },
    ],
    reactCode: `<FloatingPopoverKit id="floating-popover-kit" />`,
    joploCode: `flow('Open collision-aware floating popover', { start: '/canvas' })\n  .click('floating-popover-kit', 'Open floating popover and flip placement')`,
    render: () => <FloatingPopoverKit id="floating-popover-kit" />,
  },
  {
    id: 'hover-preview-list',
    source: { symbol: 'HoverPreviewList', module: 'components-portal-floating' },
    name: 'HoverPreviewList',
    gesture: 'hover',
    gestureLabel: 'Portal · Hover-Intent Preview List',
    summary: 'Option list that previews candidate routing diffs on hover/focus and cleanly rolls back on pointer leave unless committed.',
    sounds: ['tap', 'pop'],
    agentActions: [
      { label: 'Hover Preview Queue', action: 'previewOption', payload: 'queue' },
      { label: 'Commit Stream Worker', action: 'selectOption', payload: 'worker' },
    ],
    reactCode: `<HoverPreviewList id="hover-preview-list" />`,
    joploCode: `flow('Preview option before committing', { start: '/routing' })\n  .hover('hover-preview-list', 'Preview Queue Consumer diff before click')`,
    render: () => <HoverPreviewList id="hover-preview-list" />,
  },
  {
    id: 'breadcrumb-dropdown-bar',
    source: { symbol: 'BreadcrumbDropdownBar', module: 'components-portal-floating' },
    name: 'BreadcrumbDropdownBar',
    gesture: 'workspace',
    gestureLabel: 'Portal · Breadcrumb Sibling Switcher',
    summary: 'Hierarchical breadcrumb bar where each segment opens an in-place sibling listbox with single-open menu coordination.',
    sounds: ['tap', 'pop'],
    agentActions: [
      { label: 'Toggle Project Menu', action: 'toggleMenu' },
      { label: 'Switch to juice-ui', action: 'selectProject', payload: 'juice-ui' },
    ],
    reactCode: `<BreadcrumbDropdownBar id="breadcrumb-dropdown-bar" />`,
    joploCode: `flow('Switch sibling project from breadcrumb', { start: '/workspace' })\n  .click('breadcrumb-dropdown-bar', 'Switch active project in breadcrumb')`,
    render: () => <BreadcrumbDropdownBar id="breadcrumb-dropdown-bar" />,
  },
  {
    id: 'adaptive-toolbar-kit',
    source: { symbol: 'AdaptiveToolbarKit', module: 'components-portal-floating' },
    name: 'AdaptiveToolbarKit',
    gesture: 'workspace',
    gestureLabel: 'Portal · Priority-Collapsed Toolbar',
    summary: 'Container-width-aware action bar that automatically collapses lower-priority actions to icon-only or an overflow menu.',
    sounds: ['scrub', 'tap'],
    agentActions: [
      { label: 'Compact Width (190px)', action: 'setToolbarWidth', payload: 190 },
      { label: 'Full Width (288px)', action: 'setToolbarWidth', payload: 288 },
    ],
    reactCode: `<AdaptiveToolbarKit id="adaptive-toolbar-kit" />`,
    joploCode: `flow('Resize adaptive action bar', { start: '/toolbar' })\n  .drag('adaptive-toolbar-kit', 'Collapse low-priority actions into overflow menu')`,
    render: () => <AdaptiveToolbarKit id="adaptive-toolbar-kit" />,
  },
  {
    id: 'swatch-preview-matrix',
    source: { symbol: 'SwatchPreviewMatrix', module: 'components-portal-floating' },
    name: 'SwatchPreviewMatrix',
    gesture: 'hover',
    gestureLabel: 'Portal · 2-Column Swatch Live Preview',
    summary: '2-column theme swatch matrix with 4-color mini dots, instant hover live-preview, click persistence, and rollback on leave.',
    sounds: ['tap', 'pop'],
    agentActions: [
      { label: 'Hover Preview Midnight', action: 'previewPalette', payload: 'midnight' },
      { label: 'Commit Blueprint', action: 'commitPalette', payload: 'blueprint' },
      { label: 'Rollback Preview', action: 'rollback' },
    ],
    reactCode: `<SwatchPreviewMatrix id="swatch-preview-matrix" />`,
    joploCode: `flow('Preview and commit color theme swatch', { start: '/theme' })\n  .hover('swatch-preview-matrix', 'Preview Ember palette and commit Cobalt')`,
    render: () => <SwatchPreviewMatrix id="swatch-preview-matrix" />,
  },
  {
    id: 'floating-inspector-sheet',
    source: { symbol: 'FloatingInspectorSheet', module: 'components-portal-floating' },
    name: 'FloatingInspectorSheet',
    gesture: 'workspace',
    gestureLabel: 'Portal · Non-Blocking Property Sheet',
    summary: 'Anchored lateral inspector sheet displaying component source path, copyable location, and rule verification pills.',
    sounds: ['tap', 'pop', 'paid'],
    agentActions: [
      { label: 'Inspect TokenButton', action: 'selectTarget', payload: 'TokenButton' },
      { label: 'Toggle Rule Filter', action: 'toggleRuleMode' },
      { label: 'Copy Source Path', action: 'copySource' },
    ],
    reactCode: `<FloatingInspectorSheet id="floating-inspector-sheet" />`,
    joploCode: `flow('Inspect element source and rules', { start: '/inspect' })\n  .click('floating-inspector-sheet', 'Inspect TokenButton and copy file path')`,
    render: () => <FloatingInspectorSheet id="floating-inspector-sheet" />,
  },

  // ── 10. MEDIA, TIMELINE & WORKBENCH PRIMITIVES (6 Blocks) ─────
  {
    id: 'media-transport-dock',
    source: { symbol: 'MediaTransportDock', module: 'components-media-workbench' },
    name: 'MediaTransportDock',
    gesture: 'workspace',
    gestureLabel: 'Workbench · Transport & Step Timeline',
    summary: 'Unified media playback bar with Play/Pause, Prev/Next step scrubbers, 0.5x–2x speed cycler, and zoom percentage.',
    sounds: ['tap', 'pop', 'scrub'],
    agentActions: [
      { label: 'Play / Pause', action: 'togglePlay' },
      { label: 'Next Step', action: 'nextStep' },
      { label: 'Set 1.5x Speed', action: 'setSpeed', payload: '1.5x' },
    ],
    reactCode: `<MediaTransportDock id="media-transport-dock" />`,
    joploCode: `flow('Step through media timeline', { start: '/player' })\n  .click('media-transport-dock', 'Advance timeline step and toggle playback')`,
    render: () => <MediaTransportDock id="media-transport-dock" />,
  },
  {
    id: 'idle-fullscreen-pill',
    source: { symbol: 'IdleFullscreenPill', module: 'components-media-workbench' },
    name: 'IdleFullscreenPill',
    gesture: 'hover',
    gestureLabel: 'Workbench · Idle Auto-Hide Capsule',
    summary: 'Fullscreen presentation capsule that fades out during pointer inactivity and wakes immediately on pointer move or focus.',
    sounds: ['tap', 'swipe'],
    agentActions: [
      { label: 'Simulate Pointer Idle', action: 'setIdle', payload: true },
      { label: 'Wake Transport Pill', action: 'setIdle', payload: false },
      { label: 'Next Scene Caption', action: 'nextCaption' },
    ],
    reactCode: `<IdleFullscreenPill id="idle-fullscreen-pill" />`,
    joploCode: `flow('Auto-hide presentation transport on idle', { start: '/present' })\n  .click('idle-fullscreen-pill', 'Simulate idle fade and wake transport')`,
    render: () => <IdleFullscreenPill id="idle-fullscreen-pill" />,
  },
  {
    id: 'draggable-snap-orb',
    source: { symbol: 'DraggableSnapOrb', module: 'components-media-workbench' },
    name: 'DraggableSnapOrb',
    gesture: 'drag',
    gestureLabel: 'Workbench · 4-Corner Magnetic Snap Orb',
    summary: 'Floating assistant orb that drags freely across the stage, snaps magnetically to the nearest corner, and opens a quick note popover.',
    sounds: ['lift', 'drop', 'pop'],
    agentActions: [
      { label: 'Snap Top-Right', action: 'snapToCorner', payload: 'tr' },
      { label: 'Snap Bottom-Left', action: 'snapToCorner', payload: 'bl' },
      { label: 'Toggle Quick Popover', action: 'togglePopover' },
    ],
    reactCode: `<DraggableSnapOrb id="draggable-snap-orb" />`,
    joploCode: `flow('Drag floating orb to corner', { start: '/stage' })\n  .drag('draggable-snap-orb', 'Snap assistant orb to top-right corner')`,
    render: () => <DraggableSnapOrb id="draggable-snap-orb" />,
  },
  {
    id: 'background-task-menu',
    source: { symbol: 'BackgroundTaskMenu', module: 'components-media-workbench' },
    name: 'BackgroundTaskMenu',
    gesture: 'workspace',
    gestureLabel: 'Workbench · Progress Ring & Task Menu',
    summary: 'Header button with live SVG circular progress ring that opens a non-blocking background job popover with frame counter and cancel.',
    sounds: ['tap', 'paid', 'deny'],
    agentActions: [
      { label: 'Start Export Task', action: 'startJob' },
      { label: 'Advance +25% Frame', action: 'advanceJob' },
      { label: 'Cancel Export', action: 'cancelJob' },
    ],
    reactCode: `<BackgroundTaskMenu id="background-task-menu" />`,
    joploCode: `flow('Monitor background export task', { start: '/tasks' })\n  .click('background-task-menu', 'Start frame export and advance progress')`,
    render: () => <BackgroundTaskMenu id="background-task-menu" />,
  },
  {
    id: 'copy-snippet-flash',
    source: { symbol: 'CopySnippetFlash', module: 'components-media-workbench' },
    name: 'CopySnippetFlash',
    gesture: 'press',
    gestureLabel: 'Workbench · Click-to-Copy Flash Pill',
    summary: 'Monospace CLI command & share URL pills with instant green confirmation flash, checkmark icon swap, and auto-reset.',
    sounds: ['paid', 'tap'],
    agentActions: [
      { label: 'Copy CLI Command', action: 'copyCommand' },
      { label: 'Copy Share URL', action: 'copyShareUrl' },
    ],
    reactCode: `<CopySnippetFlash id="copy-snippet-flash" />`,
    joploCode: `flow('Copy CLI setup snippet', { start: '/share' })\n  .click('copy-snippet-flash', 'Copy CLI command with flash confirmation')`,
    render: () => <CopySnippetFlash id="copy-snippet-flash" />,
  },
  {
    id: 'masked-secret-manager',
    source: { symbol: 'MaskedSecretManager', module: 'components-media-workbench' },
    name: 'MaskedSecretManager',
    gesture: 'workspace',
    gestureLabel: 'Workbench · Masked API Key Vault',
    summary: 'Provider secret key manager displaying masked suffixes (••••9821), inline Replace/Remove actions, and connection verification.',
    sounds: ['tap', 'paid', 'deny'],
    agentActions: [
      { label: 'Test OpenAI Key', action: 'testConnection', payload: 'OpenAI' },
      { label: 'Rotate Anthropic Key', action: 'saveKey', payload: { provider: 'Anthropic', rawKey: 'sk-ant-api03-7742' } },
      { label: 'Remove Cloudflare Key', action: 'removeKey', payload: 'Cloudflare' },
    ],
    reactCode: `<MaskedSecretManager id="masked-secret-manager" />`,
    joploCode: `flow('Rotate and verify API secret key', { start: '/vault' })\n  .click('masked-secret-manager', 'Test OpenAI connection and rotate key')`,
    render: () => <MaskedSecretManager id="masked-secret-manager" />,
  },
];

function OdometerPlayground() {
  const { playSound } = useJuice();
  const [val, setVal] = useState(148920);
  return (
    <div className="j-slab j-fnd-card" style={{ padding: 14, gap: 12 }}>
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
  const [section, setSection] = useState<SiteSection>('playground');
  const [installTrack, setInstallTrack] = useState<InstallTrack>('npm');
  const [quickJumpOpen, setQuickJumpOpen] = useState<boolean>(false);
  const [category, setCategory] = useState<GestureCategory>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedId, setSelectedId] = useState<string>('slash-mention-composer');
  const [showSoundStrip, setShowSoundStrip] = useState<boolean>(false);
  const [codeTab, setCodeTab] = useState<CodeTab>('react');
  const [agentTick, setAgentTick] = useState<number>(0);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setQuickJumpOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const jumpToBlock = (blockId: string) => {
    const block = BLOCK_CATALOG.find((item) => item.id === blockId || item.demoId === blockId);
    if (!block) return;
    setSection('playground');
    setCategory('all');
    setSearchQuery('');
    setSelectedId(block.id);
    setAgentTick((t) => t + 1);
    window.setTimeout(() => {
      const el = document.querySelector(`[data-block-cell="${block.demoId ?? block.id}"]`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 60);
  };

  const counts = useMemo(() => {
    const map: Record<GestureCategory, number> = {
      all: BLOCK_CATALOG.length,
      foundation: 0,
      ai: 0,
      press: 0,
      drag: 0,
      hover: 0,
      workspace: 0,
    };
    for (const b of BLOCK_CATALOG) {
      map[b.gesture]++;
    }
    return map;
  }, []);

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

  const agentId = selectedBlock.demoId ?? selectedBlock.id;
  const liveSnapshot = useMemo(() => {
    void agentTick;
    if (typeof window === 'undefined') return null;
    const bridge = (window as unknown as { __juiceAgent?: JuiceAgentBridge }).__juiceAgent;
    const all = bridge?.snapshot();
    return all?.[agentId]?.state ?? null;
  }, [agentId, agentTick]);

  const triggerAgentAction = (action: string, payload?: unknown) => {
    const bridge = (window as unknown as { __juiceAgent?: JuiceAgentBridge }).__juiceAgent;
    bridge?.act(agentId, action, payload);
    setAgentTick((t) => t + 1);
  };

  const { symbol, module } = selectedBlock.source;
  const activeCodeText = useMemo(() => {
    if (codeTab === 'vue') return deriveVueSnippet(selectedBlock);
    if (codeTab === 'joplo') return selectedBlock.joploCode;
    if (codeTab === 'cli') return `# 1. Initialize once (copies juice.css + sound + behaviors)
npx @tokenroll/juice init

# 2. Copy source for this block + its local deps into src/components/juice/
npx @tokenroll/juice add ${selectedBlock.id}`;

    const props = symbol === 'RollingNumber' ? 'value={148920} prefix="$"' : `id="${agentId}"`;
    return `import '@tokenroll/juice/styles.css';
import { ${symbol} } from '@tokenroll/juice/blocks';

export default function App() {
  return <${symbol} ${props} />;
}`;
  }, [agentId, codeTab, selectedBlock, symbol]);

  return (
    <div className="bench-shell">
      {/* Sticky Official Site Header — Built with Juice UI Components */}
      <header className="bench-topbar">
        <div className="bench-topbar-inner">
          <button
            type="button"
            className="bench-brand"
            onClick={() => {
              playJuiceSound('tap');
              setSection('playground');
            }}
          >
            <div className="bench-logo">J</div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="bench-title">Juice UI</span>
                <Badge tone="neutral">@tokenroll/juice · v0.1</Badge>
              </div>
              <div className="bench-subtitle">
                Tactile React &amp; Vue 3 Primitives · AI Agents · 3KB Web Audio Synth
              </div>
            </div>
          </button>

          {/* Primary 4-Section Navigation */}
          <SegmentedControl<SiteSection>
            options={[
              { value: 'playground', label: `Playground (${BLOCK_CATALOG.length})` },
              { value: 'docs', label: 'Get Started' },
              { value: 'api', label: 'API (182)' },
              { value: 'tokens', label: 'Tokens & Sound' },
            ]}
            value={section}
            onChange={(next) => {
              playJuiceSound('tap');
              setSection(next);
            }}
          />

          <div className="bench-controls">
            {/* Global Cmd+K Quick Jump */}
            <Button
              size="sm"
              variant="secondary"
              leftIcon={<Search size={13} />}
              rightIcon={<Kbd>⌘K</Kbd>}
              onClick={() => {
                playJuiceSound('tap');
                setQuickJumpOpen(true);
              }}
            >
              Jump
            </Button>

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
                { value: 'static', label: 'Static' },
              ]}
              value={animate ? 'spring' : 'static'}
              onChange={(v) => setAnimate(v === 'spring')}
            />

            {/* Mute / Unmute */}
            <Button
              size="sm"
              variant="ghost"
              aria-label={sound ? 'Mute UI sounds' : 'Enable UI sounds'}
              leftIcon={sound ? <Volume2 size={14} /> : <VolumeX size={14} />}
              onClick={() => setSound(!sound)}
            >
              {sound ? 'Audio' : 'Muted'}
            </Button>

            {/* Light / Dark Theme */}
            <Button
              size="sm"
              variant="ghost"
              aria-label="Toggle color theme"
              leftIcon={theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
              onClick={() => {
                playJuiceSound('tap');
                setTheme(theme === 'light' ? 'dark' : 'light');
              }}
            >
              {theme === 'light' ? 'Dark' : 'Light'}
            </Button>

            <a
              className="site-gh-link"
              href="https://github.com/TokenRollAI/juice"
              target="_blank"
              rel="noreferrer"
            >
              <Button size="sm" variant="outline" rightIcon={<ArrowUpRight size={13} />}>
                GitHub
              </Button>
            </a>
          </div>
        </div>
      </header>

      {/* Expandable Procedural Web Audio Synth Pad Strip (Playground quick toggle) */}
      {section === 'playground' && showSoundStrip && (
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

      {/* Section 1: Playground (86 Live Interactive Blocks) */}
      {section === 'playground' && (
        <>
          <QuickInstallRibbon blockCount={BLOCK_CATALOG.length} track={installTrack}
            onTrackChange={setInstallTrack} onOpenDocs={() => setSection('docs')} />

          <div className="bench-workspace">
            <main className="bench-main">
              <div className="bench-filter-bar">
                <SegmentedControl<GestureCategory>
                  options={[
                    { value: 'all', label: `All (${counts.all})` },
                    { value: 'foundation', label: `Foundation (${counts.foundation})` },
                    { value: 'ai', label: `AI & Agents (${counts.ai})` },
                    { value: 'press', label: `Press (${counts.press})` },
                    { value: 'drag', label: `Drag (${counts.drag})` },
                    { value: 'hover', label: `Hover & Type (${counts.hover})` },
                    { value: 'workspace', label: `Workspace (${counts.workspace})` },
                  ]}
                  value={category}
                  onChange={setCategory}
                />

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <Button
                    size="sm"
                    variant={showSoundStrip ? 'primary' : 'secondary'}
                    leftIcon={<Volume2 size={13} />}
                    onClick={() => {
                      playJuiceSound('tap', true);
                      setShowSoundStrip((s) => !s);
                    }}
                  >
                    Synth Pad (12)
                  </Button>

                  <div style={{ minWidth: 220 }}>
                    <TextField
                      aria-label="Filter blocks"
                      value={searchQuery}
                      onChange={setSearchQuery}
                      placeholder={`Filter ${BLOCK_CATALOG.length} blocks…`}
                      prefix={<Search size={13} />}
                      clearable
                    />
                  </div>
                </div>
              </div>

              <div className="bench-grid">
                {filteredBlocks.map((block) => {
                  const isSelected = block.id === selectedBlock.id;
                  return (
                    <article
                      key={block.id}
                      data-block-cell={block.demoId ?? block.id}
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
                    <Badge tone="neutral">{selectedBlock.gestureLabel}</Badge>
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
                      {`snapshot("${agentId}") → ${JSON.stringify(liveSnapshot)}`}
                    </pre>
                  )}
                </div>
              )}

              {/* 2. Concentric Tonal Ramp Live Preview */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ fontWeight: 600 }}>Concentric color-mix Ramp</span>
                  <span style={{ color: 'var(--juice-mute)', fontSize: 11 }}>320px · 20px → 14px → 10px</span>
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

              <div className="site-inspector-code">
                <SegmentedControl<CodeTab>
                  options={[
                    { value: 'react', label: 'React' },
                    { value: 'vue', label: 'Vue 3' },
                    { value: 'cli', label: 'CLI' },
                    { value: 'joplo', label: 'Joplo' },
                  ]}
                  value={codeTab}
                  onChange={setCodeTab}
                />
                <CopySnippet code={activeCodeText} label={codeTab === 'cli' ? 'Terminal commands' : 'Usage example'} />
                {codeTab === 'cli' && (
                  <CopySnippet
                    code={`import './components/juice/juice.css';\nimport { ${symbol} } from './components/juice/${module}';`}
                    label="Local import from src/App.tsx"
                  />
                )}
              </div>
            </aside>
          </div>
        </>
      )}

      {/* Section 2: Get Started & Usage Guide */}
      {section === 'docs' && <GetStartedView track={installTrack} onTrackChange={setInstallTrack} onOpenPlayground={() => setSection('playground')} />}

      {/* Section 3: Primitives & Architecture API Reference */}
      {section === 'api' && <PrimitivesApiView onJumpToBlock={jumpToBlock} />}

      {/* Section 4: Concentric Tokens & Procedural Sound Lab */}
      {section === 'tokens' && <TokensSoundLabView />}

      {/* Footer */}
      <footer className="site-footer">
        <div className="site-footer-inner">
          <span>
            Juice UI · Built with <strong>@tokenroll/juice</strong> · MIT License · TokenRollAI
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <a
              href="https://github.com/TokenRollAI/juice"
              target="_blank"
              rel="noreferrer"
              style={{ color: 'inherit', textDecoration: 'none' }}
            >
              github.com/TokenRollAI/juice
            </a>
            <span>·</span>
            <span>Skill: npx skills add TokenRollAI/juice</span>
          </div>
        </div>
      </footer>

      {/* Global Cmd+K Quick Jump Modal */}
      <QuickJumpModal
        open={quickJumpOpen}
        onClose={() => setQuickJumpOpen(false)}
        blocks={BLOCK_CATALOG}
        onSelectBlock={jumpToBlock}
        onSelectSection={setSection}
      />
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
