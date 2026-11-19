---
name: juice
description: Build and compose tactile, high-craft React 18/19 and Vue 3 interfaces using @tokenroll/juice and @tokenroll/juice-vue — including Radix & Base UI primitives, portal/studio workbenches, media timelines, deep AI agent workflows, concentric color-mix tokens, procedural Web Audio sounds, and window.__juiceAgent verification. Use whenever building or upgrading UI with Juice UI components or tokens.
---

# Juice UI Skill (`@tokenroll/juice` & `@tokenroll/juice-vue`)

Use `@tokenroll/juice` (React 18/19) or `@tokenroll/juice-vue` (Vue 3) when building tactile, high-density product UIs, Radix/Base UI foundation forms, non-blocking floating portals, media/studio workbenches, or deep AI agent interfaces — with zero border bloat and zero generic AI-template noise.

## 1. Installation & Quickstart

### React (`@tokenroll/juice`)
```bash
pnpm add @tokenroll/juice lucide-react
```

```tsx
import '@tokenroll/juice/styles.css';
import { JuiceProvider, StateButton, SlashMentionComposer } from '@tokenroll/juice';

export function App() {
  return (
    <JuiceProvider defaultTheme="light" defaultFill="slab" defaultSound={true}>
      <StateButton id="deploy-btn" amount={420} />
      <SlashMentionComposer id="agent-input" />
    </JuiceProvider>
  );
}
```

### Vue 3 (`@tokenroll/juice-vue`)
```bash
pnpm add @tokenroll/juice-vue
```

```vue
<script setup lang="ts">
import '@tokenroll/juice-vue/styles.css';
import { JProvider, JStateButton, JToolApprovalGate } from '@tokenroll/juice-vue';
</script>

<template>
  <JProvider theme="light" fill="slab" :sound="true">
    <JStateButton id="deploy-btn" :amount="420" />
    <JToolApprovalGate id="shell-gate" />
  </JProvider>
</template>
```

### Framework-Agnostic Core (`@tokenroll/juice/core`)
Use `@tokenroll/juice/core` when you only need the zero-React procedural Web Audio synth (`playJuiceSound`, `JUICE_SOUND_CATALOG`) or `window.__juiceAgent` bridge (`registerJuiceAgentNode`, `unregisterJuiceAgentNode`).

## 2. Design Invariants & Concentric Tokens

1. **Zero-Border Tonal Hierarchy**: Import `@tokenroll/juice/styles.css` once. Never stack `1px solid` borders or nested drop shadows. Every surface derives from two variables — `--fill-on` (ink) and `--fill-slab` (card) — via a 6-step `color-mix(in srgb, ...)` ramp:
   - Surfaces: `--juice-w4`, `--juice-w6`, `--juice-w12`, `--juice-w20`
   - Ink hierarchy: `--juice-faint`, `--juice-mute`, `--juice-soft`, `--fill-on`
   - Dark & Solid step-up: `[data-theme="dark"]` and `[data-tone="solid"]` automatically raise tonal stops (`w6 -> 8.5%`, `w12 -> 17%`, `w20 -> 27%`) so contrast never collapses.
   - Semantic fills: Use `--juice-ok`, `--juice-warn`, `--juice-danger`, `--juice-signal` with tonal `color-mix(in srgb, var(--juice-ok) 16%, var(--fill-slab))` or `--juice-on-signal` / `--juice-on-ok` for solid ink. Never hardcode `#fff` or `#000` on cards/controls.
2. **Concentric Geometry**: Outer `.j-slab` uses `border-radius: var(--juice-r-outer)` (`20px`) and `padding: 6px`; direct inner panels use `var(--juice-r-inner)` (`14px` = `20 - 6`); inner controls/buttons/inputs use `var(--juice-r-control)` (`10px`). Showcase cards align on `width: 320px; max-width: 100%;`.
3. **Typography & Tabular Numerals**: Card headers use `13px`, `font-weight: 600`, `letter-spacing: -0.01em`. Always apply `font-variant-numeric: tabular-nums` or wrap dynamic metrics in `<RollingNumber />` so digits never jitter.
4. **Zero AI Slop**:
   - Never use decorative `<Sparkles />` icons, neon gradients, or double-bordered wrapper cards.
   - Use `.j-status-dot` + `.j-text-shimmer` for streaming/thinking states.
5. **Motion & Capsule Radius Safety**:
   - Never transition `border-radius` from `999px` with an overshooting cubic-bezier (`--juice-pop`) — negative overshoot clamps to `0px` sharp corners. Use exact half-height radii (`19px -> 21px -> 20px`) with `--juice-out`.
   - Avoid `--juice-pop` on bottom sheets (`DrawerSheet`) so they never reveal a gap below the bottom edge.

## 3. Complete 86-Block & 182-Primitive Catalog

| Layer | Key Exported Primitives & Showcase Blocks |
| :--- | :--- |
| **1. Everyday Foundation (16)** | `Button`, `IconButton`, `TextField`, `Select`, `RadioCard`, `Checkbox`, `Switch`, `NumberField`, `Slider`, `Badge`, `Kbd`, `SegmentedControl`, `Alert`, `Breadcrumbs`, `Pagination`, `ButtonKit`, `InputFields`, `SelectCombobox`, `ChoiceCards`, `RangeNumberKit`, `SettingsRows`, `TagCalendarKit`, `AvatarProfile`, `AccordionKit`, `DialogModal`, `DropdownMenuKit`, `PopoverTooltipKit`, `AlertProgress`, `NavPagination`, `EmptyStateCard`, `FileDropzone` |
| **2. Radix Primitives (8)** | `Separator`, `AspectRatio`, `AspectRatioKit`, `Label`, `Collapsible`, `DualRangeSlider`, `RangeSlider`, `CollapsibleRangeKit`, `ContextMenu`, `ContextMenuKit`, `Menubar`, `MenubarKit`, `NavigationMenu`, `NavigationMenuKit`, `Toggle`, `Toolbar`, `ToolbarButton`, `ToggleGroup`, `ToggleGroupItem`, `ToggleToolbarKit`, `AlertDialog`, `AlertDialogKit`, `ScrollArea`, `ScrollAreaKit` |
| **3. Base UI Compound (6)** | `Field`, `Fieldset`, `Form`, `FieldsetFormKit`, `Autocomplete`, `AutocompleteKit`, `CheckboxGroup` (3-state indeterminate), `CheckboxGroupKit`, `ScrubNumberField`, `NumberScrubFieldKit`, `Meter`, `Progress`, `MeterProgressKit`, `PreviewCard`, `PreviewCardKit` |
| **4. Portal, Floating & Studio (6)** | `placeFloating` (collision-aware + `document.fullscreenElement` support), `FloatingPopover`, `FloatingPopoverKit`, `useTooltip`, `Tooltip`, `HoverPreviewList`, `BreadcrumbSelect`, `BreadcrumbDropdownBar`, `AdaptiveToolbar`, `AdaptiveToolbarKit`, `SwatchGridPicker`, `SwatchPreviewMatrix`, `InspectorSheet`, `FloatingInspectorSheet` |
| **5. Media, Timeline & Workbench (6)** | `MediaTransport`, `StepTimeline`, `MediaTransportDock`, `IdleAutoHideBar`, `IdleFullscreenPill`, `CornerSnapOrb`, `DraggableSnapOrb`, `ProgressRing`, `TaskProgressCard`, `BackgroundTaskMenu`, `CopySnippet`, `CopySnippetFlash`, `MaskedSecretInput`, `MaskedSecretManager` |
| **6. Deep AI Chat & Agents (23)** | `Composer`, `SlashMentionComposer`, `ModelEffortPicker`, `ThinkingMorph`, `GroundedAnswer`, `MessageBranchThread`, `VisionRegionAsk`, `VoiceOrbSession`, `ArtifactCanvas`, `ToolApprovalGate`, `AgentPlanChecklist`, `TerminalStreamCard`, `SubagentSwarmBoard`, `McpServerRoster`, `ContextBudgetMeter`, `AgentMemoryStore`, `ModelArenaCompare`, `RateLimitBanner`, `AudioWaveTrim`, `CodeDiffReveal`, `SkeletonMorph`, `RollingNumber`, `MetricRibbon` |
| **7. Tactile & Workspace (21)** | `StateButton`, `ScrubPanel`, `SlideConfirm`, `DynamicIsland`, `MorphCard`, `SplitCompare`, `OtpField`, `PassStrength`, `TimeSlotPicker`, `RadialDial`, `SwipeCard`, `SelectionToolbar`, `CommandPalette`, `ToastStack`, `DataGrid`, `TreeExplorer`, `ResizableSplit`, `FilterBar`, `DrawerSheet`, `TabsMorph`, `TransferList` |
| **8. Headless & Synth Core** | `JuiceProvider`, `useJuice`, `useJuiceAgentNode`, `useControllableState`, `useScrubDrag`, `useRovingFocus`, `playJuiceSound`, `JUICE_SOUND_CATALOG` (`tap`, `latch`, `pop`, `scrub`, `tick`, `paid`, `landed`, `deny`, `lift`, `drop`, `swipe`, `chime`) |

## 4. Dual-Driven State, Deterministic Frames & Agent Bridge

Every interactive block supports both **uncontrolled play** (`default*` props) and **controlled state** (`value` / `stage` / `mode` / `opened`).

- **Static Storyboard / Screenshot Mode**: Pass `<JuiceProvider animate={false}>` (sets `data-animate="off"` and disables all CSS transitions/animations so frames settle immediately).
- **Runtime Agent Bridge (`window.__juiceAgent`)**:
  - `window.__juiceAgent.snapshot()` — inspect live state of every mounted node with an `id`.
  - `window.__juiceAgent.query(typeOrId)` — filter mounted nodes by ID or component type.
  - `window.__juiceAgent.act(id, action, payload)` — drive any block deterministically (e.g., `act('tool-approval-gate', 'approve')`, `act('checkbox-group-kit', 'toggleParent')`, `act('media-transport-dock', 'nextStep')`).
- **Custom Theme Override**: Override `--fill-on`, `--fill-slab`, and `--juice-signal` on any container (or map `--jp-ink` / `--jp-surface` inside Joplo) and the entire tonal ramp recalibrates automatically.
