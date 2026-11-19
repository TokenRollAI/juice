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

  it('defaults global sound to opt-in (false) and toggles cleanly (#18)', () => {
    expect(isJuiceSoundEnabled()).toBe(false);
    setJuiceSoundEnabled(true);
    expect(isJuiceSoundEnabled()).toBe(true);
    setJuiceSoundEnabled(false);
    expect(isJuiceSoundEnabled()).toBe(false);
  });
});

describe('@tokenroll/juice Option A clean subpaths & provider-optional fallback', () => {
  it('separates pure production primitives from *Kit showcase blocks', () => {
    expect(primitives.Button).toBeDefined();
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

  it('lists all 12 source modules as JSON including workbench', () => {
    const out = execFileSync(process.execPath, [cliPath, 'list', '--json'], { encoding: 'utf8' });
    const parsed = JSON.parse(out) as { modules: Array<{ id: string; exports: string[] }> };
    expect(parsed.modules.length).toBe(12);
    expect(parsed.modules.some((m) => m.id === 'ai-agents')).toBe(true);
    expect(parsed.modules.some((m) => m.id === 'portal-floating')).toBe(true);
    expect(parsed.modules.some((m) => m.id === 'composable')).toBe(true);
    expect(parsed.modules.some((m) => m.id === 'workbench')).toBe(true);
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

describe('@tokenroll/juice v0.3.0 Studio adoption primitives (#18-#22)', () => {
  const distDir = resolve(import.meta.dirname, '../dist');

  it('emits "use client" on client entrypoints/modules, keeps core framework-agnostic, drops motion from Button, and emits layered.css (#18)', () => {
    for (const file of ['index.js', 'primitives.js', 'blocks.js', 'behaviors.js', 'components.js', 'components-composable.js', 'components-foundation-forms.js', 'components-workbench.js']) {
      const src = readFileSync(join(distDir, file), 'utf8');
      expect(src.startsWith('"use client";'), `${file} should start with "use client";`).toBe(true);
    }
    for (const file of ['core.js', 'sound.js', 'bridge.js']) {
      const src = readFileSync(join(distDir, file), 'utf8');
      expect(src).not.toContain('use client');
    }

    const formsDist = readFileSync(join(distDir, 'components-foundation-forms.js'), 'utf8');
    expect(formsDist).not.toContain('motion/react');

    const layeredCss = readFileSync(join(distDir, 'layered.css'), 'utf8');
    const layerIdx = layeredCss.indexOf('@layer components {');
    expect(layerIdx).toBeGreaterThan(0);
    expect(layeredCss.slice(0, layerIdx)).toContain('--juice-w12');
    expect(layeredCss.slice(layerIdx)).toContain('.j-btn');
    expect(layeredCss.slice(layerIdx)).toContain('.j-dialog-content');
    expect(layeredCss).not.toMatch(/^\s*(html|body|button)\s*\{/m);

    // JuiceProvider defaults sound to false unless defaultSound is opted-in
    let silentSound = true;
    let optedInSound = false;
    function Probe({ onCapture }: { onCapture: (sound: boolean) => void }) {
      onCapture(primitives.useJuice().sound);
      return null;
    }
    renderToStaticMarkup(
      createElement(primitives.JuiceProvider, null, createElement(Probe, { onCapture: (s) => { silentSound = s; } })),
    );
    renderToStaticMarkup(
      createElement(primitives.JuiceProvider, { defaultSound: true }, createElement(Probe, { onCapture: (s) => { optedInSound = s; } })),
    );
    expect(silentSound).toBe(false);
    expect(optedInSound).toBe(true);
    setJuiceSoundEnabled(false);
  });

  it('supports asChild/render composition, Button link/icon sizes, DropdownMenu items, ContextMenu slots, Sheet/Dialog parity & OWN_ESCAPE (#19)', () => {
    const html = renderToStaticMarkup(
      createElement(
        'div',
        null,
        createElement(
          primitives.Button,
          { asChild: true, variant: 'link', size: 'xs' },
          createElement('a', { href: '/docs' }, 'Docs'),
        ),
        createElement(primitives.Button, { size: 'icon-sm', 'aria-label': 'Close' }, '×'),
        createElement(primitives.IconButton, { label: 'Settings', size: 'sm' }, '⚙'),
        createElement(
          primitives.Tabs.Root,
          { defaultValue: 'a' },
          createElement(
            primitives.Tabs.List,
            null,
            createElement(
              primitives.Tabs.Trigger,
              { value: 'a', asChild: true },
              createElement('a', { href: '#a' }, 'Tab A'),
            ),
          ),
        ),
      ),
    );
    expect(html).toContain('<a ');
    expect(html).toContain('href="/docs"');
    expect(html).toContain('data-variant="link"');
    expect(html).toContain('data-size="xs"');
    expect(html).not.toContain('type="button" href="/docs"');
    expect(html).toContain('data-size="icon-sm"');
    // IconButton has no hardcoded width/height inline style
    expect(html).toContain('class="j-btn j-icon-btn"');
    expect(html).not.toContain('width:30px');
    expect(html).toContain('role="tab"');
    expect(html).toContain('href="#a"');

    // DropdownMenu & ContextMenu & Sheet slots
    expect(primitives.DropdownMenu.CheckboxItem).toBeDefined();
    expect(primitives.DropdownMenu.RadioGroup).toBeDefined();
    expect(primitives.DropdownMenu.RadioItem).toBeDefined();
    expect(primitives.DropdownMenu.ItemIndicator).toBeDefined();
    expect(primitives.DropdownMenu.Shortcut).toBeDefined();
    expect(primitives.ContextMenu.Root).toBeTypeOf('function');
    expect(primitives.ContextMenu.Trigger).toBeDefined();
    expect(primitives.ContextMenu.Portal).toBeTypeOf('function');
    expect(primitives.ContextMenu.Content).toBeDefined();
    expect(primitives.ContextMenu.Item).toBeDefined();
    expect(primitives.ContextMenu.Separator).toBeTypeOf('function');
    expect(primitives.ContextMenu.Label).toBeTypeOf('function');
    expect(primitives.Sheet.Handle).toBeTypeOf('function');
    expect(primitives.Sheet.Body).toBeTypeOf('function');
    expect(primitives.OWN_ESCAPE).toEqual({ 'data-own-escape': '' });
    expect(primitives.keepCardEscape).toBeTypeOf('function');
  });

  it('renders composable Popover, TooltipProvider/Tooltip, RadioGroup with empty value, Collapsible, AlertDialog, and portalled Select/SimpleSelect (#20)', () => {
    const warnSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const html = renderToStaticMarkup(
        createElement(
          primitives.TooltipProvider,
          { delayDuration: 250, skipDelayDuration: 150 },
          createElement(
            primitives.Popover.Root,
            null,
            createElement(
              primitives.Popover.Trigger,
              { asChild: true },
              createElement('button', { type: 'button' }, 'Open Popover'),
            ),
            createElement(
              primitives.Popover.Portal,
              null,
              createElement(primitives.Popover.Content, null, 'Popover Body'),
            ),
          ),
          createElement(
            primitives.Tooltip.Root,
            null,
            createElement(
              primitives.Tooltip.Trigger,
              { asChild: true },
              createElement('button', { type: 'button' }, 'Hover me'),
            ),
            createElement(primitives.Tooltip.Content, { side: 'bottom' }, 'Tooltip body'),
          ),
          createElement(
            primitives.RadioGroup,
            { value: '', name: 'filter', variant: 'chip', orientation: 'horizontal' },
            createElement(primitives.RadioGroupItem, { value: '' }, 'All'),
            createElement(primitives.RadioGroupItem, { value: 'active' }, 'Active'),
          ),
          createElement(
            primitives.Collapsible.Root,
            { defaultOpen: false },
            createElement(primitives.Collapsible.Trigger, null, 'Toggle details'),
            createElement(primitives.Collapsible.Content, { preview: 'Preview text' }, 'Full details'),
          ),
          createElement(
            primitives.AlertDialog.Root,
            null,
            createElement(primitives.AlertDialog.Trigger, null, 'Delete'),
            createElement(
              primitives.AlertDialog.Portal,
              null,
              createElement(primitives.AlertDialog.Overlay, null),
              createElement(
                primitives.AlertDialog.Content,
                null,
                createElement(primitives.AlertDialog.Title, null, 'Confirm delete'),
                createElement(primitives.AlertDialog.Cancel, null, 'Cancel'),
                createElement(primitives.AlertDialog.Action, null, 'Confirm'),
              ),
            ),
          ),
          createElement(primitives.SimpleSelect, {
            value: '',
            size: 'sm',
            placeholder: 'Pick one',
            options: [
              { value: '', label: 'All statuses' },
              { value: 'draft', label: 'Draft', hint: 'Not published' },
            ],
            groups: [{ label: 'Archived', options: [{ value: 'old', label: 'Legacy', disabled: true }] }],
          }),
          createElement(primitives.Select, {
            label: 'Legacy Region',
            options: [{ value: 'us', label: 'US East' }],
            defaultValue: 'us',
          }),
        ),
      );
      expect(html).toContain('Open Popover');
      expect(html).toContain('Hover me');
      expect(html).toContain('role="radiogroup"');
      expect(html).toContain('aria-checked="true"');
      expect(html).toContain('name="filter" value=""');
      expect(html).toContain('Preview text');
      expect(html).toContain('aria-hidden="true"');
      expect(html).toContain('All statuses');
      expect(html).toContain('Legacy Region');
      expect(warnSpy).not.toHaveBeenCalled();
    } finally {
      warnSpy.mockRestore();
    }
  });

  it('renders bare Input, Surface/Card, Badge/Tag/Chip, EmptyState, form Switch/Checkbox, Alert tones, RollingNumber format, Breadcrumbs & Pagination (#21)', () => {
    const html = renderToStaticMarkup(
      createElement(
        'div',
        null,
        createElement(primitives.Input, { size: 'sm', invalid: true, placeholder: 'Title' }),
        createElement(primitives.TextField, {
          label: 'Project',
          defaultValue: 'Hushed',
          clearable: true,
          clearLabel: '清空项目名',
          wrapperClassName: 'custom-wrap',
        }),
        createElement(primitives.Switch, { name: 'notify', value: 'yes', defaultChecked: true, required: true, label: 'Notify' }),
        createElement(primitives.Checkbox, { name: 'all', indeterminate: true, label: 'Select all' }),
        createElement(
          primitives.Card.Root,
          { variant: 'flat', padding: 'md', as: 'section' },
          createElement(
            primitives.Card.Header,
            null,
            createElement(primitives.Card.Title, null, 'Card Title'),
            createElement(primitives.Card.Description, null, 'Card Desc'),
          ),
          createElement(primitives.Card.Body, null, 'Card Body'),
        ),
        createElement(primitives.Badge, { variant: 'solid', size: 'xs', tone: 'info' }, 'Beta'),
        createElement(primitives.Tag, { selected: true, onSelect: () => {}, onRemove: () => {}, removeLabel: '移除标签' }, 'Filter'),
        createElement(primitives.Chip, { tone: 'ok' }, 'Ready'),
        createElement(primitives.EmptyState, { kicker: 'Drafts', title: 'Nothing here', description: 'Create your first item', tone: 'signal' }),
        createElement(primitives.Alert, { tone: 'info' }, 'Syncing workspace'),
        createElement(primitives.Alert, { tone: 'ok' }, 'All systems normal'),
        createElement(primitives.RollingNumber, { value: 1234.5, format: (v) => `¥${v.toFixed(1)}` }),
        createElement(primitives.Breadcrumbs, {
          ariaLabel: '路径导航',
          items: [
            { label: 'Home', href: '/' },
            { label: 'Studio', current: true },
          ],
        }),
        createElement(primitives.Pagination, {
          page: 10,
          pageCount: 20,
          onChange: () => {},
          labels: { nav: '分页', previous: '上一页', next: '下一页', page: (n) => `第 ${n} 页` },
        }),
      ),
    );
    expect(html).toContain('class="j-input"');
    expect(html).toContain('data-invalid="true"');
    expect(html).toContain('custom-wrap');
    expect(html).toContain('清空项目名');
    expect(html).toContain('name="notify"');
    expect(html).toContain('aria-checked="mixed"');
    expect(html).toContain('<section');
    expect(html).toContain('class="j-surface j-card"');
    expect(html).toContain('data-variant="solid"');
    expect(html).toContain('data-tone="info"');
    expect(html).toContain('移除标签');
    expect(html).toContain('Nothing here');
    expect(html).toContain('Syncing workspace');
    expect(html).not.toContain('background:transparent');
    expect(html).toContain('¥');
    expect(html).toContain('路径导航');
    expect(html).toContain('href="/"');
    expect(html).toContain('aria-label="分页"');
    expect(html).toContain('j-pagination-ellipsis');
    expect(html).toContain('第 10 页');
  });

  it('renders production AI Workbench primitives: CommandDialog, AgentActionCard, AgentStepRow, AgentReasoningBlock, PromptComposer, DiffBlock (#22)', () => {
    expect(primitives.CommandDialog).toBeTypeOf('function');
    expect(primitives.CommandPalettePrimitive).toBe(primitives.CommandDialog);
    expect(primitives.CommandPalette).toBe(primitives.CommandDialog);

    const html = renderToStaticMarkup(
      createElement(
        'div',
        null,
        createElement(primitives.AgentActionCard, {
          status: 'waiting',
          title: '批准文件修改',
          subtitle: '3 处改动',
          pinned: true,
          actions: createElement(primitives.Button, { size: 'sm' }, '批准'),
        }, '将更新 chapter-01.md'),
        createElement(primitives.AgentStepRow, {
          status: 'running',
          label: '检索章节上下文',
          meta: '1.2s',
          detail: 'Matched 4 paragraphs',
          collapsible: true,
          defaultOpen: true,
        }),
        createElement(primitives.AgentReasoningBlock, {
          active: true,
          title: '思考过程',
          duration: '2.4s',
          defaultOpen: true,
        }, 'Checking continuity across scenes.'),
        createElement(primitives.PromptComposer, {
          variant: 'hero',
          placeholder: '输入创作指令…',
          sendLabel: '发送',
          stopLabel: '停止',
          defaultValue: '润色第一段',
        }),
        createElement(primitives.DiffBlock, {
          title: 'chapter-01.md',
          meta: '+1 -1',
          lines: [
            { type: 'context', lineNumber: 10, text: 'The rain tapped the glass.' },
            { type: 'del', lineNumber: 11, text: 'He walked slowly.' },
            { type: 'add', lineNumber: 11, text: 'He crossed the silent hall.' },
          ],
        }),
      ),
    );
    expect(html).toContain('j-agent-action-card');
    expect(html).toContain('data-status="waiting"');
    expect(html).toContain('data-pinned="true"');
    expect(html).toContain('批准文件修改');
    expect(html).toContain('j-text-shimmer');
    expect(html).toContain('检索章节上下文');
    expect(html).toContain('Matched 4 paragraphs');
    expect(html).toContain('思考过程');
    expect(html).toContain('j-composer');
    expect(html).toContain('data-variant="hero"');
    expect(html).toContain('发送');
    expect(html).toContain('j-diff-block');
    expect(html).toContain('data-type="add"');
    expect(html).toContain('data-type="del"');
    expect(html).toContain('He crossed the silent hall.');
  });
});
