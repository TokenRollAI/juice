# @tokenroll/juice

Tactile, behavior-complete React UI components, Radix & Base UI primitives, portal/studio workbenches, deep AI agent workflows, concentric `color-mix` tokens, and a 3KB zero-asset Web Audio procedural sound synth.

- **Website & Live 86-Block Playground**: https://juice.tokenroll.ai
- **Repository**: https://github.com/TokenRollAI/juice
- **Agent Skill**: `npx skills add TokenRollAI/juice`

## Option 1 · Direct npm Import (No `<JuiceProvider>` Required)

```bash
pnpm add @tokenroll/juice lucide-react
```

```tsx
import '@tokenroll/juice/styles.css';
import { Button, FloatingPopover } from '@tokenroll/juice/primitives';
import { SlashMentionComposer, ToolApprovalGate } from '@tokenroll/juice/blocks';

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

## Option 2 · CLI Source Copy (shadcn-style)

```bash
npx @tokenroll/juice list
npx @tokenroll/juice init --dir src/components/juice
npx @tokenroll/juice add tool-approval-gate floating-popover
```
