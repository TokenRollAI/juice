import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type FocusEvent,
  type HTMLAttributes,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';
import { clsx } from 'clsx';
import {
  Check,
  ChevronDown,
  Copy,
  ExternalLink,
  Eye,
  Layers,
  Maximize2,
  MoreHorizontal,
  Palette,
  PanelRight,
  Share2,
  X,
} from 'lucide-react';
import { useJuice, useJuiceAgentNode, useRovingFocus } from './behaviors.tsx';
import { Badge, Kbd, SegmentedControl, Switch } from './components.tsx';

export type FloatingPlacement =
  | 'bottom-start' | 'bottom-end' | 'bottom' | 'bottom-center'
  | 'top-start' | 'top-end' | 'top' | 'top-center'
  | 'right-start' | 'left-start';

export type AnchorRect = {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width?: number;
  height?: number;
};

const placements: readonly FloatingPlacement[] = [
  'bottom-start', 'bottom-end', 'bottom', 'bottom-center',
  'top-start', 'top-end', 'top', 'top-center',
  'right-start', 'left-start',
];
const viewportInset = 8;
const opposite = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' } as const;

export function placeFloating(
  anchor: AnchorRect,
  floating: { width: number; height: number },
  viewport: { width: number; height: number },
  placement: FloatingPlacement = 'bottom-start',
  gap = 8,
  margin = viewportInset,
): { x: number; y: number; side: 'top' | 'bottom' | 'left' | 'right' } {
  const [preferred, alignment] = placement.split('-') as [keyof typeof opposite, ('start' | 'end' | 'center')?];
  const inset = Number.isFinite(margin) ? Math.max(0, margin) : viewportInset;
  const anchorWidth = anchor.width ?? (anchor.right - anchor.left);
  const available = {
    top: anchor.top - inset - gap,
    bottom: viewport.height - anchor.bottom - inset - gap,
    left: anchor.left - inset - gap,
    right: viewport.width - anchor.right - inset - gap,
  };
  const vertical = preferred === 'top' || preferred === 'bottom';
  const needed = vertical ? floating.height : floating.width;
  const fallback = opposite[preferred];
  const side = available[preferred] < needed && available[fallback] > available[preferred] ? fallback : preferred;
  const clamp = (position: number, size: number, extent: number) =>
    Math.min(Math.max(inset, position), Math.max(inset, extent - size - inset));

  let x = anchor.left;
  let y = anchor.top;
  if (vertical) {
    if (alignment === 'end') x = anchor.right - floating.width;
    if (alignment === undefined || alignment === 'center') x += (anchorWidth - floating.width) / 2;
    y = side === 'top' ? anchor.top - gap - floating.height : anchor.bottom + gap;
  } else {
    x = side === 'left' ? anchor.left - gap - floating.width : anchor.right + gap;
  }

  return {
    x: Math.round(clamp(x, floating.width, viewport.width)),
    y: Math.round(clamp(y, floating.height, viewport.height)),
    side,
  };
}

const portalTokens = [
  '--fill-slab', '--fill-on', '--juice-font-ui', '--juice-font-mono', '--juice-signal', '--juice-ok',
  '--juice-warn', '--juice-danger', '--juice-soft', '--juice-mute', '--juice-faint', '--juice-w4',
  '--juice-w6', '--juice-w12', '--juice-w20', '--juice-edge', '--juice-r-inner', '--juice-r-control', '--juice-out',
];

const focusableSelector =
  '[data-initial-focus="true"], [data-autofocus="true"], [autofocus], button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';

function eventHitsNode(event: globalThis.PointerEvent, path: EventTarget[], element: HTMLElement | null | undefined): boolean {
  if (!element) return false;
  if (path.includes(element)) return true;
  return event.target instanceof Node && element.contains(event.target);
}

function isFocusVisible(element: HTMLElement): boolean {
  try {
    return element.matches(':focus-visible');
  } catch {
    return true;
  }
}

function copyPortalTokens(sourceEl: HTMLElement, targetEl: HTMLElement, win: Window) {
  const computed = win.getComputedStyle(sourceEl);
  for (const token of portalTokens) {
    targetEl.style.setProperty(token, computed.getPropertyValue(token));
  }
  targetEl.style.direction = computed.direction;
}

function AnchoredLayer({
  anchor,
  placement,
  width,
  surfaceRef,
  tooltip = false,
  interactive = false,
  id,
  surfaceProps,
  children,
}: {
  anchor: HTMLElement;
  placement: FloatingPlacement;
  width?: number | 'auto';
  surfaceRef?: RefObject<HTMLDivElement | null>;
  tooltip?: boolean;
  interactive?: boolean;
  id?: string;
  surfaceProps?: HTMLAttributes<HTMLDivElement>;
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
    copyPortalTokens(anchor, surface, win);
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
      const anchorWidth = bounds.width || (bounds.right - bounds.left);
      const anchorHeight = bounds.height || (bounds.bottom - bounds.top);
      const originX = Math.max(0, Math.min(surface.offsetWidth, bounds.left + anchorWidth / 2 - x));
      const originY = Math.max(0, Math.min(surface.offsetHeight, bounds.top + anchorHeight / 2 - y));
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
  const {
    className: extraClassName,
    style: extraStyle,
    role: extraRole,
    id: extraId,
    ...restSurfaceProps
  } = surfaceProps ?? {};

  return createPortal(
    <div
      {...restSurfaceProps}
      ref={ref}
      id={id ?? extraId}
      role={extraRole ?? (tooltip ? 'tooltip' : undefined)}
      className={clsx(tooltip ? 'j-tooltip-pill' : 'j-floating-pop', extraClassName)}
      data-floating-popover={interactive ? '' : undefined}
      style={{
        position: 'fixed',
        boxSizing: 'border-box',
        whiteSpace: tooltip ? 'normal' : undefined,
        overflowWrap: 'anywhere',
        zIndex: tooltip ? 1001 : 1000,
        width: width === 'auto' ? undefined : width,
        maxWidth: `calc(100vw - ${inset}px)`,
        maxHeight: `calc(100vh - ${inset}px)`,
        overflow: tooltip ? undefined : 'auto',
        pointerEvents: interactive ? undefined : 'none',
        ...extraStyle,
      }}
    >
      {children}
    </div>,
    host,
  );
}

type DataAttributes = {
  [key: `data-${string}`]: string | number | boolean | undefined;
};

export type FloatingPopoverProps = Omit<HTMLAttributes<HTMLDivElement>, 'children'> & DataAttributes & {
  open: boolean;
  anchor: HTMLElement | null;
  onClose: () => void;
  placement?: FloatingPlacement;
  width?: number | 'auto';
  restoreFocus?: boolean | 'focused-within';
  autoFocus?: boolean;
  ignoreRefs?: ReadonlyArray<RefObject<HTMLElement | null>>;
  children: ReactNode;
};

export function FloatingPopover({
  open,
  anchor,
  onClose,
  placement = 'bottom-start',
  width = 240,
  restoreFocus = 'focused-within',
  autoFocus = false,
  ignoreRefs,
  children,
  onFocusCapture,
  onBlurCapture,
  tabIndex,
  ...surfaceProps
}: FloatingPopoverProps) {
  const surface = useRef<HTMLDivElement>(null);
  const hadFocusWithin = useRef(false);
  const anchorRef = useRef(anchor);
  anchorRef.current = anchor;
  const restoreFocusRef = useRef(restoreFocus);
  restoreFocusRef.current = restoreFocus;
  const autoFocusRef = useRef(autoFocus);
  autoFocusRef.current = autoFocus;
  const ignoreRefsRef = useRef(ignoreRefs);
  ignoreRefsRef.current = ignoreRefs;
  const activeOpen = Boolean(open && anchor);

  useLayoutEffect(() => {
    const currentAnchor = anchorRef.current;
    const el = surface.current;
    if (!activeOpen || !currentAnchor || !el) return;
    const doc = el.ownerDocument;
    if (autoFocusRef.current && !el.contains(doc.activeElement)) {
      const first = el.querySelector<HTMLElement>(focusableSelector);
      (first ?? el).focus({ preventScroll: true });
    }
    hadFocusWithin.current = el.contains(doc.activeElement);

    return () => {
      if (el.contains(doc.activeElement)) {
        hadFocusWithin.current = true;
      }
      const mode = restoreFocusRef.current;
      const shouldRestore = mode === true || (mode === 'focused-within' && hadFocusWithin.current);
      hadFocusWithin.current = false;
      if (shouldRestore && currentAnchor.isConnected) {
        currentAnchor.focus({ preventScroll: true });
      }
    };
  }, [activeOpen]);

  useEffect(() => {
    if (!open || !anchor) return;
    const doc = anchor.ownerDocument;
    const isTopmost = () => [...doc.querySelectorAll('[data-floating-popover]')].at(-1) === surface.current;
    const onPointerDown = (event: globalThis.PointerEvent) => {
      const path = event.composedPath();
      const isIgnored = ignoreRefsRef.current?.some((ref) => eventHitsNode(event, path, ref.current)) ?? false;
      if (
        isTopmost() &&
        !eventHitsNode(event, path, anchor) &&
        !isIgnored &&
        surface.current &&
        !eventHitsNode(event, path, surface.current)
      ) {
        onClose();
      }
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
    <AnchoredLayer
      anchor={anchor}
      placement={placement}
      width={width}
      surfaceRef={surface}
      interactive
      surfaceProps={{
        ...surfaceProps,
        tabIndex: tabIndex ?? (autoFocus ? -1 : undefined),
        onFocusCapture: (event) => {
          hadFocusWithin.current = true;
          onFocusCapture?.(event);
        },
        onBlurCapture: (event) => {
          if (event.relatedTarget instanceof Node && !event.currentTarget.contains(event.relatedTarget)) {
            hadFocusWithin.current = false;
          }
          onBlurCapture?.(event);
        },
      }}
    >
      {children}
    </AnchoredLayer>
  ) : null;
}

export type CenterPopoverProps = Omit<HTMLAttributes<HTMLDivElement>, 'children'> & DataAttributes & {
  open: boolean;
  onClose: () => void;
  anchor?: HTMLElement | null;
  width?: number | string;
  restoreFocus?: boolean | 'focused-within';
  autoFocus?: boolean;
  backdrop?: boolean;
  ignoreRefs?: ReadonlyArray<RefObject<HTMLElement | null>>;
  children: ReactNode;
};

export function CenterPopover({
  open,
  onClose,
  anchor = null,
  width = 360,
  restoreFocus = 'focused-within',
  autoFocus = true,
  backdrop = false,
  ignoreRefs,
  role = 'dialog',
  className,
  style,
  tabIndex,
  onFocusCapture,
  onBlurCapture,
  children,
  ...surfaceProps
}: CenterPopoverProps) {
  const { theme, fill, animate } = useJuice();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const surface = useRef<HTMLDivElement>(null);
  const hadFocusWithin = useRef(false);
  const anchorRef = useRef(anchor);
  anchorRef.current = anchor;
  const restoreFocusRef = useRef(restoreFocus);
  restoreFocusRef.current = restoreFocus;
  const autoFocusRef = useRef(autoFocus);
  autoFocusRef.current = autoFocus;
  const ignoreRefsRef = useRef(ignoreRefs);
  ignoreRefsRef.current = ignoreRefs;

  const doc = anchor?.ownerDocument ?? (typeof document !== 'undefined' ? document : null);
  const [fullscreenHost, setFullscreenHost] = useState<Element | null>(() => doc?.fullscreenElement ?? null);
  const host = doc ? (fullscreenHost?.ownerDocument === doc ? fullscreenHost : doc.body) : null;

  useLayoutEffect(() => {
    if (!doc) return;
    const syncHost = () => setFullscreenHost(doc.fullscreenElement);
    syncHost();
    doc.addEventListener('fullscreenchange', syncHost);
    return () => doc.removeEventListener('fullscreenchange', syncHost);
  }, [doc]);

  useLayoutEffect(() => {
    if (!open || !doc) return;
    const wrapper = wrapperRef.current;
    const panel = surface.current;
    const win = doc.defaultView;
    if (!wrapper || !panel || !win) return;
    const tokenSource =
      anchorRef.current ??
      doc.querySelector<HTMLElement>('.juice-root') ??
      doc.documentElement;
    copyPortalTokens(tokenSource, wrapper, win);
    const reducedMotion = win.matchMedia('(prefers-reduced-motion: reduce)');
    const syncMotion = () => {
      panel.style.animation = animate && !reducedMotion.matches ? '' : 'none';
    };
    syncMotion();
    reducedMotion.addEventListener('change', syncMotion);
    return () => reducedMotion.removeEventListener('change', syncMotion);
  }, [animate, doc, fill, host, open, theme]);

  useLayoutEffect(() => {
    const el = surface.current;
    if (!open || !doc || !el) return;
    const previousFocus =
      anchorRef.current ??
      (doc.activeElement instanceof HTMLElement ? doc.activeElement : null);
    if (autoFocusRef.current && !el.contains(doc.activeElement)) {
      const first = el.querySelector<HTMLElement>(focusableSelector);
      (first ?? el).focus({ preventScroll: true });
    }
    hadFocusWithin.current = el.contains(doc.activeElement);

    return () => {
      if (el.contains(doc.activeElement)) {
        hadFocusWithin.current = true;
      }
      const mode = restoreFocusRef.current;
      const shouldRestore = mode === true || (mode === 'focused-within' && hadFocusWithin.current);
      hadFocusWithin.current = false;
      if (shouldRestore && previousFocus?.isConnected) {
        previousFocus.focus({ preventScroll: true });
      }
    };
  }, [doc, open]);

  useEffect(() => {
    if (!open || !doc) return;
    const isTopmost = () => [...doc.querySelectorAll('[data-floating-popover]')].at(-1) === surface.current;
    const onPointerDown = (event: globalThis.PointerEvent) => {
      const path = event.composedPath();
      const isIgnored = ignoreRefsRef.current?.some((ref) => eventHitsNode(event, path, ref.current)) ?? false;
      if (
        isTopmost() &&
        !eventHitsNode(event, path, anchorRef.current) &&
        !isIgnored &&
        surface.current &&
        !eventHitsNode(event, path, surface.current)
      ) {
        onClose();
      }
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
  }, [doc, onClose, open]);

  if (!open || !host) return null;

  return createPortal(
    <div ref={wrapperRef} className="j-center-pop-backdrop" data-backdrop={backdrop ? 'true' : undefined}>
      <div
        {...surfaceProps}
        ref={surface}
        role={role}
        tabIndex={tabIndex ?? (autoFocus ? -1 : undefined)}
        className={clsx('j-floating-pop', 'j-center-pop', className)}
        data-floating-popover=""
        style={{
          width: width === 'auto' ? undefined : width,
          ...style,
        }}
        onFocusCapture={(event) => {
          hadFocusWithin.current = true;
          onFocusCapture?.(event);
        }}
        onBlurCapture={(event) => {
          if (event.relatedTarget instanceof Node && !event.currentTarget.contains(event.relatedTarget)) {
            hadFocusWithin.current = false;
          }
          onBlurCapture?.(event);
        }}
      >
        {children}
      </div>
    </div>,
    host,
  );
}

export type TooltipOptions = {
  placement?: FloatingPlacement;
  delay?: number;
};

export function useTooltip(
  label: ReactNode,
  kbdOrOptions?: string | (TooltipOptions & { kbd?: string }),
  maybeOptions?: TooltipOptions,
) {
  const id = useId();
  const kbd = typeof kbdOrOptions === 'string' ? kbdOrOptions : kbdOrOptions?.kbd;
  const resolvedOptions = typeof kbdOrOptions === 'object' && kbdOrOptions !== null ? kbdOrOptions : maybeOptions;
  const placement = resolvedOptions?.placement ?? 'top';
  const delayMs = resolvedOptions?.delay !== undefined && Number.isFinite(resolvedOptions.delay)
    ? Math.max(0, resolvedOptions.delay)
    : 0;

  const timerRef = useRef<number | undefined>(undefined);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const visible = label != null && anchor !== null && (hovered || focused) && !dismissed;

  const clearTimer = useCallback(() => {
    if (timerRef.current !== undefined) {
      window.clearTimeout(timerRef.current);
      timerRef.current = undefined;
    }
  }, []);

  useEffect(() => clearTimer, [clearTimer]);

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
      const target = event.currentTarget;
      setAnchor(target);
      setDismissed(false);
      clearTimer();
      if (delayMs > 0) {
        timerRef.current = window.setTimeout(() => {
          timerRef.current = undefined;
          setHovered(true);
        }, delayMs);
      } else {
        setHovered(true);
      }
    },
    onPointerLeave: () => {
      clearTimer();
      setHovered(false);
    },
    onPointerDown: () => {
      clearTimer();
      setHovered(false);
      setFocused(false);
      setDismissed(true);
    },
    onFocus: (event: FocusEvent<HTMLElement>) => {
      if (!isFocusVisible(event.currentTarget)) return;
      setAnchor(event.currentTarget);
      setFocused(true);
      setDismissed(false);
    },
    onBlur: () => {
      clearTimer();
      setFocused(false);
    },
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
      <AnchoredLayer anchor={anchor} placement={placement} id={id} tooltip>
        {label}
        {kbd && <Kbd className="j-tooltip-kbd">{kbd}</Kbd>}
      </AnchoredLayer>
    ) : null,
  ] as const;
}

export function Tooltip({
  label,
  kbd,
  placement = 'top',
  delay = 0,
  children,
}: {
  label: ReactNode;
  kbd?: string;
  placement?: FloatingPlacement;
  delay?: number;
  children: (triggerProps: ReturnType<typeof useTooltip>[0]) => ReactNode;
}) {
  const [triggerProps, content] = useTooltip(label, kbd, { placement, delay });
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

export type BreadcrumbSelectOption<T extends string = string> = {
  readonly value: T;
  readonly label: ReactNode;
  readonly description?: ReactNode;
  readonly hint?: ReactNode;
  readonly disabled?: boolean;
  readonly 'data-testid'?: string;
};

export type BreadcrumbSelectItem<T extends string = string> = T | BreadcrumbSelectOption<T>;

export type BreadcrumbSelectGroup<T extends string = string> = {
  readonly heading?: ReactNode;
  readonly items: readonly BreadcrumbSelectItem<T>[];
};

export type BreadcrumbSelectProps<T extends string = string> = {
  label: string;
  value: T;
  options?: readonly BreadcrumbSelectItem<T>[];
  groups?: readonly BreadcrumbSelectGroup<T>[];
  onChange: (value: T) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  footer?: ReactNode;
  placement?: FloatingPlacement;
  width?: number | 'auto';
  triggerLabel?: ReactNode;
  'data-testid'?: string;
  triggerProps?: ButtonHTMLAttributes<HTMLButtonElement> & DataAttributes;
};

function normalizeBreadcrumbItem<T extends string>(item: BreadcrumbSelectItem<T>): BreadcrumbSelectOption<T> {
  return typeof item === 'string' ? { value: item, label: item } : item;
}

export function BreadcrumbSelect<T extends string = string>({
  label,
  value,
  options,
  groups,
  onChange,
  open,
  onOpenChange,
  footer,
  placement = 'bottom-start',
  width,
  triggerLabel,
  'data-testid': dataTestId,
  triggerProps,
}: BreadcrumbSelectProps<T>) {
  const menuId = useId();
  const generatedTriggerId = useId();
  const triggerId = triggerProps?.id ?? generatedTriggerId;
  const [anchor, setAnchor] = useState<HTMLButtonElement | null>(null);
  const [active, setActive] = useState<T>(value);
  const initialFocus = useRef<T | undefined>(undefined);
  const buttons = useRef(new Map<T, HTMLButtonElement>());

  const normalizedGroups = useMemo(() => {
    const list: Array<{ heading?: ReactNode; items: BreadcrumbSelectOption<T>[] }> = [];
    if (options && options.length > 0) {
      list.push({ items: options.map(normalizeBreadcrumbItem) });
    }
    if (groups && groups.length > 0) {
      for (const group of groups) {
        list.push({ heading: group.heading, items: group.items.map(normalizeBreadcrumbItem) });
      }
    }
    return list;
  }, [groups, options]);

  const allItems = useMemo(
    () => normalizedGroups.flatMap((group) => group.items),
    [normalizedGroups],
  );
  const enabledValues = useMemo(
    () => allItems.filter((item) => !item.disabled).map((item) => item.value),
    [allItems],
  );
  const hasRichStructure = useMemo(
    () =>
      Boolean(groups && groups.length > 0) ||
      footer !== undefined ||
      allItems.some((item) => item.description != null || item.hint != null),
    [allItems, footer, groups],
  );
  const resolvedWidth = width ?? (hasRichStructure ? 240 : 176);

  const selectedOption = allItems.find((item) => item.value === value);
  const displayContent = triggerLabel ?? selectedOption?.label ?? value;
  const accessibleTriggerLabel =
    triggerProps?.['aria-label'] ??
    `${label}: ${typeof displayContent === 'string' || typeof displayContent === 'number' ? displayContent : value}`;

  const focusOnOpen = useCallback((menu: HTMLDivElement | null) => {
    const first = menu?.querySelector<HTMLButtonElement>('[data-initial-focus="true"]:not(:disabled)')
      ?? menu?.querySelector<HTMLButtonElement>('[role="menuitemradio"]:not(:disabled)')
      ?? menu?.querySelector<HTMLButtonElement>('button:not(:disabled)');
    first?.focus({ preventScroll: true });
  }, []);

  function focusItem(item: T) {
    setActive(item);
    buttons.current.get(item)?.focus({ preventScroll: true });
  }

  const { onKeyDown } = useRovingFocus({
    items: enabledValues,
    active: enabledValues.includes(active) ? active : (enabledValues[0] ?? value),
    onSelect: focusItem,
  });
  const close = () => {
    initialFocus.current = undefined;
    onOpenChange(false);
  };

  const {
    className: triggerClassName,
    style: triggerStyle,
    onClick: triggerOnClick,
    onKeyDown: triggerOnKeyDown,
    'data-testid': triggerTestId,
    ...restTriggerProps
  } = triggerProps ?? {};

  const targetFocusValue = initialFocus.current ?? (enabledValues.includes(value) ? value : enabledValues[0]);

  return (
    <>
      <button
        {...restTriggerProps}
        ref={setAnchor}
        id={triggerId}
        type="button"
        data-testid={triggerTestId ?? dataTestId}
        className={clsx('j-chip', triggerClassName)}
        style={{
          minWidth: 0,
          height: 30,
          paddingInline: 6,
          background: open ? 'var(--juice-w12)' : undefined,
          ...triggerStyle,
        }}
        aria-label={accessibleTriggerLabel}
        aria-haspopup="menu"
        aria-controls={open ? menuId : undefined}
        aria-expanded={open}
        onClick={(event) => {
          triggerOnClick?.(event);
          if (event.defaultPrevented) return;
          initialFocus.current = undefined;
          onOpenChange(!open);
        }}
        onKeyDown={(event) => {
          triggerOnKeyDown?.(event);
          if (event.defaultPrevented) return;
          if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
          event.preventDefault();
          const next = event.key === 'ArrowDown' ? enabledValues[0] : enabledValues.at(-1);
          if (next === undefined) return;
          if (open) focusItem(next);
          else {
            initialFocus.current = next;
            onOpenChange(true);
          }
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayContent}</span>
        <ChevronDown size={12} style={{ flexShrink: 0 }} aria-hidden="true" />
      </button>
      <FloatingPopover
        open={open}
        anchor={anchor}
        onClose={close}
        placement={placement}
        width={resolvedWidth}
        data-testid={dataTestId ? `${dataTestId}-menu` : undefined}
        style={resolvedWidth === 'auto' ? { minWidth: 176 } : undefined}
      >
        <div
          ref={focusOnOpen}
          id={menuId}
          className="j-menu-list"
          style={{ background: 'transparent', padding: 0 }}
          role="menu"
          aria-labelledby={triggerId}
          onKeyDown={(event) => {
            if (event.key === 'Tab' && footer === undefined) {
              anchor?.focus({ preventScroll: true });
              close();
            } else if (event.key !== 'Tab') {
              onKeyDown(event);
            }
          }}
        >
          {normalizedGroups.map((group, groupIndex) => (
            <div key={groupIndex} role={group.heading != null ? 'group' : 'presentation'}>
              {groupIndex > 0 && <div role="separator" className="j-menu-sep" />}
              {group.heading != null && (
                <div className="j-menu-group-heading">{group.heading}</div>
              )}
              {group.items.map((item) => {
                const isSelected = item.value === value;
                const isMultiline = item.description != null;
                return (
                  <button
                    key={item.value}
                    ref={(button) => {
                      if (button && !item.disabled) buttons.current.set(item.value, button);
                      else buttons.current.delete(item.value);
                    }}
                    type="button"
                    className="j-menu-item"
                    role="menuitemradio"
                    aria-checked={isSelected}
                    aria-disabled={item.disabled || undefined}
                    disabled={item.disabled}
                    data-testid={item['data-testid']}
                    data-multiline={isMultiline ? 'true' : undefined}
                    data-highlighted={!item.disabled && active === item.value}
                    data-initial-focus={!item.disabled && item.value === targetFocusValue}
                    tabIndex={-1}
                    style={{ width: '100%', boxSizing: 'border-box' }}
                    onFocus={() => {
                      if (!item.disabled) setActive(item.value);
                    }}
                    onClick={() => {
                      if (item.disabled) return;
                      onChange(item.value);
                      initialFocus.current = undefined;
                      onOpenChange(false);
                    }}
                  >
                    <span style={{ minWidth: 0, flex: 1, display: 'grid', gap: 1 }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', color: isSelected ? 'var(--fill-on)' : undefined, fontWeight: isMultiline ? 500 : undefined }}>
                        {item.label}
                      </span>
                      {item.description != null && (
                        <span style={{ fontSize: 11, lineHeight: 1.35, color: 'var(--juice-mute)', whiteSpace: 'normal' }}>
                          {item.description}
                        </span>
                      )}
                    </span>
                    {(item.hint != null || isSelected) && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0, paddingTop: isMultiline ? 2 : 0 }}>
                        {item.hint != null && <span style={{ ...mono, color: 'var(--juice-mute)' }}>{item.hint}</span>}
                        {isSelected && <Check size={14} aria-hidden="true" />}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
          {footer !== undefined && (
            <div className="j-menu-footer">{footer}</div>
          )}
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
  icon?: ReactNode;
  onPress?: () => void;
  priority?: number;
  disabled?: boolean;
  'data-testid'?: string;
  renderTrigger?: (compact: boolean) => ReactNode;
};

const toolbarRow = { display: 'flex', flexWrap: 'nowrap', gap: 2, whiteSpace: 'nowrap' } as const;
const toolbarButton = { flex: '0 0 auto', justifyContent: 'center', gap: 4, padding: '0 5px', fontSize: 11.5, height: 30 } as const;
const compactButtonWidth = 36;
const toolbarPadding = 4;

type ToolbarFitState = {
  expandedIds: ReadonlySet<string>;
  overflowIds: ReadonlySet<string>;
};

function setsEqual(a: ReadonlySet<string>, b: ReadonlySet<string>): boolean {
  if (a.size !== b.size) return false;
  for (const item of a) {
    if (!b.has(item)) return false;
  }
  return true;
}

export function AdaptiveToolbar({
  actions,
  label,
  overflowLabel = 'More actions',
  className,
  style,
}: {
  actions: readonly AdaptiveToolbarAction[];
  label: string;
  overflowLabel?: string;
  className?: string;
  style?: CSSProperties;
}) {
  const container = useRef<HTMLDivElement>(null);
  const measureWrap = useRef<HTMLDivElement>(null);
  const fullMeasure = useRef<HTMLDivElement>(null);
  const compactMeasure = useRef<HTMLDivElement>(null);
  const [overflowAnchor, setOverflowAnchor] = useState<HTMLButtonElement | null>(null);
  const [overflowOpen, setOverflowOpen] = useState(false);
  const overflowMenuId = useId();

  const [fit, setFit] = useState<ToolbarFitState>(() => ({
    expandedIds: new Set(actions.map((action) => action.id)),
    overflowIds: new Set(),
  }));

  const priorityOrder = useMemo(() => {
    return actions
      .map((action, index) => ({ index, priority: action.priority ?? 0 }))
      .sort((a, b) => (b.priority - a.priority) || (a.index - b.index))
      .map((entry) => entry.index);
  }, [actions]);

  useLayoutEffect(() => {
    const wrap = measureWrap.current;
    if (!wrap) return;
    for (const node of wrap.querySelectorAll('[id], [data-testid]')) {
      node.removeAttribute('id');
      node.removeAttribute('data-testid');
    }
  });

  useLayoutEffect(() => {
    const viewport = container.current;
    const fullStrip = fullMeasure.current;
    const compactStrip = compactMeasure.current;
    if (!viewport || !fullStrip || !compactStrip) return;

    const update = () => {
      const fullNodes = Array.from(fullStrip.children);
      const compactNodes = Array.from(compactStrip.children);
      const count = actions.length;
      if (count === 0) {
        setFit((prev) =>
          prev.expandedIds.size === 0 && prev.overflowIds.size === 0
            ? prev
            : { expandedIds: new Set(), overflowIds: new Set() },
        );
        return;
      }

      const fullWidths = actions.map((_, index) => {
        const w = fullNodes[index]?.getBoundingClientRect().width ?? 0;
        return Math.max(compactButtonWidth, w);
      });
      const compactWidths = actions.map((action, index) => {
        if (!action.renderTrigger) return compactButtonWidth;
        const w = compactNodes[index]?.getBoundingClientRect().width ?? 0;
        return w > 0 ? w : compactButtonWidth;
      });

      const available = viewport.clientWidth;
      const totalCompact =
        toolbarPadding * 2 +
        Math.max(0, count - 1) * toolbarRow.gap +
        compactWidths.reduce((sum, w) => sum + w, 0);

      const nextExpanded = new Set<string>();
      const nextOverflow = new Set<string>();

      if (available <= 0) {
        // Non-layout environment (e.g. SSR / zero-width test container): keep all inline in compact mode
      } else if (totalCompact <= available) {
        let used = totalCompact;
        for (const idx of priorityOrder) {
          const action = actions[idx];
          if (!action) continue;
          const extra = Math.max(0, (fullWidths[idx] ?? compactButtonWidth) - (compactWidths[idx] ?? compactButtonWidth));
          if (used + extra > available) break;
          used += extra;
          nextExpanded.add(action.id);
        }
      } else {
        const inlineSet = new Set<string>();
        let used = toolbarPadding * 2 + compactButtonWidth;
        for (const idx of priorityOrder) {
          const action = actions[idx];
          if (!action) continue;
          const itemWidth = (compactWidths[idx] ?? compactButtonWidth) + toolbarRow.gap;
          if (used + itemWidth <= available) {
            used += itemWidth;
            inlineSet.add(action.id);
          }
        }
        for (const action of actions) {
          if (!inlineSet.has(action.id)) {
            nextOverflow.add(action.id);
          }
        }
      }

      setFit((prev) =>
        setsEqual(prev.expandedIds, nextExpanded) && setsEqual(prev.overflowIds, nextOverflow)
          ? prev
          : { expandedIds: nextExpanded, overflowIds: nextOverflow },
      );
    };

    update();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update);
    observer?.observe(viewport);
    observer?.observe(fullStrip);
    observer?.observe(compactStrip);
    window.addEventListener('resize', update);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', update);
    };
  }, [actions, priorityOrder]);

  const inlineActions = useMemo(
    () => actions.filter((action) => !fit.overflowIds.has(action.id)),
    [actions, fit.overflowIds],
  );
  const overflowActions = useMemo(
    () => actions.filter((action) => fit.overflowIds.has(action.id)),
    [actions, fit.overflowIds],
  );

  useEffect(() => {
    if (overflowActions.length === 0 && overflowOpen) {
      setOverflowOpen(false);
    }
  }, [overflowActions.length, overflowOpen]);

  const anyCompact = fit.expandedIds.size < actions.length || overflowActions.length > 0;

  return (
    <div ref={container} className={className} style={{ ...well, position: 'relative', maxWidth: '100%', minWidth: 0, ...style }}>
      <div
        ref={measureWrap}
        aria-hidden="true"
        inert={true}
        style={{ position: 'absolute', inset: 0, overflow: 'hidden', visibility: 'hidden', pointerEvents: 'none' }}
      >
        <div ref={fullMeasure} style={{ ...toolbarRow, width: 'max-content' }}>
          {actions.map((action) =>
            action.renderTrigger ? (
              <span key={action.id} style={{ display: 'inline-flex', flex: '0 0 auto' }}>
                {action.renderTrigger(false)}
              </span>
            ) : (
              <span key={action.id} className="j-chip" style={{ ...toolbarButton, minWidth: compactButtonWidth, boxSizing: 'border-box' }}>
                {action.icon}{action.label}
              </span>
            ),
          )}
        </div>
        <div ref={compactMeasure} style={{ ...toolbarRow, width: 'max-content' }}>
          {actions.map((action) =>
            action.renderTrigger ? (
              <span key={action.id} style={{ display: 'inline-flex', flex: '0 0 auto' }}>
                {action.renderTrigger(true)}
              </span>
            ) : (
              <span key={action.id} className="j-chip" style={{ ...toolbarButton, width: compactButtonWidth, minWidth: compactButtonWidth, boxSizing: 'border-box' }}>
                {action.icon}
              </span>
            ),
          )}
        </div>
      </div>
      <div
        role="group"
        aria-label={label}
        data-compact={anyCompact}
        style={{ ...toolbarRow, overflowX: 'auto', padding: toolbarPadding, borderRadius: 'inherit' }}
      >
        {inlineActions.map((action) => {
          const isCompact = !fit.expandedIds.has(action.id);
          if (action.renderTrigger) {
            return (
              <span key={action.id} data-compact={isCompact} style={{ display: 'inline-flex', flex: '0 0 auto' }}>
                {action.renderTrigger(isCompact)}
              </span>
            );
          }
          return (
            <Tooltip key={action.id} label={isCompact ? action.label : null}>
              {(props) => (
                <button
                  {...props}
                  type="button"
                  className="j-chip"
                  data-testid={action['data-testid']}
                  disabled={action.disabled}
                  aria-label={action.label}
                  style={{ ...toolbarButton, flexGrow: 1, minWidth: compactButtonWidth, borderRadius: 'var(--juice-r-control)' }}
                  onClick={action.onPress}
                >
                  {action.icon}{!isCompact && action.label}
                </button>
              )}
            </Tooltip>
          );
        })}
        {overflowActions.length > 0 && (
          <>
            <Tooltip label={overflowOpen ? null : overflowLabel}>
              {(props) => (
                <button
                  {...props}
                  ref={setOverflowAnchor}
                  type="button"
                  className="j-chip"
                  aria-label={overflowLabel}
                  aria-haspopup="menu"
                  aria-expanded={overflowOpen}
                  aria-controls={overflowOpen ? overflowMenuId : undefined}
                  style={{ ...toolbarButton, minWidth: compactButtonWidth, borderRadius: 'var(--juice-r-control)' }}
                  onClick={() => setOverflowOpen((current) => !current)}
                >
                  <MoreHorizontal size={14} aria-hidden="true" />
                </button>
              )}
            </Tooltip>
            <FloatingPopover
              open={overflowOpen}
              anchor={overflowAnchor}
              onClose={() => setOverflowOpen(false)}
              placement="bottom-end"
              width="auto"
              autoFocus
              style={{ minWidth: 164 }}
            >
              <div id={overflowMenuId} role="menu" aria-label={overflowLabel} className="j-menu-list" style={{ background: 'transparent', padding: 0 }}>
                {overflowActions.map((action) =>
                  action.renderTrigger && !action.onPress ? (
                    <div key={action.id} role="none" style={{ display: 'flex' }}>
                      {action.renderTrigger(false)}
                    </div>
                  ) : (
                    <button
                      key={action.id}
                      type="button"
                      role="menuitem"
                      className="j-menu-item"
                      data-testid={action['data-testid']}
                      disabled={action.disabled}
                      onClick={() => {
                        action.onPress?.();
                        setOverflowOpen(false);
                      }}
                    >
                      <span style={{ ...row, gap: 8 }}>
                        {action.icon}
                        <span>{action.label}</span>
                      </span>
                    </button>
                  ),
                )}
              </div>
            </FloatingPopover>
          </>
        )}
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

const noopPreview = () => {};

export function SwatchGridPicker<P extends SwatchPalette = SwatchPalette>({
  label,
  'aria-label': ariaLabel,
  role = 'grid',
  palettes,
  value,
  preview = null,
  onPreview = noopPreview,
  onCommit,
  columns = 3,
  renderPreview,
  trailingCell,
  getCellProps,
}: {
  label?: string;
  'aria-label'?: string;
  role?: 'grid' | 'radiogroup' | 'listbox';
  palettes: readonly P[];
  value: string;
  preview?: string | null;
  onPreview?: (id: string | null) => void;
  onCommit: (id: string) => void;
  columns?: number;
  renderPreview?: (palette: P) => ReactNode;
  trailingCell?: ReactNode;
  getCellProps?: (palette: P) => HTMLAttributes<HTMLButtonElement> & DataAttributes;
}) {
  const accessibleLabel = ariaLabel ?? label;
  const columnCount = Number.isFinite(columns) ? Math.max(1, Math.floor(columns)) : 3;
  const rows = useMemo(() => {
    const grouped: P[][] = [];
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
  const allIds = useMemo(() => palettes.map(({ id }) => id), [palettes]);
  const focus = (id: string) => buttons.current.get(id)?.focus();
  const { onKeyDown } = useRovingFocus({
    items: role === 'grid' ? rowIds : allIds,
    active: focusId ?? '',
    onSelect: focus,
    orientation: 'horizontal',
  });

  const renderPaletteButton = (palette: P) => {
    const selected = palette.id === value;
    const {
      className: cellClassName,
      style: cellStyle,
      onClick: cellOnClick,
      onFocus: cellOnFocus,
      onPointerEnter: cellOnPointerEnter,
      onPointerLeave: cellOnPointerLeave,
      ...cellRest
    } = getCellProps?.(palette) ?? {};

    const itemRole =
      role === 'radiogroup'
        ? 'radio'
        : role === 'listbox'
          ? 'option'
          : undefined;

    return (
      <button
        {...cellRest}
        key={role === 'grid' ? undefined : palette.id}
        ref={(button) => {
          if (button) buttons.current.set(palette.id, button);
          else buttons.current.delete(palette.id);
        }}
        type="button"
        role={itemRole}
        aria-checked={role === 'radiogroup' ? selected : undefined}
        aria-selected={role === 'listbox' ? selected : undefined}
        tabIndex={palette.id === focusId ? 0 : -1}
        className={clsx('j-swatch-cell', cellClassName)}
        data-selected={selected}
        data-previewing={palette.id === preview}
        style={{
          width: '100%',
          display: 'grid',
          gap: 5,
          justifyContent: 'stretch',
          textAlign: 'start',
          outline: 'revert',
          ...cellStyle,
        }}
        onPointerEnter={(event) => {
          cellOnPointerEnter?.(event);
          if (!event.defaultPrevented && event.pointerType !== 'touch') delay.schedule(palette.id);
        }}
        onPointerLeave={(event) => {
          cellOnPointerLeave?.(event);
          if (!event.defaultPrevented && event.pointerType !== 'touch') delay.show(null);
        }}
        onFocus={(event) => {
          cellOnFocus?.(event);
          setFocusedId(palette.id);
          delay.show(palette.id);
        }}
        onClick={(event) => {
          cellOnClick?.(event);
          if (event.defaultPrevented) return;
          delay.show(null);
          onCommit(palette.id);
        }}
      >
        {renderPreview ? (
          renderPreview(palette)
        ) : (
          <span className="j-tri-swatch" aria-hidden="true" style={{ width: '100%', height: 15 }}>
            {palette.colors.map((color, index) => <span key={index} style={{ background: color, flex: index === 0 ? 3 : 1 }} />)}
          </span>
        )}
        <span style={between}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{palette.label}</span>
          {selected && <Check size={11} style={{ flexShrink: 0 }} aria-hidden="true" />}
        </span>
      </button>
    );
  };

  const handleContainerKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
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
  };

  const handleContainerBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setFocusedId(null);
      delay.show(null);
    }
  };

  if (role === 'radiogroup' || role === 'listbox') {
    return (
      <div
        role={role}
        aria-label={accessibleLabel}
        className="j-swatch-grid"
        style={{ gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))` }}
        onBlur={handleContainerBlur}
        onKeyDown={handleContainerKeyDown}
      >
        {palettes.map((palette) => renderPaletteButton(palette))}
        {trailingCell !== undefined && <div style={{ minWidth: 0, display: 'grid' }}>{trailingCell}</div>}
      </div>
    );
  }

  const trailingNeedsOwnRow =
    trailingCell !== undefined &&
    (rows.length === 0 || (rows[rows.length - 1]?.length ?? 0) >= columnCount);

  return (
    <div
      role="grid"
      aria-label={accessibleLabel}
      style={{ ...stack, gap: 5 }}
      onBlur={handleContainerBlur}
      onKeyDown={handleContainerKeyDown}
    >
      {rows.map((items, rowIndex) => {
        const isLastRow = rowIndex === rows.length - 1;
        return (
          <div
            key={items[0]?.id ?? rowIndex}
            role="row"
            className="j-swatch-grid"
            style={{ gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))` }}
          >
            {items.map((palette) => (
              <div key={palette.id} role="gridcell" aria-selected={palette.id === value} style={{ minWidth: 0 }}>
                {renderPaletteButton(palette)}
              </div>
            ))}
            {isLastRow && trailingCell !== undefined && !trailingNeedsOwnRow && (
              <div role="gridcell" style={{ minWidth: 0, display: 'grid' }}>
                {trailingCell}
              </div>
            )}
          </div>
        );
      })}
      {trailingNeedsOwnRow && (
        <div
          role="row"
          className="j-swatch-grid"
          style={{ gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))` }}
        >
          <div role="gridcell" style={{ minWidth: 0, display: 'grid' }}>
            {trailingCell}
          </div>
        </div>
      )}
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
  detail: ReactNode;
  status: 'verified' | 'provisional' | (string & {});
  control?: ReactNode;
};

export type InspectorSheetLabels = {
  pending: string;
  synced: string;
  copied: string;
  copySource: string;
  openInEditor: string;
  verified: string;
  provisional: string;
  propertiesSuffix: string;
  copyFailed: string;
};

const defaultInspectorLabels: InspectorSheetLabels = {
  pending: 'Review pending',
  synced: 'Synced',
  copied: 'Source copied',
  copySource: 'Copy source',
  openInEditor: 'Open in Editor',
  verified: 'Verified',
  provisional: 'Provisional',
  propertiesSuffix: ' properties',
  copyFailed: 'Select the path to copy it manually.',
};

export function InspectorSheet({
  title: targetTitle,
  targetControl,
  source,
  editorHref,
  rules,
  copyStatus,
  onCopySource,
  labels,
  renderRuleBadge,
  'aria-label': ariaLabel,
  className,
  style,
  children,
}: {
  title: string;
  targetControl?: ReactNode;
  source?: string;
  editorHref?: string;
  rules: readonly InspectorRule[];
  copyStatus?: 'copied' | 'failed';
  onCopySource?: () => void;
  labels?: Partial<InspectorSheetLabels>;
  renderRuleBadge?: (rule: InspectorRule) => ReactNode;
  'aria-label'?: string;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}) {
  const copy = { ...defaultInspectorLabels, ...labels };
  const provisional = rules.some((rule) => rule.status === 'provisional');
  const fileStart = source ? Math.max(source.lastIndexOf('/'), source.lastIndexOf('\\')) + 1 : 0;
  const copyActionLabel = copyStatus === 'copied' ? copy.copied : copy.copySource;

  return (
    <aside
      className={className}
      aria-label={ariaLabel ?? `${targetTitle}${copy.propertiesSuffix}`}
      style={{ ...stack, gap: 8, ...style }}
    >
      <div style={header}>
        {targetControl ?? <span style={title}>{targetTitle}</span>}
        <Badge tone={provisional ? 'warn' : 'ok'}>{provisional ? copy.pending : copy.synced}</Badge>
      </div>
      {source !== undefined && (
        <div className="j-copy-snippet" style={{ gap: 2, borderRadius: 'var(--juice-r-inner)' }}>
          <code style={{ userSelect: 'text', WebkitUserSelect: 'text', minWidth: 0, wordBreak: 'normal', overflowWrap: 'anywhere' }}>
            <span style={{ color: 'var(--juice-soft)' }}>{source.slice(0, fileStart)}</span><wbr />{source.slice(fileStart)}
          </code>
          {onCopySource && (
            <Tooltip label={copyActionLabel}>
              {(props) => (
                <button {...props} type="button" className="j-chip" aria-label={copyActionLabel} onClick={onCopySource}>
                  {copyStatus === 'copied' ? <Check size={13} aria-hidden="true" /> : <Copy size={13} aria-hidden="true" />}
                </button>
              )}
            </Tooltip>
          )}
          {editorHref && (
            <Tooltip label={copy.openInEditor}>
              {(props) => <a {...props} className="j-chip" aria-label={copy.openInEditor} href={editorHref}><ExternalLink size={13} aria-hidden="true" /></a>}
            </Tooltip>
          )}
        </div>
      )}
      {copyStatus === 'failed' && <span role="status" style={muted}>{copy.copyFailed}</span>}
      {children}
      {rules.map((rule) => (
        <div key={rule.id} className="j-inspect-prop-card" data-variant={rule.status === 'provisional' ? 'dashed' : undefined}>
          <div style={between}>
            <strong style={{ fontWeight: 600 }}>{rule.label}</strong>
            <span style={{ ...row, ...muted, fontSize: 11 }}>
              {renderRuleBadge ? renderRuleBadge(rule) : (rule.status === 'verified' ? copy.verified : copy.provisional)}
              {rule.control}
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
