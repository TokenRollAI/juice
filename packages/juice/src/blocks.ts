/**
 * @tokenroll/juice/blocks
 *
 * All 86 high-craft interactive UI blocks, deep AI/Agent workflows, and showcase kits.
 */

// Core tactile micro-interaction blocks
export {
  RollingNumber,
  StateButton,
  ScrubPanel,
  SlideConfirm,
  DynamicIsland,
  MorphCard,
  MetricRibbon,
  Composer,
  ThinkingMorph,
  CommandPalette,
  ToastStack,
  SplitCompare,
  type ActionButtonStage,
  type IslandMode,
} from './components.tsx';

// Extended workspace & direct-manipulation blocks
export {
  OtpField,
  PassStrength,
  TimeSlotPicker,
  RadialDial,
  SwipeCard,
  SelectionToolbar,
  DataGrid,
  TreeExplorer,
  ResizableSplit,
  FilterBar,
  DrawerSheet,
  TabsMorph,
  AudioWaveTrim,
  CodeDiffReveal,
  SkeletonMorph,
  TransferList,
} from './components-extended.tsx';

// Deep AI Chat & Agentic workflow blocks
export {
  SlashMentionComposer,
  ModelEffortPicker,
  ContextBudgetMeter,
  GroundedAnswer,
  MessageBranchThread,
  ModelArenaCompare,
  VisionRegionAsk,
  VoiceOrbSession,
  type ReasoningEffort,
  type VisionRegionId,
  type VoiceOrbState,
} from './components-ai-chat.tsx';

export {
  ToolApprovalGate,
  SubagentSwarmBoard,
  AgentPlanChecklist,
  ArtifactCanvas,
  AgentMemoryStore,
  TerminalStreamCard,
  RateLimitBanner,
  McpServerRoster,
} from './components-ai-agents.tsx';

// Everyday Foundation showcase kits
export {
  ButtonKit,
  InputFields,
  SelectCombobox,
  ChoiceCards,
  RangeNumberKit,
  TagCalendarKit,
  SettingsRows,
  FileDropzone,
} from './components-foundation-forms.tsx';

export {
  DialogModal,
  DropdownMenuKit,
  PopoverTooltipKit,
  AccordionKit,
  NavPagination,
  AlertProgress,
  AvatarProfile,
  EmptyStateCard,
} from './components-foundation-nav.tsx';

// Radix Primitives showcase kits
export {
  ContextMenuKit,
  MenubarKit,
  NavigationMenuKit,
  ToggleToolbarKit,
  ScrollAreaKit,
  AspectRatioKit,
  AlertDialogKit,
  CollapsibleRangeKit,
} from './components-radix-primitives.tsx';

// Base UI showcase kits
export {
  FieldsetFormKit,
  AutocompleteKit,
  CheckboxGroupKit,
  NumberScrubFieldKit,
  MeterProgressKit,
  PreviewCardKit,
} from './components-base-ui.tsx';

// Portal, Floating & Studio showcase blocks
export {
  FloatingPopoverKit,
  HoverPreviewList,
  BreadcrumbDropdownBar,
  AdaptiveToolbarKit,
  SwatchPreviewMatrix,
  FloatingInspectorSheet,
} from './components-portal-floating.tsx';

// Media, Timeline & Workbench showcase blocks
export {
  MediaTransportDock,
  IdleFullscreenPill,
  DraggableSnapOrb,
  BackgroundTaskMenu,
  CopySnippetFlash,
  MaskedSecretManager,
} from './components-media-workbench.tsx';
