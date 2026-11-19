import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import {
  JUICE_SOUND_CATALOG,
  isJuiceSoundEnabled,
  setJuiceSoundEnabled,
} from '../src/sound.ts';
import * as primitives from '../src/primitives.ts';
import * as blocks from '../src/blocks.ts';

describe('@tokenroll/juice procedural sound & catalog', () => {
  it('defines 12 zero-asset procedural sounds with valid frequencies', () => {
    const names = Object.keys(JUICE_SOUND_CATALOG);
    expect(names.length).toBe(12);
    for (const spec of Object.values(JUICE_SOUND_CATALOG)) {
      expect(spec.layers.length).toBeGreaterThan(0);
      expect(spec.layers[0]!.hz).toBeGreaterThan(40);
    }
  });

  it('toggles global sound state cleanly', () => {
    expect(isJuiceSoundEnabled()).toBe(true);
    setJuiceSoundEnabled(false);
    expect(isJuiceSoundEnabled()).toBe(false);
    setJuiceSoundEnabled(true);
    expect(isJuiceSoundEnabled()).toBe(true);
  });
});

describe('@tokenroll/juice Option A clean subpaths & provider-optional fallback', () => {
  it('separates pure production primitives from *Kit showcase blocks', () => {
    expect(typeof primitives.Button).toBe('function');
    expect(typeof primitives.FloatingPopover).toBe('function');
    expect(primitives.CheckboxGroup).toBeDefined();
    expect(typeof primitives.CopySnippet).toBe('function');
    expect(typeof primitives.useJuice).toBe('function');

    const kitExportsInPrimitives = Object.keys(primitives).filter((k) => k.endsWith('Kit'));
    expect(kitExportsInPrimitives).toEqual([]);

    expect(typeof blocks.SlashMentionComposer).toBe('function');
    expect(typeof blocks.ToolApprovalGate).toBe('function');
    expect(typeof blocks.FloatingPopoverKit).toBe('function');
    expect(typeof blocks.MediaTransportDock).toBe('function');
  });

  it('renders primitives and updates reactive fallback state without <JuiceProvider>', () => {
    const fakeWin: { __juiceAgent?: { snapshot: () => Record<string, unknown> } } = {};
    vi.stubGlobal('window', fakeWin);
    try {
      let captured: ReturnType<typeof primitives.useJuice> | undefined;
      function StandaloneProbe() {
        captured = primitives.useJuice();
        return createElement(primitives.Button, { variant: 'primary' }, `Theme:${captured.theme}`);
      }

      const html1 = renderToStaticMarkup(createElement(StandaloneProbe));
      expect(html1).toContain('Theme:light');
      expect(fakeWin.__juiceAgent).toBeDefined();

      captured!.setTheme('dark');
      captured!.setFill('solid');
      captured!.setAnimate(false);
      const html2 = renderToStaticMarkup(createElement(StandaloneProbe));
      expect(html2).toContain('Theme:dark');
      expect(captured!.fill).toBe('solid');
      expect(captured!.animate).toBe(false);

      // Reset module fallback state
      captured!.setTheme('light');
      captured!.setFill('slab');
      captured!.setAnimate(true);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe('@tokenroll/juice CLI (bin/juice.mjs)', () => {
  const cliPath = resolve(import.meta.dirname, '../bin/juice.mjs');

  it('lists all 11 source modules as JSON', () => {
    const out = execFileSync(process.execPath, [cliPath, 'list', '--json'], { encoding: 'utf8' });
    const parsed = JSON.parse(out) as { modules: Array<{ id: string; exports: string[] }> };
    expect(parsed.modules.length).toBe(11);
    expect(parsed.modules.some((m) => m.id === 'ai-agents')).toBe(true);
    expect(parsed.modules.some((m) => m.id === 'portal-floating')).toBe(true);
    expect(parsed.modules.some((m) => m.id === 'composable')).toBe(true);
  });

  it('initializes core files and copies component source + transitive deps cleanly', () => {
    const workDir = mkdtempSync(join(tmpdir(), 'juice-cli-test-'));
    try {
      execFileSync(process.execPath, [cliPath, 'init', '--dir', 'src/ui/juice'], { cwd: workDir });
      expect(existsSync(join(workDir, 'src/ui/juice/juice.css'))).toBe(true);
      expect(existsSync(join(workDir, 'src/ui/juice/sound.ts'))).toBe(true);
      expect(existsSync(join(workDir, 'src/ui/juice/bridge.ts'))).toBe(true);
      expect(existsSync(join(workDir, 'src/ui/juice/behaviors.tsx'))).toBe(true);

      execFileSync(
        process.execPath,
        [cliPath, 'add', 'tool-approval-gate', 'floating-popover', '--dir', 'src/ui/juice'],
        { cwd: workDir },
      );
      expect(existsSync(join(workDir, 'src/ui/juice/components.tsx'))).toBe(true);
      expect(existsSync(join(workDir, 'src/ui/juice/components-ai-agents.tsx'))).toBe(true);
      expect(existsSync(join(workDir, 'src/ui/juice/components-portal-floating.tsx'))).toBe(true);

      // Verify relative .ts/.tsx extensions are stripped for universal consumer tsconfig compatibility
      const behaviorsCopy = readFileSync(join(workDir, 'src/ui/juice/behaviors.tsx'), 'utf8');
      expect(behaviorsCopy).toContain("from './sound'");
      expect(behaviorsCopy).not.toContain("from './sound.ts'");
    } finally {
      rmSync(workDir, { recursive: true, force: true });
    }
  });
});

describe('@tokenroll/juice v0.2.0 real-world gap fixes (#1-#17)', () => {
  const distDir = resolve(import.meta.dirname, '../dist');

  it('emits styles.css, tokens.css, and scoped.css without bare tag resets in tokens/scoped (#14)', () => {
    const tokensCss = readFileSync(join(distDir, 'tokens.css'), 'utf8');
    const scopedCss = readFileSync(join(distDir, 'scoped.css'), 'utf8');
    expect(tokensCss).toContain('--juice-w12');
    expect(tokensCss).not.toMatch(/^\s*button\s*\{/m);
    expect(scopedCss).toContain('.j-btn');
    expect(scopedCss).not.toMatch(/^\s*(html|body|button)\s*\{/m);
  });

  it('renders Textarea, Skeleton, Spinner, compact Progress, and HTML-passthrough primitives (#6, #9, #12, #13)', () => {
    const html = renderToStaticMarkup(
      createElement(
        'div',
        null,
        createElement(primitives.Button, {
          variant: 'primary',
          'data-testid': 'save-btn',
          'aria-pressed': true,
          sound: false,
        }, 'Save'),
        createElement(primitives.Switch, {
          checked: true,
          onChange: () => {},
          label: 'Follow director',
          'data-testid': 'director-switch',
        }),
        createElement(primitives.SegmentedControl, {
          value: null,
          onChange: () => {},
          options: [
            { value: 'a', label: 'A', 'data-testid': 'seg-a' },
            { value: 'b', label: 'B', 'data-testid': 'seg-b' },
          ],
        }),
        createElement(primitives.Textarea, { placeholder: 'Write notes', rows: 4, 'data-testid': 'notes' }),
        createElement(primitives.Skeleton, { width: 120, height: 16 }),
        createElement(primitives.Spinner, { size: 'sm', label: 'Loading' }),
        createElement(primitives.Progress, { value: 65, compact: true }),
      ),
    );
    expect(html).toContain('data-testid="save-btn"');
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain('data-testid="director-switch"');
    expect(html).toContain('Follow director');
    expect(html).toContain('data-testid="seg-a"');
    expect(html).toContain('<textarea');
    expect(html).toContain('data-testid="notes"');
    expect(html).toContain('j-skeleton');
    expect(html).toContain('j-spinner');
    expect(html).toContain('aria-valuenow="65"');
  });

  it('renders v0.2.0 studio & workbench primitives with custom labels, slots, and i18n (#1, #2, #7, #8, #10, #11)', () => {
    const html = renderToStaticMarkup(
      createElement(
        'div',
        null,
        createElement(primitives.CopySnippet, {
          code: 'npx @tokenroll/juice init',
          copyLabel: '复制',
          copiedLabel: '已复制',
        }),
        createElement(primitives.MaskedSecretField, {
          value: 'jpl_live_secret_1234',
          readOnly: true,
          revealLabel: '显示密钥',
          hideLabel: '隐藏密钥',
        }),
        createElement(primitives.MediaTransport, {
          playing: false,
          onTogglePlay: () => {},
          onRestart: () => {},
          onPrevious: () => {},
          onNext: () => {},
          labels: { play: '播放', pause: '暂停', restart: '重播' },
        }),
        createElement(primitives.StepTimeline, {
          steps: [
            { id: '0', label: '初始' },
            { id: '1', label: '展开' },
          ],
          activeStep: 0,
          onSelect: () => {},
          compact: true,
        }),
        createElement(primitives.SwatchGridPicker, {
          palettes: [{ id: 'paper', name: '暖纸', swatches: ['#F4F1EA', '#1E1E1E', '#FFD23F'] }],
          value: 'paper',
          onChange: () => {},
          renderPreview: (p) => createElement('span', { 'data-preview': p.id }, p.name),
        }),
      ),
    );
    expect(html).toContain('复制');
    expect(html).toContain('显示密钥');
    expect(html).toContain('播放');
    expect(html).toContain('初始');
    expect(html).toContain('data-preview="paper"');
  });

  it('renders composable SaaS primitives: Dialog, Sheet, DropdownMenu, Tabs, Accordion, Table, Avatar, OtpInput, Chart, Toast (#3, #4, #5, #15, #16, #17)', () => {
    const manager = primitives.createToastManager();
    const id = manager.add({ title: 'Saved', description: 'All changes synced', tone: 'ok' });
    expect(manager.getSnapshot().length).toBe(1);
    manager.dismiss(id);
    expect(manager.getSnapshot().length).toBe(0);

    const html = renderToStaticMarkup(
      createElement(
        'div',
        null,
        createElement(
          primitives.Tabs.Root,
          { defaultValue: 'overview' },
          createElement(
            primitives.Tabs.List,
            null,
            createElement(primitives.Tabs.Trigger, { value: 'overview' }, 'Overview'),
            createElement(primitives.Tabs.Trigger, { value: 'billing' }, 'Billing'),
          ),
          createElement(primitives.Tabs.Panel, { value: 'overview' }, 'Overview Panel'),
        ),
        createElement(
          primitives.Accordion.Root,
          { defaultValue: ['faq-1'] },
          createElement(
            primitives.Accordion.Item,
            { value: 'faq-1' },
            createElement(
              primitives.Accordion.Header,
              null,
              createElement(primitives.Accordion.Trigger, null, 'How does billing work?'),
            ),
            createElement(primitives.Accordion.Panel, null, 'Usage is metered monthly.'),
          ),
        ),
        createElement(
          primitives.Table.Root,
          null,
          createElement(
            primitives.Table.Header,
            null,
            createElement(primitives.Table.Row, null, createElement(primitives.Table.Head, null, 'Name')),
          ),
          createElement(
            primitives.Table.Body,
            null,
            createElement(primitives.Table.Row, null, createElement(primitives.Table.Cell, null, 'Juice UI')),
          ),
        ),
        createElement(
          primitives.Avatar.Root,
          null,
          createElement(primitives.Avatar.Fallback, null, 'DJ'),
        ),
        createElement(
          primitives.OtpInput.Root,
          { maxLength: 6, value: '12' },
          createElement(
            primitives.OtpInput.Group,
            null,
            createElement(primitives.OtpInput.Slot, { index: 0 }),
            createElement(primitives.OtpInput.Slot, { index: 1 }),
          ),
        ),
        createElement(primitives.ChartTooltipContent, {
          active: true,
          label: 'Nov',
          payload: [{ name: 'Shares', value: 42, color: '#1C5FB8' }],
        }),
      ),
    );
    expect(html).toContain('Overview Panel');
    expect(html).toContain('How does billing work?');
    expect(html).toContain('Juice UI');
    expect(html).toContain('DJ');
    expect(html).toContain('Shares');
    expect(html).toContain('42');
    expect(primitives.Dialog.Root).toBeTypeOf('function');
    expect(primitives.Sheet.Root).toBeTypeOf('function');
    expect(primitives.DropdownMenu.Root).toBeTypeOf('function');
    expect(primitives.ToastProvider).toBeTypeOf('function');
    expect(primitives.ToastViewport).toBeTypeOf('function');
  });
});
