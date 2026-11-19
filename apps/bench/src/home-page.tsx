import { useRef, useState } from 'react';
import {
  Button,
  CopySnippet,
  DynamicIsland,
  GroundedAnswer,
  JUICE_SOUND_CATALOG,
  JuiceProvider,
  MediaTransportDock,
  MetricRibbon,
  playJuiceSound,
  ScrubPanel,
  SegmentedControl,
  SlashMentionComposer,
  StateButton,
  SwatchPreviewMatrix,
  ToolApprovalGate,
  type JuiceFill,
  type JuiceSoundName,
  type JuiceTheme,
} from '@tokenroll/juice';
import { ArrowRight, ArrowUpRight, Check, Copy, Terminal, Volume2 } from 'lucide-react';

export type AdoptionTrack = 'npm' | 'cli' | 'skill';

const HERO_INSTALL_MODES = [
  { id: 'npm' as const, label: 'npm', cmd: 'pnpm add @tokenroll/juice' },
  { id: 'cli' as const, label: 'CLI', cmd: 'npx @tokenroll/juice init' },
];

const ADOPTION_OPTIONS = [
  { value: 'npm' as const, label: 'npm' },
  { value: 'cli' as const, label: 'CLI' },
  { value: 'skill' as const, label: 'Skill' },
];

const SIGNATURE_SOUNDS: JuiceSoundName[] = [
  'tap',
  'latch',
  'pop',
  'scrub',
  'paid',
  'landed',
  'swipe',
  'chime',
];

const RAMP_STEPS = [
  { key: 'w4', token: '--juice-w4', mix: '4%', usage: 'Subtle well' },
  { key: 'w6', token: '--juice-w6', mix: '6.5% / 8.5%', usage: 'Row & input track' },
  { key: 'w12', token: '--juice-w12', mix: '12% / 17%', usage: 'Hover & chip fill' },
  { key: 'w20', token: '--juice-w20', mix: '20% / 27%', usage: 'Active & pressed' },
  { key: 'faint', token: '--juice-faint', mix: '34% / 38%', usage: 'Ticks & hints' },
  { key: 'mute', token: '--juice-mute', mix: '52% / 60%', usage: 'Secondary ink' },
] as const;

function BentoCell({
  label,
  blockId,
  onInspect,
  children,
}: {
  label: string;
  blockId: string;
  onInspect: (blockId: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="site-bento-cell">
      <div className="site-bento-stage">{children}</div>
      <button
        type="button"
        className="site-bento-corner"
        onClick={() => {
          playJuiceSound('tap');
          onInspect(blockId);
        }}
        title={`Open ${label} in Component Inspector`}
      >
        <span>{label}</span>
        <ArrowUpRight size={11} />
      </button>
    </div>
  );
}

export function HomePage({
  onBrowseComponents,
  onOpenDocs,
  onOpenSounds,
  onInspectBlock,
}: {
  onBrowseComponents: () => void;
  onOpenDocs: (docId?: string) => void;
  onOpenSounds: () => void;
  onInspectBlock: (blockId: string) => void;
}) {
  const [heroCmdMode, setHeroCmdMode] = useState<'npm' | 'cli'>('npm');
  const [heroCopied, setHeroCopied] = useState(false);
  const copyTimerRef = useRef<number | null>(null);

  const [adoptionTab, setAdoptionTab] = useState<AdoptionTrack>('npm');
  const [previewTheme, setPreviewTheme] = useState<JuiceTheme>('dark');
  const [previewFill, setPreviewFill] = useState<JuiceFill>('slab');
  const [activePad, setActivePad] = useState<JuiceSoundName>('paid');

  const activeHeroCommand =
    HERO_INSTALL_MODES.find((m) => m.id === heroCmdMode)?.cmd ?? HERO_INSTALL_MODES[0]!.cmd;

  const handleCopyHeroCmd = async () => {
    try {
      await navigator.clipboard.writeText(activeHeroCommand);
    } catch {
      // Fallback noop if clipboard permission restricted
    }
    playJuiceSound('paid');
    setHeroCopied(true);
    if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current);
    copyTimerRef.current = window.setTimeout(() => setHeroCopied(false), 1800);
  };

  const activeSoundSpec = JUICE_SOUND_CATALOG[activePad];
  const primaryLayer = activeSoundSpec.layers[0]!;

  return (
    <div className="site-home">
      {/* 1. Editorial Hero */}
      <section className="site-hero" aria-label="Juice UI Overview">
        <button
          type="button"
          className="site-release-pill"
          onClick={() => {
            playJuiceSound('tap');
            onOpenDocs('cli-registry');
          }}
        >
          <span className="site-release-dot" aria-hidden="true" />
          <span>@tokenroll/juice v0.1 · React &amp; Vue 3 · CLI Registry</span>
          <ArrowRight size={13} />
        </button>

        <h1 className="site-hero-h1">Tactile UI components with physics and sound.</h1>

        <p className="site-hero-sub">
          86 interactive blocks and 182 accessible primitives built on concentric color-mix tokens,
          zero-asset Web Audio synthesis, and an Agent Bridge. Install via npm or copy the source
          directly.
        </p>

        <div className="site-hero-actions">
          <div className="site-hero-ctas">
            <Button
              variant="primary"
              size="md"
              className="site-pill-btn"
              onClick={() => {
                playJuiceSound('tap');
                onBrowseComponents();
              }}
            >
              Browse 86 Components
            </Button>
            <Button
              variant="outline"
              size="md"
              className="site-pill-btn site-pill-btn-outline"
              onClick={() => {
                playJuiceSound('tap');
                onOpenDocs('introduction');
              }}
            >
              Get Started
            </Button>
          </div>

          <div className="site-cmd-pill" role="group" aria-label="Quick install command">
            <div className="site-cmd-pill-modes" role="tablist" aria-label="Install method">
              {HERO_INSTALL_MODES.map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  role="tab"
                  aria-selected={heroCmdMode === mode.id}
                  className="site-cmd-pill-tab"
                  data-active={heroCmdMode === mode.id ? 'true' : undefined}
                  onClick={() => {
                    playJuiceSound('tap');
                    setHeroCmdMode(mode.id);
                    setHeroCopied(false);
                  }}
                >
                  {mode.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="site-cmd-pill-copy"
              onClick={handleCopyHeroCmd}
              aria-label={`Copy command: ${activeHeroCommand}`}
            >
              <Terminal size={13} className="site-cmd-pill-icon" />
              <code>{activeHeroCommand}</code>
              <span className="site-cmd-pill-status" data-copied={heroCopied ? 'true' : undefined}>
                {heroCopied ? <Check size={13} /> : <Copy size={13} />}
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* 2. Curated Live Interactive 3-Column Bento Showcase */}
      <section className="site-bento-wrap" aria-label="Live Interactive Component Showcase">
        <div className="site-bento-grid">
          {/* Column 1 */}
          <div className="site-bento-col">
            <BentoCell
              label="SlashMentionComposer"
              blockId="slash-mention-composer"
              onInspect={onInspectBlock}
            >
              <SlashMentionComposer id="home-slash-mention-composer" />
            </BentoCell>

            <BentoCell label="StateButton" blockId="state-button" onInspect={onInspectBlock}>
              <StateButton
                id="home-state-button"
                title="Wire Transfer"
                recipient="studio@joplo.app"
                amount={1280}
              />
            </BentoCell>

            <BentoCell
              label="MediaTransportDock"
              blockId="media-transport-dock"
              onInspect={onInspectBlock}
            >
              <MediaTransportDock id="home-media-transport-dock" />
            </BentoCell>
          </div>

          {/* Column 2 */}
          <div className="site-bento-col">
            <BentoCell label="MetricRibbon" blockId="metric-ribbon" onInspect={onInspectBlock}>
              <MetricRibbon id="home-metric-ribbon" defaultMonth="Nov" />
            </BentoCell>

            <BentoCell label="DynamicIsland" blockId="dynamic-island" onInspect={onInspectBlock}>
              <DynamicIsland id="home-dynamic-island" defaultMode="active" />
            </BentoCell>

            <BentoCell
              label="ToolApprovalGate"
              blockId="tool-approval-gate"
              onInspect={onInspectBlock}
            >
              <ToolApprovalGate id="home-tool-approval-gate" />
            </BentoCell>
          </div>

          {/* Column 3 */}
          <div className="site-bento-col">
            <BentoCell label="ScrubPanel" blockId="scrub-panel" onInspect={onInspectBlock}>
              <ScrubPanel id="home-scrub-panel" />
            </BentoCell>

            <BentoCell label="GroundedAnswer" blockId="grounded-answer" onInspect={onInspectBlock}>
              <GroundedAnswer id="home-grounded-answer" />
            </BentoCell>

            <BentoCell
              label="SwatchPreviewMatrix"
              blockId="swatch-preview-matrix"
              onInspect={onInspectBlock}
            >
              <SwatchPreviewMatrix id="home-swatch-preview-matrix" />
            </BentoCell>
          </div>
        </div>
      </section>

      {/* 3. Three Focused Editorial Sections */}
      <div className="site-editorial-stack">
        {/* Editorial 1: Hybrid Adoption — Three Ways to Ship */}
        <section className="site-editorial-split" aria-labelledby="heading-adoption">
          <div className="site-editorial-copy">
            <h2 id="heading-adoption" className="site-h2">
              Three ways to ship. Zero lock-in.
            </h2>
            <p className="site-editorial-lead">
              Consume versioned subpaths from npm, copy editable TypeScript directly into your
              repository via the CLI registry, or equip coding agents with the official skill.
            </p>

            <dl className="site-feature-dl">
              <div>
                <dt>No &lt;JuiceProvider&gt; required</dt>
                <dd>
                  Every primitive and block works out of the box with module-level sound and{' '}
                  <code>window.__juiceAgent</code> fallbacks. Add a provider only when scoping
                  themes or freezing motion.
                </dd>
              </div>
              <div>
                <dt>Clean /primitives vs /blocks subpaths</dt>
                <dd>
                  Import pure WAI-ARIA controls from <code>@tokenroll/juice/primitives</code>,
                  composed AI &amp; tactile workflows from <code>/blocks</code>, or headless Web
                  Audio from <code>/core</code>.
                </dd>
              </div>
              <div>
                <dt>CLI source ownership &amp; Agent Skill</dt>
                <dd>
                  Run <code>npx @tokenroll/juice add</code> to vendor source files locally, or{' '}
                  <code>npx skills add TokenRollAI/juice</code> so agents know every token and
                  action contract.
                </dd>
              </div>
            </dl>
          </div>

          <div className="site-editorial-panel">
            <div className="site-panel-toolbar">
              <span className="site-panel-caption">Adoption workflow</span>
              <SegmentedControl<AdoptionTrack>
                options={ADOPTION_OPTIONS}
                value={adoptionTab}
                onChange={setAdoptionTab}
              />
            </div>

            {adoptionTab === 'npm' && (
              <div className="site-snippet-stack">
                <CopySnippet
                  label="1. Install package"
                  code="pnpm add @tokenroll/juice lucide-react"
                />
                <CopySnippet
                  label="2. Import primitives or blocks (no provider required)"
                  code={`import '@tokenroll/juice/styles.css';
import { Button, TextField } from '@tokenroll/juice/primitives';
import { ToolApprovalGate } from '@tokenroll/juice/blocks';

export function DeployGate() {
  return (
    <ToolApprovalGate
      id="prod-migration"
      tool="db.migrate"
      command="ALTER TABLE sessions ADD COLUMN trace_id text;"
    />
  );
}`}
                />
              </div>
            )}

            {adoptionTab === 'cli' && (
              <div className="site-snippet-stack">
                <CopySnippet
                  label="1. Bootstrap tokens, Web Audio synth & headless hooks"
                  code="npx @tokenroll/juice init"
                />
                <CopySnippet
                  label="2. Copy specific blocks into src/components/juice/"
                  code={`npx @tokenroll/juice add slash-mention-composer tool-approval-gate

# Inspect all 10 modules, 86 blocks, and 182 exports
npx @tokenroll/juice list`}
                />
              </div>
            )}

            {adoptionTab === 'skill' && (
              <div className="site-snippet-stack">
                <CopySnippet
                  label="1. Install official AI coding skill"
                  code="npx skills add TokenRollAI/juice"
                />
                <CopySnippet
                  label="2. Drive & verify live UI state via Agent Bridge"
                  code={`// Every mounted Juice block registers deterministic actions
const state = window.__juiceAgent.snapshot();
window.__juiceAgent.act('prod-migration', 'approve');`}
                />
              </div>
            )}
          </div>
        </section>

        {/* Editorial 2: Zero-Border Concentric color-mix System */}
        <section className="site-editorial-split" aria-labelledby="heading-tokens">
          <div className="site-editorial-copy">
            <h2 id="heading-tokens" className="site-h2">
              Concentric geometry &amp; two-variable tonal tokens.
            </h2>
            <p className="site-editorial-lead">
              Hierarchy comes from proportional corner radii and a 6-step{' '}
              <code>color-mix(in srgb)</code> tonal ramp derived from just two CSS variables —{' '}
              <code>--fill-on</code> and <code>--fill-slab</code> — eliminating nested 1px border
              clutter.
            </p>

            {/* Concentric 20px -> 14px -> 10px Visual Callout */}
            <div className="site-concentric-diagram" aria-label="Concentric corner radius formula">
              <div className="site-concentric-outer">
                <span className="site-concentric-tag">Outer Slab · 20px (pad 6px)</span>
                <div className="site-concentric-inner">
                  <span className="site-concentric-tag">Inner Track · 14px (20 − 6)</span>
                  <div className="site-concentric-control">
                    <span>Control · 10px</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Live 6-Step Tonal Ramp */}
            <div className="site-ramp-grid" aria-label="6-step color-mix tonal ramp">
              {RAMP_STEPS.map((step) => (
                <div key={step.key} className="site-ramp-card">
                  <div
                    className="site-ramp-swatch"
                    style={{ background: `var(${step.token})` }}
                  />
                  <div className="site-ramp-meta">
                    <code>{step.key}</code>
                    <span>{step.mix}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="site-editorial-panel">
            <div className="site-panel-toolbar">
              <span className="site-panel-caption">Live surface calibration</span>
              <div className="site-inline-controls">
                <SegmentedControl<JuiceFill>
                  options={[
                    { value: 'slab', label: 'Slab' },
                    { value: 'solid', label: 'Solid' },
                  ]}
                  value={previewFill}
                  onChange={setPreviewFill}
                />
                <SegmentedControl<JuiceTheme>
                  options={[
                    { value: 'dark', label: 'Dark' },
                    { value: 'light', label: 'Light' },
                  ]}
                  value={previewTheme}
                  onChange={setPreviewTheme}
                />
              </div>
            </div>

            <JuiceProvider theme={previewTheme} fill={previewFill}>
              <div className="site-token-stage">
                <ScrubPanel
                  id="home-token-scrub"
                  defaultTension={76}
                  defaultRadius={14}
                  defaultSwatch="cobalt"
                />
                <div className="site-token-stage-ramp">
                  {RAMP_STEPS.map((step) => (
                    <div
                      key={step.key}
                      className="site-token-stage-chip"
                      style={{
                        background: `var(${step.token})`,
                        color: step.key === 'mute' ? 'var(--fill-slab)' : 'var(--fill-on)',
                      }}
                    >
                      {step.key}
                    </div>
                  ))}
                </div>
              </div>
            </JuiceProvider>
          </div>
        </section>

        {/* Editorial 3: 3KB Procedural Web Audio Synth */}
        <section className="site-sound-section" aria-labelledby="heading-sound">
          <div className="site-sound-head">
            <div>
              <h2 id="heading-sound" className="site-h2">
                3KB procedural Web Audio synth. Zero MP3 files.
              </h2>
              <p className="site-editorial-lead" style={{ maxWidth: 640 }}>
                12 deterministic acoustic recipes synthesized in real time from sine, triangle, and
                square oscillators plus biquad-filtered noise envelopes. Click any pad to audition.
              </p>
            </div>

            <button
              type="button"
              className="site-text-cta"
              onClick={() => {
                playJuiceSound('tap');
                onOpenSounds();
              }}
            >
              <span>Open Full Sound Studio</span>
              <ArrowRight size={14} />
            </button>
          </div>

          <div className="site-soundboard-strip" role="group" aria-label="8 signature sound pads">
            {SIGNATURE_SOUNDS.map((name) => {
              const spec = JUICE_SOUND_CATALOG[name];
              const first = spec.layers[0]!;
              const isSelected = activePad === name;
              return (
                <button
                  key={name}
                  type="button"
                  className="site-sound-pad"
                  data-active={isSelected ? 'true' : undefined}
                  onClick={() => {
                    setActivePad(name);
                    playJuiceSound(name, true);
                  }}
                >
                  <div className="site-sound-pad-top">
                    <Volume2 size={13} className="site-sound-pad-icon" />
                    <span className="site-sound-pad-hz">{Math.round(first.hz)}Hz</span>
                  </div>
                  <div className="site-sound-pad-name">{spec.label}</div>
                  <div className="site-sound-pad-meta">
                    {spec.category} · {first.ms}ms
                  </div>
                </button>
              );
            })}
          </div>

          <div className="site-soundboard-readout">
            <code>
              {`playJuiceSound('${activePad}')`} · {activeSoundSpec.layers.length}{' '}
              {activeSoundSpec.layers.length === 1 ? 'oscillator' : 'oscillators'} ·{' '}
              {primaryLayer.wave ?? primaryLayer.noise ?? 'sine'} {Math.round(primaryLayer.hz)}Hz
              {primaryLayer.to ? ` → ${Math.round(primaryLayer.to)}Hz` : ''} ({primaryLayer.ms}ms)
            </code>
          </div>
        </section>
      </div>
    </div>
  );
}
