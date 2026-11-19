# Juice (`@juice-ui/react`)

**Juice** is a standalone, tactile React UI & micro-interaction kit built around three ideas:

1. **Concentric `color-mix` Craft & 3KB Web Audio Synth** *(inspired by [bencho.dev](https://bencho.dev/))* — Zero border noise. A 6-step tonal ramp derived from `--fill-on` and `--fill-slab` that automatically steps up in dark/solid fills, paired with `20px → 14px → 10px` concentric geometry and 12 zero-asset Web Audio procedural sounds (`tap`, `latch`, `pop`, `scrub`, `tick`, `paid`, `landed`, `deny`, `lift`, `drop`, `swipe`, `chime`).
2. **Headless Behaviors & Agent Bridge** *(inspired by [ui-sdk.dev](https://ui-sdk.dev/))* — Composable `useControllableState`, `useScrubDrag`, `useRovingFocus`, and a runtime `window.__juiceAgent` (`snapshot()`, `act()`, `query()`) so AI agents and host timeline players can inspect and drive every block deterministically.
3. **Demo-to-Production 1:1 Compatibility (Joplo Ready)** — Every block works standalone in production React apps AND supports `<JuiceProvider animate={false}>` for instant, deterministic storyboard/screenshot frames when plugged into Joplo.

![Architecture](./docs/architecture.svg)

## Workspace Structure

- `packages/juice` (`@juice-ui/react`): Core tokens (`styles.css`), Web Audio procedural sound engine (`sound.ts`), headless behaviors & agent bridge (`behaviors.ts`), and 12 flagship blocks (`components.tsx`).
- `apps/bench` (`@juice-ui/bench`): Live interactive workbench for exploring, scrubbing, auditioning procedural sounds, driving `act()` states, and copying React / Joplo snippets.
- `skills/juice/SKILL.md`: Agent skill definition.

## Quickstart

```bash
pnpm install
pnpm dev      # Starts Juice Bench at http://localhost:4320
pnpm typecheck
```
