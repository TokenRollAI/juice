/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import * as primitives from '../primitives.ts';
import * as rootEntry from '../index.ts';

describe('@tokenroll/juice v0.4.0 prompt-kit primitives (#23-#26)', () => {
  const distDir = resolve(import.meta.dirname, '../../dist');

  it('exports every v0.4.0 primitive from both @tokenroll/juice/primitives and @tokenroll/juice without motion/react', () => {
    const expected = [
      'ChatContainerRoot',
      'ChatContainerContent',
      'ChatContainerScrollAnchor',
      'ScrollToBottomButton',
      'useChatContainer',
      'ChatMessage',
      'MessageAvatar',
      'MessageContent',
      'MessageActions',
      'MessageAction',
      'FeedbackBar',
      'ChainOfThought',
      'ChainOfThoughtStep',
      'ChainOfThoughtTrigger',
      'ChainOfThoughtContent',
      'ChainOfThoughtItem',
      'ToolCallCard',
      'ThinkingBar',
      'PromptSuggestion',
      'CodeBlock',
      'CodeBlockHeader',
      'CodeBlockCode',
      'SourceChip',
      'SourceList',
    ] as const;

    for (const key of expected) {
      expect(primitives[key], `primitives.${key} should be defined`).toBeDefined();
      expect(rootEntry[key], `index.${key} should equal primitives.${key}`).toBe(primitives[key]);
    }

    const aiKitDist = readFileSync(join(distDir, 'components-ai-kit.js'), 'utf8');
    expect(aiKitDist.startsWith('"use client";')).toBe(true);
    expect(aiKitDist).not.toContain('motion/react');

    const primitivesDist = readFileSync(join(distDir, 'primitives.js'), 'utf8');
    expect(primitivesDist.startsWith('"use client";')).toBe(true);

    for (const file of ['core.js', 'sound.js', 'bridge.js']) {
      const src = readFileSync(join(distDir, file), 'utf8');
      expect(src).not.toContain('use client');
    }
  });

  it('bundles all v0.4.0 component styles into styles.css and layered.css @layer components', () => {
    const stylesCss = readFileSync(join(distDir, 'styles.css'), 'utf8');
    const layeredCss = readFileSync(join(distDir, 'layered.css'), 'utf8');
    const layerIdx = layeredCss.indexOf('@layer components {');
    expect(layerIdx).toBeGreaterThan(0);
    const layeredBody = layeredCss.slice(layerIdx);

    const selectors = [
      '.j-chat-container',
      '.j-chat-content',
      '.j-scroll-bottom',
      '.j-chat-msg',
      '.j-chat-bubble',
      '.j-msg-avatar',
      '.j-msg-actions',
      '.j-msg-action',
      '.j-cot',
      '.j-cot-rail',
      '.j-tool-card',
      '.j-thinking-bar',
      '.j-prompt-suggestion',
      '.j-prompt-suggestion--row',
      '.j-code-block',
      '.j-code-block-head',
      '.j-code-block-body',
      '.j-source-chip',
      '.j-source-list',
    ];

    for (const sel of selectors) {
      expect(stylesCss, `styles.css should contain ${sel}`).toContain(sel);
      expect(layeredBody, `layered.css @layer components should contain ${sel}`).toContain(sel);
    }
    expect(layeredBody).toContain('@media (hover: none)');
  });

  it('renders ChatContainerRoot, Content, ScrollAnchor, ScrollToBottomButton, and useChatContainer (#23)', () => {
    let outsideCtx: ReturnType<typeof primitives.useChatContainer> = null;
    let insideCtx: ReturnType<typeof primitives.useChatContainer> = null;

    function OutsideProbe() {
      outsideCtx = primitives.useChatContainer();
      return null;
    }

    function InsideProbe() {
      insideCtx = primitives.useChatContainer();
      return null;
    }

    const html = renderToStaticMarkup(
      <div>
        <OutsideProbe />
        <primitives.ChatContainerRoot stickToBottom threshold={64} autoScrollSignal={1}>
          <InsideProbe />
          <primitives.ChatContainerContent>
            <p>Hello stream</p>
            <primitives.ChatContainerScrollAnchor />
          </primitives.ChatContainerContent>
          <primitives.ScrollToBottomButton label="Jump to latest" />
        </primitives.ChatContainerRoot>
        <primitives.ScrollToBottomButton visible label="Latest messages" onClick={() => {}}>
          New
        </primitives.ScrollToBottomButton>
      </div>,
    );

    expect(outsideCtx).toBeNull();
    expect(insideCtx).not.toBeNull();
    expect(insideCtx!.isAtBottom).toBe(true);
    expect(typeof insideCtx!.scrollToBottom).toBe('function');
    expect(insideCtx!.containerRef).toBeDefined();

    expect(html).toContain('data-chat-container=""');
    expect(html).toContain('data-chat-content=""');
    expect(html).toContain('data-chat-scroll-anchor=""');
    expect(html).toContain('aria-label="Jump to latest"');
    expect(html).toContain('data-visible="false"');
    expect(html).toContain('tabindex="-1"');
    expect(html).toContain('aria-label="Latest messages"');
    expect(html).toContain('data-visible="true"');
    expect(html).toContain('tabindex="0"');
    expect(html).toContain('j-scroll-bottom--pill');
  });

  it('renders ChatMessage, MessageAvatar, MessageContent, MessageActions, MessageAction, and FeedbackBar (#24)', () => {
    const html = renderToStaticMarkup(
      <div>
        <primitives.ChatMessage role="user">
          <primitives.MessageContent>Refactor the parser</primitives.MessageContent>
          <primitives.MessageAvatar fallback="DJ" />
        </primitives.ChatMessage>
        <primitives.ChatMessage role="assistant">
          <primitives.MessageAvatar src="/bot.png" alt="Juice AI" />
          <div>
            <primitives.MessageContent>Here is the updated parser.</primitives.MessageContent>
            <primitives.FeedbackBar
              onCopy={() => {}}
              copied
              onRegenerate={() => {}}
              feedback="up"
              onFeedback={() => {}}
              copyLabel="复制"
              copiedLabel="已复制"
              regenerateLabel="重新生成"
              helpfulLabel="有帮助"
              unhelpfulLabel="没帮助"
              reveal="always"
              extra={
                <primitives.MessageAction label="Share" active={false}>
                  S
                </primitives.MessageAction>
              }
            />
          </div>
        </primitives.ChatMessage>
      </div>,
    );

    expect(html).toContain('<article data-role="user" data-variant="bubble" class="j-chat-msg"');
    expect(html).toContain('class="j-chat-msg-content j-chat-bubble"');
    expect(html).toContain('DJ');
    expect(html).toContain('<article data-role="assistant" data-variant="flat" class="j-chat-msg"');
    expect(html).toContain('<img src="/bot.png" alt="Juice AI"');
    expect(html).toContain('class="j-chat-msg-content"');
    expect(html).toContain('data-reveal="always"');
    expect(html).toContain('aria-label="已复制"');
    expect(html).toContain('title="已复制"');
    expect(html).toContain('aria-label="重新生成"');
    expect(html).toContain('aria-label="有帮助"');
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain('aria-label="没帮助"');
    expect(html).toContain('aria-label="Share"');
    expect(html).toContain('aria-pressed="false"');
  });

  it('renders ChainOfThought, ToolCallCard, and ThinkingBar (#25)', () => {
    const html = renderToStaticMarkup(
      <div>
        <primitives.ChainOfThought>
          <primitives.ChainOfThoughtStep status="done" defaultOpen>
            <primitives.ChainOfThoughtTrigger meta="420ms">Inspected workspace</primitives.ChainOfThoughtTrigger>
            <primitives.ChainOfThoughtContent>
              <primitives.ChainOfThoughtItem>Read src/primitives.ts</primitives.ChainOfThoughtItem>
            </primitives.ChainOfThoughtContent>
          </primitives.ChainOfThoughtStep>
          <primitives.ChainOfThoughtStep status="running">
            <primitives.ChainOfThoughtTrigger collapsible={false}>Streaming patch</primitives.ChainOfThoughtTrigger>
          </primitives.ChainOfThoughtStep>
        </primitives.ChainOfThought>

        <primitives.ToolCallCard
          name="read_file"
          title="Read File"
          status="completed"
          summary="packages/juice/src/index.ts"
          duration="12ms"
          input='{"path":"index.ts"}'
          output='export * from "./primitives.ts";'
          defaultOpen
          actions={<span>Open</span>}
        />

        <primitives.ToolCallCard
          name="run_tests"
          status="error"
          error="Assertion failed"
          defaultOpen
        />

        <primitives.ThinkingBar
          label="Reasoning through edge cases"
          detail="Step 2 of 4"
          active
          onExpand={() => {}}
          onStop={() => {}}
          stopLabel="停止"
        />
      </div>,
    );

    expect(html).toContain('class="j-cot"');
    expect(html).toContain('class="j-cot-rail"');
    expect(html).toContain('data-status="done"');
    expect(html).toContain('data-state="open"');
    expect(html).toContain('420ms');
    expect(html).toContain('Read src/primitives.ts');
    expect(html).toContain('j-cot-item');
    expect(html).toContain('data-status="running"');
    expect(html).toContain('j-text-shimmer');
    expect(html).toContain('data-tool="read_file"');
    expect(html).toContain('Read File');
    expect(html).toContain('12ms');
    expect(html).toContain('Input');
    expect(html).toContain('Output');
    expect(html).toContain('Assertion failed');
    expect(html).toContain('j-thinking-bar');
    expect(html).toContain('Reasoning through edge cases');
    expect(html).toContain('Step 2 of 4');
    expect(html).toContain('aria-label="停止"');
  });

  it('renders PromptSuggestion (with highlight), CodeBlock*, SourceChip (with asChild), and SourceList (#26)', () => {
    const html = renderToStaticMarkup(
      <div>
        <primitives.PromptSuggestion variant="pill" highlight="C++">
          Explain C++ move semantics
        </primitives.PromptSuggestion>
        <primitives.PromptSuggestion variant="row" description="Generate unit tests for hooks">
          Write Vitest suite
        </primitives.PromptSuggestion>
        <primitives.CodeBlock>
          <primitives.CodeBlockHeader
            filename="chat.tsx"
            language="tsx"
            code={'const x = 1;\nconst y = 2;'}
            copyLabel="Copy code"
          />
          <primitives.CodeBlockCode code={'const x = 1;\nconst y = 2;'} showLineNumbers />
        </primitives.CodeBlock>
        <primitives.SourceList>
          <primitives.SourceChip
            href="https://juice.tokenroll.ai"
            target="_blank"
            label="Juice Docs"
            meta="v0.4"
          />
          <primitives.SourceChip asChild>
            <button type="button">Local Note</button>
          </primitives.SourceChip>
        </primitives.SourceList>
      </div>,
    );

    expect(html).toContain('class="j-prompt-suggestion"');
    expect(html).toContain('<mark class="j-prompt-suggestion-mark">C++</mark>');
    expect(html).toContain('j-prompt-suggestion--row');
    expect(html).toContain('Generate unit tests for hooks');
    expect(html).toContain('j-code-block');
    expect(html).toContain('chat.tsx');
    expect(html).toContain('tsx');
    expect(html).toContain('aria-label="Copy code"');
    expect(html).toContain('j-code-line-num');
    expect(html).toContain('const x = 1;');
    expect(html).toContain('class="j-source-list"');
    expect(html).toContain('role="list"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain('Juice Docs');
    expect(html).toContain('v0.4');
    expect(html).toContain('<button type="button" class="j-source-chip">Local Note</button>');
  });
});
