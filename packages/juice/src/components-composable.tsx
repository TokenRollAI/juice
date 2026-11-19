"use client";
import {
  createContext, createElement, forwardRef, useCallback, useContext,
  useEffect, useId, useMemo, useRef, useState, useSyncExternalStore,
  type ButtonHTMLAttributes, type ComponentPropsWithoutRef, type Context, type CSSProperties,
  type HTMLAttributes, type KeyboardEvent, type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent, type ReactElement, type ReactNode, type Ref,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';
import { clsx } from 'clsx';
import { Check, X } from 'lucide-react';
import {
  assignRef,
  chainEvent,
  composeRefs,
  renderSlottedElement,
  useControllableState,
  useIsomorphicLayoutEffect,
  useJuice,
  type SlottableProps,
} from './behaviors.tsx';
import { placeFloating, type FloatingPlacement } from './components-portal-floating.tsx';

type DivProps = HTMLAttributes<HTMLDivElement>;
type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;
type Orientation = 'horizontal' | 'vertical';

export const OWN_ESCAPE = { 'data-own-escape': '' } as const;

export function keepCardEscape(event: { target: EventTarget | null; preventDefault: () => void }) {
  if (event.target instanceof Element && event.target.closest('[data-own-escape]')) {
    event.preventDefault();
  }
}

function useSlot<T>(context: Context<T | null>, name: string): T {
  const value = useContext(context);
  if (value === null) throw new Error(`${name} requires its parent slot`);
  return value;
}

function itemsIn(root: HTMLElement, group: string, selector: string) {
  return Array.from(root.querySelectorAll<HTMLElement>(selector))
    .filter(item => item.closest(group) === root && !item.matches(':disabled,[aria-disabled="true"]'));
}

function moveFocus(event: KeyboardEvent, items: HTMLElement[], orientation: Orientation, loop = true) {
  const index = items.indexOf(event.target as HTMLElement);
  if (index < 0 || event.defaultPrevented || items.length === 0) return;
  const previous = orientation === 'horizontal' ? 'ArrowLeft' : 'ArrowUp';
  const next = orientation === 'horizontal' ? 'ArrowRight' : 'ArrowDown';
  let target: HTMLElement | undefined;
  switch (event.key) {
    case 'Home': target = items[0]; break;
    case 'End': target = items.at(-1); break;
    case previous:
      target = loop
        ? items[(index + items.length - 1) % items.length]
        : items[Math.max(0, index - 1)];
      break;
    case next:
      target = loop
        ? items[(index + 1) % items.length]
        : items[Math.min(items.length - 1, index + 1)];
      break;
    default: return;
  }
  event.preventDefault();
  target?.focus();
  return target;
}

function createCancelableEvent(type: string): Event {
  if (typeof Event === 'function') {
    return new Event(type, { cancelable: true });
  }
  let prevented = false;
  return {
    type,
    cancelable: true,
    get defaultPrevented() { return prevented; },
    preventDefault() { prevented = true; },
  } as unknown as Event;
}

// Reference-counted body scroll lock for nested modals/sheets/alert dialogs.
const scrollLocks = new WeakMap<Document, { count: number; overflow: string; paddingRight: string }>();

export function useBodyScrollLock(active: boolean, docRef?: RefObject<HTMLElement | null> | Document | null) {
  useIsomorphicLayoutEffect(() => {
    if (!active) return;
    const doc = docRef instanceof Document
      ? docRef
      : docRef && 'current' in docRef
        ? docRef.current?.ownerDocument ?? (typeof document !== 'undefined' ? document : null)
        : (typeof document !== 'undefined' ? document : null);
    const body = doc?.body;
    const win = doc?.defaultView;
    if (!doc || !body) return;

    const existing = scrollLocks.get(doc);
    if (existing) {
      existing.count += 1;
    } else {
      const overflow = body.style.overflow;
      const paddingRight = body.style.paddingRight;
      const scrollbarWidth = win ? Math.max(0, win.innerWidth - doc.documentElement.clientWidth) : 0;
      scrollLocks.set(doc, { count: 1, overflow, paddingRight });
      body.style.overflow = 'hidden';
      if (scrollbarWidth > 0) {
        body.style.paddingRight = `${scrollbarWidth}px`;
      }
    }

    return () => {
      const entry = scrollLocks.get(doc);
      if (!entry) return;
      entry.count -= 1;
      if (entry.count <= 0) {
        body.style.overflow = entry.overflow;
        body.style.paddingRight = entry.paddingRight;
        scrollLocks.delete(doc);
      }
    };
  }, [active]);
}

// Universal portal with fullscreen awareness and local CSS custom property token sync.
export function JuicePortal({
  open = true,
  container,
  children,
}: {
  open?: boolean;
  container?: Element | null;
  children?: ReactNode;
}) {
  const marker = useRef<HTMLSpanElement>(null);
  const scope = useRef<HTMLDivElement>(null);
  const [host, setHost] = useState<Element | null>(null);
  const { theme, fill, animate } = useJuice();

  useIsomorphicLayoutEffect(() => {
    const doc = marker.current?.ownerDocument;
    if (!doc || !open) return;
    const sync = () => setHost(doc.fullscreenElement ?? container ?? doc.body);
    sync();
    doc.addEventListener('fullscreenchange', sync);
    return () => doc.removeEventListener('fullscreenchange', sync);
  }, [container, open]);

  useIsomorphicLayoutEffect(() => {
    const source = marker.current;
    const wrapper = scope.current;
    const computed = source && source.ownerDocument.defaultView?.getComputedStyle(source);
    if (!computed || !wrapper) return;
    for (const name of computed) {
      if (name.startsWith('--juice-') || name.startsWith('--fill-')) {
        wrapper.style.setProperty(name, computed.getPropertyValue(name));
      }
    }
    wrapper.style.direction = computed.direction;
  }, [host, open, theme, fill]);

  return (
    <>
      <span hidden ref={marker} />
      {open && host && createPortal(
        <div
          ref={scope}
          className="juice-root"
          style={{ display: 'contents' }}
          data-theme={theme}
          data-tone={fill}
          data-fill={fill === 'solid' ? 'dark' : theme}
          data-animate={animate ? 'on' : 'off'}
        >
          {children}
        </div>,
        host,
      )}
    </>
  );
}

// Dialog, Sheet, Popover, and DropdownMenu share open state and document-level dismissal.
type Side = 'right' | 'left' | 'top' | 'bottom';
type OpenProps = {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  dismissOnEscape?: boolean;
  dismissOnOutsideClick?: boolean;
  pending?: boolean;
  children?: ReactNode;
};
type LayerCallbacks = {
  onOpenAutoFocus?: (event: Event) => void;
  onCloseAutoFocus?: (event: Event) => void;
  onEscapeKeyDown?: (event: globalThis.KeyboardEvent) => void;
};
type Layer = {
  id: string;
  open: boolean;
  setOpen: (next: boolean) => void;
  pending: boolean;
  escape: boolean;
  outside: boolean;
  trigger: RefObject<HTMLElement | null>;
  anchor: RefObject<HTMLElement | null>;
  surface: RefObject<HTMLDivElement | null>;
  initialFocus: RefObject<'first' | 'last'>;
  parent: Layer | null;
  depth: number;
  kind: 'dialog' | 'sheet' | 'menu' | 'popover';
  side?: Side;
};
const LayerContext = createContext<Layer | null>(null);

function LayerRoot({ kind, side, open, defaultOpen = false, onOpenChange, pending = false,
  dismissOnEscape = true, dismissOnOutsideClick = true, children,
}: OpenProps & Pick<Layer, 'kind' | 'side'>) {
  const parent = useContext(LayerContext);
  const [visible, change] = useControllableState({ value: open, defaultValue: defaultOpen, onChange: onOpenChange });
  const trigger = useRef<HTMLElement>(null);
  const anchor = useRef<HTMLElement>(null);
  const surface = useRef<HTMLDivElement>(null);
  const initialFocus = useRef<'first' | 'last'>('first');
  const id = useId();
  const setOpen = useCallback((next: boolean) => { if (next || !pending) change(next); }, [change, pending]);
  return (
    <LayerContext.Provider value={{
      id, open: visible, setOpen, pending, trigger, anchor, surface, initialFocus,
      escape: dismissOnEscape, outside: dismissOnOutsideClick, parent, depth: (parent?.depth ?? -1) + 1, kind, side,
    }}>
      {children}
    </LayerContext.Provider>
  );
}

function LayerPortal({ children, container }: { children?: ReactNode; container?: Element | null }) {
  const layer = useSlot(LayerContext, 'Portal');
  return <JuicePortal open={layer.open} container={container}>{children}</JuicePortal>;
}

type TriggerProps = ButtonProps & SlottableProps<ButtonProps & { ref?: Ref<HTMLButtonElement> }>;

function triggerElement({ asChild, render, children, ...props }: TriggerProps, ref: Ref<HTMLButtonElement>) {
  if (typeof render === 'function') return render({ type: 'button', ...props, children, ref });
  const element = asChild ? children : render;
  if (element === undefined) return <button type="button" {...props} ref={ref}>{children}</button>;
  return renderSlottedElement(element as ReactElement, props, ref, { asChild, children });
}

const LayerTrigger = forwardRef<HTMLButtonElement, TriggerProps>(function LayerTrigger(
  { onClick, onKeyDown, disabled, ...props }, forwardedRef,
) {
  const layer = useSlot(LayerContext, 'Trigger');
  const menu = layer.kind === 'menu';
  return triggerElement({
    id: layer.id + '-trigger',
    ...props,
    disabled,
    'aria-haspopup': menu ? 'menu' : 'dialog',
    'aria-expanded': layer.open,
    'aria-controls': layer.open ? layer.id : undefined,
    onClick: chainEvent(onClick, () => {
      if (!disabled) {
        layer.initialFocus.current = 'first';
        layer.setOpen(!layer.open);
      }
    }),
    onKeyDown: chainEvent(onKeyDown, event => {
      const submenu = layer.parent?.kind === 'menu';
      const opensMenu = submenu ? event.key === 'ArrowRight' : event.key === 'ArrowDown' || event.key === 'ArrowUp';
      if (disabled || !menu || !opensMenu) return;
      event.preventDefault();
      layer.initialFocus.current = event.key === 'ArrowUp' ? 'last' : 'first';
      layer.setOpen(true);
    }),
  }, node => {
    layer.trigger.current = node;
    return assignRef(forwardedRef, node);
  });
});

const focusableSelector = 'button:not(:disabled), a[href], input:not(:disabled):not([type="hidden"]), select:not(:disabled), textarea:not(:disabled), [tabindex]';
const menuItemSelector = '[role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"]';
const menuItems = (node: HTMLElement) => itemsIn(node, '[role="menu"]', menuItemSelector);
const openLayers = new WeakMap<Document, HTMLElement[]>();

function useLayerInteraction(layer: Layer, callbacks: LayerCallbacks = {}) {
  const latest = useRef({ layer, callbacks });
  useIsomorphicLayoutEffect(() => { latest.current = { layer, callbacks }; });
  const isModal = layer.kind === 'dialog' || layer.kind === 'sheet';
  useBodyScrollLock(layer.open && isModal, layer.surface);

  useIsomorphicLayoutEffect(() => {
    const node = layer.surface.current;
    if (!layer.open || !node) return;
    const doc = node.ownerDocument;
    const menu = layer.kind === 'menu';
    const popover = layer.kind === 'popover';
    const activeBefore = doc.activeElement instanceof HTMLElement && doc.activeElement !== doc.body && !node.contains(doc.activeElement)
      ? doc.activeElement
      : null;
    const returnTo: Array<HTMLElement | null> = [layer.trigger.current, activeBefore];
    for (let ancestor = layer.parent; ancestor; ancestor = ancestor.parent) {
      returnTo.push(ancestor.trigger.current);
    }
    const stack = openLayers.get(doc) ?? [];
    openLayers.set(doc, stack);
    stack.push(node);

    const tabbables = () => Array.from(node.querySelectorAll<HTMLElement>(focusableSelector))
      .filter(el => el.tabIndex >= 0 && el.getClientRects().length && !el.closest('[inert],[hidden]'));

    const openFocusEvent = createCancelableEvent('openAutoFocus');
    latest.current.callbacks.onOpenAutoFocus?.(openFocusEvent);
    if (!openFocusEvent.defaultPrevented) {
      const initial = menu
        ? menuItems(node).at(layer.initialFocus.current === 'last' ? -1 : 0)
        : tabbables()[0];
      (initial ?? node).focus({ preventScroll: true });
    }

    const top = () => stack.at(-1) === node;
    const keydown = (event: globalThis.KeyboardEvent) => {
      if (!top() || event.defaultPrevented) return;
      const { layer: current, callbacks: cbs } = latest.current;
      if (event.key === 'Escape') {
        const targetEl = event.target instanceof Element ? event.target : null;
        const ownEscapeHost = targetEl?.closest('[data-own-escape]');
        if (ownEscapeHost && node.contains(ownEscapeHost) && ownEscapeHost !== node) {
          return;
        }
        cbs.onEscapeKeyDown?.(event);
        if (event.defaultPrevented) return;
        event.preventDefault();
        if (current.escape) current.setOpen(false);
      } else if (isModal && event.key === 'Tab') {
        const targets = tabbables();
        const first = targets[0] ?? node;
        const last = targets.at(-1) ?? node;
        if (event.shiftKey ? doc.activeElement === first || doc.activeElement === node : doc.activeElement === last) {
          event.preventDefault();
          (event.shiftKey ? last : first).focus();
        }
      }
    };
    const outside = (event: MouseEvent) => {
      const { layer: current } = latest.current;
      const path = event.composedPath();
      if (
        !top() || !current.outside || path.includes(node) ||
        (current.trigger.current && path.includes(current.trigger.current)) ||
        (current.anchor.current && path.includes(current.anchor.current))
      ) return;
      current.setOpen(false);
      if (current.kind === 'menu' && !current.pending) {
        for (let parent = current.parent; parent?.kind === 'menu'; parent = parent.parent) {
          if (
            !parent.outside || parent.pending ||
            (parent.surface.current && path.includes(parent.surface.current)) ||
            (parent.trigger.current && path.includes(parent.trigger.current))
          ) break;
          parent.setOpen(false);
        }
      }
    };
    const focus = (event: FocusEvent) => {
      if (!top() || event.composedPath().includes(node)) return;
      if (!menu && !popover) (tabbables()[0] ?? node).focus();
    };
    doc.addEventListener('keydown', keydown);
    doc.addEventListener('click', outside, true);
    doc.addEventListener('focusin', focus);
    return () => {
      const wasTop = top();
      const idx = stack.indexOf(node);
      if (idx >= 0) stack.splice(idx, 1);
      doc.removeEventListener('keydown', keydown);
      doc.removeEventListener('click', outside, true);
      doc.removeEventListener('focusin', focus);
      if (wasTop) {
        const closeFocusEvent = createCancelableEvent('closeAutoFocus');
        latest.current.callbacks.onCloseAutoFocus?.(closeFocusEvent);
        if (!closeFocusEvent.defaultPrevented) {
          const restore = () => returnTo.find(target => target?.isConnected)?.focus({ preventScroll: true });
          restore();
          queueMicrotask(() => { if (doc.activeElement === doc.body) restore(); });
        }
      }
    };
  }, [layer.open, layer.kind, layer.surface, layer.trigger, layer.initialFocus, isModal]);
}

type ModalLabels = { setTitle: (id?: string) => void; setDescription: (id?: string) => void };
const LabelContext = createContext<ModalLabels | null>(null);
function DialogRoot(props: OpenProps) { return <LayerRoot kind="dialog" {...props} />; }
function SheetRoot({ side = 'right', ...props }: OpenProps & { side?: Side }) {
  return <LayerRoot kind="sheet" side={side} {...props} />;
}

function Overlay({ className, style, ...props }: DivProps) {
  const layer = useSlot(LayerContext, 'Overlay');
  if (!layer.open) return null;
  const dynamicStyle = layer.depth > 0 ? { zIndex: 1000 + layer.depth * 2, ...style } : style;
  return (
    <div
      aria-hidden={props.children == null || undefined}
      {...props}
      className={clsx('j-overlay', className)}
      style={dynamicStyle}
    />
  );
}

type ModalContentProps = DivProps & LayerCallbacks & {
  side?: Side;
};

const ModalContent = forwardRef<HTMLDivElement, ModalContentProps>(function ModalContent(
  { className, style, side, onOpenAutoFocus, onCloseAutoFocus, onEscapeKeyDown, ...props },
  forwardedRef,
) {
  const layer = useSlot(LayerContext, 'Content');
  useLayerInteraction(layer, { onOpenAutoFocus, onCloseAutoFocus, onEscapeKeyDown });
  const [title, setTitle] = useState<string>();
  const [description, setDescription] = useState<string>();
  if (!layer.open) return null;
  const edge = side ?? (layer.kind === 'sheet' ? (layer.side ?? 'right') : undefined);
  const dynamicStyle = layer.depth > 0 ? { zIndex: 1001 + layer.depth * 2, ...style } : style;
  return (
    <LabelContext.Provider value={{ setTitle, setDescription }}>
      <div
        tabIndex={-1}
        aria-labelledby={props['aria-label'] ? undefined : title}
        aria-describedby={description}
        {...props}
        ref={composeRefs(layer.surface, forwardedRef)}
        id={layer.id}
        role="dialog"
        aria-modal="true"
        data-side={edge}
        aria-busy={layer.pending || undefined}
        className={clsx('j-slab', edge ? 'j-sheet-content' : 'j-dialog-content', className)}
        style={dynamicStyle}
      />
    </LabelContext.Provider>
  );
});

function ModalTitle({ id, className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  const { setTitle } = useSlot(LabelContext, 'Title');
  const generated = useId();
  const resolved = id ?? generated;
  useIsomorphicLayoutEffect(() => { setTitle(resolved); return () => setTitle(undefined); }, [setTitle, resolved]);
  return <h2 {...props} id={resolved} className={clsx('j-dialog-title', className)} />;
}

function ModalDescription({ id, className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  const { setDescription } = useSlot(LabelContext, 'Description');
  const generated = useId();
  const resolved = id ?? generated;
  useIsomorphicLayoutEffect(() => { setDescription(resolved); return () => setDescription(undefined); }, [setDescription, resolved]);
  return <p {...props} id={resolved} className={clsx('j-dialog-description', className)} />;
}

function ModalHeader({ className, ...props }: DivProps) {
  return <div {...props} className={clsx('j-dialog-header', className)} />;
}

function ModalFooter({ className, ...props }: DivProps) {
  return <div {...props} className={clsx('j-dialog-footer', className)} />;
}

const ModalClose = forwardRef<HTMLButtonElement, TriggerProps>(function ModalClose(
  { disabled, onClick, className, asChild, render, children, ...props },
  forwardedRef,
) {
  const layer = useSlot(LayerContext, 'Close');
  const mergedDisabled = Boolean(disabled || layer.pending);
  const closeProps: ButtonProps = {
    ...props,
    disabled: mergedDisabled,
    className: asChild || render ? className : clsx('j-chip', className),
    onClick: chainEvent(onClick, () => {
      if (!mergedDisabled) layer.setOpen(false);
    }),
  };
  return triggerElement({ ...closeProps, asChild, render, children }, forwardedRef);
});

function SheetBody({ className, ...props }: DivProps) {
  return <div {...props} className={clsx('j-sheet-body', className)} />;
}

function SheetHandle({ className, onPointerDown, onPointerMove, onPointerUp, onPointerCancel, ...props }: DivProps) {
  const layer = useSlot(LayerContext, 'Sheet.Handle');
  const dragRef = useRef<{ pointerId: number; startY: number; startTime: number; deltaY: number } | null>(null);

  const resetSurface = (node: HTMLDivElement | null) => {
    if (!node) return;
    node.style.transition = '';
    node.style.transform = '';
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    onPointerDown?.(event);
    if (event.defaultPrevented || layer.side !== 'bottom' || layer.pending) return;
    if (event.button !== 0 && event.pointerType === 'mouse') return;
    dragRef.current = { pointerId: event.pointerId, startY: event.clientY, startTime: Date.now(), deltaY: 0 };
    event.currentTarget.setPointerCapture?.(event.pointerId);
    if (layer.surface.current) {
      layer.surface.current.style.transition = 'none';
    }
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    onPointerMove?.(event);
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const deltaY = Math.max(0, event.clientY - drag.startY);
    drag.deltaY = deltaY;
    if (layer.surface.current) {
      layer.surface.current.style.transform = deltaY > 0 ? `translateY(${deltaY}px)` : '';
    }
  };

  const finishDrag = (event: ReactPointerEvent<HTMLDivElement>, cancelled: boolean) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    const elapsed = Math.max(1, Date.now() - drag.startTime);
    const velocity = drag.deltaY / elapsed;
    resetSurface(layer.surface.current);
    if (!cancelled && !layer.pending && (drag.deltaY >= 80 || velocity >= 0.55)) {
      layer.setOpen(false);
    }
  };

  return (
    <div
      role="presentation"
      {...props}
      className={clsx('j-sheet-handle', className)}
      data-side={layer.side}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={(e) => { onPointerUp?.(e); finishDrag(e, false); }}
      onPointerCancel={(e) => { onPointerCancel?.(e); finishDrag(e, true); }}
    >
      <span className="j-sheet-handle-bar" aria-hidden="true" />
    </div>
  );
}

export const Dialog = {
  Root: DialogRoot,
  Trigger: LayerTrigger,
  Portal: LayerPortal,
  Overlay,
  Content: ModalContent,
  Header: ModalHeader,
  Title: ModalTitle,
  Description: ModalDescription,
  Footer: ModalFooter,
  Close: ModalClose,
};

export const Sheet = {
  ...Dialog,
  Root: SheetRoot,
  Body: SheetBody,
  Handle: SheetHandle,
};

// Composable Popover (Issue #20)
function PopoverRoot(props: OpenProps) {
  return <LayerRoot kind="popover" {...props} />;
}

const PopoverAnchor = forwardRef<HTMLElement, HTMLAttributes<HTMLElement> & SlottableProps<HTMLAttributes<HTMLElement> & { ref?: Ref<HTMLElement> }>>(
  function PopoverAnchor({ asChild, render, children, ...props }, forwardedRef) {
    const layer = useSlot(LayerContext, 'Popover.Anchor');
    const mergedRef = composeRefs<HTMLElement>((node) => { layer.anchor.current = node; }, forwardedRef);
    if (typeof render === 'function') return render({ ...props, children, ref: mergedRef });
    const element = asChild ? children : render;
    if (element !== undefined) {
      return renderSlottedElement(element as ReactElement, props, mergedRef, { asChild, children });
    }
    return <span {...props} ref={mergedRef as Ref<HTMLSpanElement>}>{children}</span>;
  },
);

export type PopoverContentProps = DivProps & LayerCallbacks & {
  side?: Side;
  align?: 'start' | 'center' | 'end';
  sideOffset?: number;
  placement?: FloatingPlacement;
};

const PopoverContent = forwardRef<HTMLDivElement, PopoverContentProps>(function PopoverContent(
  { side = 'bottom', align = 'center', sideOffset = 8, placement, className, style,
    onOpenAutoFocus, onCloseAutoFocus, onEscapeKeyDown, ...props },
  forwardedRef,
) {
  const layer = useSlot(LayerContext, 'Popover.Content');
  const [title, setTitle] = useState<string>();
  const [description, setDescription] = useState<string>();
  const preferred = placement ?? ((align === 'center' ? side : `${side}-${align}`) as FloatingPlacement);
  const { surface, trigger, anchor, open } = layer;

  useIsomorphicLayoutEffect(() => {
    const target = anchor.current ?? trigger.current;
    const node = surface.current;
    if (!open || !node || !target) return;
    const doc = node.ownerDocument;
    const win = doc.defaultView;
    if (!win) return;
    const position = () => {
      const { x, y, side: resolvedSide } = placeFloating(
        target.getBoundingClientRect(),
        { width: node.offsetWidth, height: node.offsetHeight },
        { width: doc.documentElement.clientWidth, height: doc.documentElement.clientHeight },
        preferred,
        sideOffset,
      );
      node.style.top = `${y}px`;
      node.style.left = `${x}px`;
      node.dataset.side = resolvedSide;
    };
    position();
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(position) : undefined;
    observer?.observe(target);
    observer?.observe(node);
    win.addEventListener('resize', position);
    win.addEventListener('scroll', position, true);
    return () => {
      observer?.disconnect();
      win.removeEventListener('resize', position);
      win.removeEventListener('scroll', position, true);
    };
  }, [open, preferred, sideOffset, surface, trigger, anchor]);

  useLayerInteraction(layer, { onOpenAutoFocus, onCloseAutoFocus, onEscapeKeyDown });
  if (!open) return null;
  const dynamicStyle = layer.depth > 0 ? { zIndex: 1001 + layer.depth * 2, ...style } : style;

  return (
    <LabelContext.Provider value={{ setTitle, setDescription }}>
      <div
        role="dialog"
        tabIndex={-1}
        aria-labelledby={props['aria-label'] ? undefined : title}
        aria-describedby={description}
        {...props}
        ref={composeRefs(surface, forwardedRef)}
        id={layer.id}
        className={clsx('j-floating-pop', 'j-popover-content', className)}
        style={dynamicStyle}
      />
    </LabelContext.Provider>
  );
});

export const Popover = {
  Root: PopoverRoot,
  Trigger: LayerTrigger,
  Anchor: PopoverAnchor,
  Portal: LayerPortal,
  Content: PopoverContent,
  Header: ModalHeader,
  Title: ModalTitle,
  Description: ModalDescription,
  Close: ModalClose,
};

// DropdownMenu (Full parity: CheckboxItem, RadioGroup, RadioItem, ItemIndicator, Shortcut, loop, typeahead)
function MenuRoot(props: OpenProps) { return <LayerRoot {...props} kind="menu" />; }

function closeMenu(layer: Layer) {
  let current: Layer | null = layer;
  while (current?.kind === 'menu') {
    current.setOpen(false);
    current = current.parent;
  }
}

const MenuItemIndicatorContext = createContext<{ checked: boolean | 'indeterminate' } | null>(null);
const MenuRadioGroupContext = createContext<{
  value: string | undefined;
  onValueChange: (value: string) => void;
} | null>(null);

type MenuContentProps = DivProps & LayerCallbacks & {
  placement?: FloatingPlacement;
  sideOffset?: number;
  loop?: boolean;
};

const MenuContent = forwardRef<HTMLDivElement, MenuContentProps>(function MenuContent(
  { placement, sideOffset = 6, loop = true, onKeyDown, onOpenAutoFocus, onCloseAutoFocus, onEscapeKeyDown,
    className, style, ...props },
  forwardedRef,
) {
  const layer = useSlot(LayerContext, 'MenuContent');
  const submenu = layer.parent?.kind === 'menu';
  const preferred = placement ?? (submenu ? 'right-start' : 'bottom-start');
  const { surface, trigger, open } = layer;
  const typeahead = useRef({ value: '', at: 0 });

  useIsomorphicLayoutEffect(() => {
    const anchor = trigger.current;
    const node = surface.current;
    if (!open || !node || !anchor) return;
    const doc = node.ownerDocument;
    const win = doc.defaultView;
    if (!win) return;
    const position = () => {
      const { x, y, side } = placeFloating(
        anchor.getBoundingClientRect(),
        { width: node.offsetWidth, height: node.offsetHeight },
        { width: doc.documentElement.clientWidth, height: doc.documentElement.clientHeight },
        preferred,
        sideOffset,
      );
      node.style.top = `${y}px`;
      node.style.left = `${x}px`;
      node.dataset.side = side;
    };
    position();
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(position) : undefined;
    observer?.observe(anchor);
    observer?.observe(node);
    win.addEventListener('resize', position);
    win.addEventListener('scroll', position, true);
    return () => {
      observer?.disconnect();
      win.removeEventListener('resize', position);
      win.removeEventListener('scroll', position, true);
    };
  }, [open, preferred, sideOffset, surface, trigger]);

  useLayerInteraction(layer, { onOpenAutoFocus, onCloseAutoFocus, onEscapeKeyDown });
  if (!open) return null;
  const dynamicStyle = layer.depth > 0 ? { zIndex: 1001 + layer.depth * 2, ...style } : style;

  return (
    <div
      aria-labelledby={props['aria-label'] ? undefined : trigger.current?.id || layer.id + '-trigger'}
      {...props}
      ref={composeRefs(surface, forwardedRef)}
      id={layer.id}
      role="menu"
      tabIndex={-1}
      className={clsx('j-floating-pop', 'j-menu-list', 'j-menu-content', className)}
      style={dynamicStyle}
      onKeyDown={chainEvent(onKeyDown, event => {
        if ((event.target as HTMLElement).closest('[role="menu"]') !== event.currentTarget) return;
        if (event.key === 'ArrowLeft' && submenu) {
          event.preventDefault();
          layer.setOpen(false);
          return;
        }
        if (event.key === 'Tab') {
          closeMenu(layer);
          return;
        }
        const items = menuItems(event.currentTarget);
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Home' || event.key === 'End') {
          if (!items.includes(event.target as HTMLElement)) {
            event.preventDefault();
            (event.key === 'ArrowUp' || event.key === 'End' ? items.at(-1) : items[0])?.focus();
            return;
          }
          moveFocus(event, items, 'vertical', loop);
          return;
        }
        if (
          event.key.length === 1 &&
          event.key !== ' ' &&
          !event.ctrlKey &&
          !event.metaKey &&
          !event.altKey &&
          items.length > 0
        ) {
          const char = event.key.toLowerCase();
          const now = Date.now();
          const prev = now - typeahead.current.at < 700 ? typeahead.current.value : '';
          const query = prev === char ? char : prev + char;
          typeahead.current = { value: query, at: now };
          const currentIdx = items.indexOf(event.target as HTMLElement);
          const start = query.length === 1 ? currentIdx + 1 : 0;
          const ordered = [...items.slice(start), ...items.slice(0, start)];
          const match = ordered.find(item => (item.textContent ?? '').trim().toLowerCase().startsWith(query));
          if (match) {
            event.preventDefault();
            match.focus();
          }
        }
      })}
    />
  );
});

type MenuItemProps = Omit<ButtonProps, 'onSelect'> &
  SlottableProps<ButtonProps & { ref?: Ref<HTMLButtonElement> }> & {
    tone?: 'neutral' | 'danger';
    onSelect?: (event: ReactMouseEvent<HTMLButtonElement>) => void;
  };

const MenuItem = forwardRef<HTMLButtonElement, MenuItemProps>(function MenuItem(
  { tone, disabled, onSelect, onClick, className, asChild, render, children, ...props },
  forwardedRef,
) {
  const layer = useSlot(LayerContext, 'MenuItem');
  const itemProps: ButtonProps & Record<string, unknown> = {
    tabIndex: -1,
    ...props,
    role: 'menuitem',
    'data-tone': tone,
    disabled,
    'aria-disabled': disabled || undefined,
    className: clsx('j-menu-item', className),
    onClick: chainEvent(onClick, chainEvent(onSelect, () => {
      if (!disabled) closeMenu(layer);
    })),
  };
  return triggerElement({ ...itemProps, asChild, render, children }, forwardedRef);
});

type MenuCheckboxItemProps = Omit<MenuItemProps, 'checked'> & {
  checked?: boolean | 'indeterminate';
  onCheckedChange?: (checked: boolean) => void;
};

const MenuCheckboxItem = forwardRef<HTMLButtonElement, MenuCheckboxItemProps>(function MenuCheckboxItem(
  { checked = false, onCheckedChange, disabled, onSelect, onClick, className, asChild, render, children, ...props },
  forwardedRef,
) {
  const layer = useSlot(LayerContext, 'DropdownMenu.CheckboxItem');
  const state = checked === 'indeterminate' ? 'indeterminate' : checked ? 'checked' : 'unchecked';
  const itemProps: ButtonProps & Record<string, unknown> = {
    tabIndex: -1,
    ...props,
    role: 'menuitemcheckbox',
    'aria-checked': checked === 'indeterminate' ? 'mixed' : Boolean(checked),
    'data-state': state,
    disabled,
    'aria-disabled': disabled || undefined,
    className: clsx('j-menu-item', 'j-menu-check-item', className),
    onClick: chainEvent(onClick, (event: ReactMouseEvent<HTMLButtonElement>) => {
      if (disabled) return;
      onCheckedChange?.(checked === 'indeterminate' ? true : !checked);
      onSelect?.(event);
      if (!event.defaultPrevented) closeMenu(layer);
    }),
  };
  return (
    <MenuItemIndicatorContext.Provider value={{ checked }}>
      {triggerElement({ ...itemProps, asChild, render, children }, forwardedRef)}
    </MenuItemIndicatorContext.Provider>
  );
});

function MenuRadioGroup({
  value,
  defaultValue,
  onValueChange,
  className,
  ...props
}: DivProps & { value?: string; defaultValue?: string; onValueChange?: (value: string) => void }) {
  const [current, setCurrent] = useControllableState<string | undefined>({
    value,
    defaultValue,
    onChange: (next) => {
      if (next !== undefined) onValueChange?.(next);
    },
  });
  return (
    <MenuRadioGroupContext.Provider value={{ value: current, onValueChange: setCurrent }}>
      <div role="group" {...props} className={clsx('j-menu-group', className)} />
    </MenuRadioGroupContext.Provider>
  );
}

type MenuRadioItemProps = MenuItemProps & { value: string };

const MenuRadioItem = forwardRef<HTMLButtonElement, MenuRadioItemProps>(function MenuRadioItem(
  { value, disabled, onSelect, onClick, className, asChild, render, children, ...props },
  forwardedRef,
) {
  const layer = useSlot(LayerContext, 'DropdownMenu.RadioItem');
  const group = useSlot(MenuRadioGroupContext, 'DropdownMenu.RadioItem');
  const checked = group.value === value;
  const itemProps: ButtonProps & Record<string, unknown> = {
    tabIndex: -1,
    ...props,
    role: 'menuitemradio',
    'aria-checked': checked,
    'data-state': checked ? 'checked' : 'unchecked',
    disabled,
    'aria-disabled': disabled || undefined,
    className: clsx('j-menu-item', 'j-menu-radio-item', className),
    onClick: chainEvent(onClick, (event: ReactMouseEvent<HTMLButtonElement>) => {
      if (disabled) return;
      group.onValueChange(value);
      onSelect?.(event);
      if (!event.defaultPrevented) closeMenu(layer);
    }),
  };
  return (
    <MenuItemIndicatorContext.Provider value={{ checked }}>
      {triggerElement({ ...itemProps, asChild, render, children }, forwardedRef)}
    </MenuItemIndicatorContext.Provider>
  );
});

function MenuItemIndicator({
  forceMount = false,
  className,
  children,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { forceMount?: boolean }) {
  const ctx = useContext(MenuItemIndicatorContext);
  const visible = forceMount || Boolean(ctx && ctx.checked !== false);
  if (!visible) return null;
  return (
    <span {...props} className={clsx('j-menu-indicator', className)} aria-hidden="true">
      {children ?? <Check size={13} />}
    </span>
  );
}

function MenuShortcut({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return <span {...props} className={clsx('j-menu-shortcut', className)} />;
}

function SubTrigger({ className, ...props }: TriggerProps) {
  return <LayerTrigger {...props} className={clsx('j-menu-item', className)} role="menuitem" tabIndex={-1} />;
}

function MenuSeparator({ className, ...props }: DivProps) {
  return <div {...props} role="separator" className={clsx('j-menu-separator', className)} />;
}

function MenuLabel({ className, ...props }: DivProps) {
  return <div {...props} className={clsx('j-menu-label', className)} />;
}

function MenuGroup({ className, ...props }: DivProps) {
  return <div role="group" {...props} className={clsx('j-menu-group', className)} />;
}

export const DropdownMenu = {
  Root: MenuRoot,
  Trigger: LayerTrigger,
  Portal: LayerPortal,
  Content: MenuContent,
  Item: MenuItem,
  CheckboxItem: MenuCheckboxItem,
  RadioGroup: MenuRadioGroup,
  RadioItem: MenuRadioItem,
  ItemIndicator: MenuItemIndicator,
  Shortcut: MenuShortcut,
  Separator: MenuSeparator,
  Label: MenuLabel,
  Group: MenuGroup,
  Sub: MenuRoot,
  SubTrigger,
  SubContent: MenuContent,
};

// RadioGroup & RadioGroupItem (Issue #20)
type RadioGroupVariant = 'default' | 'card' | 'chip';
type RadioGroupContextValue = {
  name?: string;
  value: string | undefined;
  select: (next: string) => void;
  disabled: boolean;
  orientation: Orientation;
  variant: RadioGroupVariant;
  tabStop: string | undefined;
  registerItem: (val: string, disabled: boolean) => () => void;
};

const RadioGroupContext = createContext<RadioGroupContextValue | null>(null);

export type RadioGroupProps = Omit<DivProps, 'defaultValue'> & {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  name?: string;
  disabled?: boolean;
  orientation?: Orientation;
  variant?: RadioGroupVariant;
};

function RadioGroupRoot({
  value,
  defaultValue,
  onValueChange,
  name,
  disabled = false,
  orientation = 'vertical',
  variant = 'default',
  className,
  onKeyDown,
  children,
  ...props
}: RadioGroupProps) {
  const [current, setCurrent] = useControllableState<string | undefined>({
    value,
    defaultValue,
    onChange: (next) => {
      if (next !== undefined) onValueChange?.(next);
    },
  });
  const [firstEnabled, setFirstEnabled] = useState<string | undefined>(undefined);
  const itemsOrderRef = useRef<Array<{ value: string; disabled: boolean }>>([]);
  const { playSound } = useJuice();

  const syncFirstEnabled = useCallback(() => {
    const first = itemsOrderRef.current.find(entry => !entry.disabled)?.value;
    setFirstEnabled(prev => (prev === first ? prev : first));
  }, []);

  const registerItem = useCallback((val: string, itemDisabled: boolean) => {
    const entry = { value: val, disabled: itemDisabled };
    itemsOrderRef.current.push(entry);
    syncFirstEnabled();
    return () => {
      const idx = itemsOrderRef.current.indexOf(entry);
      if (idx >= 0) itemsOrderRef.current.splice(idx, 1);
      syncFirstEnabled();
    };
  }, [syncFirstEnabled]);

  const select = useCallback((next: string) => {
    if (disabled) return;
    if (next !== current) {
      playSound('tap');
      setCurrent(next);
    }
  }, [current, disabled, playSound, setCurrent]);

  const tabStop = current !== undefined ? current : firstEnabled;

  return (
    <RadioGroupContext.Provider value={{ name, value: current, select, disabled, orientation, variant, tabStop, registerItem }}>
      <div
        role="radiogroup"
        aria-orientation={orientation}
        aria-disabled={disabled || undefined}
        data-orientation={orientation}
        data-variant={variant}
        {...props}
        className={clsx('j-radio-group', className)}
        onKeyDown={chainEvent(onKeyDown, (event) => {
          if (disabled) return;
          const radios = itemsIn(event.currentTarget, '[role="radiogroup"]', '[role="radio"]');
          if (radios.length === 0) return;
          const idx = radios.indexOf(event.target as HTMLElement);
          if (idx < 0) return;
          let target: HTMLElement | undefined;
          if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
            target = radios[(idx + 1) % radios.length];
          } else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
            target = radios[(idx - 1 + radios.length) % radios.length];
          } else if (event.key === 'Home') {
            target = radios[0];
          } else if (event.key === 'End') {
            target = radios.at(-1);
          } else {
            return;
          }
          event.preventDefault();
          if (target) {
            target.focus();
            const nextVal = target.dataset.value;
            if (nextVal !== undefined) select(nextVal);
          }
        })}
      >
        {children}
        {name && current !== undefined && (
          <input type="hidden" name={name} value={current} disabled={disabled} />
        )}
      </div>
    </RadioGroupContext.Provider>
  );
}

export type RadioGroupItemProps = Omit<ButtonProps, 'value'> & {
  value: string;
  variant?: RadioGroupVariant;
};

export const RadioGroupItem = forwardRef<HTMLButtonElement, RadioGroupItemProps>(function RadioGroupItem(
  { value, disabled = false, variant, className, children, onClick, ...props },
  forwardedRef,
) {
  const group = useSlot(RadioGroupContext, 'RadioGroupItem');
  const isDisabled = group.disabled || disabled;
  const checked = group.value === value;
  const resolvedVariant = variant ?? group.variant;
  const isTabStop = !isDisabled && (checked || (group.value === undefined && group.tabStop === value));

  useIsomorphicLayoutEffect(() => {
    return group.registerItem(value, isDisabled);
  }, [group.registerItem, value, isDisabled]);

  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      tabIndex={isTabStop ? 0 : -1}
      disabled={isDisabled}
      data-value={value}
      data-checked={checked ? 'true' : undefined}
      data-state={checked ? 'checked' : 'unchecked'}
      data-variant={resolvedVariant}
      {...props}
      ref={forwardedRef}
      className={clsx('j-radio-item', className)}
      onClick={chainEvent(onClick, () => {
        if (!isDisabled) group.select(value);
      })}
    >
      {resolvedVariant !== 'chip' && (
        <span className="j-radio-dot" data-checked={checked ? 'true' : undefined} aria-hidden="true">
          {checked && <span className="j-radio-dot-inner" />}
        </span>
      )}
      {children != null && <span className="j-radio-item-content">{children}</span>}
    </button>
  );
});

export const RadioGroup = Object.assign(RadioGroupRoot, {
  Root: RadioGroupRoot,
  Item: RadioGroupItem,
});

// Surface & Card Primitives (Issue #21)
export type SurfaceVariant = 'slab' | 'flat' | 'recessed' | 'glass';
export type SurfacePadding = 'none' | 'sm' | 'md' | 'lg';
export type SurfaceElement = 'div' | 'section' | 'article' | 'aside';

export type SurfaceProps = HTMLAttributes<HTMLElement> & {
  variant?: SurfaceVariant;
  padding?: SurfacePadding;
  interactive?: boolean;
  as?: SurfaceElement;
};

export const Surface = forwardRef<HTMLElement, SurfaceProps>(function Surface(
  { variant = 'slab', padding = 'md', interactive = false, as = 'div', className, ...props },
  ref,
) {
  return createElement(as, {
    ...props,
    ref,
    'data-variant': variant,
    'data-padding': padding,
    'data-interactive': interactive ? 'true' : undefined,
    className: clsx('j-surface', className),
  });
});

const CardRoot = forwardRef<HTMLElement, SurfaceProps>(function CardRoot(
  { variant = 'slab', padding = 'md', className, ...props },
  ref,
) {
  return <Surface ref={ref} variant={variant} padding={padding} className={clsx('j-card', className)} {...props} />;
});

function CardHeader({ className, ...props }: DivProps) {
  return <div {...props} className={clsx('j-card-header', className)} />;
}

function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 {...props} className={clsx('j-card-title', className)} />;
}

function CardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p {...props} className={clsx('j-card-description', className)} />;
}

function CardBody({ className, ...props }: DivProps) {
  return <div {...props} className={clsx('j-card-body', className)} />;
}

function CardFooter({ className, ...props }: DivProps) {
  return <div {...props} className={clsx('j-card-footer', className)} />;
}

export const Card = Object.assign(CardRoot, {
  Root: CardRoot,
  Header: CardHeader,
  Title: CardTitle,
  Description: CardDescription,
  Body: CardBody,
  Footer: CardFooter,
});

// Tabs
const TabsContext = createContext<{
  id: string; value: string | undefined; select: (value: string) => void; orientation: Orientation; keepMounted: boolean;
} | null>(null);
type TabsRootProps = DivProps & {
  value?: string; defaultValue?: string; onValueChange?: (value: string) => void;
  keepMounted?: boolean; orientation?: Orientation;
};
function TabsRoot({ value, defaultValue, onValueChange, keepMounted = false, orientation = 'horizontal', id, ...props }: TabsRootProps) {
  const generated = useId();
  const [current, setCurrent] = useControllableState<string | undefined>({
    value,
    defaultValue,
    onChange: next => { if (next !== undefined) onValueChange?.(next); },
  });
  return (
    <TabsContext.Provider value={{ id: id ?? generated, value: current, select: setCurrent, keepMounted, orientation }}>
      <div {...props} id={id ?? generated} />
    </TabsContext.Provider>
  );
}
function TabList({ className, style, onKeyDown, ...props }: DivProps) {
  const tabs = useSlot(TabsContext, 'Tabs.List');
  const ref = useRef<HTMLDivElement>(null);
  useIsomorphicLayoutEffect(() => {
    if (tabs.value === undefined && ref.current) {
      const first = itemsIn(ref.current, '[role="tablist"]', '[role="tab"]')[0]?.dataset.value;
      if (first !== undefined) tabs.select(first);
    }
  }, [tabs]);
  return (
    <div
      {...props}
      ref={ref}
      role="tablist"
      aria-orientation={tabs.orientation}
      data-orientation={tabs.orientation}
      className={clsx('j-seg', className)}
      style={tabs.orientation === 'vertical' ? { flexDirection: 'column', ...style } : style}
      onKeyDown={chainEvent(onKeyDown, event => {
        const target = moveFocus(event, itemsIn(event.currentTarget, '[role="tablist"]', '[role="tab"]'), tabs.orientation);
        const next = target?.dataset.value;
        if (next !== undefined && next !== tabs.value) tabs.select(next);
      })}
    />
  );
}

type TabTriggerProps = ButtonProps &
  SlottableProps<ButtonProps & { ref?: Ref<HTMLButtonElement> }> & { value: string };

const TabTrigger = forwardRef<HTMLButtonElement, TabTriggerProps>(function TabTrigger(
  { value, onClick, className, asChild, render, children, ...props },
  forwardedRef,
) {
  const tabs = useSlot(TabsContext, 'Tabs.Trigger');
  const id = tabs.id + '-' + encodeURIComponent(value);
  const active = tabs.value === value;
  const triggerProps: ButtonProps & Record<string, unknown> = {
    ...props,
    role: 'tab',
    id: id + '-tab',
    'aria-controls': id + '-panel',
    'aria-selected': active,
    tabIndex: active ? 0 : -1,
    'data-value': value,
    'data-active': active,
    className: clsx('j-seg-btn', className),
    onClick: chainEvent(onClick, () => { if (!active) tabs.select(value); }),
  };
  return triggerElement({ ...triggerProps, asChild, render, children }, forwardedRef);
});

function TabPanel({ value, keepMounted, children, ...props }: DivProps & { value: string; keepMounted?: boolean }) {
  const tabs = useSlot(TabsContext, 'Tabs.Panel');
  const id = tabs.id + '-' + encodeURIComponent(value);
  const active = value === tabs.value;
  return (
    <div {...props} role="tabpanel" id={id + '-panel'} aria-labelledby={id + '-tab'} tabIndex={0} hidden={!active}>
      {(active || (keepMounted ?? tabs.keepMounted)) && children}
    </div>
  );
}
export const Tabs = { Root: TabsRoot, List: TabList, Trigger: TabTrigger, Panel: TabPanel };

// Toast store. Timers belong to the manager so multiple subscribers see one expiry.
type ToastAction = { label: string; onClick: () => void };
export type ToastOptions = {
  title: ReactNode;
  description?: ReactNode;
  tone?: 'neutral' | 'ok' | 'warn' | 'danger' | 'signal';
  duration?: number;
  action?: ToastAction | ReactNode;
  closeLabel?: string;
};
type ToastRecord = Readonly<ToastOptions & { id: string }>;
export function createToastManager() {
  let records: readonly ToastRecord[] = [];
  let sequence = 0;
  const listeners = new Set<() => void>();
  const timers = new Map<string, ReturnType<typeof setTimeout>>();
  function publish(next: readonly ToastRecord[]) {
    records = next;
    listeners.forEach(listener => listener());
  }
  function clearTimer(id: string) { clearTimeout(timers.get(id)); timers.delete(id); }
  function dismiss(id?: string) {
    const next = id === undefined ? [] : records.filter(toast => toast.id !== id);
    if (next.length === records.length) return;
    if (id === undefined) timers.forEach((_timer, key) => clearTimer(key));
    else clearTimer(id);
    publish(next);
  }
  function schedule(id: string, duration = 5000) {
    clearTimer(id);
    if (duration > 0 && Number.isFinite(duration)) timers.set(id, setTimeout(() => dismiss(id), duration));
  }
  return {
    add(options: ToastOptions) {
      const id = 'toast-' + ++sequence;
      schedule(id, options.duration);
      publish([...records, { ...options, id }]);
      return id;
    },
    update(id: string, patch: Partial<ToastOptions>) {
      if (!records.some(record => record.id === id)) return;
      if ('duration' in patch) schedule(id, patch.duration);
      publish(records.map(record => record.id === id ? { ...record, ...patch, id } : record));
    },
    dismiss,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    getSnapshot: () => records,
  };
}
export type ToastManager = ReturnType<typeof createToastManager>;
const ToastContext = createContext<ToastManager | null>(null);
export function ToastProvider({ manager, children }: { manager?: ToastManager; children?: ReactNode }) {
  const [local] = useState(createToastManager);
  return <ToastContext.Provider value={manager ?? local}>{children}</ToastContext.Provider>;
}
export function useToastManager() { return useSlot(ToastContext, 'useToastManager'); }

type ToastPlacement = `${'top' | 'bottom'}-${'left' | 'center' | 'right'}`;
function isToastAction(action: ToastOptions['action']): action is ToastAction {
  return typeof action === 'object' && action !== null && 'label' in action && 'onClick' in action;
}
export function ToastViewport({ placement = 'bottom-right', closeLabel = 'Dismiss', sound = false, className, style, ...props }:
  DivProps & { placement?: ToastPlacement; closeLabel?: string; sound?: boolean }) {
  const manager = useToastManager();
  const records = useSyncExternalStore(manager.subscribe, manager.getSnapshot, manager.getSnapshot);
  const { playSound } = useJuice();
  const previous = useRef(records);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (sound && records.some(record => !previous.current.some(old => old.id === record.id))) playSound('pop');
    previous.current = records;
  }, [records, sound, playSound]);
  useEffect(() => {
    const doc = ref.current?.ownerDocument;
    if (!doc || !records.length) return;
    const escape = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      const target = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-toast-id]') : null;
      if (!ref.current?.contains(target) && openLayers.get(doc)?.length) return;
      event.preventDefault();
      manager.dismiss(target?.dataset.toastId ?? records.at(-1)?.id);
    };
    doc.addEventListener('keydown', escape);
    return () => doc.removeEventListener('keydown', escape);
  }, [manager, records]);
  return (
    <div
      {...props}
      ref={ref}
      aria-live="polite"
      aria-relevant="additions text"
      data-placement={placement}
      className={clsx('j-toast-viewport', className)}
      style={style}
    >
      {records.map(({ id, title, description, tone = 'neutral', action, closeLabel: label }) => (
        <div key={id} data-toast-id={id} data-tone={tone} className="j-toast-item j-toast-card">
          <div className="j-toast-body">
            <strong className="j-toast-title" data-tone={tone}>{title}</strong>
            {description != null && <div className="j-toast-desc">{description}</div>}
          </div>
          {isToastAction(action) ? <button type="button" className="j-chip" onClick={action.onClick}>{action.label}</button> : action}
          <button type="button" className="j-chip" aria-label={label ?? closeLabel} onClick={() => manager.dismiss(id)}>
            <X size={14} aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  );
}

// Semantic table slots styled via `.j-table*` CSS classes (zero visual inline styles).
function tableSlot<Tag extends 'table' | 'thead' | 'tbody' | 'tfoot' | 'tr' | 'th' | 'td' | 'caption'>(
  tag: Tag,
  baseClass: string,
) {
  return forwardRef<HTMLElementTagNameMap[Tag], ComponentPropsWithoutRef<Tag>>(function TableSlot(
    { className, ...props },
    ref,
  ) {
    return createElement(tag, { ...props, ref, className: clsx(baseClass, className) });
  });
}

export const Table = {
  Root: tableSlot('table', 'j-table'),
  Header: tableSlot('thead', 'j-table-header'),
  Body: tableSlot('tbody', 'j-table-body'),
  Footer: tableSlot('tfoot', 'j-table-footer'),
  Row: tableSlot('tr', 'j-table-row'),
  Head: tableSlot('th', 'j-table-head'),
  Cell: tableSlot('td', 'j-table-cell'),
  Caption: tableSlot('caption', 'j-table-caption'),
};

// Avatar (zero inline styles for named sizes; CSS handles xs/sm/md/lg cleanly)
type AvatarStatus = 'idle' | 'loading' | 'loaded' | 'error';
const AvatarContext = createContext<{ status: AvatarStatus; setStatus: (status: AvatarStatus) => void } | null>(null);
type AvatarSizeName = 'xs' | 'sm' | 'md' | 'lg';

function AvatarRoot({ size = 'md', className, style, children, ...props }:
  HTMLAttributes<HTMLSpanElement> & { size?: AvatarSizeName | number }) {
  const [status, setStatus] = useState<AvatarStatus>('idle');
  const numericStyle: CSSProperties | undefined = typeof size === 'number'
    ? { width: size, height: size, fontSize: size * 0.38, ...style }
    : style;
  return (
    <AvatarContext.Provider value={{ status, setStatus }}>
      <span
        {...props}
        className={clsx('j-avatar', 'j-avatar-root', className)}
        data-size={typeof size === 'string' ? size : undefined}
        data-status={status}
        style={numericStyle}
      >
        {children}
      </span>
    </AvatarContext.Provider>
  );
}

function AvatarImage({ src, srcSet, alt = '', onLoad, onError, className, style, ...props }: ComponentPropsWithoutRef<'img'>) {
  const { status, setStatus } = useSlot(AvatarContext, 'Avatar.Image');
  const ref = useRef<HTMLImageElement>(null);
  useIsomorphicLayoutEffect(() => {
    const image = ref.current;
    if (!image) setStatus('idle');
    else if (!image.complete) setStatus('loading');
    else setStatus(image.naturalWidth ? 'loaded' : 'error');
    return () => setStatus('idle');
  }, [src, srcSet, setStatus]);
  if (!src && !srcSet) return null;
  return (
    <img
      {...props}
      key={JSON.stringify([src, srcSet])}
      ref={ref}
      alt={alt}
      src={src || undefined}
      srcSet={srcSet}
      className={clsx('j-avatar-img', className)}
      data-loaded={status === 'loaded' ? 'true' : undefined}
      onLoad={e => { setStatus('loaded'); onLoad?.(e); }}
      onError={e => { setStatus('error'); onError?.(e); }}
      style={style}
    />
  );
}

function AvatarFallback(props: HTMLAttributes<HTMLSpanElement>) {
  return useSlot(AvatarContext, 'Avatar.Fallback').status === 'loaded' ? null : <span {...props} />;
}

export const Avatar = { Root: AvatarRoot, Image: AvatarImage, Fallback: AvatarFallback };

// Chart adapters accept the payload shape directly, without a chart-library dependency.
type ChartValue = number | string | ReadonlyArray<number | string>;
type SeriesEntry = {
  name?: string | number; dataKey?: unknown; value?: ChartValue; color?: string; fill?: string;
  type?: string; payload?: unknown;
};
type ChartConfig = Record<string, { label?: ReactNode; color?: string }>;
type ChartProps = Pick<DivProps, 'className' | 'style'> & {
  active?: boolean; payload?: readonly SeriesEntry[]; label?: ReactNode; config?: ChartConfig;
  indicator?: 'dot' | 'line' | 'dashed';
};
function seriesDisplay(entry: SeriesEntry, config: ChartConfig | undefined, fallbackLabel: ReactNode) {
  const key = String(entry.dataKey ?? entry.name ?? entry.value ?? '');
  const series = config?.[key] ?? config?.[String(entry.name ?? entry.value ?? '')];
  return {
    key,
    label: series?.label ?? fallbackLabel ?? key,
    color: series?.color ?? entry.color ?? entry.fill ?? 'var(--juice-signal)',
  };
}
function Indicator({ kind, color }: { kind: ChartProps['indicator']; color: string }) {
  return (
    <span
      aria-hidden="true"
      style={kind === 'dashed'
        ? { width: 12, borderTop: '2px dashed ' + color }
        : { width: kind === 'line' ? 12 : 8, height: kind === 'line' ? 3 : 8, borderRadius: 4, background: color }}
    />
  );
}
const seriesRow: CSSProperties = { display: 'flex', gap: 7, alignItems: 'center' };
export function ChartTooltipContent({ active = true, payload, label, config, indicator = 'dot', formatter,
  className, style }: ChartProps & {
  formatter?: (value: ChartValue | undefined, name: string | number, entry: SeriesEntry, index: number,
    payload: readonly SeriesEntry[]) => ReactNode;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className={clsx('j-slab', className)} style={{ display: 'grid', gap: 5, padding: '8px 12px', ...style }}>
      {label != null && <strong>{label}</strong>}
      {payload.map((entry, i) => {
        if (entry.type === 'none') return null;
        const series = seriesDisplay(entry, config, entry.name);
        const formatted = formatter?.(entry.value, entry.name ?? series.key, entry, i, payload);
        const tuple = Array.isArray(formatted) && formatted.length === 2;
        return (
          <div key={series.key + i} style={seriesRow}>
            <Indicator kind={indicator} color={series.color} />
            <span>{tuple ? formatted[1] : series.label}</span>
            <span style={{ marginInlineStart: 'auto', fontVariantNumeric: 'tabular-nums' }}>
              {tuple ? formatted[0] : formatted ?? (Array.isArray(entry.value) ? entry.value.join(' – ') : entry.value)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
export function ChartLegendContent({ active = true, payload, label, config, indicator = 'dot', formatter,
  className, style }: ChartProps & {
  formatter?: (value: ChartValue | undefined, entry: SeriesEntry, index: number) => ReactNode;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className={className} style={{ ...seriesRow, flexWrap: 'wrap', gap: 12, ...style }}>
      {label != null && <strong>{label}</strong>}
      {payload.map((entry, i) => {
        if (entry.type === 'none') return null;
        const series = seriesDisplay(entry, config, entry.value ?? entry.name);
        return (
          <span key={series.key + i} style={seriesRow}>
            <Indicator kind={indicator} color={series.color} />{formatter?.(entry.value, entry, i) ?? series.label}
          </span>
        );
      })}
    </div>
  );
}

// Each visible slot is a native text input. The form receives one contiguous code.
type OtpState = {
  value: string; change: (value: string) => void; length: number; disabled: boolean; invalid: boolean;
  slots: RefObject<Map<number, HTMLInputElement>>;
};
const OtpContext = createContext<OtpState | null>(null);
function OtpRoot({ value, defaultValue = '', onValueChange, maxLength = 6, name, disabled = false, invalid = false, children, ...props }:
  DivProps & {
    value?: string; defaultValue?: string; onValueChange?: (value: string) => void;
    maxLength?: number; name?: string; disabled?: boolean; invalid?: boolean;
  }) {
  const [code, change] = useControllableState({ value, defaultValue, onChange: onValueChange });
  const slots = useRef(new Map<number, HTMLInputElement>());
  const length = Number.isFinite(maxLength) ? Math.max(1, Math.floor(maxLength)) : 6;
  const current = code.replace(/\D/g, '').slice(0, length);
  return (
    <OtpContext.Provider value={{ value: current, change, length, disabled, invalid, slots }}>
      <div role="group" aria-disabled={disabled || undefined} aria-invalid={invalid || undefined} {...props}>
        {children}
        {name && <input type="hidden" name={name} value={current} disabled={disabled} />}
      </div>
    </OtpContext.Provider>
  );
}
function OtpGroup({ className, style, ...props }: DivProps) {
  return (
    <div
      {...props}
      className={clsx('j-otp-grid', className)}
      style={{ gridTemplateColumns: 'none', gridAutoFlow: 'column', gridAutoColumns: 'minmax(0, 1fr)', ...style }}
    />
  );
}
function OtpSlot({ index, style, className, onChange, onFocus, onKeyDown, onPaste, ...props }:
  Omit<ComponentPropsWithoutRef<'input'>, 'value' | 'defaultValue' | 'name'> & { index: number }) {
  const { value, change, length, slots, disabled, invalid } = useSlot(OtpContext, 'OtpInput.Slot');
  const setRef = useCallback((node: HTMLInputElement | null) => {
    if (node) slots.current.set(index, node);
    else slots.current.delete(index);
  }, [slots, index]);
  const start = Math.min(index, value.length);
  const focus = (at: number) => {
    const slot = slots.current.get(Math.min(length - 1, Math.max(0, at)));
    slot?.focus();
    slot?.select();
  };
  const insert = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, length - start);
    if (!digits) return;
    change((value.slice(0, start) + digits + value.slice(start + digits.length)).slice(0, length));
    focus(start + digits.length);
  };
  if (index < 0 || index >= length) return null;
  return (
    <input
      type="text"
      inputMode="numeric"
      autoComplete={index === 0 ? 'one-time-code' : 'off'}
      aria-label={`Digit ${index + 1} of ${length}`}
      {...props}
      ref={setRef}
      value={value[index] ?? ''}
      disabled={disabled || props.disabled}
      aria-invalid={invalid || props['aria-invalid']}
      className={clsx('j-otp-slot', className)}
      data-filled={Boolean(value[index])}
      style={{ minWidth: 0, ...style }}
      onFocus={chainEvent(onFocus, event => event.currentTarget.select())}
      onPaste={chainEvent(onPaste, event => { event.preventDefault(); insert(event.clipboardData.getData('text')); })}
      onChange={chainEvent(onChange, event => {
        const text = event.currentTarget.value;
        if (!text) change(value.slice(0, start) + value.slice(start + 1));
        else {
          const native = event.nativeEvent as InputEvent;
          insert(native.inputType === 'insertText' && native.data?.length === 1 ? native.data : text);
        }
      })}
      onKeyDown={chainEvent(onKeyDown, event => {
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
          event.preventDefault();
          focus(index + (event.key === 'ArrowLeft' ? -1 : 1));
        } else if (event.key === 'Backspace') {
          event.preventDefault();
          const remove = value[index] ? index : Math.max(0, start - 1);
          change(value.slice(0, remove) + value.slice(remove + 1));
          focus(Math.max(0, Math.min(index - 1, remove)));
        }
      })}
    />
  );
}
function OtpSeparator({ children = '–', ...props }: HTMLAttributes<HTMLSpanElement>) {
  return <span aria-hidden="true" {...props}>{children}</span>;
}
export const OtpInput = { Root: OtpRoot, Group: OtpGroup, Slot: OtpSlot, Separator: OtpSeparator };

// Accordion
type SingleAccordion = { type?: 'single'; value?: string; defaultValue?: string; onValueChange?: (value: string) => void };
type MultiAccordion = { type: 'multiple'; value?: string[]; defaultValue?: string[]; onValueChange?: (value: string[]) => void };
type AccordionProps = DivProps & (SingleAccordion | MultiAccordion) & { collapsible?: boolean; disabled?: boolean };
const AccordionContext = createContext<{
  expanded: readonly string[]; toggle: (value: string) => void; locked: boolean; disabled: boolean;
} | null>(null);
const AccordionItemContext = createContext<{
  id: string; value: string; expanded: boolean; disabled: boolean;
} | null>(null);
function AccordionRoot(options: AccordionProps) {
  const { type = 'single', value, defaultValue, onValueChange, collapsible = false, disabled = false,
    onKeyDown, style, ...props } = options;
  const [current, change] = useControllableState<string | string[]>({
    value,
    defaultValue: defaultValue ?? (type === 'multiple' ? [] : ''),
    onChange: next => {
      if (options.type === 'multiple' && Array.isArray(next)) options.onValueChange?.(next);
      if (options.type !== 'multiple' && typeof next === 'string') options.onValueChange?.(next);
    },
  });
  const expanded = Array.isArray(current) ? current : current ? [current] : [];
  const locked = type === 'single' && !collapsible;
  const toggle = (key: string) => {
    if (type === 'multiple') change(expanded.includes(key) ? expanded.filter(item => item !== key) : [...expanded, key]);
    else if (!expanded.includes(key)) change(key);
    else if (collapsible) change('');
  };
  return (
    <AccordionContext.Provider value={{ expanded, toggle, locked, disabled }}>
      <div
        {...props}
        data-accordion-root=""
        style={{ display: 'grid', gap: 4, ...style }}
        onKeyDown={chainEvent(onKeyDown, event => {
          const nodes = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[data-accordion-trigger]:not(:disabled)'))
            .filter(node => node.closest('[data-accordion-root]') === event.currentTarget);
          moveFocus(event, nodes, 'vertical');
        })}
      />
    </AccordionContext.Provider>
  );
}
function AccordionItem({ value, disabled = false, className, ...props }: DivProps & { value: string; disabled?: boolean }) {
  const root = useSlot(AccordionContext, 'Accordion.Item');
  const id = useId();
  const expanded = root.expanded.includes(value);
  return (
    <AccordionItemContext.Provider value={{ id, value, expanded, disabled: root.disabled || disabled }}>
      <div {...props} className={clsx('j-acc-item', className)} data-state={expanded ? 'open' : 'closed'} />
    </AccordionItemContext.Provider>
  );
}
function AccordionHeader({ style, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 {...props} style={{ margin: 0, ...style }} />;
}
function AccordionTrigger({ onClick, className, disabled, ...props }: ButtonProps) {
  const root = useSlot(AccordionContext, 'Accordion.Trigger');
  const item = useSlot(AccordionItemContext, 'Accordion.Trigger');
  return (
    <button
      type="button"
      {...props}
      id={item.id + '-trigger'}
      data-accordion-trigger=""
      aria-expanded={item.expanded}
      aria-controls={item.id + '-panel'}
      disabled={disabled || item.disabled}
      aria-disabled={disabled || item.disabled || (item.expanded && root.locked) || undefined}
      className={clsx('j-acc-trigger', className)}
      onClick={chainEvent(onClick, () => root.toggle(item.value))}
    />
  );
}
function AccordionPanel({ className, ...props }: DivProps) {
  const item = useSlot(AccordionItemContext, 'Accordion.Panel');
  const ref = useRef<HTMLDivElement>(null);
  const { animate } = useJuice();
  useIsomorphicLayoutEffect(() => {
    const node = ref.current;
    if (!node || !item.expanded || !animate || node.ownerDocument.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const animation = node.animate?.([{ opacity: 0, transform: 'translateY(-3px)' }, { opacity: 1, transform: 'none' }],
      { duration: 150, easing: 'ease-out' });
    return () => animation?.cancel();
  }, [item.expanded, animate]);
  return (
    <div
      {...props}
      ref={ref}
      id={item.id + '-panel'}
      role="region"
      aria-labelledby={item.id + '-trigger'}
      hidden={!item.expanded}
      className={clsx('j-acc-body', className)}
    />
  );
}
export const Accordion = { Root: AccordionRoot, Item: AccordionItem, Header: AccordionHeader, Trigger: AccordionTrigger, Panel: AccordionPanel };
