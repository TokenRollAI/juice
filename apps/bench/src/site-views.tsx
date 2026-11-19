import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Badge,
  Button,
  CopySnippet,
  JUICE_SOUND_CATALOG,
  JuiceProvider,
  Kbd,
  playJuiceSound,
  ScrubPanel,
  SegmentedControl,
  StateButton,
  Switch,
  TextField,
  useJuice,
  type JuiceAgentBridge,
  type JuiceSoundName,
} from '@tokenroll/juice';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Boxes,
  CornerDownLeft,
  Home,
  Layers,
  Moon,
  Play,
  Search,
  Sun,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { BLOCK_CATALOG, type BlockSpec } from './catalog.tsx';
import { getEnrichedComponent, ORDERED_COMPONENTS } from './component-meta.ts';

export type SitePage = 'home' | 'components' | 'docs' | 'sounds';

export type DocSectionId =
  | 'introduction'
  | 'installation'
  | 'cli-registry'
  | 'primitives-vs-blocks'
  | 'provider-optional'
  | 'theming-tokens'
  | 'web-audio-synth'
  | 'agent-bridge-joplo'
  | 'vue-3'
  | 'api-index';

export type DocNavItem = {
  id: DocSectionId;
  label: string;
  group: 'Get Started' | 'Design & Runtime' | 'Reference';
  summary: string;
};

export const DOC_NAV_ITEMS: readonly DocNavItem[] = [
  {
    id: 'introduction',
    label: 'Introduction',
    group: 'Get Started',
    summary: 'Design philosophy, architecture, and interactive demo.',
  },
  {
    id: 'installation',
    label: 'Installation',
    group: 'Get Started',
    summary: 'Install @tokenroll/juice with pnpm, npm, or bun.',
  },
  {
    id: 'cli-registry',
    label: 'CLI Registry',
    group: 'Get Started',
    summary: 'Copy editable component source into your repository.',
  },
  {
    id: 'primitives-vs-blocks',
    label: 'Primitives vs Blocks',
    group: 'Get Started',
    summary: 'Subpath exports: /primitives, /blocks, and /core.',
  },
  {
    id: 'provider-optional',
    label: 'Provider-Optional',
    group: 'Get Started',
    summary: 'Zero-wrapper defaults plus scoped JuiceProvider overrides.',
  },
  {
    id: 'theming-tokens',
    label: 'Theming & Tokens',
    group: 'Design & Runtime',
    summary: 'Concentric radii and two-variable color-mix() ramp.',
  },
  {
    id: 'web-audio-synth',
    label: 'Web Audio Synth',
    group: 'Design & Runtime',
    summary: '3KB procedural sound recipes with zero audio assets.',
  },
  {
    id: 'agent-bridge-joplo',
    label: 'Agent Bridge & Joplo',
    group: 'Design & Runtime',
    summary: 'Programmatic snapshot(), act(), and deterministic frames.',
  },
  {
    id: 'vue-3',
    label: 'Vue 3',
    group: 'Design & Runtime',
    summary: 'SFC usage and parity via @tokenroll/juice-vue.',
  },
  {
    id: 'api-index',
    label: 'API Index (182)',
    group: 'Reference',
    summary: 'Searchable reference of all 182 exports and 86 blocks.',
  },
] as const;

type PkgManager = 'pnpm' | 'npm' | 'bun';

type ApiLayerMeta = {
  id: string;
  title: string;
  subtitle: string;
  modules: string[];
  primitives: string[];
};

const API_LAYERS: readonly ApiLayerMeta[] = [
  {
    id: 'foundation',
    title: 'Everyday Foundation & WAI-ARIA Primitives',
    subtitle:
      'Accessible buttons, inputs, searchable selects, dialogs, roving menus, toolbars, and scroll viewports.',
    modules: [
      'components-foundation-forms',
      'components-foundation-nav',
      'components-radix-primitives',
    ],
    primitives: [
      'Button',
      'IconButton',
      'TextField',
      'Select',
      'RadioCard',
      'Checkbox',
      'Switch',
      'NumberField',
      'Slider',
      'RangeSlider',
      'DualRangeSlider',
      'Separator',
      'AspectRatio',
      'Label',
      'Collapsible',
      'ContextMenu',
      'Menubar',
      'NavigationMenu',
      'Toggle',
      'ToggleGroup',
      'ToggleGroupItem',
      'Toolbar',
      'ToolbarButton',
      'AlertDialog',
      'ScrollArea',
      'Alert',
      'Breadcrumbs',
      'Pagination',
    ],
  },
  {
    id: 'base-ui',
    title: 'Base UI Compound Primitives',
    subtitle:
      'Compound form validation, indeterminate checkbox hierarchies, scrubbable number inputs, meters, and hover cards.',
    modules: ['components-base-ui'],
    primitives: [
      'Form',
      'Fieldset',
      'Field',
      'Autocomplete',
      'CheckboxGroup',
      'ScrubNumberField',
      'Meter',
      'Progress',
      'PreviewCard',
    ],
  },
  {
    id: 'portal-studio',
    title: 'Portal, Floating & Studio Primitives',
    subtitle:
      'Collision-aware fullscreen-safe popovers, tooltips, adaptive toolbars, swatch matrices, and property inspectors.',
    modules: ['components-portal-floating'],
    primitives: [
      'placeFloating',
      'FloatingPopover',
      'useTooltip',
      'Tooltip',
      'BreadcrumbSelect',
      'AdaptiveToolbar',
      'SwatchGridPicker',
      'InspectorSheet',
    ],
  },
  {
    id: 'media-workbench',
    title: 'Media, Timeline & Workbench Primitives',
    subtitle:
      'Transport docks, step timelines, auto-hide bars, magnetic corner orbs, progress rings, and secret vaults.',
    modules: ['components-media-workbench'],
    primitives: [
      'MediaTransport',
      'StepTimeline',
      'IdleAutoHideBar',
      'CornerSnapOrb',
      'ProgressRing',
      'TaskProgressCard',
      'CopySnippet',
      'MaskedSecretInput',
    ],
  },
  {
    id: 'ai-agents',
    title: 'AI Chat & Agentic Workflow Surfaces',
    subtitle:
      'Slash-mention composers, grounded citations, HITL tool approval gates, subagent swarm boards, and context meters.',
    modules: ['components-ai-chat', 'components-ai-agents'],
    primitives: [
      'SlashMentionComposer',
      'ModelEffortPicker',
      'ContextBudgetMeter',
      'GroundedAnswer',
      'MessageBranchThread',
      'ModelArenaCompare',
      'VisionRegionAsk',
      'VoiceOrbSession',
      'ToolApprovalGate',
      'SubagentSwarmBoard',
      'AgentPlanChecklist',
      'ArtifactCanvas',
      'AgentMemoryStore',
      'TerminalStreamCard',
      'RateLimitBanner',
      'McpServerRoster',
    ],
  },
  {
    id: 'tactile-core',
    title: 'Tactile Micro-Interactions, Workspace & Core Engine',
    subtitle:
      'Direct-manipulation blocks, operator data grids, headless hooks, procedural Web Audio synth, and Agent Bridge.',
    modules: ['components', 'components-extended'],
    primitives: [
      'JuiceProvider',
      'useJuice',
      'useJuiceAgentNode',
      'useControllableState',
      'useScrubDrag',
      'useRovingFocus',
      'ensureJuiceAgentBridge',
      'registerJuiceAgentNode',
      'unregisterJuiceAgentNode',
      'playJuiceSound',
      'isJuiceSoundEnabled',
      'setJuiceSoundEnabled',
      'subscribeJuiceSound',
      'JUICE_SOUND_CATALOG',
      'Kbd',
      'Badge',
      'SegmentedControl',
      'RollingNumber',
      'StateButton',
      'ScrubPanel',
      'SlideConfirm',
      'DynamicIsland',
      'MorphCard',
      'MetricRibbon',
      'Composer',
      'ThinkingMorph',
      'CommandPalette',
      'ToastStack',
      'SplitCompare',
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Page 3: Classic Left-Sidebar Documentation
// ─────────────────────────────────────────────────────────────────────────────

export function DocsPage({
  activeDoc,
  onSelectDoc,
  onJumpToBlock,
  onOpenSounds,
}: {
  activeDoc: DocSectionId;
  onSelectDoc: (doc: DocSectionId) => void;
  onJumpToBlock: (blockId: string) => void;
  onOpenSounds: () => void;
}) {
  const [pkgMgr, setPkgMgr] = useState<PkgManager>('pnpm');
  const [demoAnimate, setDemoAnimate] = useState(true);
  const [apiQuery, setApiQuery] = useState('');
  const [apiLayer, setApiLayer] = useState<string>('all');
  const [bridgeLog, setBridgeLog] = useState<string>(
    '// Click an action button above to inspect live state',
  );

  const groups = ['Get Started', 'Design & Runtime', 'Reference'] as const;
  const currentIdx = DOC_NAV_ITEMS.findIndex((item) => item.id === activeDoc);
  const prevDoc = currentIdx > 0 ? DOC_NAV_ITEMS[currentIdx - 1] : undefined;
  const nextDoc =
    currentIdx >= 0 && currentIdx < DOC_NAV_ITEMS.length - 1
      ? DOC_NAV_ITEMS[currentIdx + 1]
      : undefined;

  const installPrefix = pkgMgr === 'npm' ? 'npm install' : `${pkgMgr} add`;

  const resolvedApiLayers = useMemo(() => {
    const q = apiQuery.trim().toLowerCase();
    return API_LAYERS.filter((l) => apiLayer === 'all' || l.id === apiLayer)
      .map((layer) => {
        const layerBlocks: BlockSpec[] = BLOCK_CATALOG.filter((b) =>
          layer.modules.includes(b.source.module),
        );
        if (!q) {
          return { ...layer, blocks: layerBlocks };
        }
        const matchedPrims = layer.primitives.filter((p) => p.toLowerCase().includes(q));
        const matchedBlocks = layerBlocks.filter((b) => {
          const meta = getEnrichedComponent(b);
          return (
            meta.title.toLowerCase().includes(q) ||
            b.source.symbol.toLowerCase().includes(q) ||
            b.name.toLowerCase().includes(q) ||
            b.summary.toLowerCase().includes(q) ||
            b.id.includes(q)
          );
        });
        if (matchedPrims.length === 0 && matchedBlocks.length === 0) {
          return null;
        }
        return {
          ...layer,
          primitives: matchedPrims,
          blocks: matchedBlocks,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
  }, [apiLayer, apiQuery]);

  const runDocsBridgeAction = (id: string, action: string, payload?: unknown) => {
    const bridge = (window as unknown as { __juiceAgent?: JuiceAgentBridge }).__juiceAgent;
    bridge?.act(id, action, payload);
    const snap = bridge?.snapshot()?.[id]?.state;
    setBridgeLog(
      `window.__juiceAgent.act('${id}', '${action}'${
        payload !== undefined ? `, ${JSON.stringify(payload)}` : ''
      })\n→ ${JSON.stringify(snap ?? {}, null, 2)}`,
    );
  };

  return (
    <div className="site-docs-layout">
      {/* Sticky 220px Left Sidebar */}
      <aside className="site-docs-sidebar" aria-label="Documentation navigation">
        {groups.map((group) => (
          <div key={group} className="site-docs-nav-group">
            <div className="site-docs-nav-heading">{group}</div>
            <ul className="site-docs-nav-list">
              {DOC_NAV_ITEMS.filter((i) => i.group === group).map((item) => {
                const active = item.id === activeDoc;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      className="site-docs-nav-link"
                      data-active={active ? 'true' : undefined}
                      onClick={() => {
                        playJuiceSound('tap');
                        onSelectDoc(item.id);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                    >
                      {item.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </aside>

      {/* Centered Readable Content Column (max-width: 760px) */}
      <article className="site-docs-article">
        {activeDoc === 'introduction' && (
          <div className="site-prose">
            <div className="site-doc-eyebrow">Get Started</div>
            <h1 className="site-doc-h1">Introduction</h1>
            <p className="site-doc-lead">
              Juice UI (<code>@tokenroll/juice</code>) is a tactile UI component system for React
              18/19 and Vue 3 — combining accessible primitives, concentric{' '}
              <code>color-mix()</code> surfaces, a 3KB procedural Web Audio synthesizer, and a
              programmatic Agent Bridge.
            </p>

            <h2 className="site-doc-h2">Core design invariants</h2>
            <ul className="site-doc-list">
              <li>
                <strong>Tactile physics &amp; acoustic feedback</strong> — Controls respond with
                calibrated spring curves and optional zero-asset Web Audio oscillator envelopes.
              </li>
              <li>
                <strong>Concentric tonal hierarchy</strong> — Surfaces derive a 6-step tonal ramp
                from two variables (<code>--fill-on</code> and <code>--fill-slab</code>) with
                proportional <code>20px → 14px → 10px</code> corner geometry instead of nested
                borders.
              </li>
              <li>
                <strong>Dual-driven for humans &amp; agents</strong> — Every interactive block works
                naturally with pointer/keyboard input while registering deterministic state and
                actions on <code>window.__juiceAgent</code>.
              </li>
            </ul>

            <h2 className="site-doc-h2">Interactive preview</h2>
            <p className="site-doc-p">
              Try pressing the multi-stage payment button or dragging the concentric scrub rows
              below:
            </p>
            <div className="site-doc-demo-frame">
              <StateButton
                id="docs-intro-btn"
                title="Release Payout"
                recipient="ops@tokenroll.ai"
                amount={640}
              />
              <ScrubPanel id="docs-intro-scrub" />
            </div>

            <CopySnippet
              label="Quick taste"
              code={`import '@tokenroll/juice/styles.css';
import { StateButton, ScrubPanel } from '@tokenroll/juice/blocks';

export function StudioControls() {
  return (
    <>
      <StateButton id="payout" amount={640} />
      <ScrubPanel id="physics" />
    </>
  );
}`}
            />
          </div>
        )}

        {activeDoc === 'installation' && (
          <div className="site-prose">
            <div className="site-doc-eyebrow">Get Started</div>
            <h1 className="site-doc-h1">Installation</h1>
            <p className="site-doc-lead">
              Install Juice UI from npm with zero Tailwind or PostCSS setup required. All styles
              ship in a self-contained CSS token sheet prefixed with <code>.j-*</code>.
            </p>

            <div className="site-doc-bar">
              <span className="site-doc-bar-label">Package manager</span>
              <SegmentedControl<PkgManager>
                options={[
                  { value: 'pnpm', label: 'pnpm' },
                  { value: 'npm', label: 'npm' },
                  { value: 'bun', label: 'bun' },
                ]}
                value={pkgMgr}
                onChange={setPkgMgr}
              />
            </div>

            <CopySnippet
              label="React 18 / 19"
              code={`${installPrefix} @tokenroll/juice lucide-react`}
            />

            <CopySnippet label="Vue 3" code={`${installPrefix} @tokenroll/juice-vue`} />

            <h2 className="site-doc-h2">Import stylesheet once</h2>
            <p className="site-doc-p">
              Import <code>@tokenroll/juice/styles.css</code> in your application entry file (such
              as <code>main.tsx</code> or <code>layout.tsx</code>), then import any primitive or
              block:
            </p>
            <CopySnippet
              label="src/main.tsx"
              code={`import '@tokenroll/juice/styles.css';
import { Button, TextField } from '@tokenroll/juice/primitives';

export function App() {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <TextField placeholder="Project name…" />
      <Button variant="primary">Create</Button>
    </div>
  );
}`}
            />

            <h2 className="site-doc-h2">Equip AI coding agents</h2>
            <p className="site-doc-p">
              Install the official agent skill so Claude Code, Codex, or Antigravity knows the full
              86-block catalog, token rules, and Agent Bridge verification loop:
            </p>
            <CopySnippet label="Agent Skill" code="npx skills add TokenRollAI/juice" />
          </div>
        )}

        {activeDoc === 'cli-registry' && (
          <div className="site-prose">
            <div className="site-doc-eyebrow">Get Started</div>
            <h1 className="site-doc-h1">CLI Registry</h1>
            <p className="site-doc-lead">
              Prefer owning the source code directly in your repository like <code>shadcn/ui</code>?
              The <code>@tokenroll/juice</code> CLI copies clean, editable TypeScript and CSS
              straight into your project.
            </p>

            <h2 className="site-doc-h2">1. Initialize shared foundation</h2>
            <p className="site-doc-p">
              Run <code>init</code> once to scaffold <code>juice.css</code>,{' '}
              <code>sound.ts</code>, <code>bridge.ts</code>, and <code>behaviors.tsx</code> into{' '}
              <code>src/components/juice/</code>:
            </p>
            <CopySnippet label="Initialize" code="npx @tokenroll/juice init" />

            <h2 className="site-doc-h2">2. Add individual blocks or modules</h2>
            <p className="site-doc-p">
              Pass any block slug (or module name) to copy its source file and resolve local
              sibling dependencies automatically:
            </p>
            <CopySnippet
              label="Copy blocks"
              code={`npx @tokenroll/juice add slash-mention-composer tool-approval-gate
npx @tokenroll/juice add scrub-panel state-button`}
            />

            <h2 className="site-doc-h2">3. List all registry items</h2>
            <CopySnippet
              label="Inspect catalog"
              code="npx @tokenroll/juice list"
            />
          </div>
        )}

        {activeDoc === 'primitives-vs-blocks' && (
          <div className="site-prose">
            <div className="site-doc-eyebrow">Get Started</div>
            <h1 className="site-doc-h1">Primitives vs Blocks</h1>
            <p className="site-doc-lead">
              Juice separates low-level accessible building blocks from composed interactive
              workflows through explicit tree-shakeable package subpaths.
            </p>

            <div className="site-subpath-cards">
              <div className="site-subpath-card">
                <code>@tokenroll/juice/primitives</code>
                <p>
                  Pure, stateless/controllable WAI-ARIA primitives and headless hooks (
                  <code>Button</code>, <code>TextField</code>, <code>Select</code>,{' '}
                  <code>FloatingPopover</code>, <code>ScrollArea</code>, <code>useScrubDrag</code>)
                  with zero showcase fixture data.
                </p>
              </div>
              <div className="site-subpath-card">
                <code>@tokenroll/juice/blocks</code>
                <p>
                  All 86 composed interactive workflows across AI chat, HITL agent approvals,
                  direct-manipulation scrubbers, spatial morph cards, and workbench docks.
                </p>
              </div>
              <div className="site-subpath-card">
                <code>@tokenroll/juice/core</code>
                <p>
                  Zero-React runtime containing the 3KB Web Audio procedural synthesizer (
                  <code>playJuiceSound</code>) and <code>window.__juiceAgent</code> registry for
                  vanilla JS, Svelte, or custom hosts.
                </p>
              </div>
            </div>

            <CopySnippet
              label="Combining subpaths cleanly"
              code={`import { Button, FloatingPopover } from '@tokenroll/juice/primitives';
import { SlashMentionComposer } from '@tokenroll/juice/blocks';
import { playJuiceSound } from '@tokenroll/juice/core';`}
            />
          </div>
        )}

        {activeDoc === 'provider-optional' && (
          <div className="site-prose">
            <div className="site-doc-eyebrow">Get Started</div>
            <h1 className="site-doc-h1">Provider-Optional Architecture</h1>
            <p className="site-doc-lead">
              Every Juice component works immediately without wrapping your app in{' '}
              <code>&lt;JuiceProvider&gt;</code>. Sound state, theme defaults, and the Agent Bridge
              sync automatically via <code>useSyncExternalStore</code>.
            </p>

            <h2 className="site-doc-h2">When to add &lt;JuiceProvider&gt;</h2>
            <p className="site-doc-p">
              Wrap a subtree in <code>&lt;JuiceProvider&gt;</code> when you want to scope{' '}
              <code>theme=&quot;dark&quot;</code>, switch cards to inverted{' '}
              <code>fill=&quot;solid&quot;</code>, or freeze spring transitions via{' '}
              <code>animate=&#123;false&#125;</code> for deterministic screenshot capture:
            </p>

            <div className="site-doc-demo-frame" style={{ flexDirection: 'column', gap: 16 }}>
              <div className="site-doc-bar" style={{ width: '100%', margin: 0 }}>
                <span className="site-doc-bar-label">
                  Live provider prop: <code>animate=&#123;{String(demoAnimate)}&#125;</code>
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12.5, color: 'var(--site-muted)' }}>Spring motion</span>
                  <Switch
                    checked={demoAnimate}
                    onChange={setDemoAnimate}
                    aria-label="Toggle spring motion"
                  />
                </div>
              </div>

              <JuiceProvider animate={demoAnimate}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'center' }}>
                  <StateButton id="docs-provider-btn" amount={320} />
                </div>
              </JuiceProvider>
            </div>

            <CopySnippet
              label="Scoped provider usage"
              code={`import { JuiceProvider } from '@tokenroll/juice/primitives';
import { StateButton } from '@tokenroll/juice/blocks';

export function DeterministicPreview({ staticFrame = false }) {
  return (
    <JuiceProvider theme="dark" fill="slab" animate={!staticFrame}>
      <StateButton id="checkout-btn" amount={320} />
    </JuiceProvider>
  );
}`}
            />
          </div>
        )}

        {activeDoc === 'theming-tokens' && (
          <div className="site-prose">
            <div className="site-doc-eyebrow">Design &amp; Runtime</div>
            <h1 className="site-doc-h1">Theming &amp; Concentric Tokens</h1>
            <p className="site-doc-lead">
              Juice replaces brittle 12-shade manual palettes with a live 6-step{' '}
              <code>color-mix(in srgb)</code> ramp computed from two tokens:{' '}
              <code>--fill-on</code> (ink) and <code>--fill-slab</code> (card surface).
            </p>

            <h2 className="site-doc-h2">Two-variable brand customization</h2>
            <CopySnippet
              label="Custom surface override"
              code={`.brand-surface {
  --fill-on: #f4f6fb;
  --fill-slab: #12151e;
  --juice-signal: #4f7cff;
  /* w4, w6, w12, w20, faint, mute, soft recalibrate automatically */
}`}
            />

            <h2 className="site-doc-h2">Automatic dark &amp; solid contrast step-up</h2>
            <p className="site-doc-p">
              On dark surfaces or inverted <code>fill=&quot;solid&quot;</code> cards, translucent
              mixes naturally lose perceptual contrast. Juice automatically steps up quiet stops (
              <code>w6: 6.5% → 8.5%</code>, <code>w12: 12% → 17%</code>,{' '}
              <code>w20: 20% → 27%</code>) so inner tracks remain crisp without adding 1px borders.
            </p>

            <h2 className="site-doc-h2">Concentric corner geometry</h2>
            <p className="site-doc-p">
              Nested radii obey <code>R_inner = R_outer − padding</code>: outer slabs use{' '}
              <code>20px</code> with <code>6px</code> padding, inner rows use <code>14px</code>,
              and compact controls use <code>10px</code>.
            </p>
          </div>
        )}

        {activeDoc === 'web-audio-synth' && (
          <div className="site-prose">
            <div className="site-doc-eyebrow">Design &amp; Runtime</div>
            <h1 className="site-doc-h1">Procedural Web Audio Synth</h1>
            <p className="site-doc-lead">
              All 12 UI sounds in <code>JUICE_SOUND_CATALOG</code> are synthesized on demand using
              native Web Audio oscillators and biquad-filtered noise buffers — under 3KB gzipped
              with zero external MP3/WAV requests.
            </p>

            <div className="site-doc-demo-frame" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {(['tap', 'latch', 'pop', 'paid', 'landed', 'deny'] as JuiceSoundName[]).map(
                  (snd) => (
                    <Button
                      key={snd}
                      size="sm"
                      variant="secondary"
                      leftIcon={<Volume2 size={13} />}
                      onClick={() => playJuiceSound(snd, true)}
                    >
                      {snd}
                    </Button>
                  ),
                )}
              </div>
              <Button
                size="sm"
                variant="outline"
                rightIcon={<ArrowRight size={13} />}
                onClick={onOpenSounds}
              >
                Open Sound Studio
              </Button>
            </div>

            <CopySnippet
              label="Trigger & control audio"
              code={`import {
  playJuiceSound,
  setJuiceSoundEnabled,
  JUICE_SOUND_CATALOG,
} from '@tokenroll/juice/core';

// Play any of the 12 built-in procedural recipes
playJuiceSound('paid');

// Globally mute or unmute UI feedback
setJuiceSoundEnabled(false);`}
            />
          </div>
        )}

        {activeDoc === 'agent-bridge-joplo' && (
          <div className="site-prose">
            <div className="site-doc-eyebrow">Design &amp; Runtime</div>
            <h1 className="site-doc-h1">Agent Bridge &amp; Joplo</h1>
            <p className="site-doc-lead">
              Every Juice block registers its live state and semantic actions on{' '}
              <code>window.__juiceAgent</code> via <code>useJuiceAgentNode</code>, enabling AI
              agents and Joplo storyboards to inspect and drive UI without brittle CSS selectors.
            </p>

            <div className="site-doc-demo-frame" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0' }}>
                <ScrubPanel id="docs-bridge-scrub" />
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Button
                  size="sm"
                  variant="secondary"
                  leftIcon={<Play size={12} />}
                  onClick={() => runDocsBridgeAction('docs-bridge-scrub', 'setTension', 90)}
                >
                  act(&apos;docs-bridge-scrub&apos;, &apos;setTension&apos;, 90)
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  leftIcon={<Play size={12} />}
                  onClick={() => runDocsBridgeAction('docs-bridge-scrub', 'setSwatch', 'emerald')}
                >
                  act(&apos;docs-bridge-scrub&apos;, &apos;setSwatch&apos;, &apos;emerald&apos;)
                </Button>
              </div>
              <pre className="site-json-box" style={{ margin: 0 }}>
                {bridgeLog}
              </pre>
            </div>

            <CopySnippet
              label="Register custom components on the Agent Bridge"
              code={`import { useJuiceAgentNode } from '@tokenroll/juice/primitives';

export function DeployToggle({ id = 'deploy-toggle' }) {
  const [armed, setArmed] = useState(false);

  useJuiceAgentNode(
    id,
    'DeployToggle',
    { armed },
    {
      arm: () => setArmed(true),
      reset: () => setArmed(false),
    },
  );

  return <button onClick={() => setArmed(!armed)}>{armed ? 'Armed' : 'Idle'}</button>;
}`}
            />
          </div>
        )}

        {activeDoc === 'vue-3' && (
          <div className="site-prose">
            <div className="site-doc-eyebrow">Design &amp; Runtime</div>
            <h1 className="site-doc-h1">Vue 3 Support</h1>
            <p className="site-doc-lead">
              <code>@tokenroll/juice-vue</code> brings the exact same CSS token sheet, 3KB Web
              Audio synthesizer, and <code>window.__juiceAgent</code> bridge to Vue 3 Composition
              API applications.
            </p>

            <CopySnippet label="Install Vue 3 package" code="pnpm add @tokenroll/juice-vue" />

            <CopySnippet
              label="App.vue"
              code={`<script setup lang="ts">
import '@tokenroll/juice-vue/styles.css';
import {
  JProvider,
  JStateButton,
  JScrubPanel,
  JToolApprovalGate,
} from '@tokenroll/juice-vue';
</script>

<template>
  <JProvider theme="dark" fill="slab" :sound="true">
    <JStateButton id="vue-payout" :amount="420" />
    <JScrubPanel id="vue-scrub" />
    <JToolApprovalGate id="vue-gate" />
  </JProvider>
</template>`}
            />
          </div>
        )}

        {activeDoc === 'api-index' && (
          <div className="site-prose site-prose-wide">
            <div className="site-doc-eyebrow">Reference</div>
            <h1 className="site-doc-h1">API Index (182 Exports · 86 Blocks)</h1>
            <p className="site-doc-lead">
              Search every exported primitive, hook, and interactive block across all 6 layers.
              Click any block to open its dedicated interactive component page.
            </p>

            <div className="site-api-filter-row">
              <div className="site-category-strip" role="tablist" aria-label="Filter API layers">
                {[
                  { id: 'all', label: 'All Layers' },
                  { id: 'foundation', label: 'Foundation' },
                  { id: 'base-ui', label: 'Base UI' },
                  { id: 'portal-studio', label: 'Portal & Studio' },
                  { id: 'media-workbench', label: 'Media' },
                  { id: 'ai-agents', label: 'AI & Agents' },
                  { id: 'tactile-core', label: 'Tactile & Core' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={apiLayer === tab.id}
                    className="site-category-pill"
                    data-active={apiLayer === tab.id ? 'true' : undefined}
                    onClick={() => {
                      playJuiceSound('tap');
                      setApiLayer(tab.id);
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div style={{ width: 240, maxWidth: '100%' }}>
                <TextField
                  aria-label="Filter API exports"
                  value={apiQuery}
                  onChange={setApiQuery}
                  placeholder="Search 182 exports…"
                  prefix={<Search size={13} />}
                  clearable
                />
              </div>
            </div>

            <div className="site-api-layers">
              {resolvedApiLayers.map((layer) => (
                <section key={layer.id} className="site-api-layer-box">
                  <div className="site-api-layer-head">
                    <div>
                      <h2 className="site-api-layer-title">{layer.title}</h2>
                      <p className="site-api-layer-sub">{layer.subtitle}</p>
                    </div>
                    <span className="site-count-pill">{layer.blocks.length} blocks</span>
                  </div>

                  {layer.primitives.length > 0 && (
                    <div className="site-prim-chips">
                      {layer.primitives.map((prim) => (
                        <code key={prim} className="site-prim-chip">
                          {prim}
                        </code>
                      ))}
                    </div>
                  )}

                  {layer.blocks.length > 0 && (
                    <div className="site-api-block-grid">
                      {layer.blocks.map((block) => {
                        const meta = getEnrichedComponent(block);
                        return (
                          <button
                            key={block.id}
                            type="button"
                            className="site-api-block-btn"
                            onClick={() => {
                              playJuiceSound('tap');
                              onJumpToBlock(block.id);
                            }}
                          >
                            <div style={{ minWidth: 0 }}>
                              <div className="site-api-block-name">{meta.title}</div>
                              <div className="site-api-block-desc">
                                &lt;{block.source.symbol} /&gt; · {meta.pillarLabel}
                              </div>
                            </div>
                            <ArrowUpRight size={13} className="site-api-block-arrow" />
                          </button>
                        );
                      })}
                    </div>
                  )}
                </section>
              ))}

              {resolvedApiLayers.length === 0 && (
                <div className="site-empty-box">
                  <div className="site-empty-title">No exports match &ldquo;{apiQuery}&rdquo;</div>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setApiQuery('');
                      setApiLayer('all');
                    }}
                  >
                    Clear search
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Prev / Next Doc Pager */}
        <nav className="site-doc-pager" aria-label="Documentation pagination">
          {prevDoc ? (
            <button
              type="button"
              className="site-doc-pager-btn"
              onClick={() => {
                playJuiceSound('tap');
                onSelectDoc(prevDoc.id);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            >
              <ArrowLeft size={14} />
              <div>
                <span className="site-doc-pager-dir">Previous</span>
                <span className="site-doc-pager-label">{prevDoc.label}</span>
              </div>
            </button>
          ) : (
            <span />
          )}

          {nextDoc ? (
            <button
              type="button"
              className="site-doc-pager-btn site-doc-pager-next"
              onClick={() => {
                playJuiceSound('tap');
                onSelectDoc(nextDoc.id);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            >
              <div>
                <span className="site-doc-pager-dir">Next</span>
                <span className="site-doc-pager-label">{nextDoc.label}</span>
              </div>
              <ArrowRight size={14} />
            </button>
          ) : (
            <span />
          )}
        </nav>
      </article>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page 4: Dedicated Procedural Sound Studio (bencho.dev/sounds)
// ─────────────────────────────────────────────────────────────────────────────

type SoundCategoryFilter = 'All' | 'Tactile' | 'State' | 'Motion';

export function SoundsPage() {
  const [selected, setSelected] = useState<JuiceSoundName>('paid');
  const [catFilter, setCatFilter] = useState<SoundCategoryFilter>('All');

  const allSounds = useMemo(
    () => Object.keys(JUICE_SOUND_CATALOG) as JuiceSoundName[],
    [],
  );

  const visibleSounds = useMemo(
    () =>
      allSounds.filter(
        (name) => catFilter === 'All' || JUICE_SOUND_CATALOG[name].category === catFilter,
      ),
    [allSounds, catFilter],
  );

  const spec = JUICE_SOUND_CATALOG[selected];
  const totalDurationMs = Math.max(
    ...spec.layers.map((l) => (l.at ?? 0) + l.ms),
    100,
  );

  return (
    <div className="site-sounds-page">
      <header className="site-gallery-header">
        <div>
          <div className="site-gallery-title-row">
            <h1 className="site-page-h1">Procedural Sound Studio</h1>
            <span className="site-count-pill">12 recipes · &lt; 3KB · 0 audio files</span>
          </div>
          <p className="site-page-sub">
            Real-time Web Audio oscillator and filtered-noise synthesis. Click any pad to audition
            and inspect its multi-layer envelope recipe.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          leftIcon={<Volume2 size={14} />}
          onClick={() => playJuiceSound(selected, true)}
        >
          Audition &ldquo;{spec.label}&rdquo;
        </Button>
      </header>

      <div className="site-gallery-toolbar">
        <div className="site-category-strip" role="tablist" aria-label="Filter sounds by category">
          {(['All', 'Tactile', 'State', 'Motion'] as const).map((cat) => (
            <button
              key={cat}
              type="button"
              role="tab"
              aria-selected={catFilter === cat}
              className="site-category-pill"
              data-active={catFilter === cat ? 'true' : undefined}
              onClick={() => {
                playJuiceSound('tap');
                setCatFilter(cat);
              }}
            >
              {cat === 'All' ? `All (${allSounds.length})` : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Responsive 4-Column Interactive Pad Grid */}
      <div className="site-studio-pad-grid">
        {visibleSounds.map((name) => {
          const item = JUICE_SOUND_CATALOG[name];
          const first = item.layers[0]!;
          const maxMs = Math.max(...item.layers.map((l) => (l.at ?? 0) + l.ms));
          const active = name === selected;
          const waveLabel = first.noise ? `${first.noise} noise` : (first.wave ?? 'sine');

          return (
            <button
              key={name}
              type="button"
              className="site-studio-pad"
              data-active={active ? 'true' : undefined}
              onClick={() => {
                setSelected(name);
                playJuiceSound(name, true);
              }}
            >
              <div className="site-studio-pad-head">
                <span className="site-studio-pad-cat">{item.category}</span>
                <span className="site-studio-pad-hz">
                  {Math.round(first.hz)}Hz{first.to ? ` → ${Math.round(first.to)}Hz` : ''}
                </span>
              </div>

              <div className="site-studio-pad-center">
                <span className="site-studio-pad-title">{item.label}</span>
                <Volume2 size={15} className="site-studio-pad-speaker" />
              </div>

              {/* Mini visual layer timeline bars */}
              <div className="site-studio-bars" aria-hidden="true">
                {item.layers.map((layer, idx) => {
                  const leftPct = ((layer.at ?? 0) / maxMs) * 100;
                  const widthPct = Math.max(12, (layer.ms / maxMs) * 100);
                  return (
                    <span
                      key={idx}
                      className="site-studio-bar-track"
                    >
                      <i
                        className="site-studio-bar-fill"
                        style={{
                          left: `${leftPct}%`,
                          width: `${Math.min(100 - leftPct, widthPct)}%`,
                        }}
                      />
                    </span>
                  );
                })}
              </div>

              <div className="site-studio-pad-foot">
                <span>{waveLabel}</span>
                <span>
                  {item.layers.length} {item.layers.length === 1 ? 'layer' : 'layers'} · {maxMs}ms
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Oscillator Layer Recipe Inspector + One-Click Copy Snippet */}
      <section className="site-studio-inspector" aria-label="Oscillator layer recipe inspector">
        <div className="site-studio-recipe-col">
          <div className="site-studio-recipe-head">
            <div>
              <h2 className="site-studio-recipe-title">
                {spec.label} <code>&apos;{selected}&apos;</code>
              </h2>
              <p className="site-studio-recipe-sub">
                {spec.category} feedback · {spec.layers.length}{' '}
                {spec.layers.length === 1 ? 'oscillator layer' : 'oscillator layers'} ·{' '}
                {totalDurationMs}ms total envelope
              </p>
            </div>
            <Badge tone="neutral">Web Audio API</Badge>
          </div>

          <div className="site-layer-table" role="table" aria-label="Oscillator layers">
            <div className="site-layer-row site-layer-header" role="row">
              <span role="columnheader">Layer</span>
              <span role="columnheader">Source</span>
              <span role="columnheader">Pitch Sweep</span>
              <span role="columnheader">Timing</span>
              <span role="columnheader">Peak Gain</span>
            </div>
            {spec.layers.map((layer, idx) => (
              <div key={idx} className="site-layer-row" role="row">
                <span role="cell">
                  <code>#{idx + 1}</code>
                </span>
                <span role="cell">
                  {layer.noise ? `noise (${layer.noise})` : (layer.wave ?? 'sine')}
                  {layer.cut ? ` · cut ${layer.cut}Hz` : ''}
                </span>
                <span role="cell">
                  <code>
                    {Math.round(layer.hz)}Hz
                    {layer.to ? ` → ${Math.round(layer.to)}Hz` : ''}
                  </code>
                </span>
                <span role="cell">
                  <code>
                    +{layer.at ?? 0}ms · {layer.ms}ms (atk {layer.atk ?? 3}ms)
                  </code>
                </span>
                <span role="cell">
                  <code>{layer.gain}</code>
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="site-studio-snippet-col">
          <CopySnippet
            label="Play in React or Vanilla TS"
            code={`import { playJuiceSound } from '@tokenroll/juice';

// Synthesize "${spec.label}" on interaction
playJuiceSound('${selected}');`}
          />
          <CopySnippet
            label="Zero-React core import"
            code={`import { playJuiceSound } from '@tokenroll/juice/core';\nplayJuiceSound('${selected}');`}
          />
        </div>
      </section>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Global Cmd+K Command Palette Modal
// ─────────────────────────────────────────────────────────────────────────────

type PaletteItem =
  | { kind: 'page'; id: SitePage; label: string; hint: string }
  | { kind: 'doc'; id: DocSectionId; label: string; hint: string }
  | { kind: 'block'; id: string; label: string; hint: string }
  | { kind: 'action'; id: 'toggle-theme' | 'toggle-sound'; label: string; hint: string };

export function CommandPaletteModal({
  open,
  onClose,
  onNavigatePage,
  onNavigateDoc,
  onJumpToBlock,
}: {
  open: boolean;
  onClose: () => void;
  onNavigatePage: (page: SitePage) => void;
  onNavigateDoc: (doc: DocSectionId) => void;
  onJumpToBlock: (blockId: string) => void;
}) {
  const { theme, sound, setTheme, setSound } = useJuice();
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const items = useMemo<PaletteItem[]>(() => {
    const pages: PaletteItem[] = [
      { kind: 'page', id: 'home', label: 'Home', hint: 'Overview & Bento Showcase' },
      {
        kind: 'page',
        id: 'components',
        label: 'Components',
        hint: 'Interactive Component Pages',
      },
      {
        kind: 'block',
        id: 'overview',
        label: `All Components (${BLOCK_CATALOG.length})`,
        hint: 'Full Categorized Directory',
      },
      { kind: 'page', id: 'docs', label: 'Documentation', hint: 'Guides & API Index (182)' },
      { kind: 'page', id: 'sounds', label: 'Sounds', hint: '12 Web Audio Synth Recipes' },
    ];

    const actions: PaletteItem[] = [
      {
        kind: 'action',
        id: 'toggle-theme',
        label: theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme',
        hint: 'Appearance',
      },
      {
        kind: 'action',
        id: 'toggle-sound',
        label: sound ? 'Mute UI Audio' : 'Enable UI Audio',
        hint: 'Web Audio',
      },
    ];

    const docs: PaletteItem[] = DOC_NAV_ITEMS.map((d) => ({
      kind: 'doc',
      id: d.id,
      label: `Docs: ${d.label}`,
      hint: d.group,
    }));

    const blocks: PaletteItem[] = ORDERED_COMPONENTS.map((entry) => ({
      kind: 'block',
      id: entry.block.id,
      label: entry.title,
      hint: `${entry.pillarLabel} · <${entry.block.source.symbol} />`,
    }));

    const q = query.trim().toLowerCase();
    if (!q) {
      return [...pages, ...docs.slice(0, 4), ...blocks.slice(0, 10), ...actions];
    }

    const match = (item: PaletteItem) =>
      item.label.toLowerCase().includes(q) ||
      item.hint.toLowerCase().includes(q) ||
      item.id.toLowerCase().includes(q);

    return [
      ...pages.filter(match),
      ...docs.filter(match),
      ...blocks.filter(match),
      ...actions.filter(match),
    ].slice(0, 28);
  }, [query, sound, theme]);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setActiveIndex(0);
    const id = window.setTimeout(() => inputRef.current?.focus(), 10);
    return () => window.clearTimeout(id);
  }, [open]);

  useEffect(() => {
    if (activeIndex >= items.length) setActiveIndex(0);
  }, [activeIndex, items.length]);

  if (!open) return null;

  const execute = (item: PaletteItem | undefined) => {
    if (!item) return;
    playJuiceSound('tap');
    if (item.kind === 'page') {
      onNavigatePage(item.id);
    } else if (item.kind === 'doc') {
      onNavigateDoc(item.id);
    } else if (item.kind === 'block') {
      onJumpToBlock(item.id);
    } else if (item.id === 'toggle-theme') {
      setTheme(theme === 'dark' ? 'light' : 'dark');
    } else if (item.id === 'toggle-sound') {
      setSound(!sound);
    }
    onClose();
  };

  return (
    <div
      className="site-cmd-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Command Palette"
      onClick={onClose}
    >
      <div className="site-cmd-modal" onClick={(e) => e.stopPropagation()}>
        <div className="site-cmd-input-bar">
          <Search size={15} className="site-cmd-search-icon" />
          <input
            ref={inputRef}
            className="site-cmd-input"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
              } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActiveIndex((i) => (items.length ? (i + 1) % items.length : 0));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActiveIndex((i) => (items.length ? (i - 1 + items.length) % items.length : 0));
              } else if (e.key === 'Enter') {
                e.preventDefault();
                execute(items[activeIndex]);
              }
            }}
            placeholder="Search pages, documentation, or 86 components…"
          />
          <button
            type="button"
            className="site-cmd-close"
            onClick={onClose}
            aria-label="Close command palette"
          >
            <X size={13} />
          </button>
        </div>

        <div className="site-cmd-results">
          {items.map((item, idx) => {
            const active = idx === activeIndex;
            return (
              <button
                key={`${item.kind}-${item.id}`}
                type="button"
                className="site-cmd-row"
                data-active={active ? 'true' : undefined}
                onMouseEnter={() => setActiveIndex(idx)}
                onClick={() => execute(item)}
              >
                <span className="site-cmd-row-left">
                  {item.kind === 'page' ? (
                    item.id === 'home' ? (
                      <Home size={14} />
                    ) : item.id === 'components' ? (
                      <Boxes size={14} />
                    ) : item.id === 'docs' ? (
                      <BookOpen size={14} />
                    ) : (
                      <Volume2 size={14} />
                    )
                  ) : item.kind === 'doc' ? (
                    <BookOpen size={14} />
                  ) : item.kind === 'action' ? (
                    item.id === 'toggle-theme' ? (
                      theme === 'dark' ? (
                        <Sun size={14} />
                      ) : (
                        <Moon size={14} />
                      )
                    ) : sound ? (
                      <VolumeX size={14} />
                    ) : (
                      <Volume2 size={14} />
                    )
                  ) : (
                    <Layers size={14} />
                  )}
                  <span className="site-cmd-row-label">{item.label}</span>
                </span>

                <span className="site-cmd-row-right">
                  <span>{item.hint}</span>
                  {active && <CornerDownLeft size={12} />}
                </span>
              </button>
            );
          })}

          {items.length === 0 && (
            <div className="site-cmd-empty">No matching pages, docs, or components.</div>
          )}
        </div>

        <div className="site-cmd-foot">
          <span>
            <Kbd>↑</Kbd> <Kbd>↓</Kbd> Navigate
          </span>
          <span>
            <Kbd>↵</Kbd> Open · <Kbd>Esc</Kbd> Dismiss
          </span>
        </div>
      </div>
    </div>
  );
}
