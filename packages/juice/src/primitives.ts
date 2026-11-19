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
  useTooltip,
  Tooltip,
  BreadcrumbSelect,
  AdaptiveToolbar,
  SwatchGridPicker,
  InspectorSheet,
  type FloatingPlacement,
  type AdaptiveToolbarAction,
  type SwatchPalette,
  type InspectorRule,
} from './components-portal-floating.tsx';

// Media, timeline & workbench primitives
export {
  ProgressRing,
  CopySnippet,
  MediaTransport,
  StepTimeline,
  IdleAutoHideBar,
  CornerSnapOrb,
  TaskProgressCard,
  MaskedSecretInput,
  type SnapCorner,
} from './components-media-workbench.tsx';
