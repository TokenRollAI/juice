import { useMemo, useState, type ReactNode } from 'react';
import {
  Badge,
  CommandPalette,
  Composer,
  DynamicIsland,
  JUICE_SOUND_CATALOG,
  JuiceProvider,
  Kbd,
  MetricRibbon,
  MorphCard,
  playJuiceSound,
  RollingNumber,
  ScrubPanel,
  SegmentedControl,
  SlideConfirm,
  SplitCompare,
  StateButton,
  ThinkingMorph,
  ToastStack,
  useJuice,
  type JuiceAgentBridge,
  type JuiceSoundName,
} from '@juice-ui/react';
import {
  Check,
  Code2,
  Copy,
  Moon,
  Play,
  Sliders,
  Sparkles,
  Sun,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';

type GestureCategory = 'all' | 'press' | 'drag' | 'hover' | 'type' | 'ai';

type BlockSpec = {
  id: string;
  name: string;
  gesture: Exclude<GestureCategory, 'all'>;
  gestureLabel: string;
  summary: string;
  sounds: JuiceSoundName[];
  agentActions: Array<{ label: string; action: string; payload?: unknown }>;
  reactCode: string;
  joploCode: string;
  render: () => ReactNode;
};

const BLOCK_CATALOG: BlockSpec[] = [
  {
    id: 'confirm-send',
    name: 'ConfirmSend',
    gesture: 'press',
    gestureLabel: 'Press · State Machine',
    summary: 'Multi-stage spring payment button (idle → confirming → pending → settled) with zero layout shift.',
    sounds: ['tap', 'latch', 'paid'],
    agentActions: [
      { label: 'Step: Press()', action: 'press' },
      { label: 'Force Settled', action: 'setStage', payload: 'success' },
      { label: 'Reset Idle', action: 'reset' },
    ],
    reactCode: `<StateButton
  id="confirm-send"
  title="Wire Transfer"
  recipient="studio@joplo.app"
  amount={1280}
/>`,
    joploCode: `flow('Approve wire transfer', { start: '/pay' })
  .click('confirm-send', 'Arm confirmation')
  .click('confirm-send', 'Commit transfer', done('Receipt #8841'))`,
    render: () => <StateButton id="confirm-send" />,
  },
  {
    id: 'scrub-panel',
    name: 'PathPanel',
    gesture: 'drag',
    gestureLabel: 'Drag · Scrub Rows',
    summary: 'Concentric 20px → 14px settings slab where the row itself is the slider track with dot ticks.',
    sounds: ['scrub', 'tick', 'pop', 'latch'],
    agentActions: [
      { label: 'Tension → 92%', action: 'setTension', payload: 92 },
      { label: 'Corner → 20px', action: 'setRadius', payload: 20 },
      { label: 'Signal → Emerald', action: 'setSwatch', payload: 'emerald' },
      { label: 'Toggle Snap', action: 'toggleSnap' },
    ],
    reactCode: `<ScrubPanel
  id="scrub-panel"
  defaultTension={72}
  defaultRadius={14}
  defaultSwatch="cobalt"
/>`,
    joploCode: `flow('Tune spring physics', { start: '/studio' })
  .drag('scrub-panel', 'Scrub tension to 92%', set($.ui.tension, 92))`,
    render: () => <ScrubPanel id="scrub-panel" />,
  },
  {
    id: 'slide-confirm',
    name: 'WakeSlider',
    gesture: 'drag',
    gestureLabel: 'Drag · High Consequence',
    summary: 'Drag-to-deploy track with spring snap-back on early release, keyboard Enter support, and chord chime.',
    sounds: ['lift', 'drop', 'landed'],
    agentActions: [
      { label: 'Commit Deploy', action: 'confirm' },
      { label: 'Reset Track', action: 'reset' },
    ],
    reactCode: `<SlideConfirm
  id="slide-confirm"
  label="Slide to deploy production"
  confirmedLabel="Production deployed · v2.4.0"
/>`,
    joploCode: `flow('Release to production', { start: '/deploy' })
  .drag('slide-confirm', 'Slide thumb to commit release', done('v2.4.0 live'))`,
    render: () => <SlideConfirm id="slide-confirm" />,
  },
  {
    id: 'dynamic-island',
    name: 'DynamicIsland',
    gesture: 'press',
    gestureLabel: 'Press · Spatial Morph',
    summary: '3-stage morphing capsule (compact → active → expanded) with static-safe equalizer bars.',
    sounds: ['tap', 'pop', 'paid'],
    agentActions: [
      { label: 'Mode: Compact', action: 'setMode', payload: 'compact' },
      { label: 'Mode: Active', action: 'setMode', payload: 'active' },
      { label: 'Mode: Expanded', action: 'setMode', payload: 'expanded' },
    ],
    reactCode: `<DynamicIsland
  id="dynamic-island"
  defaultMode="active"
/>`,
    joploCode: `flow('Expand live walkthrough capsule', { start: '/stage' })
  .click('dynamic-island', 'Expand active voice session')`,
    render: () => <DynamicIsland id="dynamic-island" />,
  },
  {
    id: 'morph-card',
    name: 'MorphCard',
    gesture: 'press',
    gestureLabel: 'Press · In-Place Disclosure',
    summary: 'Expands inline from a summary row into a budget cap editor without modal interruption.',
    sounds: ['pop', 'tick', 'paid'],
    agentActions: [
      { label: 'Expand Inline', action: 'open' },
      { label: 'Set Cap $5,000', action: 'setLimit', payload: 5000 },
      { label: 'Collapse', action: 'close' },
    ],
    reactCode: `<MorphCard
  id="morph-card"
  defaultOpened={false}
/>`,
    joploCode: `flow('Adjust worker spend cap inline', { start: '/billing' })
  .click('morph-card', 'Open inline spend inspector')`,
    render: () => <MorphCard id="morph-card" />,
  },
  {
    id: 'metric-ribbon',
    name: 'IncomeFlow',
    gesture: 'hover',
    gestureLabel: 'Hover · Rolling Odometer',
    summary: 'Interactive monthly volume bars paired with a per-digit rolling odometer and delta badge.',
    sounds: ['tick'],
    agentActions: [
      { label: 'Inspect Aug ($53.9k)', action: 'selectMonth', payload: 'Aug' },
      { label: 'Inspect Oct ($74.2k)', action: 'selectMonth', payload: 'Oct' },
      { label: 'Inspect Nov ($89.6k)', action: 'selectMonth', payload: 'Nov' },
    ],
    reactCode: `<MetricRibbon
  id="metric-ribbon"
  defaultMonth="Nov"
/>`,
    joploCode: `flow('Compare Q4 recurring volume', { start: '/metrics' })
  .hover('metric-ribbon', 'Scrub from August to November')`,
    render: () => <MetricRibbon id="metric-ribbon" />,
  },
  {
    id: 'ai-composer',
    name: 'AiComposer',
    gesture: 'type',
    gestureLabel: 'Type · Agent Native',
    summary: 'Multi-modal prompt composer with context attachment pills, model cycler, and quick polish chips.',
    sounds: ['tap', 'pop'],
    agentActions: [
      { label: 'Cycle Model', action: 'cycleModel' },
      {
        label: 'Fill Demo Prompt',
        action: 'type',
        payload: 'Convert modal into a concentric 20px -> 14px MorphCard',
      },
      { label: 'Dispatch Prompt', action: 'submit' },
    ],
    reactCode: `<Composer
  id="ai-composer"
  defaultModel="Claude 4.6"
/>`,
    joploCode: `flow('Ask agent to refine UI', { start: '/chat' })
  .type('ai-composer', 'Convert modal into an inline MorphCard')
  .click('ai-composer', 'Dispatch prompt')`,
    render: () => <Composer id="ai-composer" />,
  },
  {
    id: 'thinking-morph',
    name: 'ThinkingMorph',
    gesture: 'ai',
    gestureLabel: 'AI · Reasoning → Artifact',
    summary: 'Collapsible reasoning trace and tool execution steps that settle into a clickable artifact pill.',
    sounds: ['tap', 'paid'],
    agentActions: [
      { label: 'Step 1: Analyzing', action: 'setStep', payload: 0 },
      { label: 'Step 2: Patching', action: 'setStep', payload: 1 },
      { label: 'Step 3: Artifact Ready', action: 'setStep', payload: 2 },
    ],
    reactCode: `<ThinkingMorph
  id="thinking-morph"
  defaultStep={2}
/>`,
    joploCode: `flow('Stream agent reasoning into artifact', { start: '/agent' })
  .system('Tools complete', set($.ui.step, 2))`,
    render: () => <ThinkingMorph id="thinking-morph" />,
  },
  {
    id: 'command-palette',
    name: 'CommandPalette',
    gesture: 'type',
    gestureLabel: 'Type · Roving Focus',
    summary: 'Keyboard-navigable launcher with instant filtering, ↑/↓ roving highlight, and Kbd badges.',
    sounds: ['tick', 'pop'],
    agentActions: [
      { label: 'Filter "Audio"', action: 'search', payload: 'Audio' },
      { label: 'Clear Filter', action: 'search', payload: '' },
      { label: 'Execute Highlighted', action: 'execute' },
    ],
    reactCode: `<CommandPalette
  id="command-palette"
  onExecute={(cmd) => console.log(cmd)}
/>`,
    joploCode: `flow('Launch command via keyboard', { start: '/workspace' })
  .type('command-palette', 'Audio')
  .press('Enter', 'Trigger procedural sound synth')`,
    render: () => <CommandPalette id="command-palette" />,
  },
  {
    id: 'toast-stack',
    name: 'ToastStack',
    gesture: 'hover',
    gestureLabel: 'Hover · Z-Axis Stack',
    summary: 'Sonner-inspired 3D stacked notifications that fan out on hover with optimistic inline Undo.',
    sounds: ['pop', 'tap'],
    agentActions: [
      { label: '+ Push Event Toast', action: 'pushToast' },
      { label: 'Fan Out Stack', action: 'setExpanded', payload: true },
      { label: 'Collapse Stack', action: 'setExpanded', payload: false },
      { label: 'Undo Latest', action: 'undoTop' },
    ],
    reactCode: `<ToastStack id="toast-stack" />`,
    joploCode: `flow('Inspect stacked notifications & undo', { start: '/app' })
  .hover('toast-stack', 'Fan out recent events')`,
    render: () => <ToastStack id="toast-stack" />,
  },
  {
    id: 'split-compare',
    name: 'SplitCompare',
    gesture: 'drag',
    gestureLabel: 'Drag · Before / After',
    summary: 'Interactive before-and-after surface comparison comparing boxy wireframes vs Juice concentric slabs.',
    sounds: ['scrub'],
    agentActions: [
      { label: 'Reveal 25%', action: 'setSplit', payload: 25 },
      { label: 'Center 50%', action: 'setSplit', payload: 50 },
      { label: 'Reveal 80%', action: 'setSplit', payload: 80 },
    ],
    reactCode: `<SplitCompare
  id="split-compare"
  defaultSplit={54}
/>`,
    joploCode: `flow('Compare wireframe vs concentric craft', { start: '/review' })
  .drag('split-compare', 'Scrub comparison divider to 80%')`,
    render: () => <SplitCompare id="split-compare" />,
  },
  {
    id: 'rolling-odometer',
    name: 'RollingOdometer',
    gesture: 'ai',
    gestureLabel: 'AI & Data · Live Counter',
    summary: 'Standalone per-digit rolling odometer card with instant step buttons for live metric storytelling.',
    sounds: ['tick', 'pop'],
    agentActions: [],
    reactCode: `<RollingNumber value={148920} prefix="$" />`,
    joploCode: `flow('Update revenue counter', { start: '/dashboard' })
  .system('New enterprise seat added', set($.data.arr, 148920))`,
    render: () => <OdometerPlayground />,
  },
];

function OdometerPlayground() {
  const { playSound } = useJuice();
  const [val, setVal] = useState(148920);
  return (
    <div className="j-slab" style={{ width: 304, padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: 'var(--juice-mute)' }}>Annual Recurring Revenue</span>
        <Badge tone="ok">+24.8% YoY</Badge>
      </div>
      <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: '-0.03em' }}>
        <RollingNumber value={val} prefix="$" />
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        {[
          { label: '-$1,250', delta: -1250 },
          { label: '+$4,800', delta: 4800 },
          { label: '+$25,000', delta: 25000 },
        ].map((btn) => (
          <button
            key={btn.label}
            type="button"
            className="j-chip"
            style={{ flex: 1, justifyContent: 'center' }}
            onClick={() => {
              playSound('pop');
              setVal((v) => Math.max(0, v + btn.delta));
            }}
          >
            {btn.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function BenchInner() {
  const { theme, fill, sound, animate, setTheme, setFill, setSound, setAnimate } = useJuice();
  const [category, setCategory] = useState<GestureCategory>('all');
  const [selectedId, setSelectedId] = useState<string>('scrub-panel');
  const [showSoundStrip, setShowSoundStrip] = useState<boolean>(true);
  const [codeTab, setCodeTab] = useState<'react' | 'joplo'>('react');
  const [copied, setCopied] = useState<boolean>(false);
  const [agentTick, setAgentTick] = useState<number>(0);

  const filteredBlocks = useMemo(() => {
    if (category === 'all') return BLOCK_CATALOG;
    return BLOCK_CATALOG.filter((b) => b.gesture === category);
  }, [category]);

  const selectedBlock = useMemo(
    () => BLOCK_CATALOG.find((b) => b.id === selectedId) ?? BLOCK_CATALOG[0]!,
    [selectedId],
  );

  const liveSnapshot = useMemo(() => {
    void agentTick;
    if (typeof window === 'undefined') return null;
    const bridge = (window as unknown as { __juiceAgent?: JuiceAgentBridge }).__juiceAgent;
    const all = bridge?.snapshot();
    return all?.[selectedBlock.id]?.state ?? null;
  }, [selectedBlock.id, agentTick]);

  const triggerAgentAction = (action: string, payload?: unknown) => {
    const bridge = (window as unknown as { __juiceAgent?: JuiceAgentBridge }).__juiceAgent;
    bridge?.act(selectedBlock.id, action, payload);
    setAgentTick((t) => t + 1);
  };

  const copySnippet = () => {
    const text = codeTab === 'react' ? selectedBlock.reactCode : selectedBlock.joploCode;
    navigator.clipboard?.writeText(text).catch(() => {});
    playJuiceSound('tap');
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };

  return (
    <div className="bench-shell">
      {/* Sticky Header */}
      <header className="bench-topbar">
        <div className="bench-topbar-inner">
          <div className="bench-brand">
            <div className="bench-logo">J</div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="bench-title">Juice</span>
                <Badge tone="signal">v0.1 · Bench</Badge>
              </div>
              <div className="bench-subtitle">
                Tactile React UI Blocks · Headless Behaviors · 3KB Web Audio Synth · Joplo Ready
              </div>
            </div>
          </div>

          <div className="bench-controls">
            {/* Fill Tone: Slab vs Solid */}
            <SegmentedControl
              options={[
                { value: 'slab', label: 'Slab' },
                { value: 'solid', label: 'Solid' },
              ]}
              value={fill}
              onChange={(v) => setFill(v)}
            />

            {/* Motion vs Static Frame (Joplo Storyboard Determinism Mode) */}
            <SegmentedControl
              options={[
                { value: 'spring', label: 'Spring' },
                { value: 'static', label: 'Static Frame' },
              ]}
              value={animate ? 'spring' : 'static'}
              onChange={(v) => setAnimate(v === 'spring')}
            />

            {/* Sound Synth Strip Toggle */}
            <button
              type="button"
              className="j-chip"
              onClick={() => {
                playJuiceSound('tap', true);
                setShowSoundStrip((s) => !s);
              }}
              style={{
                height: 32,
                padding: '0 11px',
                background: showSoundStrip ? 'var(--juice-ink)' : 'var(--juice-w6)',
                color: showSoundStrip ? 'var(--juice-bg)' : 'var(--juice-ink)',
              }}
            >
              <Volume2 size={14} />
              <span>Synth Pad (12)</span>
            </button>

            {/* Mute / Unmute */}
            <button
              type="button"
              className="j-chip"
              aria-label={sound ? 'Mute UI sounds' : 'Enable UI sounds'}
              onClick={() => setSound(!sound)}
              style={{ height: 32, padding: '0 10px' }}
            >
              {sound ? <Volume2 size={14} /> : <VolumeX size={14} />}
              <span>{sound ? 'Audio On' : 'Muted'}</span>
            </button>

            {/* Light / Dark Theme */}
            <button
              type="button"
              className="j-chip"
              aria-label="Toggle color theme"
              onClick={() => {
                playJuiceSound('tap');
                setTheme(theme === 'light' ? 'dark' : 'light');
              }}
              style={{ height: 32, padding: '0 11px' }}
            >
              {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
              <span>{theme === 'light' ? 'Dark' : 'Light'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Expandable Procedural Web Audio Synth Pad Strip */}
      {showSoundStrip && (
        <section className="bench-sound-strip" aria-label="Procedural Web Audio Sound Synthesizer">
          <div className="bench-sound-strip-inner">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Badge tone="neutral">Web Audio Synth</Badge>
              <span style={{ fontSize: 12.5, color: 'var(--juice-mute)' }}>
                Zero MP3 assets · Click any pad to synthesize oscillator + filter envelope live:
              </span>
            </div>
            <div className="bench-sound-pads">
              {(Object.keys(JUICE_SOUND_CATALOG) as JuiceSoundName[]).map((name) => {
                const spec = JUICE_SOUND_CATALOG[name];
                const firstLayer = spec.layers[0]!;
                return (
                  <button
                    key={name}
                    type="button"
                    className="bench-sound-pad"
                    onClick={() => playJuiceSound(name, true)}
                  >
                    <span>{spec.label}</span>
                    <span className="bench-sound-pad-hz">{Math.round(firstLayer.hz)}Hz</span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Main Workspace: Filter Bar + Live Block Grid + Lateral Inspector */}
      <div className="bench-workspace">
        <main className="bench-main">
          <div className="bench-filter-bar">
            <SegmentedControl<GestureCategory>
              options={[
                { value: 'all', label: `All (${BLOCK_CATALOG.length})` },
                { value: 'press', label: 'Press' },
                { value: 'drag', label: 'Drag' },
                { value: 'hover', label: 'Hover' },
                { value: 'type', label: 'Type' },
                { value: 'ai', label: 'AI & Data' },
              ]}
              value={category}
              onChange={setCategory}
            />

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--juice-mute)' }}>
              <span>Every block is live on the canvas — drag, type, or drive via</span>
              <Kbd>__juiceAgent</Kbd>
            </div>
          </div>

          <div className="bench-grid">
            {filteredBlocks.map((block) => {
              const isSelected = block.id === selectedBlock.id;
              return (
                <article
                  key={block.id}
                  className="bench-cell"
                  data-selected={isSelected ? 'true' : undefined}
                  onClick={() => setAgentTick((t) => t + 1)}
                >
                  <div className="bench-cell-stage">{block.render()}</div>

                  <div className="bench-cell-footer">
                    <div>
                      <div className="bench-cell-name">{block.name}</div>
                      <div className="bench-cell-gesture">{block.gestureLabel}</div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {block.sounds.slice(0, 2).map((snd) => (
                        <button
                          key={snd}
                          type="button"
                          className="j-chip"
                          title={`Audition ${snd} sound`}
                          style={{ height: 24, padding: '0 7px', fontSize: 11 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            playJuiceSound(snd, true);
                          }}
                        >
                          <Volume2 size={11} />
                          <span>{snd}</span>
                        </button>
                      ))}
                      <button
                        type="button"
                        className="bench-inspect-btn"
                        data-active={isSelected ? 'true' : undefined}
                        onClick={() => {
                          playJuiceSound('tap');
                          setSelectedId(block.id);
                          setAgentTick((t) => t + 1);
                        }}
                      >
                        <Sliders size={12} />
                        <span>Inspect</span>
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </main>

        {/* Non-blocking Contextual Lateral Inspector */}
        <aside className="bench-inspector" aria-label="Component & Agent Bridge Inspector">
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 16, fontWeight: 650, letterSpacing: '-0.02em' }}>
                  {selectedBlock.name}
                </span>
                <Badge tone="signal">{selectedBlock.gestureLabel}</Badge>
              </div>
              <p style={{ margin: '6px 0 0', fontSize: 12.5, color: 'var(--juice-mute)', lineHeight: 1.45 }}>
                {selectedBlock.summary}
              </p>
            </div>
          </div>

          {/* 1. Agent Bridge & Joplo Programmatic Driver */}
          {selectedBlock.agentActions.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, fontWeight: 600 }}>
                  Agent &amp; Joplo Step Driver (<Kbd>act()</Kbd>)
                </span>
                <span style={{ fontSize: 11, color: 'var(--juice-mute)' }}>Programmatic control</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {selectedBlock.agentActions.map((actItem) => (
                  <button
                    key={actItem.label}
                    type="button"
                    className="j-chip"
                    onClick={() => triggerAgentAction(actItem.action, actItem.payload)}
                  >
                    <Play size={11} />
                    <span>{actItem.label}</span>
                  </button>
                ))}
              </div>
              {liveSnapshot && (
                <pre
                  className="bench-code-box"
                  style={{ fontSize: 11, padding: '8px 10px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                >
                  {`snapshot("${selectedBlock.id}") → ${JSON.stringify(liveSnapshot)}`}
                </pre>
              )}
            </div>
          )}

          {/* 2. Concentric Tonal Ramp Live Preview */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <span style={{ fontWeight: 600 }}>Concentric color-mix Ramp</span>
              <span style={{ color: 'var(--juice-mute)', fontSize: 11 }}>20px → 14px → 10px</span>
            </div>
            <div className="bench-token-ramp">
              {[
                { name: 'w4', bg: 'var(--juice-w4)' },
                { name: 'w6', bg: 'var(--juice-w6)' },
                { name: 'w12', bg: 'var(--juice-w12)' },
                { name: 'w20', bg: 'var(--juice-w20)' },
                { name: 'faint', bg: 'var(--juice-faint)' },
                { name: 'mute', bg: 'var(--juice-mute)' },
              ].map((tok) => (
                <div
                  key={tok.name}
                  className="bench-token-swatch"
                  style={{ background: tok.bg, color: 'var(--juice-ink)' }}
                >
                  {tok.name}
                </div>
              ))}
            </div>
          </div>

          {/* 3. Code Snippets: Standalone React vs Joplo Flow */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <SegmentedControl
                options={[
                  { value: 'react', label: 'React TSX', icon: <Code2 size={12} /> },
                  { value: 'joplo', label: 'Joplo Flow', icon: <Sparkles size={12} /> },
                ]}
                value={codeTab}
                onChange={setCodeTab}
              />

              <button type="button" className="j-chip" onClick={copySnippet}>
                {copied ? <Check size={12} /> : <Copy size={12} />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            <pre className="bench-code-box">
              {codeTab === 'react' ? selectedBlock.reactCode : selectedBlock.joploCode}
            </pre>
          </div>
        </aside>
      </div>
    </div>
  );
}

export function App() {
  return (
    <JuiceProvider defaultTheme="light" defaultFill="slab" defaultSound={true} defaultAnimate={true}>
      <BenchInner />
    </JuiceProvider>
  );
}
