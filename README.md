<p align="left">
  <img src="./docs/logo.svg" width="44" height="44" alt="Juice UI Logo" />
</p>

# Juice UI (`@tokenroll/juice` & `@tokenroll/juice-vue`)

**Juice UI** is a standalone, domain-agnostic, high-craft UI & micro-interaction system by **TokenRollAI** with **86 live blocks**, **182 exported primitives**, concentric `color-mix` tokens, and a 3KB zero-asset Web Audio synth across React 18/19 and Vue 3.

- **Official Website & Live 86-Block Playground**: https://juice.tokenroll.ai
- **React Package**: `@tokenroll/juice` (`packages/juice`)
- **Vue 3 Package**: `@tokenroll/juice-vue` (`packages/vue`)
- **CLI Registry**: `npx @tokenroll/juice init` / `npx @tokenroll/juice add <name>`
- **AI Agent Skill**: `npx skills add TokenRollAI/juice` (`skills/juice/SKILL.md`)

## Three Ways to Use Juice UI (Hybrid Architecture)

### 1. Direct npm Import (Clean Subpaths + No `<JuiceProvider>` Required)
```bash
pnpm add @tokenroll/juice lucide-react
```

```tsx
import '@tokenroll/juice/styles.css';
import { Button, FloatingPopover } from '@tokenroll/juice/primitives';
import { ToolApprovalGate, SlashMentionComposer } from '@tokenroll/juice/blocks';

// Works immediately without wrapping in <JuiceProvider>!
export function App() {
  return (
    <>
      <Button variant="primary">Deploy</Button>
      <ToolApprovalGate id="shell-gate" />
      <SlashMentionComposer id="agent-input" />
    </>
  );
}
```

> Wrap with `<JuiceProvider defaultTheme="dark" defaultFill="solid" animate={false}>` only when you need scoped theme switching or deterministic 0ms storyboard frames.

Subpath exports:
- `@tokenroll/juice/primitives` — 100% pure production primitives (`Button`, `TextField`, `Select`, `FloatingPopover`, `ScrollArea`, `CheckboxGroup`, `CopySnippet`, hooks & sound synth), zero demo `*Kit` fixtures.
- `@tokenroll/juice/blocks` — All 86 interactive & AI agent blocks (`SlashMentionComposer`, `ToolApprovalGate`, `GroundedAnswer`, `MediaTransportDock`, etc.).
- `@tokenroll/juice/core` — Framework-agnostic Web Audio synth + `window.__juiceAgent` bridge (zero React).
- `@tokenroll/juice/styles.css` — Single bundled ~56KB concentric `color-mix` stylesheet.

### 2. CLI Source Copy (shadcn-style Full Local Ownership)
Copy component source + transitive dependencies + `juice.css` directly into your project:
```bash
npx @tokenroll/juice list
npx @tokenroll/juice init --dir src/components/juice
npx @tokenroll/juice add tool-approval-gate slash-mention-composer floating-popover
```

### 3. Vue 3 & AI Agent Skill
```bash
pnpm add @tokenroll/juice-vue
npx skills add TokenRollAI/juice
```

![Architecture](./docs/architecture.svg)

## Workspace Structure

- `packages/juice` (`@tokenroll/juice`): Core CSS tokens, Web Audio synth, provider-optional behaviors & agent bridge, clean subpaths (`/primitives`, `/blocks`, `/core`), and built-in zero-dependency CLI (`bin/juice.mjs`).
- `packages/vue` (`@tokenroll/juice-vue`): Native Vue 3 composition hooks and components sharing the same token ramp and `window.__juiceAgent` protocol.
- `apps/bench` (`@tokenroll/juice-site`): Official Juice UI Website, Documentation, API Matrix, Tokens/Sound Lab & 86-Block Playground — built 100% with Juice UI components.
- `skills/juice/SKILL.md`: Agent skill definition.

## Local Development

```bash
pnpm install
pnpm dev            # Official website & Playground at http://localhost:4320
pnpm build          # Build @tokenroll/juice, @tokenroll/juice-vue, and website
pnpm typecheck
pnpm test
```

## License

MIT © TokenRollAI
