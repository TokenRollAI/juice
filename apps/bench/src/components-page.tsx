import { useEffect, useMemo, useState } from 'react';
import {
  Badge,
  Button,
  CopySnippet,
  IconButton,
  Kbd,
  playJuiceSound,
  SegmentedControl,
  TextField,
  useJuice,
  type JuiceAgentBridge,
  type JuiceFill,
} from '@tokenroll/juice';
import { Play, Search, SlidersHorizontal, Volume2, X } from 'lucide-react';
import {
  BLOCK_CATALOG,
  deriveVueSnippet,
  type CodeTab,
  type GestureCategory,
} from './catalog.tsx';

const CATEGORY_LABELS: Array<{ id: GestureCategory; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'foundation', label: 'Foundation' },
  { id: 'ai', label: 'AI & Agents' },
  { id: 'press', label: 'Press' },
  { id: 'drag', label: 'Drag' },
  { id: 'hover', label: 'Hover & Type' },
  { id: 'workspace', label: 'Workspace' },
];

const RAMP_TOKENS = [
  { name: 'w4', bg: 'var(--juice-w4)' },
  { name: 'w6', bg: 'var(--juice-w6)' },
  { name: 'w12', bg: 'var(--juice-w12)' },
  { name: 'w20', bg: 'var(--juice-w20)' },
  { name: 'faint', bg: 'var(--juice-faint)' },
  { name: 'mute', bg: 'var(--juice-mute)' },
] as const;

export function ComponentsPage({
  inspectedId,
  onInspectChange,
  commandOpen,
}: {
  inspectedId: string | null;
  onInspectChange: (id: string | null) => void;
  commandOpen: boolean;
}) {
  const { fill, animate, setFill, setAnimate } = useJuice();
  const [category, setCategory] = useState<GestureCategory>('all');
  const [query, setQuery] = useState('');
  const [codeTab, setCodeTab] = useState<CodeTab>('react');
  const [agentTick, setAgentTick] = useState(0);

  // Dismiss slide-over drawer on Escape (when Cmd+K modal is not active)
  useEffect(() => {
    if (!inspectedId || commandOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onInspectChange(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [inspectedId, commandOpen, onInspectChange]);

  // If an inspectedId is pushed externally (e.g. from Home bento, Docs API, or Cmd+K), ensure it is visible
  useEffect(() => {
    if (!inspectedId) return;
    const target = BLOCK_CATALOG.find((b) => b.id === inspectedId || b.demoId === inspectedId);
    if (!target) return;
    const matchesCurrent =
      (category === 'all' || target.gesture === category) &&
      (!query.trim() ||
        target.name.toLowerCase().includes(query.trim().toLowerCase()) ||
        target.source.symbol.toLowerCase().includes(query.trim().toLowerCase()));
    if (!matchesCurrent) {
      setCategory('all');
      setQuery('');
    }
  }, [inspectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  const counts = useMemo(() => {
    const map: Record<GestureCategory, number> = {
      all: BLOCK_CATALOG.length,
      foundation: 0,
      ai: 0,
      press: 0,
      drag: 0,
      hover: 0,
      workspace: 0,
    };
    for (const block of BLOCK_CATALOG) {
      map[block.gesture]++;
    }
    return map;
  }, []);

  const filteredBlocks = useMemo(() => {
    const q = query.trim().toLowerCase();
    return BLOCK_CATALOG.filter((block) => {
      const catMatch = category === 'all' || block.gesture === category;
      if (!catMatch) return false;
      if (!q) return true;
      return (
        block.name.toLowerCase().includes(q) ||
        block.source.symbol.toLowerCase().includes(q) ||
        block.id.toLowerCase().includes(q) ||
        block.gestureLabel.toLowerCase().includes(q) ||
        block.summary.toLowerCase().includes(q)
      );
    });
  }, [category, query]);

  const inspectedBlock = useMemo(() => {
    if (!inspectedId) return null;
    return (
      BLOCK_CATALOG.find((b) => b.id === inspectedId || b.demoId === inspectedId) ?? null
    );
  }, [inspectedId]);

  const agentNodeId = inspectedBlock ? (inspectedBlock.demoId ?? inspectedBlock.id) : null;

  const liveSnapshot = useMemo(() => {
    void agentTick;
    if (!agentNodeId || typeof window === 'undefined') return null;
    const bridge = (window as unknown as { __juiceAgent?: JuiceAgentBridge }).__juiceAgent;
    const all = bridge?.snapshot();
    return all?.[agentNodeId]?.state ?? null;
  }, [agentNodeId, agentTick]);

  const runAgentAction = (action: string, payload?: unknown) => {
    if (!agentNodeId) return;
    const bridge = (window as unknown as { __juiceAgent?: JuiceAgentBridge }).__juiceAgent;
    bridge?.act(agentNodeId, action, payload);
    setAgentTick((t) => t + 1);
  };

  const activeSnippet = useMemo(() => {
    if (!inspectedBlock) return '';
    if (codeTab === 'vue') return deriveVueSnippet(inspectedBlock);
    if (codeTab === 'joplo') return inspectedBlock.joploCode;
    if (codeTab === 'cli') {
      return `npx @tokenroll/juice init && npx @tokenroll/juice add ${inspectedBlock.id}`;
    }
    const { symbol } = inspectedBlock.source;
    const body = inspectedBlock.reactCode.includes(`<${symbol}`)
      ? inspectedBlock.reactCode
      : `<${symbol} id="${inspectedBlock.demoId ?? inspectedBlock.id}" />`;
    return `import '@tokenroll/juice/styles.css';
import { ${symbol} } from '@tokenroll/juice/blocks';

export default function Example() {
  return (
    ${body.split('\n').join('\n    ')}
  );
}`;
  }, [codeTab, inspectedBlock]);

  return (
    <div className="site-gallery-page">
      {/* Page Header */}
      <header className="site-gallery-header">
        <div>
          <div className="site-gallery-title-row">
            <h1 className="site-page-h1">Components &amp; Blocks</h1>
            <span className="site-count-pill">
              {filteredBlocks.length === BLOCK_CATALOG.length
                ? `${BLOCK_CATALOG.length} blocks`
                : `${filteredBlocks.length} of ${BLOCK_CATALOG.length}`}
            </span>
          </div>
          <p className="site-page-sub">
            Interactive React &amp; Vue 3 blocks with spring physics, procedural Web Audio, and
            programmatic Agent Bridge hooks.
          </p>
        </div>

        {/* Subtle Surface & Motion Toggles tucked cleanly inside Gallery */}
        <div className="site-gallery-env-toggles" aria-label="Stage surface and motion preview">
          <SegmentedControl<JuiceFill>
            options={[
              { value: 'slab', label: 'Slab' },
              { value: 'solid', label: 'Solid' },
            ]}
            value={fill}
            onChange={setFill}
          />
          <SegmentedControl<'spring' | 'static'>
            options={[
              { value: 'spring', label: 'Spring' },
              { value: 'static', label: 'Static' },
            ]}
            value={animate ? 'spring' : 'static'}
            onChange={(next) => setAnimate(next === 'spring')}
          />
        </div>
      </header>

      {/* Single-Row bencho.dev-Style Category Pill Strip + Right-Aligned Search */}
      <div className="site-gallery-toolbar">
        <div className="site-category-strip" role="tablist" aria-label="Filter by interaction category">
          {CATEGORY_LABELS.map((cat) => {
            const active = category === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                role="tab"
                aria-selected={active}
                className="site-category-pill"
                data-active={active ? 'true' : undefined}
                onClick={() => {
                  playJuiceSound('tap');
                  setCategory(cat.id);
                }}
              >
                <span>{cat.label}</span>
                {cat.id === 'all' && <span className="site-category-count">({counts.all})</span>}
              </button>
            );
          })}
        </div>

        <div className="site-gallery-search">
          <TextField
            aria-label="Search components"
            value={query}
            onChange={setQuery}
            placeholder="Filter 86 blocks…"
            prefix={<Search size={13} />}
            clearable
          />
        </div>
      </div>

      {/* Full-Width Spacious 3-Column Grid (NO permanent sidebar!) */}
      {filteredBlocks.length > 0 ? (
        <div className="site-gallery-grid">
          {filteredBlocks.map((block) => {
            const isInspected = inspectedBlock?.id === block.id;
            const displaySymbol = block.source.symbol;
            return (
              <article
                key={block.id}
                data-block-cell={block.demoId ?? block.id}
                className="site-gallery-card"
                data-inspected={isInspected ? 'true' : undefined}
                onClick={() => {
                  if (isInspected) setAgentTick((t) => t + 1);
                }}
              >
                <div className="site-gallery-stage">{block.render()}</div>

                <div className="site-gallery-card-bar">
                  <div className="site-gallery-card-meta">
                    <span className="site-gallery-card-name">{displaySymbol}</span>
                    <span className="site-gallery-card-sub">{block.gestureLabel}</span>
                  </div>

                  <div className="site-gallery-card-actions">
                    {block.sounds[0] && (
                      <button
                        type="button"
                        className="site-quiet-chip"
                        title={`Audition "${block.sounds[0]}" sound`}
                        onClick={(e) => {
                          e.stopPropagation();
                          playJuiceSound(block.sounds[0]!, true);
                        }}
                      >
                        <Volume2 size={11} />
                        <span>{block.sounds[0]}</span>
                      </button>
                    )}

                    <button
                      type="button"
                      className="site-inspect-trigger"
                      data-active={isInspected ? 'true' : undefined}
                      onClick={(e) => {
                        e.stopPropagation();
                        playJuiceSound('tap');
                        onInspectChange(isInspected ? null : block.id);
                        setAgentTick((t) => t + 1);
                      }}
                    >
                      <SlidersHorizontal size={12} />
                      <span>{isInspected ? 'Inspecting' : 'Inspect'}</span>
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="site-empty-box">
          <div className="site-empty-title">No blocks matching &ldquo;{query}&rdquo;</div>
          <div className="site-empty-sub">
            Try searching by component name, gesture category, or interaction keyword.
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setQuery('');
              setCategory('all');
            }}
          >
            Reset filters
          </Button>
        </div>
      )}

      {/* Non-Blocking Right Slide-Over Inspector Drawer (440px) */}
      {inspectedBlock && (
        <aside
          className="site-inspector-drawer"
          aria-label={`Inspector for ${inspectedBlock.source.symbol}`}
        >
          <div className="site-drawer-head">
            <div style={{ minWidth: 0 }}>
              <div className="site-drawer-title-row">
                <h2 className="site-drawer-title">{inspectedBlock.source.symbol}</h2>
                <Badge tone="neutral">{inspectedBlock.gestureLabel}</Badge>
              </div>
              <p className="site-drawer-summary">{inspectedBlock.summary}</p>
            </div>

            <IconButton
              label="Close inspector (Esc)"
              variant="ghost"
              size="sm"
              onClick={() => {
                playJuiceSound('tap');
                onInspectChange(null);
              }}
            >
              <X size={15} />
            </IconButton>
          </div>

          <div className="site-drawer-body">
            {/* 1. Agent Bridge & Joplo Step Driver + Live snapshot() */}
            <section className="site-drawer-section">
              <div className="site-drawer-section-head">
                <span className="site-drawer-label">
                  Agent Bridge Driver <Kbd>act()</Kbd>
                </span>
                <span className="site-drawer-hint">id=&ldquo;{agentNodeId}&rdquo;</span>
              </div>

              {inspectedBlock.agentActions.length > 0 && (
                <div className="site-driver-chips">
                  {inspectedBlock.agentActions.map((actItem) => (
                    <button
                      key={actItem.label}
                      type="button"
                      className="site-driver-btn"
                      onClick={() => runAgentAction(actItem.action, actItem.payload)}
                    >
                      <Play size={11} />
                      <span>{actItem.label}</span>
                    </button>
                  ))}
                </div>
              )}

              <pre className="site-json-box">
                {`// window.__juiceAgent.snapshot()["${agentNodeId}"]\n${
                  liveSnapshot ? JSON.stringify(liveSnapshot, null, 2) : '{ "mounted": true }'
                }`}
              </pre>
            </section>

            {/* 2. Concentric color-mix Ramp Preview */}
            <section className="site-drawer-section">
              <div className="site-drawer-section-head">
                <span className="site-drawer-label">Concentric color-mix Ramp</span>
                <span className="site-drawer-hint">20px → 14px → 10px</span>
              </div>

              <div className="site-drawer-ramp">
                {RAMP_TOKENS.map((tok) => (
                  <div
                    key={tok.name}
                    className="site-drawer-swatch"
                    style={{
                      background: tok.bg,
                      color: tok.name === 'mute' ? 'var(--fill-slab)' : 'var(--fill-on)',
                    }}
                  >
                    {tok.name}
                  </div>
                ))}
              </div>
            </section>

            {/* 3. React | Vue 3 | CLI | Joplo Code Tabs */}
            <section className="site-drawer-section">
              <div className="site-drawer-section-head">
                <span className="site-drawer-label">Source &amp; Usage</span>
                <SegmentedControl<CodeTab>
                  options={[
                    { value: 'react', label: 'React' },
                    { value: 'vue', label: 'Vue 3' },
                    { value: 'cli', label: 'CLI' },
                    { value: 'joplo', label: 'Joplo' },
                  ]}
                  value={codeTab}
                  onChange={setCodeTab}
                />
              </div>

              <CopySnippet
                code={activeSnippet}
                label={
                  codeTab === 'react'
                    ? '@tokenroll/juice/blocks'
                    : codeTab === 'vue'
                      ? '@tokenroll/juice-vue'
                      : codeTab === 'cli'
                        ? 'CLI source copy'
                        : 'Joplo storyboard flow'
                }
              />

              {codeTab === 'cli' && (
                <CopySnippet
                  code={`import './components/juice/juice.css';\nimport { ${inspectedBlock.source.symbol} } from './components/juice/${inspectedBlock.source.module}';`}
                  label="Local import after CLI add"
                />
              )}
            </section>
          </div>

          <div className="site-drawer-foot">
            <span>
              Module: <code>{inspectedBlock.source.module}.tsx</code>
            </span>
            <span>
              Press <Kbd>Esc</Kbd> to close
            </span>
          </div>
        </aside>
      )}
    </div>
  );
}
