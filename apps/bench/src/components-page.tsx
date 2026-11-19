import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Button,
  CopySnippet,
  playJuiceSound,
  useJuice,
  type JuiceAgentBridge,
} from '@tokenroll/juice';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  LayoutGrid,
  PanelLeft,
  Play,
  Search,
  Volume2,
  X,
} from 'lucide-react';
import { BLOCK_CATALOG, deriveVueSnippet } from './catalog.tsx';
import {
  buildNpmImportCode,
  buildReactExampleCode,
  DEFAULT_COMPONENT_ID,
  findComponentEntry,
  ORDERED_COMPONENTS,
  PILLAR_GROUPS,
  type ComponentPillarId,
  type ComponentViewTarget,
} from './component-meta.ts';
import type { DocSectionId } from './site-views.tsx';

type ExampleTab = 'preview' | 'code';
type ExampleLang = 'react' | 'vue' | 'joplo';
type InstallTab = 'cli' | 'npm';

const GET_STARTED_LINKS: ReadonlyArray<{
  id: 'home' | DocSectionId;
  label: string;
}> = [
  { id: 'home', label: 'Home' },
  { id: 'introduction', label: 'Introduction' },
  { id: 'installation', label: 'Installation' },
  { id: 'cli-registry', label: 'CLI Registry' },
];

export function ComponentsPage({
  activeView,
  onSelectView,
  onNavigateHome,
  onNavigateDoc,
  commandOpen,
}: {
  activeView: ComponentViewTarget;
  onSelectView: (target: ComponentViewTarget) => void;
  onNavigateHome: () => void;
  onNavigateDoc: (doc: DocSectionId) => void;
  commandOpen: boolean;
}) {
  const { fill, animate, setFill, setAnimate } = useJuice();

  const [sidebarQuery, setSidebarQuery] = useState('');
  const [overviewPillar, setOverviewPillar] = useState<'all' | ComponentPillarId>('all');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const [exampleTab, setExampleTab] = useState<ExampleTab>('preview');
  const [exampleLang, setExampleLang] = useState<ExampleLang>('react');
  const [installTab, setInstallTab] = useState<InstallTab>('cli');
  const [codeCopied, setCodeCopied] = useState(false);
  const [agentTick, setAgentTick] = useState(0);

  const sidebarRef = useRef<HTMLElement | null>(null);
  const copyTimerRef = useRef<number | null>(null);

  const isOverview = activeView === 'overview';

  const activeEntry = useMemo(() => {
    if (isOverview) return null;
    return findComponentEntry(activeView) ?? findComponentEntry(DEFAULT_COMPONENT_ID)!;
  }, [activeView, isOverview]);

  // Reset per-component ephemeral tabs/copy state when switching components
  useEffect(() => {
    setExampleTab('preview');
    setCodeCopied(false);
    // Let the newly mounted component register on window.__juiceAgent before reading snapshot
    const raf = window.requestAnimationFrame(() => {
      setAgentTick((t) => t + 1);
    });
    return () => window.cancelAnimationFrame(raf);
  }, [activeView]);

  // Keep active sidebar link scrolled comfortably into view inside the sticky sidebar
  useEffect(() => {
    const container = sidebarRef.current;
    if (!container) return;
    const activeBtn = container.querySelector<HTMLElement>('[data-sidebar-active="true"]');
    if (activeBtn) {
      activeBtn.scrollIntoView({ block: 'nearest' });
    }
  }, [activeView]);

  // Dismiss mobile drawer on Escape (when Cmd+K palette is closed)
  useEffect(() => {
    if (!mobileNavOpen || commandOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setMobileNavOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mobileNavOpen, commandOpen]);

  // Cleanup copy timer on unmount
  useEffect(() => {
    return () => {
      if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current);
    };
  }, []);

  const filteredPillars = useMemo(() => {
    const q = sidebarQuery.trim().toLowerCase();
    if (!q) return PILLAR_GROUPS;
    return PILLAR_GROUPS.map((group) => {
      const entries = group.entries.filter(
        (entry) =>
          entry.title.toLowerCase().includes(q) ||
          entry.block.source.symbol.toLowerCase().includes(q) ||
          entry.block.id.toLowerCase().includes(q) ||
          entry.pillarLabel.toLowerCase().includes(q) ||
          entry.block.summary.toLowerCase().includes(q) ||
          entry.primitives.some((p) => p.toLowerCase().includes(q)),
      );
      return { ...group, entries };
    }).filter((group) => group.entries.length > 0);
  }, [sidebarQuery]);

  const overviewGroups = useMemo(() => {
    const base = sidebarQuery.trim() ? filteredPillars : PILLAR_GROUPS;
    if (overviewPillar === 'all') return base;
    return base.filter((g) => g.id === overviewPillar);
  }, [filteredPillars, overviewPillar, sidebarQuery]);

  const totalFilteredCount = useMemo(
    () => filteredPillars.reduce((acc, g) => acc + g.entries.length, 0),
    [filteredPillars],
  );

  const { prevEntry, nextEntry } = useMemo(() => {
    if (!activeEntry) return { prevEntry: undefined, nextEntry: undefined };
    const idx = ORDERED_COMPONENTS.findIndex((e) => e.block.id === activeEntry.block.id);
    return {
      prevEntry: idx > 0 ? ORDERED_COMPONENTS[idx - 1] : undefined,
      nextEntry:
        idx >= 0 && idx < ORDERED_COMPONENTS.length - 1
          ? ORDERED_COMPONENTS[idx + 1]
          : undefined,
    };
  }, [activeEntry]);

  const agentNodeId = activeEntry ? (activeEntry.block.demoId ?? activeEntry.block.id) : null;

  const liveSnapshot = useMemo(() => {
    void agentTick;
    if (!agentNodeId || typeof window === 'undefined') return null;
    const bridge = (window as unknown as { __juiceAgent?: JuiceAgentBridge }).__juiceAgent;
    const all = bridge?.snapshot();
    return all?.[agentNodeId]?.state ?? null;
  }, [agentNodeId, agentTick]);

  const syncSnapshotSoon = () => {
    window.requestAnimationFrame(() => {
      setAgentTick((t) => t + 1);
    });
  };

  const runAgentAction = (action: string, payload?: unknown) => {
    if (!agentNodeId) return;
    if (exampleTab !== 'preview') {
      setExampleTab('preview');
    }
    const bridge = (window as unknown as { __juiceAgent?: JuiceAgentBridge }).__juiceAgent;
    bridge?.act(agentNodeId, action, payload);
    setAgentTick((t) => t + 1);
  };

  const exampleCode = useMemo(() => {
    if (!activeEntry) return '';
    if (exampleLang === 'vue') return deriveVueSnippet(activeEntry.block);
    if (exampleLang === 'joplo') return activeEntry.block.joploCode;
    return buildReactExampleCode(activeEntry);
  }, [activeEntry, exampleLang]);

  const npmImportCode = useMemo(() => {
    if (!activeEntry) return '';
    return buildNpmImportCode(activeEntry);
  }, [activeEntry]);

  const handleCopyExampleCode = async () => {
    try {
      await navigator.clipboard.writeText(exampleCode);
    } catch {
      // Ignore restricted clipboard environments
    }
    playJuiceSound('paid');
    setCodeCopied(true);
    if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current);
    copyTimerRef.current = window.setTimeout(() => setCodeCopied(false), 1800);
  };

  const handleSelectNavTarget = (target: ComponentViewTarget) => {
    playJuiceSound('tap');
    setMobileNavOpen(false);
    onSelectView(target);
  };

  const renderSidebarContents = (isMobileDrawer = false) => {
    const isFiltering = sidebarQuery.trim().length > 0;

    return (
      <>
        <div className="site-comp-sidebar-top">
          <div className="site-comp-filter-box">
            <Search size={13} className="site-comp-filter-icon" aria-hidden="true" />
            <input
              type="text"
              className="site-comp-filter-input"
              value={sidebarQuery}
              onChange={(e) => setSidebarQuery(e.target.value)}
              placeholder={`Filter ${BLOCK_CATALOG.length} components…`}
              aria-label="Filter components"
            />
            {sidebarQuery && (
              <button
                type="button"
                className="site-comp-filter-clear"
                onClick={() => setSidebarQuery('')}
                aria-label="Clear component filter"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {isMobileDrawer && (
            <button
              type="button"
              className="site-comp-mobile-close"
              onClick={() => setMobileNavOpen(false)}
              aria-label="Close component navigation"
            >
              <X size={15} />
            </button>
          )}
        </div>

        <div className="site-comp-sidebar-scroll">
          {!isFiltering && (
            <div className="site-comp-nav-group">
              <div className="site-comp-nav-heading">Get Started</div>
              <ul className="site-comp-nav-list">
                {GET_STARTED_LINKS.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      className="site-comp-nav-link"
                      onClick={() => {
                        playJuiceSound('tap');
                        setMobileNavOpen(false);
                        if (item.id === 'home') {
                          onNavigateHome();
                        } else {
                          onNavigateDoc(item.id);
                        }
                      }}
                    >
                      <span>{item.label}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="site-comp-nav-group">
            <div className="site-comp-nav-heading">Overview</div>
            <ul className="site-comp-nav-list">
              <li>
                <button
                  type="button"
                  className="site-comp-nav-link"
                  data-active={isOverview ? 'true' : undefined}
                  data-sidebar-active={
                    !isMobileDrawer && isOverview ? 'true' : undefined
                  }
                  onClick={() => handleSelectNavTarget('overview')}
                >
                  <span className="site-comp-nav-link-inner">
                    <LayoutGrid size={13} className="site-comp-nav-overview-icon" />
                    <span>All Components ({BLOCK_CATALOG.length})</span>
                  </span>
                </button>
              </li>
            </ul>
          </div>

          {filteredPillars.length > 0 ? (
            filteredPillars.map((group) => (
              <div key={group.id} className="site-comp-nav-group">
                <div className="site-comp-nav-heading">
                  <span>{group.label}</span>
                  <span className="site-comp-nav-count">({group.entries.length})</span>
                </div>
                <ul className="site-comp-nav-list">
                  {group.entries.map((entry) => {
                    const active = !isOverview && activeEntry?.block.id === entry.block.id;
                    return (
                      <li key={entry.block.id}>
                        <button
                          type="button"
                          className="site-comp-nav-link"
                          data-active={active ? 'true' : undefined}
                          data-sidebar-active={
                            !isMobileDrawer && active ? 'true' : undefined
                          }
                          onClick={() => handleSelectNavTarget(entry.block.id)}
                        >
                          <span>{entry.title}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))
          ) : (
            <div className="site-comp-sidebar-empty">
              <p>No components match &ldquo;{sidebarQuery}&rdquo;.</p>
              <button
                type="button"
                className="site-comp-sidebar-reset"
                onClick={() => setSidebarQuery('')}
              >
                Reset filter
              </button>
            </div>
          )}
        </div>
      </>
    );
  };

  return (
    <div className="site-comp-shell">
      {/* Mobile (<960px) Top Component Selector & Quick Stepper Bar */}
      <div className="site-comp-mobile-bar">
        <button
          type="button"
          className="site-comp-mobile-trigger"
          onClick={() => {
            playJuiceSound('tap');
            setMobileNavOpen(true);
          }}
          aria-expanded={mobileNavOpen}
          aria-label="Open component navigation sidebar"
        >
          <PanelLeft size={15} />
          <span className="site-comp-mobile-trigger-label">
            {isOverview
              ? `All Components (${BLOCK_CATALOG.length})`
              : (activeEntry?.title ?? 'Components')}
          </span>
          <ChevronDown size={13} />
        </button>

        {!isOverview && (
          <div className="site-comp-mobile-stepper">
            <button
              type="button"
              className="site-comp-mobile-step-btn"
              disabled={!prevEntry}
              onClick={() => prevEntry && handleSelectNavTarget(prevEntry.block.id)}
              aria-label={prevEntry ? `Previous: ${prevEntry.title}` : 'No previous component'}
            >
              <ArrowLeft size={14} />
            </button>
            <button
              type="button"
              className="site-comp-mobile-step-btn"
              disabled={!nextEntry}
              onClick={() => nextEntry && handleSelectNavTarget(nextEntry.block.id)}
              aria-label={nextEntry ? `Next: ${nextEntry.title}` : 'No next component'}
            >
              <ArrowRight size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Mobile Slide-Out Left Drawer */}
      {mobileNavOpen && (
        <div
          className="site-comp-mobile-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Component directory"
          onClick={() => setMobileNavOpen(false)}
        >
          <aside
            className="site-comp-mobile-drawer"
            onClick={(e) => e.stopPropagation()}
          >
            {renderSidebarContents(true)}
          </aside>
        </div>
      )}

      <div className="site-comp-layout">
        {/* Sticky 244px Left Sidebar (prompt-kit / shadcn style) */}
        <aside
          ref={sidebarRef}
          className="site-comp-sidebar"
          aria-label="Components navigation"
        >
          {renderSidebarContents(false)}
        </aside>

        {/* Main Right Pane */}
        <div className="site-comp-main">
          {isOverview ? (
            /* ───────────────────────────────────────────────────────────────
               Fast Clickable Overview Directory (#/components/overview)
               ─────────────────────────────────────────────────────────────── */
            <article className="site-comp-overview">
              <header className="site-comp-header">
                <nav className="site-comp-breadcrumb" aria-label="Breadcrumb">
                  <span>Components</span>
                  <ChevronRight size={12} aria-hidden="true" />
                  <span className="site-comp-breadcrumb-current">Overview</span>
                </nav>

                <div className="site-comp-overview-title-row">
                  <h1 className="site-comp-h1">All Components</h1>
                  <span className="site-count-pill">
                    {sidebarQuery.trim()
                      ? `${totalFilteredCount} of ${BLOCK_CATALOG.length}`
                      : `${BLOCK_CATALOG.length} components`}
                  </span>
                </div>

                <p className="site-comp-lead">
                  Explore all {BLOCK_CATALOG.length} interactive React &amp; Vue 3 components
                  across 7 architectural pillars. Select any component to inspect its live
                  stage, source code, CLI install, and Agent Bridge hooks.
                </p>

                <div
                  className="site-comp-pillar-pills"
                  role="tablist"
                  aria-label="Filter directory by pillar"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={overviewPillar === 'all'}
                    className="site-category-pill"
                    data-active={overviewPillar === 'all' ? 'true' : undefined}
                    onClick={() => {
                      playJuiceSound('tap');
                      setOverviewPillar('all');
                    }}
                  >
                    <span>All</span>
                    <span className="site-category-count">({BLOCK_CATALOG.length})</span>
                  </button>
                  {PILLAR_GROUPS.map((group) => (
                    <button
                      key={group.id}
                      type="button"
                      role="tab"
                      aria-selected={overviewPillar === group.id}
                      className="site-category-pill"
                      data-active={overviewPillar === group.id ? 'true' : undefined}
                      onClick={() => {
                        playJuiceSound('tap');
                        setOverviewPillar(group.id);
                      }}
                    >
                      <span>{group.label}</span>
                      <span className="site-category-count">({group.entries.length})</span>
                    </button>
                  ))}
                </div>
              </header>

              {overviewGroups.length > 0 ? (
                <div className="site-comp-overview-sections">
                  {overviewGroups.map((group) => (
                    <section
                      key={group.id}
                      className="site-comp-overview-group"
                      aria-labelledby={`pillar-${group.id}`}
                    >
                      <div className="site-comp-overview-group-head">
                        <div>
                          <h2 id={`pillar-${group.id}`} className="site-comp-overview-h2">
                            {group.label}
                            <span className="site-comp-overview-count">
                              {group.entries.length}
                            </span>
                          </h2>
                          <p className="site-comp-overview-sub">{group.description}</p>
                        </div>
                      </div>

                      <div className="site-comp-directory-grid">
                        {group.entries.map((entry) => (
                          <button
                            key={entry.block.id}
                            type="button"
                            className="site-comp-dir-card"
                            onClick={() => handleSelectNavTarget(entry.block.id)}
                          >
                            <div className="site-comp-dir-card-top">
                              <span className="site-comp-dir-title">{entry.title}</span>
                              <ArrowUpRight size={13} className="site-comp-dir-arrow" />
                            </div>
                            <p className="site-comp-dir-summary">{entry.block.summary}</p>
                            <div className="site-comp-dir-meta">
                              <code>&lt;{entry.block.source.symbol} /&gt;</code>
                              <span>
                                {entry.subpath === '@tokenroll/juice/primitives'
                                  ? '/primitives'
                                  : '/blocks'}
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              ) : (
                <div className="site-empty-box">
                  <div className="site-empty-title">
                    No components matching &ldquo;{sidebarQuery}&rdquo;
                  </div>
                  <div className="site-empty-sub">
                    Try searching by component name, primitive export, or interaction keyword.
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setSidebarQuery('');
                      setOverviewPillar('all');
                    }}
                  >
                    Reset filters
                  </Button>
                </div>
              )}
            </article>
          ) : (
            activeEntry && (
              /* ───────────────────────────────────────────────────────────────
                 Dedicated Single-Component Page (#/components/<id>)
                 ─────────────────────────────────────────────────────────────── */
              <article className="site-comp-article">
                {/* 1. Header */}
                <header className="site-comp-header">
                  <nav className="site-comp-breadcrumb" aria-label="Breadcrumb">
                    <button
                      type="button"
                      className="site-comp-breadcrumb-link"
                      onClick={() => handleSelectNavTarget('overview')}
                    >
                      Components
                    </button>
                    <ChevronRight size={12} aria-hidden="true" />
                    <span className="site-comp-breadcrumb-current">
                      {activeEntry.pillarLabel}
                    </span>
                  </nav>

                  <h1 className="site-comp-h1">{activeEntry.title}</h1>
                  <p className="site-comp-lead">{activeEntry.block.summary}</p>

                  <div className="site-comp-meta-row">
                    <span className="site-comp-meta-badge">{activeEntry.subpath}</span>
                    <span className="site-comp-meta-symbol">
                      &lt;{activeEntry.block.source.symbol} /&gt;
                    </span>
                    {activeEntry.primitives.length > 0 &&
                      activeEntry.primitives[0] !== activeEntry.block.source.symbol && (
                        <span className="site-comp-meta-symbol">
                          {activeEntry.primitives.join(' · ')}
                        </span>
                      )}
                    {activeEntry.block.sounds.map((snd) => (
                      <button
                        key={snd}
                        type="button"
                        className="site-quiet-chip"
                        title={`Audition "${snd}" Web Audio synth recipe`}
                        onClick={() => playJuiceSound(snd, true)}
                      >
                        <Volume2 size={11} />
                        <span>{snd}</span>
                      </button>
                    ))}
                  </div>
                </header>

                {/* 2. Examples Section (Preview | Code underline tabs) */}
                <section className="site-comp-section" aria-labelledby="comp-examples-heading">
                  <h2 id="comp-examples-heading" className="site-comp-h2">
                    Examples
                  </h2>

                  <div
                    className="site-underline-tabs"
                    role="tablist"
                    aria-label="Component example view"
                  >
                    <button
                      type="button"
                      role="tab"
                      aria-selected={exampleTab === 'preview'}
                      className="site-underline-tab"
                      data-active={exampleTab === 'preview' ? 'true' : undefined}
                      onClick={() => {
                        playJuiceSound('tap');
                        setExampleTab('preview');
                      }}
                    >
                      Preview
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={exampleTab === 'code'}
                      className="site-underline-tab"
                      data-active={exampleTab === 'code' ? 'true' : undefined}
                      onClick={() => {
                        playJuiceSound('tap');
                        setExampleTab('code');
                      }}
                    >
                      Code
                    </button>
                  </div>

                  {/* Preview Frame (kept mounted so live state & Agent Bridge stay active) */}
                  <div
                    className="site-comp-preview-frame"
                    hidden={exampleTab !== 'preview'}
                    onClickCapture={syncSnapshotSoon}
                    onPointerUpCapture={syncSnapshotSoon}
                    onKeyUpCapture={syncSnapshotSoon}
                  >
                    <div
                      className="site-comp-stage-toggles"
                      aria-label="Preview surface and motion controls"
                    >
                      <div className="site-mini-toggle-group" role="group" aria-label="Surface fill">
                        <button
                          type="button"
                          className="site-mini-toggle"
                          data-active={fill === 'slab' ? 'true' : undefined}
                          onClick={() => {
                            playJuiceSound('tap');
                            setFill('slab');
                          }}
                        >
                          Slab
                        </button>
                        <button
                          type="button"
                          className="site-mini-toggle"
                          data-active={fill === 'solid' ? 'true' : undefined}
                          onClick={() => {
                            playJuiceSound('tap');
                            setFill('solid');
                          }}
                        >
                          Solid
                        </button>
                      </div>

                      <div className="site-mini-toggle-group" role="group" aria-label="Spring motion">
                        <button
                          type="button"
                          className="site-mini-toggle"
                          data-active={animate ? 'true' : undefined}
                          onClick={() => {
                            playJuiceSound('tap');
                            setAnimate(true);
                          }}
                        >
                          Spring
                        </button>
                        <button
                          type="button"
                          className="site-mini-toggle"
                          data-active={!animate ? 'true' : undefined}
                          onClick={() => {
                            playJuiceSound('tap');
                            setAnimate(false);
                          }}
                        >
                          Static
                        </button>
                      </div>
                    </div>

                    <div key={activeEntry.block.id} className="site-comp-stage-canvas">
                      {activeEntry.block.render()}
                    </div>
                  </div>

                  {/* Code Frame */}
                  {exampleTab === 'code' && (
                    <div className="site-comp-code-frame">
                      <div className="site-comp-code-toolbar">
                        <div
                          className="site-comp-lang-tabs"
                          role="tablist"
                          aria-label="Code snippet language"
                        >
                          {(
                            [
                              { id: 'react', label: 'React' },
                              { id: 'vue', label: 'Vue 3' },
                              { id: 'joplo', label: 'Joplo' },
                            ] as const
                          ).map((lang) => (
                            <button
                              key={lang.id}
                              type="button"
                              role="tab"
                              aria-selected={exampleLang === lang.id}
                              className="site-comp-lang-btn"
                              data-active={exampleLang === lang.id ? 'true' : undefined}
                              onClick={() => {
                                playJuiceSound('tap');
                                setExampleLang(lang.id);
                                setCodeCopied(false);
                              }}
                            >
                              {lang.label}
                            </button>
                          ))}
                        </div>

                        <button
                          type="button"
                          className="site-comp-copy-btn"
                          data-copied={codeCopied ? 'true' : undefined}
                          onClick={handleCopyExampleCode}
                        >
                          {codeCopied ? <Check size={12} /> : <Copy size={12} />}
                          <span>{codeCopied ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>

                      <pre className="site-comp-code-pre">
                        <code>{exampleCode}</code>
                      </pre>
                    </div>
                  )}
                </section>

                {/* 3. Installation Section (CLI | npm underline tabs) */}
                <section className="site-comp-section" aria-labelledby="comp-install-heading">
                  <h2 id="comp-install-heading" className="site-comp-h2">
                    Installation
                  </h2>

                  <div
                    className="site-underline-tabs"
                    role="tablist"
                    aria-label="Installation method"
                  >
                    <button
                      type="button"
                      role="tab"
                      aria-selected={installTab === 'cli'}
                      className="site-underline-tab"
                      data-active={installTab === 'cli' ? 'true' : undefined}
                      onClick={() => {
                        playJuiceSound('tap');
                        setInstallTab('cli');
                      }}
                    >
                      CLI
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={installTab === 'npm'}
                      className="site-underline-tab"
                      data-active={installTab === 'npm' ? 'true' : undefined}
                      onClick={() => {
                        playJuiceSound('tap');
                        setInstallTab('npm');
                      }}
                    >
                      npm
                    </button>
                  </div>

                  {installTab === 'cli' ? (
                    <div className="site-comp-install-pane">
                      <CopySnippet
                        label="Copy editable source into your project"
                        code={`npx @tokenroll/juice add ${activeEntry.block.id}`}
                      />
                      <p className="site-comp-install-note">
                        First time using the CLI registry? Run{' '}
                        <code>npx @tokenroll/juice init</code> once to scaffold design tokens,
                        Web Audio synth, and headless hooks.
                      </p>
                    </div>
                  ) : (
                    <div className="site-comp-install-pane">
                      <CopySnippet
                        label="1. Install package"
                        code="pnpm add @tokenroll/juice lucide-react"
                      />
                      <CopySnippet
                        label="2. Import subpath directly (no <JuiceProvider> needed)"
                        code={npmImportCode}
                      />
                    </div>
                  )}
                </section>

                {/* 4. Programmatic Control (window.__juiceAgent) — only when agentActions exist */}
                {activeEntry.block.agentActions.length > 0 && (
                  <section className="site-comp-section" aria-labelledby="comp-agent-heading">
                    <div className="site-comp-section-head">
                      <h2 id="comp-agent-heading" className="site-comp-h2">
                        Agent Bridge
                      </h2>
                      <span className="site-comp-agent-tag">
                        window.__juiceAgent · id=&ldquo;{agentNodeId}&rdquo;
                      </span>
                    </div>

                    <p className="site-comp-subnote">
                      Trigger deterministic <code>act()</code> commands against the live preview
                      above and inspect real-time <code>snapshot()</code> state:
                    </p>

                    <div className="site-driver-chips">
                      {activeEntry.block.agentActions.map((actItem) => (
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

                    <pre className="site-json-box">
                      {`// window.__juiceAgent.snapshot()["${agentNodeId}"]\n${
                        liveSnapshot
                          ? JSON.stringify(liveSnapshot, null, 2)
                          : '{ "mounted": true }'
                      }`}
                    </pre>
                  </section>
                )}

                {/* 5. Prev / Next Component Footer */}
                <nav className="site-comp-pager" aria-label="Component pagination">
                  {prevEntry ? (
                    <button
                      type="button"
                      className="site-comp-pager-card"
                      onClick={() => handleSelectNavTarget(prevEntry.block.id)}
                    >
                      <span className="site-comp-pager-dir">
                        <ArrowLeft size={13} />
                        <span>Previous</span>
                      </span>
                      <span className="site-comp-pager-title">{prevEntry.title}</span>
                      <span className="site-comp-pager-pillar">{prevEntry.pillarLabel}</span>
                    </button>
                  ) : (
                    <div />
                  )}

                  {nextEntry ? (
                    <button
                      type="button"
                      className="site-comp-pager-card site-comp-pager-card-next"
                      onClick={() => handleSelectNavTarget(nextEntry.block.id)}
                    >
                      <span className="site-comp-pager-dir">
                        <span>Next</span>
                        <ArrowRight size={13} />
                      </span>
                      <span className="site-comp-pager-title">{nextEntry.title}</span>
                      <span className="site-comp-pager-pillar">{nextEntry.pillarLabel}</span>
                    </button>
                  ) : (
                    <div />
                  )}
                </nav>
              </article>
            )
          )}
        </div>
      </div>
    </div>
  );
}
