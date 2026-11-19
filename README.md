# Juice (`@juice-ui/react` & `@juice-ui/vue`)

**Juice** is a standalone, domain-agnostic, high-craft UI & micro-interaction system with **86 live blocks** and **182 exported primitives** across React and Vue 3:

1. **Concentric `color-mix` Craft & 3KB Web Audio Synth** *(inspired by [bencho.dev](https://bencho.dev/))* — Zero border noise. A 6-step tonal ramp derived from `--fill-on` and `--fill-slab` that automatically steps up in dark/solid fills, paired with `320px` card width, `20px → 14px → 10px` concentric geometry, and 12 zero-asset Web Audio procedural sounds (`tap`, `latch`, `pop`, `scrub`, `tick`, `paid`, `landed`, `deny`, `lift`, `drop`, `swipe`, `chime`).
2. **Full Radix Primitives + Base UI + Studio Workbench + Deep AI Agents** —
   - **Everyday Foundation, Radix & Base UI (30 blocks)**: Full WAI-ARIA keyboard roving, typeahead, 3-state indeterminate `CheckboxGroup`, compound `Field` / `Fieldset` / `Form`, `Autocomplete`, `NumberField` with `ScrubArea`, `ContextMenu`, `Menubar`, `NavigationMenu`, `ToggleGroup` + `Toolbar`, `AlertDialog`, `ScrollArea`, `AspectRatio`, `DualRangeSlider`, `Collapsible`, `Meter`, `Progress`, `PreviewCard`.
   - **Portal, Floating & Studio Primitives (14 blocks)**: Collision-aware `placeFloating` & `FloatingPopover` (respecting `document.fullscreenElement`), `HoverPreviewList`, `BreadcrumbDropdownBar`, width-collapsing `AdaptiveToolbar`, 2-column `SwatchPreviewMatrix` with hover preview & rollback, non-blocking `FloatingInspectorSheet`, inline-editable `DataGrid`, `TreeExplorer`, `ResizableSplit`, `DrawerSheet`.
   - **Media, Timeline & Workbench Primitives (6 blocks)**: `MediaTransportDock` (`StepTimeline`), `IdleFullscreenPill`, 4-corner magnetic `DraggableSnapOrb`, SVG `ProgressRing` + `BackgroundTaskMenu`, `CopySnippetFlash`, and `MaskedSecretManager`.
   - **Deep AI Chat & Agentic Workflows (23 blocks)** *(benchmarked against [aisdkagents.com](https://www.aisdkagents.com/ai-components) & [prompt-kit.com](https://www.prompt-kit.com))*: `SlashMentionComposer`, `ModelEffortPicker`, `ThinkingMorph` (`.j-status-dot` + `.j-text-shimmer`), `GroundedAnswer`, `MessageBranchThread`, `VisionRegionAsk`, `VoiceOrbSession`, `ArtifactCanvas`, `ToolApprovalGate` (HITL), `AgentPlanChecklist`, `TerminalStreamCard`, `SubagentSwarmBoard`, `McpServerRoster`, `ContextBudgetMeter`, `AgentMemoryStore`, `ModelArenaCompare`, `RateLimitBanner`.
3. **Headless Behaviors & Agent Bridge** *(inspired by [ui-sdk.dev](https://ui-sdk.dev/))* — Composable `useControllableState`, `useScrubDrag`, `useRovingFocus`, and a runtime `window.__juiceAgent` (`snapshot()`, `act()`, `query()`) so AI agents and host timeline players can inspect and drive every block deterministically, plus `<JuiceProvider animate={false}>` for instant Joplo storyboard frame capture.

![Architecture](./docs/architecture.svg)

## Workspace Structure

- `packages/juice` (`@juice-ui/react`): Core tokens (`styles.css`, `styles-ai.css`, `styles-foundation.css`, `styles-studio.css`), Web Audio procedural sound engine (`sound.ts`), headless behaviors & agent bridge (`behaviors.tsx`), and 86 blocks + reusable primitives.
- `packages/vue` (`@juice-ui/vue`): Native Vue 3 composition hooks (`provideJuice`, `useJuice`, `useJuiceAgentNode`, `useControllableState`) and components sharing the same CSS token ramp and `window.__juiceAgent` protocol.
- `apps/bench` (`@juice-ui/bench`): Live interactive workbench at `http://localhost:4320` for exploring all 86 blocks, auditioning procedural sounds, driving `act()` states, and copying `React | Vue 3 | Joplo` snippets.
- `skills/juice/SKILL.md`: Agent skill definition.

## Quickstart

```bash
pnpm install
pnpm dev        # Starts Juice Bench at http://localhost:4320
pnpm typecheck
pnpm test
pnpm build
```
