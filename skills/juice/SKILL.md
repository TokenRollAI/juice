---
name: juice
description: Build and compose tactile, modern React and Vue 3 UI interfaces, Radix & Base UI primitives, portal/studio workbenches, media timelines, and deep AI agent flows using @juice-ui/react and @juice-ui/vue.
---

# Juice UI Skill (`@juice-ui/react` & `@juice-ui/vue`)

Use `@juice-ui/react` (or `@juice-ui/vue`) when building high-craft product interfaces, everyday Radix/Base UI foundation components, non-blocking floating portals, media/studio workbenches, or deep AI agent flows without border bloat or generic AI-template noise.

## 1. Design Rules & Concentric Tokens

- **Zero-Border Tonal Hierarchy**: Import `@juice-ui/react/styles.css`. Never stack 1px borders or nested shadows. All surfaces derive from `--fill-on` (ink) and `--fill-slab` (card) via the 6-step `color-mix` ramp:
  - `--juice-w4`, `--juice-w6`, `--juice-w12`, `--juice-w20` (surfaces & interactive fills)
  - `--juice-faint`, `--juice-mute`, `--juice-soft` (secondary typography & ticks)
- **Concentric Geometry**: Outer card `.j-slab` uses `width: 320px`, `border-radius: 20px`, and `padding: 6px`; direct inner panels use `border-radius: 14px` (`20 - 6 = 14`); inner controls use `10px`.
- **Capsule Radius Transitions**: When animating a capsule into an expanded card (e.g., `DynamicIsland`), never transition from `999px` or use an overshooting cubic-bezier (`--juice-pop`) on `border-radius` (negative overshoot clamps to `0px` sharp corners). Use exact geometric half-height radii (`19px -> 21px -> 20px`) with `--juice-out`.
- **AI Status Indicator**: Use `.j-status-dot` + `.j-text-shimmer` for streaming/thinking states. Never use decorative `<Sparkles />` icons.
- **Tabular Numerals**: Wrap animated metrics or counters in `<RollingNumber value={...} prefix="$" />` so digits never jitter horizontally.

## 2. Complete 86-Block Component Catalog (+ Reusable Primitives)

| Pillar | Reusable Primitives & Showcase Blocks |
| :--- | :--- |
| **1. Everyday Foundation (16)** | `Button`, `ButtonKit`, `Input`, `Textarea`, `InputFields`, `Select`, `Combobox`, `SelectCombobox`, `Checkbox`, `RadioGroup`, `ChoiceCards`, `Slider`, `NumberField`, `RangeNumberKit`, `SettingsRows`, `TagInput`, `MiniCalendar`, `TagCalendarKit`, `Avatar`, `AvatarGroup`, `AvatarProfile`, `Accordion`, `AccordionKit`, `Dialog`, `DialogModal`, `DropdownMenu`, `DropdownMenuKit`, `Popover`, `Tooltip`, `PopoverTooltipKit`, `Alert`, `ProgressBar`, `AlertProgress`, `Breadcrumb`, `Pagination`, `NavPagination`, `EmptyState`, `EmptyStateCard`, `FileDropzone` |
| **2. Radix Primitives (8)** | `Separator`, `AspectRatio`, `AspectRatioKit`, `Label`, `Collapsible`, `DualRangeSlider`, `RangeSlider`, `CollapsibleRangeKit`, `ContextMenu`, `ContextMenuKit`, `Menubar`, `MenubarKit`, `NavigationMenu`, `NavigationMenuKit`, `Toggle`, `Toolbar`, `ToolbarButton`, `ToggleGroup`, `ToggleGroupItem`, `ToggleToolbarKit`, `AlertDialog`, `AlertDialogKit`, `ScrollArea`, `ScrollAreaKit` |
| **3. Base UI Compound Primitives (6)** | `Field`, `Fieldset`, `Form`, `FieldsetFormKit`, `Autocomplete`, `AutocompleteKit`, `CheckboxGroup` (3-state indeterminate), `CheckboxGroupKit`, `ScrubNumberField`, `NumberScrubFieldKit`, `Meter`, `Progress`, `MeterProgressKit`, `PreviewCard`, `PreviewCardKit` |
| **4. Portal, Floating & Studio (6)** | `placeFloating` (collision-aware + fullscreen root support), `FloatingPopover`, `FloatingPopoverKit`, `useTooltip`, `HoverPreviewList`, `BreadcrumbSelect`, `BreadcrumbDropdownBar`, `AdaptiveToolbar`, `AdaptiveToolbarKit`, `SwatchGridPicker`, `SwatchPreviewMatrix`, `InspectorSheet`, `FloatingInspectorSheet` |
| **5. Media, Timeline & Workbench (6)** | `MediaTransport`, `StepTimeline`, `MediaTransportDock`, `IdleAutoHideBar`, `IdleFullscreenPill`, `CornerSnapOrb`, `DraggableSnapOrb`, `ProgressRing`, `TaskProgressCard`, `BackgroundTaskMenu`, `CopySnippet`, `CopySnippetFlash`, `MaskedSecretInput`, `MaskedSecretManager` |
| **6. Deep AI Chat & Agentic Workflows (23)** | `Composer`, `SlashMentionComposer`, `ModelEffortPicker`, `ThinkingMorph`, `GroundedAnswer`, `MessageBranchThread`, `VisionRegionAsk`, `VoiceOrbSession`, `ArtifactCanvas`, `ToolApprovalGate`, `AgentPlanChecklist`, `TerminalStreamCard`, `SubagentSwarmBoard`, `McpServerRoster`, `ContextBudgetMeter`, `AgentMemoryStore`, `ModelArenaCompare`, `RateLimitBanner`, `AudioWaveTrim`, `CodeDiffReveal`, `SkeletonMorph`, `RollingNumber`, `MetricRibbon` |
| **7. Tactile & Workspace Surfaces (21)** | `StateButton`, `ScrubPanel`, `SlideConfirm`, `DynamicIsland`, `MorphCard`, `SplitCompare`, `OtpField`, `PassStrength`, `TimeSlotPicker`, `RadialDial`, `SwipeCard`, `SelectionToolbar`, `CommandPalette`, `ToastStack`, `DataGrid`, `TreeExplorer`, `ResizableSplit`, `FilterBar`, `DrawerSheet`, `TabsMorph`, `TransferList` |

## 3. Dual-Driven State & Agent/Joplo Bridge

Every Juice block supports both **uncontrolled audience play** (`default*` props) and **controlled timeline/state play** (`value` / `stage` / `mode` / `opened` props).

- **Deterministic Frame Mode (for Joplo Storyboards & Screenshots)**: Pass `<JuiceProvider animate={false}>` to disable spring transitions so every component settles at its target steady state immediately.
- **Runtime Agent Bridge (`window.__juiceAgent`)**:
  - `window.__juiceAgent.snapshot()` returns the live state of every mounted component with an `id`.
  - `window.__juiceAgent.act(id, action, payload)` drives any component programmatically (e.g., `act('context-menu-kit', 'openContextMenu')`, `act('checkbox-group-kit', 'toggleParent')`, `act('media-transport-dock', 'nextStep')`).
