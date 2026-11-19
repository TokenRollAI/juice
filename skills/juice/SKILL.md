---
name: juice
description: Build and compose tactile, modern React UI interfaces, micro-interaction blocks, high-density workspaces, and AI agent flows using @juice-ui/react, concentric color-mix tokens, headless behaviors, and procedural Web Audio sounds.
---

# Juice UI Skill (`@juice-ui/react`)

Use `@juice-ui/react` when building high-craft product interfaces, tactile micro-interactions, operator workspaces, or demo-ready application screens without border bloat or generic AI-template noise.

## 1. Design Rules & Concentric Tokens

- **Zero-Border Tonal Hierarchy**: Import `@juice-ui/react/styles.css`. Never stack 1px borders or nested shadows. All surfaces derive from `--fill-on` (ink) and `--fill-slab` (card) via the 6-step `color-mix` ramp:
  - `--juice-w4`, `--juice-w6`, `--juice-w12`, `--juice-w20` (surfaces & interactive fills)
  - `--juice-faint`, `--juice-mute`, `--juice-soft` (secondary typography & ticks)
- **Concentric Geometry**: Outer card `.j-slab` uses `border-radius: 20px` and `padding: 6px`; direct inner rows use `border-radius: 14px` (`20 - 6 = 14`); inner controls use `10px`.
- **Tabular Numerals**: Wrap animated metrics or counters in `<RollingNumber value={...} prefix="$" />` so digits never jitter horizontally.

## 2. Complete Component Catalog (28 Blocks + 4 Primitives)

| Category | Components |
| :--- | :--- |
| **Primitives** | `Kbd`, `Badge`, `SegmentedControl`, `Switch`, `RollingNumber` |
| **Press & State Morph** | `StateButton` (`ConfirmSend`), `DynamicIsland`, `MorphCard`, `TimeSlotPicker` (`StandingCalendar`), `SwipeCard` (`SwipeActions`), `SelectionToolbar` (`FormatBar`) |
| **Drag & Direct Manipulation** | `ScrubPanel` (`PathPanel`), `SlideConfirm` (`WakeSlider`), `SplitCompare`, `RadialDial` (`ContextGauge`) |
| **Hover & Type** | `MetricRibbon` (`IncomeFlow`), `ToastStack`, `CommandPalette`, `OtpField` (`OneTimeCode`), `PassStrength` (`PassReveal`) |
| **High-Density Workspace** | `DataGrid` (`InlineDataGrid`), `TreeExplorer`, `ResizableSplit`, `FilterBar`, `DrawerSheet` (`VaulSheet`), `TabsMorph`, `TransferList` (`SourceTransfer`) |
| **AI & Media Narrative** | `Composer` (`AiComposer`), `ThinkingMorph`, `AudioWaveTrim` (`WaveTrim`), `CodeDiffReveal` (`CodePatchMorph`), `SkeletonMorph` |

## 3. Dual-Driven State & Agent/Joplo Bridge

Every Juice block supports both **uncontrolled audience play** (`default*` props) and **controlled timeline/state play** (`value` / `stage` / `mode` / `opened` props).

- **Deterministic Frame Mode (for Joplo Storyboards & Screenshots)**: Pass `<JuiceProvider animate={false}>` to disable spring transitions so every component settles at its target steady state immediately.
- **Runtime Agent Bridge (`window.__juiceAgent`)**:
  - `window.__juiceAgent.snapshot()` returns the live state of every mounted component with an `id`.
  - `window.__juiceAgent.act(id, action, payload)` drives any component programmatically (e.g., `act('confirm-send', 'press')`, `act('data-grid', 'editSecondRow')`, `act('code-diff-reveal', 'apply')`).
