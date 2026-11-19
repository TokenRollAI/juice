import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Copy, ExternalLink, Eye, Layers, Maximize2, Palette, PanelRight, Share2, X } from 'lucide-react';
import { useJuice, useJuiceAgentNode, useRovingFocus } from './behaviors.tsx';
import { Badge, Kbd, SegmentedControl, Switch } from './components.tsx';

export type FloatingPlacement =
  | 'bottom-start' | 'bottom-end' | 'bottom'
  | 'top-start' | 'top-end' | 'top'
  | 'right-start' | 'left-start';

const placements: readonly FloatingPlacement[] = [
  'bottom-start', 'bottom-end', 'bottom', 'top-start', 'top-end', 'top', 'right-start', 'left-start',
];
const viewportInset = 8;
const opposite = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' } as const;

export function placeFloating(
  anchor: { left: number; top: number; width: number; height: number; right: number; bottom: number },
  floating: { width: number; height: number },
  viewport: { width: number; height: number },
  placement: FloatingPlacement = 'bottom-start',
  gap = 8,
): { x: number; y: number; side: 'top' | 'bottom' | 'left' | 'right' } {
  const [preferred, alignment] = placement.split('-') as [keyof typeof opposite, ('start' | 'end')?];
  const available = {
    top: anchor.top - viewportInset - gap,
    bottom: viewport.height - anchor.bottom - viewportInset - gap,
    left: anchor.left - viewportInset - gap,
    right: viewport.width - anchor.right - viewportInset - gap,
  };
  const vertical = preferred === 'top' || preferred === 'bottom';
  const needed = vertical ? floating.height : floating.width;
  const fallback = opposite[preferred];
  const side = available[preferred] < needed && available[fallback] > available[preferred] ? fallback : preferred;
  const clamp = (position: number, size: number, extent: number) =>
    Math.min(Math.max(viewportInset, position), Math.max(viewportInset, extent - size - viewportInset));

  let x = anchor.left;
  let y = anchor.top;
  if (vertical) {
    if (alignment === 'end') x = anchor.right - floating.width;
    if (alignment === undefined) x += (anchor.width - floating.width) / 2;
    y = side === 'top' ? anchor.top - gap - floating.height : anchor.bottom + gap;
  } else {
    x = side === 'left' ? anchor.left - gap - floating.width : anchor.right + gap;
  }

  return { x: clamp(x, floating.width, viewport.width), y: clamp(y, floating.height, viewport.height), side };
}

const portalTokens = [
  '--fill-slab', '--fill-on', '--juice-font-ui', '--juice-font-mono', '--juice-signal', '--juice-ok',
  '--juice-warn', '--juice-danger', '--juice-soft', '--juice-mute', '--juice-faint', '--juice-w4',
  '--juice-w6', '--juice-w12', '--juice-w20', '--juice-edge', '--juice-r-inner', '--juice-r-control', '--juice-out',
];

function AnchoredLayer({
  anchor,
  placement,
  width,
  surfaceRef,
  tooltip = false,
  interactive = false,
  id,
  children,
}: {
  anchor: HTMLElement;
  placement: FloatingPlacement;
  width?: number;
  surfaceRef?: RefObject<HTMLDivElement | null>;
  tooltip?: boolean;
  interactive?: boolean;
  id?: string;
  children: ReactNode;
}) {
  const { theme, fill, animate } = useJuice();
  const localRef = useRef<HTMLDivElement>(null);
  const ref = surfaceRef ?? localRef;
  const doc = anchor.ownerDocument;
  const [fullscreenHost, setFullscreenHost] = useState(() => doc.fullscreenElement);
  const host = fullscreenHost?.ownerDocument === doc ? fullscreenHost : doc.body;

  useLayoutEffect(() => {
    const syncHost = () => setFullscreenHost(doc.fullscreenElement);
    syncHost();
    doc.addEventListener('fullscreenchange', syncHost);
    return () => doc.removeEventListener('fullscreenchange', syncHost);
  }, [doc]);

  useLayoutEffect(() => {
    const surface = ref.current;
    const win = doc.defaultView;
    if (!surface || !win) return;
    const computed = win.getComputedStyle(anchor);
    for (const token of portalTokens) {
      surface.style.setProperty(token, computed.getPropertyValue(token));
    }
    surface.style.direction = computed.direction;
    const reducedMotion = win.matchMedia('(prefers-reduced-motion: reduce)');
    const syncMotion = () => {
      surface.style.animation = animate && !reducedMotion.matches ? '' : 'none';
    };
    syncMotion();
    reducedMotion.addEventListener('change', syncMotion);

    const update = () => {
      const viewport = { width: doc.documentElement.clientWidth, height: doc.documentElement.clientHeight };
      const bounds = anchor.getBoundingClientRect();
      const { x, y, side } = placeFloating(
        bounds,
        { width: surface.offsetWidth, height: surface.offsetHeight },
        viewport,
        placement,
      );
      surface.style.left = `${x}px`;
      surface.style.top = `${y}px`;
      surface.dataset.side = side;
      const originX = Math.max(0, Math.min(surface.offsetWidth, bounds.left + bounds.width / 2 - x));
      const originY = Math.max(0, Math.min(surface.offsetHeight, bounds.top + bounds.height / 2 - y));
      surface.style.transformOrigin = side === 'top' || side === 'bottom'
        ? `${originX}px ${side === 'top' ? '100%' : '0%'}`
        : `${side === 'left' ? '100%' : '0%'} ${originY}px`;
    };

    update();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update);
    observer?.observe(anchor);
    observer?.observe(surface);
    win.addEventListener('resize', update);
    win.addEventListener('scroll', update, { capture: true, passive: true });
    return () => {
      observer?.disconnect();
      reducedMotion.removeEventListener('change', syncMotion);
      win.removeEventListener('resize', update);
      win.removeEventListener('scroll', update, true);
    };
  }, [anchor, animate, doc, fill, host, placement, ref, theme]);

  const inset = viewportInset * 2;
  return createPortal(
    <div
      ref={ref}
      id={id}
      role={tooltip ? 'tooltip' : undefined}
      className={tooltip ? 'j-tooltip-pill' : 'j-floating-pop'}
      data-floating-popover={interactive ? '' : undefined}
      style={{
        position: 'fixed',
        boxSizing: 'border-box',
        whiteSpace: tooltip ? 'normal' : undefined,
        overflowWrap: 'anywhere',
        zIndex: tooltip ? 1001 : 1000,
        width,
        maxWidth: `calc(100vw - ${inset}px)`,
        maxHeight: `calc(100vh - ${inset}px)`,
        overflow: tooltip ? undefined : 'auto',
        pointerEvents: interactive ? undefined : 'none',
      }}
    >
      {children}
    </div>,
    host,
  );
}

export function FloatingPopover({
  open,
  anchor,
  onClose,
  placement = 'bottom-start',
  width = 240,
  children,
}: {
  open: boolean;
  anchor: HTMLElement | null;
  onClose: () => void;
  placement?: FloatingPlacement;
  width?: number;
  children: ReactNode;
}) {
  const surface = useRef<HTMLDivElement>(null);
  const previousAnchor = useRef<HTMLElement | null>(null);

  useLayoutEffect(() => {
    if (open && anchor) {
      previousAnchor.current = anchor;
    } else if (previousAnchor.current) {
      previousAnchor.current.focus({ preventScroll: true });
      previousAnchor.current = null;
    }
  }, [anchor, open]);

  useEffect(() => {
    if (!open || !anchor) return;
    const doc = anchor.ownerDocument;
    const isTopmost = () => [...doc.querySelectorAll('[data-floating-popover]')].at(-1) === surface.current;
    const onPointerDown = (event: globalThis.PointerEvent) => {
      const path = event.composedPath();
      if (isTopmost() && !path.includes(anchor) && surface.current && !path.includes(surface.current)) onClose();
    };
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented || !isTopmost()) return;
      event.preventDefault();
      onClose();
    };
    doc.addEventListener('pointerdown', onPointerDown, true);
    doc.addEventListener('keydown', onKeyDown);
    return () => {
      doc.removeEventListener('pointerdown', onPointerDown, true);
      doc.removeEventListener('keydown', onKeyDown);
    };
  }, [anchor, onClose, open]);

  return open && anchor ? (
    <AnchoredLayer anchor={anchor} placement={placement} width={width} surfaceRef={surface} interactive>
      {children}
    </AnchoredLayer>
  ) : null;
}

export function useTooltip(label: ReactNode, kbd?: string) {
  const id = useId();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const visible = label != null && anchor !== null && (hovered || focused) && !dismissed;

  useEffect(() => {
    if (!visible || !anchor) return;
    const doc = anchor.ownerDocument;
    const dismiss = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') setDismissed(true);
    };
    doc.addEventListener('keydown', dismiss);
    return () => doc.removeEventListener('keydown', dismiss);
  }, [anchor, visible]);

  const triggerProps = {
    'aria-describedby': visible ? id : undefined,
    onPointerEnter: (event: PointerEvent<HTMLElement>) => {
      if (event.pointerType === 'touch') return;
      setAnchor(event.currentTarget);
      setHovered(true);
      setDismissed(false);
    },
    onPointerLeave: () => setHovered(false),
    onFocus: (event: FocusEvent<HTMLElement>) => {
      setAnchor(event.currentTarget);
      setFocused(true);
      setDismissed(false);
    },
    onBlur: () => setFocused(false),
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
      if (event.key !== 'Escape' || !visible) return;
      event.preventDefault();
      event.stopPropagation();
      setDismissed(true);
    },
  };

  return [
    triggerProps,
    visible && anchor ? (
      <AnchoredLayer anchor={anchor} placement="top" id={id} tooltip>
        {label}
        {kbd && <Kbd className="j-tooltip-kbd">{kbd}</Kbd>}
      </AnchoredLayer>
    ) : null,
  ] as const;
}

export function Tooltip({
  label,
  kbd,
  children,
}: {
  label: ReactNode;
  kbd?: string;
  children: (triggerProps: ReturnType<typeof useTooltip>[0]) => ReactNode;
}) {
  const [triggerProps, content] = useTooltip(label, kbd);
  return <>{children(triggerProps)}{content}</>;
}

function usePreviewDelay(onPreview: (id: string | null) => void) {
  const timer = useRef<number | undefined>(undefined);
  const latest = useRef(onPreview);
  useLayoutEffect(() => { latest.current = onPreview; }, [onPreview]);

  const show = useCallback((id: string | null) => {
    window.clearTimeout(timer.current);
    timer.current = undefined;
    latest.current(id);
  }, []);

  useEffect(() => {
    const escape = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape' && !event.defaultPrevented) show(null);
    };
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('keydown', escape);
      window.clearTimeout(timer.current);
    };
  }, [show]);

  return {
    show,
    schedule(id: string) {
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => show(id), 150);
    },
  };
}

const cardStyle = { padding: 10 } as const;
const row = { display: 'flex', alignItems: 'center', gap: 6 } as const;
const between = { ...row, justifyContent: 'space-between' } as const;
const title = { fontSize: 14, lineHeight: 1.3, letterSpacing: '-.025em', fontWeight: 600 } as const;
const muted = { fontSize: 12, lineHeight: 1.45, color: 'var(--juice-soft)' } as const;
const mono = { fontFamily: 'var(--juice-font-mono)', fontSize: 11, fontVariantNumeric: 'tabular-nums' } as const;
const header = { ...between, padding: '2px 4px' } as const;
const well = { borderRadius: 'var(--juice-r-inner)', background: 'var(--juice-w6)' } as const;
const stack = { display: 'grid', gap: 6 } as const;

const demoPlacements = [
  { value: 'bottom-start', label: 'Below' },
  { value: 'top', label: 'Above' },
  { value: 'right-start', label: 'Right' },
] as const;

export function FloatingPopoverKit({ id = 'floating-popover-kit' }: { id?: string } = {}) {
  const popoverId = useId();
  const [anchor, setAnchor] = useState<HTMLButtonElement | null>(null);
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState<FloatingPlacement>('bottom-start');
  const [showShortcuts, setShowShortcuts] = useState(false);
  const focusClose = useCallback((button: HTMLButtonElement | null) => {
    button?.focus({ preventScroll: true });
  }, []);
  const openPopover = () => setOpen(true);
  const closePopover = () => setOpen(false);

  useJuiceAgentNode(id, 'FloatingPopoverKit', { open, placement }, {
    openPopover,
    closePopover,
    setPlacement: (next: FloatingPlacement) => { if (placements.includes(next)) setPlacement(next); },
  });

  return (
    <div
      id={id}
      className="j-slab j-fnd-card"
      style={cardStyle}
      onKeyDown={(event) => {
        if (event.defaultPrevented || (!event.metaKey && !event.ctrlKey)) return;
        if (event.key.toLowerCase() === 'p') {
          event.preventDefault();
          setOpen((current) => !current);
        }
        if (event.key === '/') {
          event.preventDefault();
          setShowShortcuts((current) => !current);
        }
      }}
    >
      <div style={header}>
        <span style={title}>Popover placement</span>
        <Tooltip label="Keyboard shortcuts" kbd="⌘/">
          {(props) => (
            <button {...props} className="j-chip" type="button" aria-label="Keyboard shortcuts" aria-expanded={showShortcuts} onClick={() => setShowShortcuts(!showShortcuts)}>
              <span style={mono}>⌘/</span>
            </button>
          )}
        </Tooltip>
      </div>
      <div style={{ ...well, display: 'grid', placeItems: 'center', minHeight: 76 }}>
        <Tooltip label={open ? null : 'Open popover'} kbd="⌘P">
          {(props) => (
            <button
              {...props}
              ref={setAnchor}
              className="j-chip"
              style={{ height: 32, borderRadius: 10, paddingInline: 12, background: 'var(--fill-on)', color: 'var(--fill-slab)' }}
              type="button"
              aria-haspopup="dialog"
              aria-expanded={open}
              aria-controls={open ? popoverId : undefined}
              onClick={() => setOpen((current) => !current)}
            >
              <Layers size={14} aria-hidden="true" /> {open ? 'Close popover' : 'Open popover'}
            </button>
          )}
        </Tooltip>
      </div>
      {showShortcuts && (
        <div style={{ ...stack, ...muted, padding: '0 4px 2px' }}>
          <div style={between}>Toggle popover <Kbd>⌘P</Kbd></div>
          <div style={between}>Toggle shortcuts <Kbd>⌘/</Kbd></div>
        </div>
      )}
      <FloatingPopover open={open} anchor={anchor} onClose={closePopover} placement={placement}>
        <div id={popoverId} role="dialog" aria-label="Popover placement" style={{ ...stack, padding: 4 }}>
          <div style={between}>
            <span style={title}>Placement</span>
            <button
              ref={focusClose}
              className="j-chip"
              type="button"
              aria-label="Close popover"
              onClick={closePopover}
            >
              <X size={13} aria-hidden="true" />
            </button>
          </div>
          <SegmentedControl options={demoPlacements} value={placement} onChange={setPlacement} />
        </div>
      </FloatingPopover>
    </div>
  );
}

const previewOptions = [
  { id: 'edge-router', label: 'A · Edge Router', summary: 'Routes requests near their origin.', tradeoffs: 'Low latency with a limited runtime.' },
  { id: 'stream-worker', label: 'B · Stream Worker', summary: 'Processes events as they arrive.', tradeoffs: 'Immediate results require backpressure handling.' },
  { id: 'queue-consumer', label: 'C · Queue Consumer', summary: 'Processes small batches from a queue.', tradeoffs: 'Absorbs bursts with a delay before processing.' },
] as const;

export function HoverPreviewList({ id = 'hover-preview-list' }: { id?: string } = {}) {
  const buttons = useRef(new Map<string, HTMLButtonElement>());
  const [selected, setSelected] = useState<string>(previewOptions[0].id);
  const [previewed, setPreviewed] = useState<string | null>(null);
  const delay = usePreviewDelay(setPreviewed);
  const preview = previewOptions.find((option) => option.id === previewed);
  const anchor = preview ? buttons.current.get(preview.id) : undefined;
  const previewId = useId();

  function previewOption(next: string | null) {
    if (next === null || previewOptions.some((option) => option.id === next)) delay.show(next);
  }

  function selectOption(next: string) {
    if (!previewOptions.some((option) => option.id === next)) return;
    setSelected(next);
  }

  useJuiceAgentNode(id, 'HoverPreviewList', { selected, previewed }, { selectOption, previewOption });

  return (
    <div id={id} className="j-slab j-fnd-card" style={cardStyle}>
      <div style={header}>
        <span style={title}>Routing options</span>
        <div role="group" aria-label="Quick switch" style={row}>
          {previewOptions.slice(1).map((option, index) => (
            <Tooltip key={option.id} label={index === 0 ? 'Stream Worker · Ready' : 'Queue Consumer · Needs attention'}>
              {(props) => (
                <button {...props} type="button" className="j-chip" style={{ padding: 0, background: 'transparent' }}
                  aria-label={`Select ${option.label}`} onClick={() => selectOption(option.id)}>
                  <Badge tone={index === 0 ? 'ok' : 'warn'}>{index === 0 ? <>B <Check size={11} /></> : 'C !'}</Badge>
                </button>
              )}
            </Tooltip>
          ))}
        </div>
      </div>
      <div className="j-menu-list" role="group" aria-label="Routing options">
        {previewOptions.map((option) => (
          <button
            key={option.id}
            ref={(button) => {
              if (button) buttons.current.set(option.id, button);
              else buttons.current.delete(option.id);
            }}
            type="button"
            className="j-menu-item"
            aria-pressed={selected === option.id}
            aria-describedby={preview?.id === option.id ? previewId : undefined}
            data-highlighted={selected === option.id}
            onClick={() => selectOption(option.id)}
            onFocus={() => previewOption(option.id)}
            onBlur={() => previewOption(null)}
            onPointerEnter={(event) => {
              if (event.pointerType !== 'touch') delay.schedule(option.id);
            }}
            onPointerLeave={() => previewOption(null)}
            onKeyDown={(event) => {
              if (event.key === 'Escape' && previewed !== null) {
                event.stopPropagation();
                previewOption(null);
              }
            }}
          >
            <span style={{ ...row, gap: 10 }}>
              <span style={{ ...mono, color: 'var(--juice-soft)' }}>{option.label[0]}</span>
              <span>{option.label.slice(4)}</span>
            </span>
            {selected === option.id && <Check size={14} aria-hidden="true" />}
          </button>
        ))}
      </div>
      {preview && anchor && (
        <AnchoredLayer anchor={anchor} placement="right-start" width={226}>
          <div id={previewId} role="tooltip" style={{ ...stack, padding: 8, gap: 8 }}>
            <span style={title}>{preview.label}</span>
            <span style={muted}>{preview.summary}</span>
            <span style={{ ...muted, borderTop: '1px solid var(--juice-edge)', paddingTop: 7 }}>{preview.tradeoffs}</span>
          </div>
        </AnchoredLayer>
      )}
    </div>
  );
}

export function BreadcrumbSelect({
  label,
  value,
  options,
  onChange,
  open,
  onOpenChange,
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const menuId = useId();
  const triggerId = useId();
  const [anchor, setAnchor] = useState<HTMLButtonElement | null>(null);
  const [active, setActive] = useState(value);
  const initialFocus = useRef<string | undefined>(undefined);
  const buttons = useRef(new Map<string, HTMLButtonElement>());
  const focusOnOpen = useCallback((menu: HTMLDivElement | null) => {
    const first = menu?.querySelector<HTMLButtonElement>('[data-initial-focus="true"]')
      ?? menu?.querySelector<HTMLButtonElement>('button');
    first?.focus({ preventScroll: true });
  }, []);

  function focusItem(item: string) {
    setActive(item);
    buttons.current.get(item)?.focus({ preventScroll: true });
  }

  const { onKeyDown } = useRovingFocus({ items: options, active, onSelect: focusItem });
  const close = () => {
    initialFocus.current = undefined;
    onOpenChange(false);
  };

  return (
    <>
      <button
        ref={setAnchor}
        id={triggerId}
        type="button"
        className="j-chip"
        style={{ minWidth: 0, height: 30, paddingInline: 6, background: open ? 'var(--juice-w12)' : undefined }}
        aria-label={`${label}: ${value}`}
        aria-haspopup="menu"
        aria-controls={open ? menuId : undefined}
        aria-expanded={open}
        onClick={() => {
          initialFocus.current = undefined;
          onOpenChange(!open);
        }}
        onKeyDown={(event) => {
          if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
          event.preventDefault();
          const next = event.key === 'ArrowDown' ? options[0] : options.at(-1);
          if (next === undefined) return;
          if (open) focusItem(next);
          else {
            initialFocus.current = next;
            onOpenChange(true);
          }
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</span>
        <ChevronDown size={12} style={{ flexShrink: 0 }} aria-hidden="true" />
      </button>
      <FloatingPopover open={open} anchor={anchor} onClose={close} width={176}>
        <div
          ref={focusOnOpen}
          id={menuId}
          className="j-menu-list"
          style={{ background: 'transparent', padding: 0 }}
          role="menu"
          aria-labelledby={triggerId}
          onKeyDown={(event) => {
            if (event.key === 'Tab') {
              anchor?.focus({ preventScroll: true });
              close();
            } else {
              onKeyDown(event);
            }
          }}
        >
          {options.map((option) => (
            <button
              key={option}
              ref={(button) => {
                if (button) buttons.current.set(option, button);
                else buttons.current.delete(option);
              }}
              type="button"
              className="j-menu-item"
              role="menuitemradio"
              aria-checked={option === value}
              data-highlighted={active === option}
              data-initial-focus={option === (initialFocus.current ?? value)}
              tabIndex={-1}
              onFocus={() => setActive(option)}
              onClick={() => {
                onChange(option);
                initialFocus.current = undefined;
                onOpenChange(false);
              }}
            >
              {option} {value === option && <Check size={14} aria-hidden="true" />}
            </button>
          ))}
        </div>
      </FloatingPopover>
    </>
  );
}

const organizations = ['Acme Org', 'Field Labs'] as const;
const projects = ['Core UI', 'Pattern Library', 'Design System'] as const;

export function BreadcrumbDropdownBar({ id = 'breadcrumb-dropdown-bar' }: { id?: string } = {}) {
  const [organization, setOrganization] = useState<string>(organizations[0]);
  const [project, setProject] = useState<string>(projects[0]);
  const [menu, setMenu] = useState<'organization' | 'project' | null>(null);

  const selectProject = (name: string) => {
    if (!projects.some((option) => option === name)) return;
    setProject(name);
    setMenu(null);
  };
  useJuiceAgentNode(id, 'BreadcrumbDropdownBar', { organization, project, menu }, {
    selectProject,
    toggleMenu: () => setMenu((current) => current ? null : 'project'),
  });

  return (
    <div id={id} className="j-slab j-fnd-card" style={cardStyle}>
      <nav aria-label="Breadcrumb" style={{ ...row, gap: 4, whiteSpace: 'nowrap' }}>
        <BreadcrumbSelect
          label="Organization"
          value={organization}
          options={organizations}
          open={menu === 'organization'}
          onOpenChange={(next) => setMenu((current) => next ? 'organization' : current === 'organization' ? null : current)}
          onChange={setOrganization}
        />
        <span aria-hidden="true" style={muted}>/</span>
        <BreadcrumbSelect
          label="Project"
          value={project}
          options={projects}
          open={menu === 'project'}
          onOpenChange={(next) => setMenu((current) => next ? 'project' : current === 'project' ? null : current)}
          onChange={selectProject}
        />
        <span aria-hidden="true" style={muted}>/</span>
        <span aria-current="page" style={{ ...muted, ...mono }}>v0.3</span>
      </nav>
    </div>
  );
}

export type AdaptiveToolbarAction = {
  id: string;
  label: string;
  icon: ReactNode;
  onPress: () => void;
};

const toolbarRow = { display: 'flex', flexWrap: 'nowrap', gap: 2, whiteSpace: 'nowrap' } as const;
const toolbarButton = { flex: '0 0 auto', justifyContent: 'center', gap: 4, padding: '0 5px', fontSize: 11.5, height: 30 } as const;
const compactButtonWidth = 36;
const toolbarPadding = 4;

export function AdaptiveToolbar({
  actions,
  label,
  style,
}: {
  actions: readonly AdaptiveToolbarAction[];
  label: string;
  style?: CSSProperties;
}) {
  const container = useRef<HTMLDivElement>(null);
  const measurement = useRef<HTMLDivElement>(null);
  const [visibleLabels, setVisibleLabels] = useState(actions.length);

  useLayoutEffect(() => {
    const viewport = container.current;
    const labels = measurement.current;
    if (!viewport || !labels) return;
    const update = () => {
      const items = Array.from(labels.children);
      let used = toolbarPadding * 2 + Math.max(0, items.length - 1) * toolbarRow.gap + items.length * compactButtonWidth;
      let count = 0;
      for (const item of items) {
        used += item.getBoundingClientRect().width - compactButtonWidth;
        if (used > viewport.clientWidth) break;
        count++;
      }
      setVisibleLabels(count);
    };
    update();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update);
    observer?.observe(viewport);
    observer?.observe(labels);
    window.addEventListener('resize', update);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', update);
    };
  }, [actions]);

  return (
    <div ref={container} style={{ ...well, position: 'relative', maxWidth: '100%', minWidth: 0, ...style }}>
      <div aria-hidden="true" style={{ position: 'absolute', inset: 0, overflow: 'hidden', visibility: 'hidden', pointerEvents: 'none' }}>
        <div ref={measurement} style={{ ...toolbarRow, width: 'max-content' }}>
          {actions.map(({ id, icon, label: actionLabel }) => (
            <span key={id} className="j-chip" style={{ ...toolbarButton, minWidth: compactButtonWidth, boxSizing: 'border-box' }}>{icon}{actionLabel}</span>
          ))}
        </div>
      </div>
      <div role="group" aria-label={label} data-compact={visibleLabels < actions.length}
        style={{ ...toolbarRow, overflowX: 'auto', padding: toolbarPadding, borderRadius: 'inherit' }}>
        {actions.map(({ id, icon, label: actionLabel, onPress }, index) => (
          <Tooltip key={id} label={index >= visibleLabels ? actionLabel : null}>
            {(props) => (
              <button
                {...props}
                type="button"
                className="j-chip"
                aria-label={actionLabel}
                style={{ ...toolbarButton, flexGrow: 1, minWidth: compactButtonWidth, borderRadius: 'var(--juice-r-control)' }}
                onClick={onPress}
              >
                {icon}{index < visibleLabels && actionLabel}
              </button>
            )}
          </Tooltip>
        ))}
      </div>
    </div>
  );
}

const toolbarActions = [
  { id: 'inspect', label: 'Inspect', Icon: PanelRight },
  { id: 'appearance', label: 'Appearance', Icon: Palette },
  { id: 'export', label: 'Export', Icon: Maximize2 },
  { id: 'share', label: 'Share', Icon: Share2 },
] as const;

export function AdaptiveToolbarKit({ id = 'adaptive-toolbar-kit' }: { id?: string } = {}) {
  const [width, setWidth] = useState(300);
  const [lastAction, setLastAction] = useState<string | null>(null);
  const sliderId = useId();
  const actions = useMemo(() => toolbarActions.map(({ id, label, Icon }) => ({
    id,
    label,
    icon: <Icon size={13} aria-hidden="true" />,
    onPress: () => setLastAction(label),
  })), []);

  function setToolbarWidth(px: number) {
    if (Number.isFinite(px)) setWidth(Math.max(180, Math.min(300, Math.round(px))));
  }

  useJuiceAgentNode(id, 'AdaptiveToolbarKit', { width, lastAction }, { setToolbarWidth });

  return (
    <div id={id} className="j-slab j-fnd-card" style={cardStyle}>
      <div style={header}>
        <label style={title} htmlFor={sliderId}>Toolbar width</label>
        <div style={row}>
          <span style={{ ...row, ...muted }} role="status">
            {lastAction && <><Check size={12} aria-hidden="true" />{lastAction}</>}
          </span>
          <output style={{ ...muted, ...mono }} htmlFor={sliderId}>{width} px</output>
        </div>
      </div>
      <input
        id={sliderId}
        type="range"
        min={180}
        max={300}
        value={width}
        aria-valuetext={`${width} pixels`}
        onChange={(event) => setToolbarWidth(event.currentTarget.valueAsNumber)}
        style={{ width: '100%', height: 24, margin: 0, accentColor: 'var(--fill-on)' }}
      />
      <AdaptiveToolbar actions={actions} label="Actions" style={{ width }} />
    </div>
  );
}

export type SwatchPalette = {
  id: string;
  label: string;
  colors: readonly [surface: string, ink: string, accent: string];
};

export function SwatchGridPicker({
  label,
  palettes,
  value,
  preview,
  onPreview,
  onCommit,
  columns = 3,
}: {
  label: string;
  palettes: readonly SwatchPalette[];
  value: string;
  preview: string | null;
  onPreview: (id: string | null) => void;
  onCommit: (id: string) => void;
  columns?: number;
}) {
  const columnCount = Number.isFinite(columns) ? Math.max(1, Math.floor(columns)) : 3;
  const rows = useMemo(() => {
    const grouped: SwatchPalette[][] = [];
    for (let start = 0; start < palettes.length; start += columnCount) {
      grouped.push(palettes.slice(start, start + columnCount));
    }
    return grouped;
  }, [columnCount, palettes]);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const buttons = useRef(new Map<string, HTMLButtonElement>());
  const delay = usePreviewDelay(onPreview);
  const focusId = [focusedId, value].find((candidate) => palettes.some(({ id }) => id === candidate)) ?? palettes[0]?.id;
  const activeRow = rows.findIndex((items) => items.some(({ id }) => id === focusId));
  const rowIds = rows[activeRow]?.map(({ id }) => id) ?? [];
  const focus = (id: string) => buttons.current.get(id)?.focus();
  const { onKeyDown } = useRovingFocus({
    items: rowIds,
    active: focusId ?? '',
    onSelect: focus,
    orientation: 'horizontal',
  });

  return (
    <div
      role="grid"
      aria-label={label}
      style={{ ...stack, gap: 5 }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setFocusedId(null);
          delay.show(null);
        }
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
          delay.show(null);
        } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
          event.preventDefault();
          const nextRow = activeRow + (event.key === 'ArrowDown' ? 1 : -1);
          const items = rows[nextRow];
          const next = items?.[Math.min(rowIds.indexOf(focusId ?? ''), items.length - 1)];
          if (next) focus(next.id);
        } else {
          onKeyDown(event);
        }
      }}
    >
      {rows.map((items) => (
        <div
          key={items[0]?.id}
          role="row"
          className="j-swatch-grid"
          style={{ gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))` }}
        >
          {items.map((palette) => (
            <div key={palette.id} role="gridcell" aria-selected={palette.id === value} style={{ minWidth: 0 }}>
              <button
                ref={(button) => {
                  if (button) buttons.current.set(palette.id, button);
                  else buttons.current.delete(palette.id);
                }}
                type="button"
                tabIndex={palette.id === focusId ? 0 : -1}
                className="j-swatch-cell"
                data-selected={palette.id === value}
                data-previewing={palette.id === preview}
                style={{ width: '100%', display: 'grid', gap: 5, justifyContent: 'stretch', textAlign: 'start', outline: 'revert' }}
                onPointerEnter={(event) => {
                  if (event.pointerType !== 'touch') delay.schedule(palette.id);
                }}
                onPointerLeave={(event) => {
                  if (event.pointerType !== 'touch') delay.show(null);
                }}
                onFocus={() => {
                  setFocusedId(palette.id);
                  delay.show(palette.id);
                }}
                onClick={() => {
                  delay.show(null);
                  onCommit(palette.id);
                }}
              >
                <span className="j-tri-swatch" aria-hidden="true" style={{ width: '100%', height: 15 }}>
                  {palette.colors.map((color, index) => <span key={index} style={{ background: color, flex: index === 0 ? 3 : 1 }} />)}
                </span>
                <span style={between}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{palette.label}</span>
                  {palette.id === value && <Check size={11} style={{ flexShrink: 0 }} aria-hidden="true" />}
                </span>
              </button>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

const demoPalettes = [
  { id: 'paper', label: 'Paper', colors: ['#faf7ef', '#262420', '#275ba8'] },
  { id: 'slate', label: 'Slate', colors: ['#eaf0f5', '#263848', '#365b78'] },
  { id: 'midnight', label: 'Midnight', colors: ['#171a2c', '#f1f0fa', '#b7a3ff'] },
  { id: 'blueprint', label: 'Blueprint', colors: ['#102d52', '#eef5ff', '#8bc4ff'] },
  { id: 'forest', label: 'Forest', colors: ['#152c24', '#edf6ec', '#9cdbaf'] },
  { id: 'terminal', label: 'Terminal', colors: ['#151916', '#ecf0ed', '#96e6a4'] },
] as const satisfies readonly SwatchPalette[];

export function SwatchPreviewMatrix({ id = 'swatch-preview-matrix' }: { id?: string } = {}) {
  const storageKey = `juice:palette:${id}`;
  const [saved, setSaved] = useState<string>(demoPalettes[0].id);
  const [preview, setPreview] = useState<string | null>(null);
  const palette = demoPalettes.find((item) => item.id === (preview ?? saved)) ?? demoPalettes[0];

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(storageKey);
      setSaved(demoPalettes.find((item) => item.id === stored)?.id ?? demoPalettes[0].id);
    } catch {
      setSaved(demoPalettes[0].id);
    }
    setPreview(null);
  }, [storageKey]);

  function previewPalette(next: string | null) {
    if (next === null || demoPalettes.some((item) => item.id === next)) setPreview(next === saved ? null : next);
  }

  function rollback() {
    setPreview(null);
  }

  function commitPalette(next: string) {
    if (!demoPalettes.some((item) => item.id === next)) return;
    setSaved(next);
    rollback();
    try {
      window.localStorage.setItem(storageKey, next);
    } catch {
      // The active selection remains available when storage is disabled.
    }
  }

  useJuiceAgentNode(id, 'SwatchPreviewMatrix', { saved, preview }, { previewPalette, commitPalette, rollback });

  return (
    <div id={id} className="j-slab j-fnd-card" style={cardStyle}>
      <div
        data-previewing={preview !== null}
        style={{
          ...stack,
          gap: 18,
          borderRadius: 'var(--juice-r-inner)',
          padding: '12px 14px',
          background: palette.colors[0],
          color: palette.colors[1],
        }}
      >
        <div style={between}>
          <span style={{ fontSize: 12, fontWeight: 500 }}>Palette</span>
          <span style={{ ...row, fontSize: 11 }}>
            {preview ? <Eye size={12} aria-hidden="true" /> : <Check size={12} aria-hidden="true" />}
            {preview ? 'Preview' : 'Selected'}
          </span>
        </div>
        <div style={{ ...between, alignItems: 'baseline' }}>
          <strong style={{ fontSize: 24, lineHeight: 1.1, fontWeight: 600, letterSpacing: '-.045em' }}>{palette.label}</strong>
          <span aria-label={`Accent ${palette.colors[2]}`} style={{ ...row, ...mono }}>
            <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: '50%', background: palette.colors[2] }} />
            {palette.colors[2].toUpperCase()}
          </span>
        </div>
      </div>
      <SwatchGridPicker
        label="Palette swatches"
        palettes={demoPalettes}
        value={saved}
        preview={preview}
        onPreview={previewPalette}
        onCommit={commitPalette}
      />
    </div>
  );
}

export type InspectorRule = {
  id: string;
  label: string;
  detail: string;
  status: 'verified' | 'provisional';
  control?: ReactNode;
};

export function InspectorSheet({
  title: targetTitle,
  targetControl,
  source,
  editorHref,
  rules,
  copyStatus,
  onCopySource,
  children,
}: {
  title: string;
  targetControl?: ReactNode;
  source: string;
  editorHref?: string;
  rules: readonly InspectorRule[];
  copyStatus?: 'copied' | 'failed';
  onCopySource: () => void;
  children?: ReactNode;
}) {
  const provisional = rules.some((rule) => rule.status === 'provisional');
  const fileStart = Math.max(source.lastIndexOf('/'), source.lastIndexOf('\\')) + 1;

  return (
    <aside aria-label={`${targetTitle} properties`} style={{ ...stack, gap: 8 }}>
      <div style={header}>
        {targetControl ?? <span style={title}>{targetTitle}</span>}
        <Badge tone={provisional ? 'warn' : 'ok'}>{provisional ? 'Review pending' : 'Synced'}</Badge>
      </div>
      <div className="j-copy-snippet" style={{ gap: 2, borderRadius: 'var(--juice-r-inner)' }}>
        <code style={{ userSelect: 'text', WebkitUserSelect: 'text', minWidth: 0, wordBreak: 'normal', overflowWrap: 'anywhere' }}>
          <span style={{ color: 'var(--juice-soft)' }}>{source.slice(0, fileStart)}</span><wbr />{source.slice(fileStart)}
        </code>
        <Tooltip label={copyStatus === 'copied' ? 'Source copied' : 'Copy source'}>
          {(props) => (
            <button {...props} type="button" className="j-chip" aria-label={copyStatus === 'copied' ? 'Source copied' : 'Copy source'} onClick={onCopySource}>
              {copyStatus === 'copied' ? <Check size={13} aria-hidden="true" /> : <Copy size={13} aria-hidden="true" />}
            </button>
          )}
        </Tooltip>
        {editorHref && (
          <Tooltip label="Open in Editor">
            {(props) => <a {...props} className="j-chip" aria-label="Open in Editor" href={editorHref}><ExternalLink size={13} aria-hidden="true" /></a>}
          </Tooltip>
        )}
      </div>
      {copyStatus === 'failed' && <span role="status" style={muted}>Select the path to copy it manually.</span>}
      {children}
      {rules.map((rule) => (
        <div key={rule.id} className="j-inspect-prop-card" data-variant={rule.status === 'provisional' ? 'dashed' : undefined}>
          <div style={between}>
            <strong style={{ fontWeight: 600 }}>{rule.label}</strong>
            <span style={{ ...row, ...muted, fontSize: 11 }}>
              {rule.status === 'verified' ? 'Verified' : 'Provisional'} {rule.control}
            </span>
          </div>
          <span style={muted}>{rule.detail}</span>
        </div>
      ))}
    </aside>
  );
}

const inspectorTargets = [
  {
    name: 'Button',
    rule: 'Accessible name',
    review: 'Focus indicator',
    source: 'src/components/Button.tsx:42:8',
    requiredRule: 'The control has an accessible name.',
    reviewRule: 'The focus indicator is visible on every surface.',
  },
  {
    name: 'Text field',
    rule: 'Label association',
    review: 'Error message',
    source: 'src/components/TextField.tsx:24:5',
    requiredRule: 'The control is associated with its label.',
    reviewRule: 'The error message is announced after validation.',
  },
] as const;
const targetOptions = inspectorTargets.map(({ name }) => name);

export function FloatingInspectorSheet({ id = 'floating-inspector-sheet' }: { id?: string } = {}) {
  const [target, setTarget] = useState<(typeof inspectorTargets)[number]>(inspectorTargets[0]);
  const [targetMenu, setTargetMenu] = useState(false);
  const [verifiedTargets, setVerifiedTargets] = useState<ReadonlySet<string>>(() => new Set());
  const ruleMode = verifiedTargets.has(target.name) ? 'verified' : 'provisional';
  const [copyStatus, setCopyStatus] = useState<'copied' | 'failed'>();
  const copyRequest = useRef(0);

  useEffect(() => {
    if (copyStatus !== 'copied') return;
    const timeout = window.setTimeout(() => setCopyStatus(undefined), 1800);
    return () => window.clearTimeout(timeout);
  }, [copyStatus]);

  function selectTarget(name: string) {
    const next = inspectorTargets.find((item) => item.name === name);
    if (!next || next === target) return;
    copyRequest.current++;
    setCopyStatus(undefined);
    setTarget(next);
  }

  function toggleRuleMode() {
    setVerifiedTargets((current) => {
      const next = new Set(current);
      if (next.has(target.name)) next.delete(target.name);
      else next.add(target.name);
      return next;
    });
  }

  async function copySource() {
    const request = ++copyRequest.current;
    let result: 'copied' | 'failed';
    try {
      await navigator.clipboard.writeText(target.source);
      result = 'copied';
    } catch {
      result = 'failed';
    }
    if (request === copyRequest.current) setCopyStatus(result);
  }

  useJuiceAgentNode(id, 'FloatingInspectorSheet', { target: target.name, source: target.source, ruleMode, copyStatus }, {
    selectTarget,
    toggleRuleMode,
    copySource,
  });

  return (
    <div id={id} className="j-slab j-fnd-card" style={cardStyle}>
      <InspectorSheet
        title={target.name}
        targetControl={<BreadcrumbSelect label="Inspect element" value={target.name} options={targetOptions}
          open={targetMenu} onOpenChange={setTargetMenu} onChange={selectTarget} />}
        source={target.source}
        editorHref={`vscode://file/${target.source}`}
        rules={[
          { id: 'required', label: target.rule, detail: target.requiredRule, status: 'verified' },
          { id: 'review', label: target.review, detail: target.reviewRule, status: ruleMode,
            control: <Switch aria-label={`Verify ${target.review.toLowerCase()}`} checked={ruleMode === 'verified'} onChange={toggleRuleMode} /> },
        ]}
        copyStatus={copyStatus}
        onCopySource={copySource}
      />
    </div>
  );
}
