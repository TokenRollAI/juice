import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  Info,
  MoreHorizontal,
  Share2,
  Trash2,
  UserPlus,
} from 'lucide-react';
import { useReducedMotion } from 'motion/react';
import { useControllableState, useJuice, useJuiceAgentNode, useRovingFocus } from './behaviors.tsx';
import { Badge, Kbd, RollingNumber, SegmentedControl, Switch } from './components.tsx';

const card = { padding: 10 } as const;
const row = { display: 'flex', alignItems: 'center', gap: 6 } as const;
const between = { ...row, justifyContent: 'space-between' } as const;
const inset = { background: 'var(--juice-w6)', borderRadius: 'var(--juice-r-inner)', padding: 10 } as const;
const muted = { color: 'var(--juice-mute)', fontSize: 12 } as const;
const visuallyHidden = {
  position: 'absolute',
  width: 1,
  height: 1,
  overflow: 'hidden',
  clipPath: 'inset(50%)',
  whiteSpace: 'nowrap',
} as const;

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function DialogModal({
  id = 'dialog-modal',
  open: controlledOpen,
  defaultOpen = true,
  onOpenChange,
}: {
  id?: string;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
} = {}) {
  const { playSound } = useJuice();
  const titleId = useId();
  const descriptionId = useId();
  const dialog = useRef<HTMLElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const moveFocus = useRef(false);
  const [open, setOpen] = useControllableState({
    value: controlledOpen,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    if (!moveFocus.current) return;
    moveFocus.current = false;
    (open ? cancel : trigger).current?.focus();
  }, [open]);

  const openDialog = () => {
    if (open) return;
    moveFocus.current = document.activeElement === trigger.current;
    playSound('tap');
    setConfirmed(false);
    setOpen(true);
  };

  const closeDialog = () => {
    if (!open) return;
    moveFocus.current = Boolean(dialog.current?.contains(document.activeElement));
    playSound('tap');
    setOpen(false);
  };

  const confirmArchive = () => {
    if (!open) return;
    moveFocus.current = Boolean(dialog.current?.contains(document.activeElement));
    playSound('paid');
    setConfirmed(true);
    setOpen(false);
  };

  useJuiceAgentNode(id, 'DialogModal', { open, confirmed }, { openDialog, closeDialog, confirmArchive });

  return (
    <div id={id} className="j-slab j-fnd-card" style={card}>
      <div style={{ ...inset, display: 'grid', alignItems: 'center', minHeight: 118 }}>
        {open ? (
          <section
            ref={dialog}
            role="dialog"
            aria-labelledby={titleId}
            aria-describedby={descriptionId}
            style={{ borderRadius: 'var(--juice-r-inner)', background: 'var(--fill-slab)', padding: 10 }}
            onKeyDown={(event) => {
              if (event.key !== 'Escape' || event.defaultPrevented) return;
              event.preventDefault();
              event.stopPropagation();
              closeDialog();
            }}
          >
            <strong id={titleId} style={{ fontSize: 14 }}>Archive "juice-bench"?</strong>
            <p id={descriptionId} style={{ ...muted, margin: '4px 0 10px' }}>Move this project out of the active workspace.</p>
            <div style={{ ...row, justifyContent: 'flex-end' }}>
              <button ref={cancel} type="button" className="j-btn" data-size="sm" data-variant="ghost" onClick={closeDialog}>
                Cancel
              </button>
              <button type="button" className="j-btn" data-size="sm" onClick={confirmArchive}>
                Confirm Archive
              </button>
            </div>
          </section>
        ) : (
          <div style={between}>
            <span role="status" style={muted}>{confirmed ? 'Project archived' : 'juice-bench'}</span>
            <button ref={trigger} type="button" className="j-btn" data-size="sm" data-variant="secondary" onClick={openDialog}>
              {confirmed ? 'Reopen dialog' : 'Archive project'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const MENU_COMMANDS = [
  { id: 'duplicate', label: 'Duplicate', shortcut: '⌘D', key: 'd', icon: Copy },
  { id: 'copy-link', label: 'Copy Link', shortcut: '⌘L', key: 'l', icon: ExternalLink },
  { id: 'delete', label: 'Delete Block', shortcut: '⌫', key: 'backspace', icon: Trash2 },
] as const;
const MENU_ITEMS = ['guides', ...MENU_COMMANDS.map((item) => item.id)] as const;
type MenuItem = (typeof MENU_ITEMS)[number];

export function DropdownMenuKit({ id = 'dropdown-menu' }: { id?: string } = {}) {
  const { playSound } = useJuice();
  const menuId = useId();
  const triggerId = useId();
  const cardRef = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const items = useRef<Partial<Record<MenuItem, HTMLButtonElement | null>>>({});
  const pendingFocus = useRef<MenuItem | null>(null);
  const [open, setOpen] = useState(true);
  const [guides, setGuides] = useState(true);
  const [active, setActive] = useState<MenuItem>('guides');
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [copyResult, setCopyResult] = useState<'copied' | 'failed' | null>(null);

  function focusItem(item: MenuItem) {
    setActive(item);
    items.current[item]?.focus();
  }

  useEffect(() => {
    if (!open || !pendingFocus.current) return;
    const target = pendingFocus.current;
    pendingFocus.current = null;
    items.current[target]?.focus();
  }, [open]);

  const { onKeyDown } = useRovingFocus({ items: MENU_ITEMS, active, onSelect: focusItem });

  const openMenu = (item: MenuItem) => {
    if (open) {
      focusItem(item);
      return;
    }
    pendingFocus.current = item;
    setActive(item);
    setOpen(true);
  };

  const closeMenu = () => {
    setOpen(false);
    trigger.current?.focus();
  };

  const toggleGuides = () => {
    playSound('tap');
    setGuides((previous) => !previous);
  };

  const selectItem = async (item: string) => {
    if (item === 'guides') {
      toggleGuides();
      return;
    }
    const command = MENU_COMMANDS.find((candidate) => candidate.id === item);
    if (!command) return;
    playSound('tap');
    setSelectedItem(command.id);
    setCopyResult(null);
    if (cardRef.current?.contains(document.activeElement)) trigger.current?.focus();
    setOpen(false);
    if (command.id === 'copy-link') {
      const link = new URL(window.location.href);
      link.hash = id;
      setCopyResult(await copyText(link.href) ? 'copied' : 'failed');
    }
  };

  useJuiceAgentNode(id, 'DropdownMenuKit', { open, guides, active, selectedItem }, { selectItem, toggleGuides });

  const selectedLabel = MENU_COMMANDS.find((item) => item.id === selectedItem)?.label;
  const feedback = selectedItem === 'copy-link' && copyResult
    ? (copyResult === 'copied' ? 'Link copied' : 'Copy failed')
    : selectedLabel;

  return (
    <div
      ref={cardRef}
      id={id}
      className="j-slab j-fnd-card"
      style={card}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
      onKeyDown={(event) => {
        if (!open || event.defaultPrevented) return;
        if (event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
          closeMenu();
          return;
        }
        if (event.altKey || event.shiftKey) return;
        const command = MENU_COMMANDS.find((item) => item.key === event.key.toLowerCase());
        const hasModifier = event.metaKey || event.ctrlKey;
        if (!command || hasModifier === (command.id === 'delete')) return;
        event.preventDefault();
        void selectItem(command.id);
      }}
    >
      <div style={between}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>Block actions</span>
        <button
          ref={trigger}
          id={triggerId}
          type="button"
          className="j-btn"
          data-size="sm"
          data-variant="secondary"
          aria-label="Block actions"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls={open ? menuId : undefined}
          onClick={() => {
            playSound('tap');
            if (open) closeMenu();
            else openMenu('guides');
          }}
          onKeyDown={(event) => {
            if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
            event.preventDefault();
            openMenu(event.key === 'ArrowDown' ? 'guides' : 'delete');
          }}
        >
          <MoreHorizontal size={16} aria-hidden="true" />
        </button>
      </div>
      {open && (
        <div id={menuId} className="j-menu-list" role="menu" aria-labelledby={triggerId} onKeyDown={onKeyDown}>
          <button
            ref={(node) => { items.current.guides = node; }}
            type="button"
            role="menuitemcheckbox"
            aria-checked={guides}
            tabIndex={-1}
            data-highlighted={active === 'guides'}
            className="j-menu-item"
            onFocus={() => setActive('guides')}
            onClick={toggleGuides}
          >
            Show Grid Guides {guides && <Check size={14} aria-hidden="true" />}
          </button>
          {MENU_COMMANDS.map(({ id: item, label, shortcut, icon: Icon }) => (
            <button
              key={item}
              ref={(node) => { items.current[item] = node; }}
              type="button"
              role="menuitem"
              tabIndex={-1}
              data-highlighted={active === item}
              data-tone={item === 'delete' ? 'danger' : undefined}
              className="j-menu-item"
              onFocus={() => setActive(item)}
              onClick={() => { void selectItem(item); }}
            >
              <span style={row}><Icon size={13} aria-hidden="true" />{label}</span>
              <Kbd>{shortcut}</Kbd>
            </button>
          ))}
        </div>
      )}
      {!open && feedback && <span role="status" style={muted}>{feedback}</span>}
    </div>
  );
}

const SHARE_ROLES = [
  { value: 'Viewer', label: 'Viewer' },
  { value: 'Editor', label: 'Editor' },
] as const;
type ShareRole = (typeof SHARE_ROLES)[number]['value'];
const SHARE_URL = 'https://joplo.app/share/juice-bench';

export function PopoverTooltipKit({ id = 'popover-tooltip' }: { id?: string } = {}) {
  const { playSound } = useJuice();
  const popoverId = useId();
  const tooltipId = useId();
  const shareTrigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(true);
  const [isPublic, setPublic] = useState(false);
  const [role, setRoleValue] = useState<ShareRole>('Viewer');
  const [copyResult, setCopyResult] = useState<'copied' | 'failed' | null>(null);
  const [tooltip, setTooltip] = useState(false);

  const togglePublic = () => {
    playSound(isPublic ? 'tap' : 'latch');
    setPublic((previous) => !previous);
  };

  const setRole = (next: ShareRole) => {
    if (next === 'Viewer' || next === 'Editor') setRoleValue(next);
  };

  const copyLink = async () => {
    const copied = await copyText(SHARE_URL);
    setCopyResult(copied ? 'copied' : 'failed');
    playSound(copied ? 'latch' : 'tap');
  };

  useJuiceAgentNode(
    id,
    'PopoverTooltipKit',
    { open, isPublic, role, copied: copyResult === 'copied', tooltip },
    { togglePublic, setRole, copyLink },
  );

  return (
    <div id={id} className="j-slab j-fnd-card" style={card}>
      <div
        style={{ display: 'grid', gap: 8 }}
        onKeyDown={(event) => {
          if (event.key !== 'Escape' || !open) return;
          event.preventDefault();
          event.stopPropagation();
          setOpen(false);
          shareTrigger.current?.focus();
        }}
      >
        <button
          ref={shareTrigger}
          type="button"
          className="j-btn"
          data-size="sm"
          data-variant="secondary"
          style={{ justifySelf: 'start' }}
          aria-expanded={open}
          aria-controls={open ? popoverId : undefined}
          onClick={() => {
            playSound('tap');
            setOpen(!open);
          }}
        >
          <Share2 size={13} aria-hidden="true" /> Quick share
        </button>
        {open && (
          <div id={popoverId} role="region" aria-label="Sharing settings" style={{ ...inset, display: 'grid', gap: 8 }}>
            <div style={between}>
              <span style={{ fontSize: 13 }}>Public Link</span>
              <Switch checked={isPublic} aria-label="Public Link" onChange={setPublic} />
            </div>
            <div style={between}>
              <span style={muted}>Link role</span>
              <SegmentedControl options={SHARE_ROLES} value={role} onChange={setRole} />
            </div>
            <div style={between}>
              <span
                title={SHARE_URL}
                style={{ ...muted, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
              >
                joplo.app/share/juice-bench
              </span>
              <button type="button" className="j-btn" data-size="sm" data-variant="secondary" onClick={() => { void copyLink(); }}>
                {copyResult === 'copied' ? <Check size={13} aria-hidden="true" /> : <Copy size={13} aria-hidden="true" />}
                Copy URL
              </button>
            </div>
            {copyResult && (
              <div role="status" style={muted}>
                {copyResult === 'copied' ? 'URL copied' : (
                  <span style={{ userSelect: 'text', overflowWrap: 'anywhere' }}>Copy manually from {SHARE_URL}</span>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      <div
        style={{ alignSelf: 'flex-start', position: 'relative' }}
        onPointerEnter={(event) => { if (event.pointerType !== 'touch') setTooltip(true); }}
        onPointerLeave={(event) => {
          if (event.pointerType !== 'touch' && !event.currentTarget.contains(document.activeElement)) setTooltip(false);
        }}
      >
        <button
          type="button"
          className="j-btn"
          data-size="sm"
          data-variant="outline"
          aria-describedby={tooltip ? tooltipId : undefined}
          onFocus={() => setTooltip(true)}
          onBlur={() => setTooltip(false)}
          onClick={() => setTooltip(true)}
          onKeyDown={(event) => {
            if (event.key === 'Escape' && tooltip) {
              event.preventDefault();
              event.stopPropagation();
              setTooltip(false);
            }
            if (event.key === '/' && (event.metaKey || event.ctrlKey)) {
              event.preventDefault();
              setTooltip(true);
            }
          }}
        >
          Hover or focus · <Kbd>⌘/</Kbd>
        </button>
        {tooltip && (
          <div
            id={tooltipId}
            role="tooltip"
            style={{
              position: 'absolute', bottom: '100%', left: 0, zIndex: 1, whiteSpace: 'nowrap',
              borderRadius: 'var(--juice-r-control)', padding: '6px 9px', fontSize: 12,
              background: 'var(--fill-on)', color: 'var(--fill-slab)',
            }}
          >
            Show keyboard shortcuts
          </div>
        )}
      </div>
    </div>
  );
}

const ACCORDION_ITEMS = [
  { id: 'tokens', title: 'Token Architecture', content: 'Shared surface tokens define the palette, spacing and concentric radii for every control.' },
  { id: 'audio', title: 'Procedural Web Audio', content: 'Short Web Audio cues acknowledge gestures and confirmations without loading audio files.' },
  { id: 'bridge', title: 'Agent Bridge Contract', content: 'The bridge exposes component state and named actions so a host can inspect and drive the same UI.' },
] as const;
type AccordionItem = (typeof ACCORDION_ITEMS)[number]['id'];

export function AccordionKit({ id = 'accordion-kit' }: { id?: string } = {}) {
  const { playSound, animate } = useJuice();
  const reducedMotion = useReducedMotion();
  const headingId = useId();
  const [openItems, setOpenItems] = useState<AccordionItem[]>(['tokens']);
  const openItem = (item: string) => {
    const match = ACCORDION_ITEMS.find((candidate) => candidate.id === item);
    if (!match || openItems.includes(match.id)) return;
    playSound('tap');
    setOpenItems((previous) => previous.includes(match.id) ? previous : [...previous, match.id]);
  };
  const toggleAll = () => {
    playSound('tap');
    setOpenItems((previous) => previous.length === ACCORDION_ITEMS.length ? [] : ACCORDION_ITEMS.map((item) => item.id));
  };

  useJuiceAgentNode(id, 'AccordionKit', { openItems }, { openItem, toggleAll });

  return (
    <div id={id} className="j-slab j-fnd-card" style={card}>
      {ACCORDION_ITEMS.map((item, index) => {
        const expanded = openItems.includes(item.id);
        const triggerId = `${headingId}-${item.id}-trigger`;
        const panelId = `${headingId}-${item.id}-panel`;
        const transition = animate && !reducedMotion ? '180ms var(--juice-out)' : undefined;
        return (
          <div key={item.id} className="j-acc-item">
            <h3 style={{ margin: 0 }}>
              <button
                id={triggerId}
                type="button"
                className="j-acc-trigger"
                aria-expanded={expanded}
                aria-controls={panelId}
                onClick={() => {
                  playSound('tap');
                  setOpenItems((previous) =>
                    previous.includes(item.id) ? previous.filter((open) => open !== item.id) : [...previous, item.id],
                  );
                }}
              >
                {index + 1}. {item.title}
                <ChevronDown
                  size={14}
                  aria-hidden="true"
                  style={{ transform: expanded ? 'rotate(180deg)' : undefined, transition: transition && `transform ${transition}` }}
                />
              </button>
            </h3>
            <div
              id={panelId}
              role="region"
              aria-labelledby={triggerId}
              inert={!expanded}
              style={{
                display: 'grid',
                gridTemplateRows: expanded ? '1fr' : '0fr',
                transition: transition && `grid-template-rows ${transition}`,
              }}
            >
              <div style={{ overflow: 'hidden' }}><div className="j-acc-body">{item.content}</div></div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function Breadcrumbs({ segments, current, onNavigate }: {
  segments: readonly string[];
  current: number;
  onNavigate: (index: number) => void;
}) {
  return (
    <nav aria-label="Breadcrumbs">
      <ol style={{ ...row, gap: 0, flexWrap: 'wrap', listStyle: 'none', padding: 0, margin: 0 }}>
        {segments.map((segment, index) => (
          <li key={index} style={{ ...row, gap: 0 }}>
            {index > 0 && <ChevronRight size={11} color="var(--juice-mute)" aria-hidden="true" />}
            <button
              type="button"
              className="j-btn"
              data-size="xs"
              data-variant={index === current ? 'secondary' : 'ghost'}
              aria-current={index === current ? 'page' : undefined}
              onClick={() => onNavigate(index)}
            >
              {segment}
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function Pagination({ page, pageCount, onChange }: {
  page: number;
  pageCount: number;
  onChange: (page: number) => void;
}) {
  return (
    <nav aria-label="Pagination" style={{ ...row, flexWrap: 'wrap' }}>
      <button
        type="button"
        className="j-btn"
        data-size="sm"
        data-variant="ghost"
        aria-label="Previous page"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        <ChevronLeft size={14} aria-hidden="true" />
      </button>
      {Array.from({ length: pageCount }, (_, index) => {
        const number = index + 1;
        return (
          <button
            key={number}
            type="button"
            className="j-btn"
            data-size="sm"
            data-variant={number === page ? 'primary' : 'ghost'}
            aria-label={`Page ${number}`}
            aria-current={number === page ? 'page' : undefined}
            onClick={() => onChange(number)}
          >
            {number}
          </button>
        );
      })}
      <button
        type="button"
        className="j-btn"
        data-size="sm"
        data-variant="ghost"
        aria-label="Next page"
        disabled={page >= pageCount}
        onClick={() => onChange(page + 1)}
      >
        <ChevronRight size={14} aria-hidden="true" />
      </button>
    </nav>
  );
}

const WORKSPACE_PATH = ['Workspace', 'Packages', '@juice-ui', 'react'];
const TOTAL_ITEMS = 96;
const PAGE_SIZE = 20;
const PAGE_COUNT = Math.ceil(TOTAL_ITEMS / PAGE_SIZE);

export function NavPagination({ id = 'nav-pagination' }: { id?: string } = {}) {
  const { playSound } = useJuice();
  const [current, setCurrent] = useState(WORKSPACE_PATH.length - 1);
  const [page, setPageValue] = useState(1);
  const first = (page - 1) * PAGE_SIZE + 1;
  const last = Math.min(page * PAGE_SIZE, TOTAL_ITEMS);

  const setPage = (next: number) => {
    if (!Number.isFinite(next)) return;
    const bounded = Math.max(1, Math.min(PAGE_COUNT, Math.round(next)));
    if (bounded === page) return;
    playSound('tap');
    setPageValue(bounded);
  };

  useJuiceAgentNode(
    id,
    'NavPagination',
    { page, current: WORKSPACE_PATH[current], first, last, total: TOTAL_ITEMS },
    { setPage, nextPage: () => setPage(page + 1), prevPage: () => setPage(page - 1) },
  );

  return (
    <div id={id} className="j-slab j-fnd-card" style={card}>
      <Breadcrumbs
        segments={WORKSPACE_PATH}
        current={current}
        onNavigate={(index) => {
          if (index === current) return;
          playSound('tap');
          setCurrent(index);
          setPageValue(1);
        }}
      />
      <div style={{ ...inset, display: 'grid', justifyItems: 'center', gap: 6 }}>
        <Pagination page={page} pageCount={PAGE_COUNT} onChange={setPage} />
        <div role="status" style={muted}>
          <span style={visuallyHidden}>{first}–{last} of {TOTAL_ITEMS}</span>
          <span aria-hidden="true">
            <RollingNumber value={first} />–<RollingNumber value={last} /> of <RollingNumber value={TOTAL_ITEMS} />
          </span>
        </div>
      </div>
    </div>
  );
}

type AlertTone = 'ok' | 'warn' | 'danger';

export function Alert({ tone, children }: { tone: AlertTone; children: ReactNode }) {
  const Icon = tone === 'ok' ? Info : AlertCircle;
  return (
    <div className="j-alert" data-tone={tone} role="status" style={{ justifyContent: 'flex-start' }}>
      <Icon size={15} aria-hidden="true" style={{ flexShrink: 0 }} />{children}
    </div>
  );
}

const DEFAULT_USAGE = 66;
const DATABASE_SHARE = 42 / DEFAULT_USAGE;
const QUOTA_MESSAGES = {
  ok: 'Storage is within quota.',
  warn: 'Storage is nearing its limit.',
  danger: 'Free up space to stay within quota.',
};

export function AlertProgress({ id = 'alert-progress' }: { id?: string } = {}) {
  const { playSound } = useJuice();
  const [usage, setUsageValue] = useState(DEFAULT_USAGE);
  const database = Math.round(usage * DATABASE_SHARE);
  const assets = usage - database;
  const free = 100 - usage;
  const tone: AlertTone = usage >= 95 ? 'danger' : usage >= 80 ? 'warn' : 'ok';
  const segments = [
    { label: 'Database', value: database, color: 'var(--fill-on)' },
    { label: 'Assets', value: assets, color: 'var(--juice-mute)' },
    { label: 'Free', value: free, color: 'var(--juice-w12)' },
  ];

  const setUsage = (next: number) => {
    if (Number.isFinite(next)) setUsageValue(Math.max(0, Math.min(100, Math.round(next))));
  };
  const resetQuota = () => {
    playSound('tap');
    setUsage(DEFAULT_USAGE);
  };

  useJuiceAgentNode(id, 'AlertProgress', { usage, database, assets, free, tone }, { setUsage, resetQuota });

  return (
    <div id={id} className="j-slab j-fnd-card" style={card}>
      <div style={between}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>Storage quota</span>
        <strong style={{ fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>{usage}% used</strong>
      </div>
      <div className="j-ai-stack-bar" role="meter" aria-label="Storage used" aria-valuenow={usage} aria-valuemin={0} aria-valuemax={100}>
        {segments.map(({ label, value, color }) => value > 0 && (
          <span key={label} className="j-ai-stack-seg" style={{ width: `${value}%`, background: color }} />
        ))}
      </div>
      <div style={{ ...between, ...muted }} aria-label="Storage breakdown">
        {segments.map(({ label, value }) => <span key={label}>{label} {value}%</span>)}
      </div>
      <Alert tone={tone}>{QUOTA_MESSAGES[tone]}</Alert>
      <div style={between}>
        <label style={{ ...row, ...muted, flex: 1 }}>
          Preview usage
          <input
            type="range"
            min={0}
            max={100}
            value={usage}
            style={{ minWidth: 0, width: 100, flex: 1, accentColor: 'var(--fill-on)' }}
            onChange={(event) => setUsage(event.currentTarget.valueAsNumber)}
          />
        </label>
        <button type="button" className="j-btn" data-size="xs" data-variant="ghost" onClick={resetQuota}>Reset</button>
      </div>
    </div>
  );
}

const MEMBERS = [
  { initials: 'AL', name: 'Avery Lee', role: 'Product Designer', status: 'Online' },
  { initials: 'LC', name: 'Lena Chen', role: 'Engineering Lead', status: 'Online' },
  { initials: 'RF', name: 'Riley Flores', role: 'Design Engineer', status: 'Away' },
  { initials: 'EK', name: 'Eli Kim', role: 'Product Manager', status: 'Offline' },
  { initials: 'MS', name: 'Maya Shah', role: 'Software Engineer', status: 'Online' },
  { initials: 'JP', name: 'Jamie Park', role: 'UX Researcher', status: 'Away' },
  { initials: 'TO', name: 'Taylor Ortiz', role: 'Technical Writer', status: 'Offline' },
] as const;
type Member = (typeof MEMBERS)[number];
const VISIBLE_MEMBERS = 4;
const avatarButton = { border: 0, padding: 0, cursor: 'pointer' } as const;

export function AvatarProfile({ id = 'avatar-profile' }: { id?: string } = {}) {
  const { playSound } = useJuice();
  const extraId = useId();
  const [member, setMember] = useState<Member>(MEMBERS[0]);
  const [reviewers, setReviewers] = useState<Member['initials'][]>([]);
  const [expanded, setExpanded] = useState(false);
  const reviewer = reviewers.includes(member.initials);
  const tone = member.status === 'Online' ? 'ok' : member.status === 'Away' ? 'warn' : undefined;

  const selectMember = (initials: string) => {
    const next = MEMBERS.find((candidate) => candidate.initials === initials);
    if (!next || next === member) return;
    playSound('tap');
    setMember(next);
  };

  const toggleReviewer = () => {
    playSound(reviewer ? 'tap' : 'latch');
    setReviewers((previous) =>
      previous.includes(member.initials) ? previous.filter((initials) => initials !== member.initials) : [...previous, member.initials],
    );
  };

  useJuiceAgentNode(id, 'AvatarProfile', { member, reviewer, reviewers, expanded }, { selectMember, toggleReviewer });

  const renderAvatar = (entry: Member) => (
    <button
      key={entry.initials}
      type="button"
      className="j-avatar"
      aria-label={entry.name}
      aria-pressed={entry === member}
      title={entry.name}
      style={entry === member ? { ...avatarButton, background: 'var(--fill-on)', color: 'var(--fill-slab)', zIndex: 1 } : avatarButton}
      onClick={() => selectMember(entry.initials)}
    >
      {entry.initials}
    </button>
  );

  return (
    <div id={id} className="j-slab j-fnd-card" style={card}>
      <div className="j-avatar-group" role="group" aria-label="Team members">
        {MEMBERS.slice(0, VISIBLE_MEMBERS).map(renderAvatar)}
        <button
          type="button"
          className="j-avatar"
          style={avatarButton}
          aria-label="Three more team members"
          aria-expanded={expanded}
          aria-controls={expanded ? extraId : undefined}
          onClick={() => {
            playSound('tap');
            setExpanded(!expanded);
          }}
        >
          +3
        </button>
      </div>
      {expanded && (
        <div id={extraId} className="j-avatar-group" role="group" aria-label="More team members">
          {MEMBERS.slice(VISIBLE_MEMBERS).map(renderAvatar)}
        </div>
      )}
      <div style={{ ...inset, display: 'grid', gap: 8 }}>
        <div style={between} aria-live="polite">
          <div style={{ display: 'grid', gap: 2 }}>
            <strong style={{ fontSize: 13 }}>{member.name}</strong>
            <span style={muted}>{member.role}</span>
          </div>
          <span style={{ ...row, ...muted }}>
            <span className="j-status-dot" data-tone={tone} aria-hidden="true" />{member.status}
          </span>
        </div>
        <button
          type="button"
          className="j-btn"
          data-size="sm"
          data-variant={reviewer ? 'secondary' : 'outline'}
          aria-pressed={reviewer}
          style={{ justifySelf: 'start' }}
          onClick={toggleReviewer}
        >
          {reviewer ? <Check size={13} aria-hidden="true" /> : <UserPlus size={13} aria-hidden="true" />}
          Assign Reviewer
        </button>
      </div>
    </div>
  );
}

const WEBHOOK_URL = 'https://api.joplo.app/hooks';

export function EmptyStateCard({ id = 'empty-state' }: { id?: string } = {}) {
  const { playSound } = useJuice();
  const [populated, setPopulated] = useState(false);
  const populate = () => {
    if (populated) return;
    playSound('latch');
    setPopulated(true);
  };
  const resetEmpty = () => {
    if (!populated) return;
    playSound('tap');
    setPopulated(false);
  };

  useJuiceAgentNode(id, 'EmptyStateCard', { populated, url: populated ? WEBHOOK_URL : null }, { populate, resetEmpty });

  return (
    <div id={id} className="j-slab j-fnd-card" style={card}>
      <div style={{ ...inset, display: 'grid', justifyItems: populated ? 'stretch' : 'center', gap: 8, padding: 14 }}>
        <div role="status">
          {populated ? (
            <div style={between}>
              <span style={{ fontSize: 12, overflowWrap: 'anywhere', userSelect: 'text' }}>{WEBHOOK_URL}</span>
              <Badge tone="ok" style={{ flexShrink: 0 }}>200 OK</Badge>
            </div>
          ) : (
            <strong style={{ fontSize: 13 }}>No webhooks configured</strong>
          )}
        </div>
        <button
          type="button"
          className="j-btn"
          data-size="sm"
          data-variant={populated ? 'ghost' : 'primary'}
          style={{ justifySelf: populated ? 'end' : 'center' }}
          onClick={populated ? resetEmpty : populate}
        >
          {populated ? 'Reset' : '+ Create Webhook'}
        </button>
      </div>
    </div>
  );
}
