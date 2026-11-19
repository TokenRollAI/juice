# @tokenroll/juice

Tactile, behavior-complete React UI components, Radix & Base UI primitives, portal/studio workbenches, deep AI agent components, concentric `color-mix` tokens, and a 3KB zero-asset Web Audio procedural sound synth.

- **Website & Interactive Playground**: https://juice.tokenroll.ai
- **Repository**: https://github.com/TokenRollAI/juice
- **Agent Skill**: `npx skills add TokenRollAI/juice`

## Install

```bash
pnpm add @tokenroll/juice lucide-react
```

## Quickstart

```tsx
import '@tokenroll/juice/styles.css';
import { JuiceProvider, StateButton, SlashMentionComposer } from '@tokenroll/juice';

export function App() {
  return (
    <JuiceProvider defaultTheme="light" defaultFill="slab" defaultSound={true}>
      <StateButton id="send-action" amount={420} />
      <SlashMentionComposer id="agent-input" />
    </JuiceProvider>
  );
}
```
