---
name: juice
description: Build and compose tactile, high-craft React 18/19 and Vue 3 interfaces using @tokenroll/juice and @tokenroll/juice-vue — supporting clean subpaths (@tokenroll/juice/primitives & @tokenroll/juice/blocks), provider-optional zero-setup usage, shadcn-style CLI source copy (npx @tokenroll/juice add), concentric color-mix tokens, procedural Web Audio sounds, and window.__juiceAgent verification.
---

# Juice UI Skill (`@tokenroll/juice` & `@tokenroll/juice-vue`)

Use `@tokenroll/juice` (React 18/19) or `@tokenroll/juice-vue` (Vue 3) when building tactile, high-density product UIs, Radix/Base UI foundation forms, non-blocking floating portals, media/studio workbenches, or deep AI agent interfaces — with zero border bloat and zero generic AI-template noise.

## 1. Three Ways to Adopt Juice UI (Option A Hybrid Architecture)

Choose the integration path that fits the project:

### Track 1 · Direct npm Import (Clean Subpaths + Provider-Optional)
```bash
pnpm add @tokenroll/juice lucide-react
```
- **Pure production primitives** (`@tokenroll/juice/primitives`) — zero demo `*Kit` data, **no `<JuiceProvider>` required** (works out of the box with reactive module-level fallback + automatic `window.__juiceAgent` bridge):
  ```tsx
  import '@tokenroll/juice/styles.css';
  import { Button, FloatingPopover, CheckboxGroup } from '@tokenroll/juice/primitives';

  export function Toolbar() {
    return <Button variant="primary">Deploy</Button>;
  }
  ```
- **High-craft interactive & AI agent blocks** (`@tokenroll/juice/blocks`):
  ```tsx
  import { SlashMentionComposer, ToolApprovalGate, GroundedAnswer } from '@tokenroll/juice/blocks';
  ```
- **Optional `<JuiceProvider>`**: Wrap only when you want scoped Light/Dark or Slab/Solid theme switching or deterministic static frames (`<JuiceProvider animate={false}>`).
- **Zero-React Core** (`@tokenroll/juice/core`): `playJuiceSound`, `JUICE_SOUND_CATALOG`, `registerJuiceAgentNode`.
- **Vue 3** (`@tokenroll/juice-vue`): `pnpm add @tokenroll/juice-vue` → `import '@tokenroll/juice-vue/styles.css'`.

### Track 2 · CLI Source Copy (shadcn-style 100% Local Source Ownership)
Copy component source + transitive dependencies + `juice.css` straight into the project so you or an AI agent can customize every pixel locally:
```bash
npx @tokenroll/juice list
npx @tokenroll/juice init --dir src/components/juice
npx @tokenroll/juice add tool-approval-gate slash-mention-composer floating-popover
```

### Track 3 · AI Agent Skill
```bash
npx skills add TokenRollAI/juice
```

## 2. Design Invariants & Concentric Tokens

1. **Zero-Border Tonal Hierarchy**: Import `@tokenroll/juice/styles.css` (or local `juice.css`) once. Never stack `1px solid` borders or nested shadows. Every surface derives from `--fill-on` (ink) and `--fill-slab` (card) via a 6-step `color-mix(in srgb, ...)` ramp:
   - Surfaces: `--juice-w4`, `--juice-w6`, `--juice-w12`, `--juice-w20`
   - Ink hierarchy: `--juice-faint`, `--juice-mute`, `--juice-soft`, `--fill-on`
   - Dark & Solid step-up: `[data-theme="dark"]` and `[data-tone="solid"]` automatically step up tonal stops (`w6 -> 8.5%`, `w12 -> 17%`, `w20 -> 27%`) so contrast never collapses.
   - Semantic fills: Use `--juice-ok`, `--juice-warn`, `--juice-danger`, `--juice-signal` with tonal `color-mix(in srgb, var(--juice-ok) 16%, var(--fill-slab))` or `--juice-on-signal` / `--juice-on-ok`. Never hardcode `#fff` / `#000` on cards or controls.
2. **Concentric Geometry**: Outer `.j-slab` uses `border-radius: var(--juice-r-outer)` (`20px`) and `padding: 6px`; direct inner panels use `var(--juice-r-inner)` (`14px` = `20 - 6`); inner controls/buttons/inputs use `var(--juice-r-control)` (`10px`). Showcase cards default to `width: 320px; max-width: 100%;`.
3. **Typography & Tabular Numerals**: Card headers use `13px`, `font-weight: 600`, `letter-spacing: -0.01em`. Always apply `font-variant-numeric: tabular-nums` or `<RollingNumber />` on dynamic metrics.
4. **Zero AI Slop**: Never use decorative `<Sparkles />`, neon gradients, or double-bordered wrapper cards. Use `.j-status-dot` + `.j-text-shimmer` for streaming/thinking states.
5. **Motion & Capsule Radius Safety**: Never transition `border-radius` from `999px` with overshooting `--juice-pop`; use exact half-height radii with `--juice-out`. Never use `--juice-pop` on bottom sheets (`DrawerSheet`).

## 3. Clean Subpath & Module Catalog (86 Blocks · 182 Exports)

| Subpath / CLI Module | Key Primitives & Blocks |
| :--- | :--- |
| **`/primitives` · `foundation-forms`** | `Button`, `IconButton`, `TextField`, `Select`, `RadioCard`, `NumberField`, `Slider` |
| **`/primitives` · `foundation-nav`** | `Breadcrumbs`, `Pagination`, `Alert` |
| **`/primitives` · `radix-primitives`** | `Separator`, `AspectRatio`, `Label`, `Collapsible`, `ContextMenu`, `Menubar`, `NavigationMenu`, `Toggle`, `Toolbar`, `ToolbarButton`, `ToggleGroup`, `ToggleGroupItem`, `AlertDialog`, `ScrollArea`, `DualRangeSlider`, `RangeSlider` |
| **`/primitives` · `base-ui`** | `Form`, `Fieldset`, `Field`, `Meter`, `Progress`, `Autocomplete`, `CheckboxGroup` (3-state), `ScrubNumberField`, `PreviewCard` |
| **`/primitives` · `portal-floating`** | `placeFloating` (collision-aware + fullscreen-safe), `FloatingPopover`, `useTooltip`, `Tooltip`, `BreadcrumbSelect`, `AdaptiveToolbar`, `SwatchGridPicker`, `InspectorSheet` |
| **`/primitives` · `media-workbench`** | `ProgressRing`, `CopySnippet`, `MediaTransport`, `StepTimeline`, `IdleAutoHideBar`, `CornerSnapOrb`, `TaskProgressCard`, `MaskedSecretInput` |
| **`/blocks` · `ai-chat` & `ai-agents`** | `Composer`, `SlashMentionComposer`, `ModelEffortPicker`, `ThinkingMorph`, `GroundedAnswer`, `MessageBranchThread`, `VisionRegionAsk`, `VoiceOrbSession`, `ArtifactCanvas`, `ToolApprovalGate`, `AgentPlanChecklist`, `TerminalStreamCard`, `SubagentSwarmBoard`, `McpServerRoster`, `ContextBudgetMeter`, `AgentMemoryStore`, `ModelArenaCompare`, `RateLimitBanner` |
| **`/blocks` · `tactile` & `extended`** | `StateButton`, `ScrubPanel`, `SlideConfirm`, `DynamicIsland`, `MorphCard`, `MetricRibbon`, `RollingNumber`, `CommandPalette`, `ToastStack`, `SplitCompare`, `OtpField`, `PassStrength`, `TimeSlotPicker`, `RadialDial`, `SwipeCard`, `SelectionToolbar`, `DataGrid`, `TreeExplorer`, `ResizableSplit`, `FilterBar`, `DrawerSheet`, `TabsMorph`, `AudioWaveTrim`, `CodeDiffReveal`, `SkeletonMorph`, `TransferList` |
| **`/core` · `sound` & `bridge`** | `playJuiceSound`, `JUICE_SOUND_CATALOG` (`tap`, `latch`, `pop`, `scrub`, `tick`, `paid`, `landed`, `deny`, `lift`, `drop`, `swipe`, `chime`), `registerJuiceAgentNode`, `ensureJuiceAgentBridge` |

## 4. Dual-Driven State, Deterministic Frames & Agent Bridge

Every interactive block supports both **uncontrolled play** (`default*` props) and **controlled state** (`value` / `stage` / `mode` / `opened`).

- **Static Storyboard / Screenshot Mode**: `<JuiceProvider animate={false}>` disables all CSS transitions/animations so frames settle immediately.
- **Runtime Agent Bridge (`window.__juiceAgent`)** — auto-mounted even without `<JuiceProvider>`:
  - `window.__juiceAgent.snapshot()` — live state of every mounted node with an `id`.
  - `window.__juiceAgent.query(typeOrId)` — filter mounted nodes by ID or type.
  - `window.__juiceAgent.act(id, action, payload)` — drive any block deterministically.
- **Custom Theme Override**: Override `--fill-on`, `--fill-slab`, and `--juice-signal` on any container (or map `--jp-ink` / `--jp-surface` in Joplo) and the entire 6-step tonal ramp adapts automatically.
