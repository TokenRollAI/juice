import { useCallback, useEffect, useState } from 'react';
import {
  IconButton,
  JuiceProvider,
  Kbd,
  playJuiceSound,
  useJuice,
} from '@tokenroll/juice';
import { Check, Moon, Search, Sun, Volume2, VolumeX } from 'lucide-react';
import { JuiceMark } from './brand-mark.tsx';
import { BLOCK_CATALOG } from './catalog.tsx';
import { ComponentsPage } from './components-page.tsx';
import { HomePage } from './home-page.tsx';
import {
  CommandPaletteModal,
  DOC_NAV_ITEMS,
  DocsPage,
  SoundsPage,
  type DocSectionId,
  type SitePage,
} from './site-views.tsx';

type RouteState = {
  page: SitePage;
  doc: DocSectionId;
  inspect: string | null;
};

function parseHashRoute(): RouteState {
  if (typeof window === 'undefined') {
    return { page: 'home', doc: 'introduction', inspect: null };
  }
  const raw = window.location.hash.replace(/^#\/?/, '');
  if (!raw) {
    return { page: 'home', doc: 'introduction', inspect: null };
  }
  const [pathPart = '', queryPart = ''] = raw.split('?');
  const segments = pathPart.split('/').filter(Boolean);
  const params = new URLSearchParams(queryPart);

  if (segments[0] === 'components') {
    return {
      page: 'components',
      doc: 'introduction',
      inspect: params.get('inspect'),
    };
  }
  if (segments[0] === 'docs') {
    const candidate = segments[1] as DocSectionId | undefined;
    const validDoc = DOC_NAV_ITEMS.some((d) => d.id === candidate)
      ? candidate!
      : 'introduction';
    return { page: 'docs', doc: validDoc, inspect: null };
  }
  if (segments[0] === 'sounds') {
    return { page: 'sounds', doc: 'introduction', inspect: null };
  }
  return { page: 'home', doc: 'introduction', inspect: null };
}

function formatHashRoute(route: RouteState): string {
  if (route.page === 'home') return '#/';
  if (route.page === 'components') {
    return route.inspect
      ? `#/components?inspect=${encodeURIComponent(route.inspect)}`
      : '#/components';
  }
  if (route.page === 'docs') {
    return route.doc === 'introduction' ? '#/docs' : `#/docs/${route.doc}`;
  }
  return '#/sounds';
}

function GithubMark() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 .5C5.65.5.5 5.66.5 12.02c0 5.09 3.29 9.4 7.86 10.93.58.1.79-.25.79-.56v-2.02c-3.2.7-3.88-1.38-3.88-1.38-.52-1.34-1.28-1.69-1.28-1.69-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.7 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.46.11-3.05 0 0 .97-.31 3.17 1.18a10.96 10.96 0 0 1 5.78 0c2.2-1.49 3.16-1.18 3.16-1.18.63 1.59.24 2.76.12 3.05.74.81 1.18 1.84 1.18 3.1 0 4.43-2.7 5.41-5.27 5.69.42.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.53 11.53 0 0 0 23.5 12.02C23.5 5.66 18.35.5 12 .5Z" />
    </svg>
  );
}

function SiteShell() {
  const { theme, sound, setTheme, setSound } = useJuice();
  const [route, setRoute] = useState<RouteState>(() => parseHashRoute());
  const [commandOpen, setCommandOpen] = useState(false);
  const [skillCopied, setSkillCopied] = useState(false);

  // Sync HTML canvas background & color-scheme with active theme
  useEffect(() => {
    const html = document.documentElement;
    html.style.background = theme === 'dark' ? '#09090b' : '#ffffff';
    html.style.colorScheme = theme;
  }, [theme]);

  // Listen for browser Back/Forward hash navigation
  useEffect(() => {
    const onHashChange = () => {
      setRoute(parseHashRoute());
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // Global Cmd+K / Ctrl+K shortcut
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        playJuiceSound('tap');
        setCommandOpen((open) => !open);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const commitRoute = useCallback((next: RouteState, scrollTop = true) => {
    setRoute(next);
    const nextHash = formatHashRoute(next);
    if (next.page === 'home' && !window.location.hash) {
      // Keep clean root URL until navigating deeper
    } else if (window.location.hash !== nextHash) {
      window.history.pushState(null, '', nextHash);
    }
    if (scrollTop) {
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    }
  }, []);

  const navigatePage = useCallback(
    (page: SitePage) => {
      commitRoute({
        page,
        doc: route.doc,
        inspect: page === 'components' ? null : null,
      });
    },
    [commitRoute, route.doc],
  );

  const navigateDoc = useCallback(
    (docId?: string) => {
      const valid = DOC_NAV_ITEMS.some((d) => d.id === docId)
        ? (docId as DocSectionId)
        : 'introduction';
      commitRoute({ page: 'docs', doc: valid, inspect: null });
    },
    [commitRoute],
  );

  const jumpToBlockInspector = useCallback(
    (blockId: string) => {
      const match = BLOCK_CATALOG.find((b) => b.id === blockId || b.demoId === blockId);
      const resolvedId = match ? match.id : blockId;
      commitRoute({ page: 'components', doc: route.doc, inspect: resolvedId }, false);
      window.setTimeout(() => {
        const targetAttr = match ? (match.demoId ?? match.id) : resolvedId;
        const el = document.querySelector(`[data-block-cell="${targetAttr}"]`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
          window.scrollTo({ top: 0 });
        }
      }, 40);
    },
    [commitRoute, route.doc],
  );

  const handleInspectChange = useCallback(
    (nextInspect: string | null) => {
      const next: RouteState = { page: 'components', doc: route.doc, inspect: nextInspect };
      setRoute(next);
      window.history.replaceState(null, '', formatHashRoute(next));
    },
    [route.doc],
  );

  const copyFooterSkill = async () => {
    try {
      await navigator.clipboard.writeText('npx skills add TokenRollAI/juice');
    } catch {
      // Ignore restricted clipboard
    }
    playJuiceSound('paid');
    setSkillCopied(true);
    window.setTimeout(() => setSkillCopied(false), 1800);
  };

  const navItems: Array<{ id: SitePage; label: string }> = [
    { id: 'home', label: 'Home' },
    { id: 'components', label: 'Components' },
    { id: 'docs', label: 'Docs' },
    { id: 'sounds', label: 'Sounds' },
  ];

  return (
    <div className="site-shell">
      {/* Ultra-Clean Single-Row 56px Sticky Navbar */}
      <header className="site-navbar">
        <div className="site-navbar-inner">
          <div className="site-navbar-left">
            <button
              type="button"
              className="site-brand"
              onClick={() => {
                playJuiceSound('tap');
                navigatePage('home');
              }}
            >
              <JuiceMark size={26} className="site-brand-svg" />
              <span className="site-brand-word">Juice</span>
            </button>

            <nav className="site-nav-links" aria-label="Main navigation">
              {navItems.map((item) => {
                const active = route.page === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className="site-nav-link"
                    data-active={active ? 'true' : undefined}
                    aria-current={active ? 'page' : undefined}
                    onClick={() => {
                      playJuiceSound('tap');
                      navigatePage(item.id);
                    }}
                  >
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="site-navbar-right">
            <button
              type="button"
              className="site-search-trigger"
              onClick={() => {
                playJuiceSound('tap');
                setCommandOpen(true);
              }}
              aria-label="Search documentation and components (Cmd+K)"
            >
              <span className="site-search-trigger-left">
                <Search size={13} />
                <span className="site-search-trigger-text">Search…</span>
              </span>
              <Kbd>⌘K</Kbd>
            </button>

            <IconButton
              label={sound ? 'Mute UI audio' : 'Enable UI audio'}
              variant="ghost"
              size="sm"
              onClick={() => {
                const next = !sound;
                setSound(next);
                if (next) playJuiceSound('tap', true);
              }}
            >
              {sound ? <Volume2 size={15} /> : <VolumeX size={15} />}
            </IconButton>

            <IconButton
              label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
              variant="ghost"
              size="sm"
              onClick={() => {
                playJuiceSound('tap');
                setTheme(theme === 'dark' ? 'light' : 'dark');
              }}
            >
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </IconButton>

            <a
              href="https://github.com/TokenRollAI/juice"
              target="_blank"
              rel="noreferrer"
              className="site-github-icon"
              aria-label="TokenRollAI/juice on GitHub"
            >
              <GithubMark />
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="site-main">
        {route.page === 'home' && (
          <HomePage
            onBrowseComponents={() => navigatePage('components')}
            onOpenDocs={navigateDoc}
            onOpenSounds={() => navigatePage('sounds')}
            onInspectBlock={jumpToBlockInspector}
          />
        )}

        {route.page === 'components' && (
          <ComponentsPage
            inspectedId={route.inspect}
            onInspectChange={handleInspectChange}
            commandOpen={commandOpen}
          />
        )}

        {route.page === 'docs' && (
          <DocsPage
            activeDoc={route.doc}
            onSelectDoc={(doc) => commitRoute({ page: 'docs', doc, inspect: null })}
            onJumpToBlock={jumpToBlockInspector}
            onOpenSounds={() => navigatePage('sounds')}
          />
        )}

        {route.page === 'sounds' && <SoundsPage />}
      </main>

      {/* Minimal Editorial Footer */}
      <footer className="site-footer">
        <div className="site-footer-inner">
          <div className="site-footer-left">Juice UI by TokenRollAI · MIT License</div>

          <div className="site-footer-right">
            <button
              type="button"
              className="site-footer-link"
              onClick={() => navigatePage('components')}
            >
              Components
            </button>
            <button
              type="button"
              className="site-footer-link"
              onClick={() => navigatePage('docs')}
            >
              Docs
            </button>
            <button
              type="button"
              className="site-footer-link"
              onClick={() => navigatePage('sounds')}
            >
              Sounds
            </button>
            <a
              href="https://github.com/TokenRollAI/juice"
              target="_blank"
              rel="noreferrer"
              className="site-footer-link"
            >
              GitHub
            </a>
            <button
              type="button"
              className="site-footer-skill"
              onClick={copyFooterSkill}
              title="Click to copy AI agent skill command"
            >
              <code>npx skills add TokenRollAI/juice</code>
              {skillCopied && <Check size={12} />}
            </button>
          </div>
        </div>
      </footer>

      {/* Global Cmd+K Command Palette */}
      <CommandPaletteModal
        open={commandOpen}
        onClose={() => setCommandOpen(false)}
        onNavigatePage={navigatePage}
        onNavigateDoc={(doc) => navigateDoc(doc)}
        onJumpToBlock={jumpToBlockInspector}
      />
    </div>
  );
}

export function App() {
  return (
    <JuiceProvider
      defaultTheme="dark"
      defaultFill="slab"
      defaultSound={true}
      defaultAnimate={true}
    >
      <SiteShell />
    </JuiceProvider>
  );
}
