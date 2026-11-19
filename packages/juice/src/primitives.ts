/**
 * @tokenroll/juice/primitives
 *
 * 100% pure, production-ready UI primitives, headless hooks, procedural Web Audio
 * synthesizer, and runtime Agent Bridge — with zero demo/showcase *Kit fixtures.
 */

export * from './sound.ts';
export * from './behaviors.tsx';

// Core tactile primitives
export {
  Kbd,
  Badge,
  SegmentedControl,
  Switch,
  Checkbox,
  RollingNumber,
  type SegmentedOption,
  type ActionButtonStage,
  type IslandMode,
} from './components.tsx';

// Everyday foundation form & navigation primitives
export {
  Button,
  IconButton,
  TextField,
  Textarea,
  Select,
  RadioCard,
  NumberField,
  Slider,
  type SelectOption,
} from './components-foundation-forms.tsx';

export {
  Breadcrumbs,
  Pagination,
  Alert,
  Skeleton,
  Spinner,
} from './components-foundation-nav.tsx';

// Radix-grade WAI-ARIA primitives
export {
  Separator,
  AspectRatio,
  Label,
  Collapsible,
  ContextMenu,
  Menubar,
  NavigationMenu,
  Toggle,
  Toolbar,
  ToolbarButton,
  ToggleGroup,
  ToggleGroupItem,
  AlertDialog,
  ScrollArea,
  DualRangeSlider,
  RangeSlider,
  type MenuItem,
  type MenuEntry,
  type MenubarMenu,
  type NavigationMenuSection,
} from './components-radix-primitives.tsx';

// Base UI compound primitives
export {
  Form,
  Fieldset,
  Field,
  Meter,
  Progress,
  Autocomplete,
  CheckboxGroup,
  ScrubNumberField,
  PreviewCard,
  type FormProps,
  type AutocompleteSuggestion,
  type PreviewPackageName,
} from './components-base-ui.tsx';

// Portal, floating & studio workbench primitives
export {
  placeFloating,
  FloatingPopover,
  CenterPopover,
  useTooltip,
  Tooltip,
  BreadcrumbSelect,
  AdaptiveToolbar,
  SwatchGridPicker,
  InspectorSheet,
  type FloatingPlacement,
  type AnchorRect,
  type FloatingPopoverProps,
  type CenterPopoverProps,
  type TooltipOptions,
  type BreadcrumbSelectOption,
  type BreadcrumbSelectItem,
  type BreadcrumbSelectGroup,
  type BreadcrumbSelectProps,
  type AdaptiveToolbarAction,
  type SwatchPalette,
  type InspectorRule,
  type InspectorSheetLabels,
} from './components-portal-floating.tsx';

// Media, timeline & workbench primitives
export {
  ProgressRing,
  CopySnippet,
  MediaTransport,
  StepTimeline,
  useIdleVisibility,
  IdleAutoHideBar,
  CornerSnapOrb,
  TaskProgressCard,
  MaskedSecretField,
  MaskedSecretInput,
  type CopySnippetProps,
  type MediaTransportButtonKey,
  type MediaTransportLabels,
  type TimelineStepDwell,
  type TimelineStepItem,
  type StepTimelineLabels,
  type SnapCorner,
  type OrbPosition,
  type CornerSnapOrbProps,
  type MaskedSecretFieldProps,
} from './components-media-workbench.tsx';

// Composable multi-part SaaS & app primitives (v0.2.0)
export {
  Dialog,
  Sheet,
  DropdownMenu,
  Tabs,
  Accordion,
  createToastManager,
  ToastProvider,
  useToastManager,
  ToastViewport,
  Table,
  Avatar,
  ChartTooltipContent,
  ChartLegendContent,
  OtpInput,
  type ToastOptions,
  type ToastManager,
} from './components-composable.tsx';
