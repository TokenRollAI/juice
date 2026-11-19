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

  it('lists all 10 source modules as JSON', () => {
    const out = execFileSync(process.execPath, [cliPath, 'list', '--json'], { encoding: 'utf8' });
    const parsed = JSON.parse(out) as { modules: Array<{ id: string; exports: string[] }> };
    expect(parsed.modules.length).toBe(10);
    expect(parsed.modules.some((m) => m.id === 'ai-agents')).toBe(true);
    expect(parsed.modules.some((m) => m.id === 'portal-floating')).toBe(true);
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
