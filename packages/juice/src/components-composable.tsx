import {
  cloneElement, createContext, createElement, forwardRef, isValidElement, useCallback, useContext,
  useEffect, useId, useLayoutEffect, useRef, useState, useSyncExternalStore,
  type ButtonHTMLAttributes, type ComponentPropsWithoutRef, type Context, type CSSProperties,
  type HTMLAttributes, type KeyboardEvent, type ReactElement, type ReactNode, type Ref,
  type RefObject, type SyntheticEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { clsx } from 'clsx';
import { X } from 'lucide-react';
import { useControllableState, useJuice } from './behaviors.tsx';
import { placeFloating, type FloatingPlacement } from './components-portal-floating.tsx';

type DivProps = HTMLAttributes<HTMLDivElement>;
type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;
type Orientation = 'horizontal' | 'vertical';

const useClientLayout = typeof document === 'undefined' ? useEffect : useLayoutEffect;

function useSlot<T>(context: Context<T | null>, name: string): T {
  const value = useContext(context);
  if (value === null) throw new Error(`${name} requires its parent slot`);
  return value;
}

function itemsIn(root: HTMLElement, group: string, selector: string) {
  return Array.from(root.querySelectorAll<HTMLElement>(selector))
    .filter(item => item.closest(group) === root && !item.matches(':disabled,[aria-disabled="true"]'));
}

function moveFocus(event: KeyboardEvent, items: HTMLElement[], orientation: Orientation) {
  const index = items.indexOf(event.target as HTMLElement);
  if (index < 0 || event.defaultPrevented) return;
  const previous = orientation === 'horizontal' ? 'ArrowLeft' : 'ArrowUp';
  const next = orientation === 'horizontal' ? 'ArrowRight' : 'ArrowDown';
  let target: HTMLElement | undefined;
  switch (event.key) {
    case 'Home': target = items[0]; break;
    case 'End': target = items.at(-1); break;
    case previous: target = items[(index + items.length - 1) % items.length]; break;
    case next: target = items[(index + 1) % items.length]; break;
    default: return;
  }
  event.preventDefault();
  target?.focus();
  return target;
}

// Dialog, Sheet and DropdownMenu share open state and document-level dismissal.
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
type Layer = {
  id: string;
  open: boolean;
  setOpen: (next: boolean) => void;
  pending: boolean;
  escape: boolean;
  outside: boolean;
  trigger: RefObject<HTMLElement | null>;
  surface: RefObject<HTMLDivElement | null>;
  initialFocus: RefObject<'first' | 'last'>;
  parent: Layer | null;
  depth: number;
  kind: 'dialog' | 'sheet' | 'menu';
  side?: Side;
};
const LayerContext = createContext<Layer | null>(null);

function LayerRoot({ kind, side, open, defaultOpen = false, onOpenChange, pending = false,
  dismissOnEscape = true, dismissOnOutsideClick = true, children,
}: OpenProps & Pick<Layer, 'kind' | 'side'>) {
  const parent = useContext(LayerContext);
  const [visible, change] = useControllableState({ value: open, defaultValue: defaultOpen, onChange: onOpenChange });
  const trigger = useRef<HTMLElement>(null);
  const surface = useRef<HTMLDivElement>(null);
  const initialFocus = useRef<'first' | 'last'>('first');
  const id = useId();
  const setOpen = (next: boolean) => { if (next || !pending) change(next); };
  return <LayerContext.Provider value={{ id, open: visible, setOpen, pending, trigger, surface, initialFocus,
    escape: dismissOnEscape, outside: dismissOnOutsideClick, parent, depth: (parent?.depth ?? -1) + 1, kind, side }}>
    {children}
  </LayerContext.Provider>;
}

function LayerPortal({ children, container }: { children?: ReactNode; container?: Element | null }) {
  const layer = useSlot(LayerContext, 'Portal');
  const marker = useRef<HTMLSpanElement>(null);
  const scope = useRef<HTMLDivElement>(null);
  const [host, setHost] = useState<Element | null>(null);
  const { theme, fill, animate } = useJuice();
  useClientLayout(() => {
    const doc = marker.current?.ownerDocument;
    if (!doc || !layer.open) return;
    const sync = () => setHost(doc.fullscreenElement ?? container ?? doc.body);
    sync();
    doc.addEventListener('fullscreenchange', sync);
    return () => doc.removeEventListener('fullscreenchange', sync);
  }, [container, layer.open]);
  useClientLayout(() => {
    const source = marker.current;
    const wrapper = scope.current;
    const computed = source && source.ownerDocument.defaultView?.getComputedStyle(source);
    if (!computed || !wrapper) return;
    // A portal can leave a locally themed slab, even without a JuiceProvider.
    for (const name of computed) {
      if (name.startsWith('--juice-') || name.startsWith('--fill-')) {
        wrapper.style.setProperty(name, computed.getPropertyValue(name));
      }
    }
    wrapper.style.direction = computed.direction;
  }, [host, layer.open, theme, fill]);
  return <>
    <span hidden ref={marker} />
    {layer.open && host && createPortal(
      <div ref={scope} className="juice-root" style={{ display: 'contents' }} data-theme={theme} data-tone={fill}
        data-fill={fill === 'solid' ? 'dark' : theme} data-animate={animate ? 'on' : 'off'}>{children}</div>, host)}
  </>;
}

type TriggerProps = ButtonProps & {
  asChild?: boolean;
  render?: ReactElement | ((props: ButtonProps & { ref: Ref<HTMLButtonElement> }) => ReactElement);
};
type SlottedButton = ButtonProps & { ref?: Ref<HTMLButtonElement> };

function assignRef<T>(ref: Ref<T> | undefined, value: T | null) {
  if (typeof ref === 'function') return ref(value);
  if (ref) ref.current = value;
}

function after<E extends SyntheticEvent>(first?: (event: E) => void, second?: (event: E) => void) {
  return (event: E) => { first?.(event); if (!event.defaultPrevented) second?.(event); };
}

function triggerElement({ asChild, render, children, ...props }: TriggerProps, ref: Ref<HTMLButtonElement>) {
  if (typeof render === 'function') return render({ type: 'button', ...props, children, ref });
  const element = asChild ? children : render;
  if (element === undefined) return <button type="button" {...props} ref={ref}>{children}</button>;
  if (!isValidElement<SlottedButton>(element)) throw new Error('Trigger requires a single element');
  const child = element.props;
  // React 18 keeps ref on the element, React 19 exposes it as a prop.
  const childRef = Object.getOwnPropertyDescriptor(child, 'ref')?.value ??
    Object.getOwnPropertyDescriptor(element, 'ref')?.value;
  return cloneElement(element, {
    ...props, ...child, 'aria-haspopup': props['aria-haspopup'], 'aria-expanded': props['aria-expanded'],
    'aria-controls': props['aria-controls'], disabled: props.disabled || child.disabled,
    type: child.type ?? props.type ?? (element.type === 'button' ? 'button' : undefined),
    children: asChild ? child.children : children ?? child.children, className: clsx(props.className, child.className),
    style: { ...props.style, ...child.style }, onClick: after(child.onClick, props.onClick),
    onKeyDown: after(child.onKeyDown, props.onKeyDown),
    ref: node => {
      const cleanup = assignRef(childRef, node);
      const release = assignRef(ref, node);
      if (cleanup || release) return () => {
        if (cleanup) cleanup(); else assignRef(childRef, null);
        if (release) release(); else assignRef(ref, null);
      };
    },
  });
}

const LayerTrigger = forwardRef<HTMLButtonElement, TriggerProps>(function LayerTrigger(
  { onClick, onKeyDown, disabled, ...props }, forwardedRef,
) {
  const layer = useSlot(LayerContext, 'Trigger');
  const menu = layer.kind === 'menu';
  return triggerElement({
    id: layer.id + '-trigger', ...props, disabled, 'aria-haspopup': menu ? 'menu' : 'dialog', 'aria-expanded': layer.open,
    'aria-controls': layer.open ? layer.id : undefined,
    onClick: after(onClick, () => { if (!disabled) { layer.initialFocus.current = 'first'; layer.setOpen(!layer.open); } }),
    onKeyDown: after(onKeyDown, event => {
      const submenu = layer.parent?.kind === 'menu';
      const opensMenu = submenu ? event.key === 'ArrowRight' : event.key === 'ArrowDown' || event.key === 'ArrowUp';
      if (disabled || !menu || !opensMenu) return;
      event.preventDefault();
      layer.initialFocus.current = event.key === 'ArrowUp' ? 'last' : 'first';
      layer.setOpen(true);
    }),
  }, node => { layer.trigger.current = node; return assignRef(forwardedRef, node); });
});

const focusableSelector = 'button:not(:disabled), a[href], input:not(:disabled):not([type="hidden"]), select:not(:disabled), textarea:not(:disabled), [tabindex]';
const menuItems = (node: HTMLElement) => itemsIn(node, '[role="menu"]', '[role="menuitem"]');
const openLayers = new WeakMap<Document, HTMLElement[]>();

function useLayerInteraction(layer: Layer) {
  const latest = useRef(layer);
  useClientLayout(() => { latest.current = layer; });
  useClientLayout(() => {
    const node = layer.surface.current;
    if (!layer.open || !node) return;
    const doc = node.ownerDocument;
    const menu = layer.kind === 'menu';
    const returnTo = [layer.trigger.current ?? doc.activeElement as HTMLElement | null];
    for (let ancestor = layer.parent; ancestor; ancestor = ancestor.parent) {
      returnTo.push(ancestor.trigger.current);
    }
    const stack = openLayers.get(doc) ?? [];
    openLayers.set(doc, stack);
    stack.push(node);
    const tabbables = () => Array.from(node.querySelectorAll<HTMLElement>(focusableSelector))
      .filter(el => el.tabIndex >= 0 && el.getClientRects().length && !el.closest('[inert],[hidden]'));
    const initial = menu ? menuItems(node).at(layer.initialFocus.current === 'last' ? -1 : 0) : tabbables()[0];
    (initial ?? node).focus({ preventScroll: true });
    const top = () => stack.at(-1) === node;
    const keydown = (event: globalThis.KeyboardEvent) => {
      if (!top() || event.defaultPrevented) return;
      const current = latest.current;
      if (event.key === 'Escape') {
        event.preventDefault();
        if (current.escape) current.setOpen(false);
      } else if (!menu && event.key === 'Tab') {
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
      const current = latest.current;
      if (!top() || !current.outside || event.composedPath().includes(node) ||
          (current.trigger.current && event.composedPath().includes(current.trigger.current))) return;
      current.setOpen(false);
      // A portalled submenu is outside its parent in the DOM. Walk the logical
      // menu tree so one outside click dismisses just the levels it left.
      if (current.kind === 'menu' && !current.pending) {
        for (let parent = current.parent; parent?.kind === 'menu'; parent = parent.parent) {
          if (!parent.outside || parent.pending || (parent.surface.current && event.composedPath().includes(parent.surface.current)) ||
              (parent.trigger.current && event.composedPath().includes(parent.trigger.current))) break;
          parent.setOpen(false);
        }
      }
    };
    const focus = (event: FocusEvent) => {
      if (!top() || event.composedPath().includes(node)) return;
      if (!menu) (tabbables()[0] ?? node).focus();
    };
    doc.addEventListener('keydown', keydown);
    doc.addEventListener('click', outside, true);
    doc.addEventListener('focusin', focus);
    return () => {
      const wasTop = top();
      stack.splice(stack.indexOf(node), 1);
      doc.removeEventListener('keydown', keydown);
      doc.removeEventListener('click', outside, true);
      doc.removeEventListener('focusin', focus);
      if (wasTop) {
        const restore = () => returnTo.find(target => target?.isConnected)?.focus({ preventScroll: true });
        restore();
        // The immediate trigger can disappear later in this same React commit.
        queueMicrotask(() => { if (doc.activeElement === doc.body) restore(); });
      }
    };
  }, [layer.open, layer.kind, layer.surface, layer.trigger, layer.initialFocus]);
}

type ModalLabels = { setTitle: (id?: string) => void; setDescription: (id?: string) => void };
const LabelContext = createContext<ModalLabels | null>(null);
function DialogRoot(props: OpenProps) { return <LayerRoot kind="dialog" {...props} />; }
function SheetRoot({ side = 'right', ...props }: OpenProps & { side?: Side }) {
  return <LayerRoot kind="sheet" side={side} {...props} />;
}

function Overlay({ style, ...props }: DivProps) {
  const layer = useSlot(LayerContext, 'Overlay');
  return layer.open ? <div aria-hidden={props.children == null || undefined} {...props} style={{ position: 'fixed', inset: 0,
    background: 'rgb(0 0 0 / 35%)', zIndex: 1000 + layer.depth * 2, ...style }} /> : null;
}
function sheetPosition(side: Side): CSSProperties {
  if (side === 'left' || side === 'right') return {
    top: 0, bottom: 0, [side]: 0, width: 'min(24rem, 100%)',
    borderRadius: side === 'left' ? '0 var(--juice-r-outer) var(--juice-r-outer) 0' : 'var(--juice-r-outer) 0 0 var(--juice-r-outer)',
  };
  return { left: 0, right: 0, [side]: 0,
    borderRadius: side === 'top' ? '0 0 var(--juice-r-outer) var(--juice-r-outer)' : 'var(--juice-r-outer) var(--juice-r-outer) 0 0' };
}
function ModalContent({ className, style, side, ...props }: DivProps & { side?: Side }) {
  const layer = useSlot(LayerContext, 'Content');
  useLayerInteraction(layer);
  const [title, setTitle] = useState<string>();
  const [description, setDescription] = useState<string>();
  if (!layer.open) return null;
  const edge = side ?? layer.side;
  const position: CSSProperties = edge ? sheetPosition(edge) : {
    top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 'min(28rem, calc(100% - 32px))',
  };
  return <LabelContext.Provider value={{ setTitle, setDescription }}>
    <div tabIndex={-1} aria-labelledby={props['aria-label'] ? undefined : title} aria-describedby={description}
      {...props} ref={layer.surface} id={layer.id} role="dialog" aria-modal="true" data-side={edge}
      aria-busy={layer.pending || undefined} className={clsx('j-slab', className)} style={{
        position: 'fixed', zIndex: 1001 + layer.depth * 2, display: 'grid', alignContent: 'start', gap: 14,
        maxHeight: '100dvh', overflow: 'auto', padding: 20, userSelect: 'text', ...position, ...style,
      }} />
  </LabelContext.Provider>;
}

function ModalTitle({ id, style, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  const { setTitle } = useSlot(LabelContext, 'Title');
  const generated = useId();
  const resolved = id ?? generated;
  useClientLayout(() => { setTitle(resolved); return () => setTitle(undefined); }, [setTitle, resolved]);
  return <h2 {...props} id={resolved} style={{ margin: 0, fontSize: '1.125rem', ...style }} />;
}
function ModalDescription({ id, style, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  const { setDescription } = useSlot(LabelContext, 'Description');
  const generated = useId();
  const resolved = id ?? generated;
  useClientLayout(() => { setDescription(resolved); return () => setDescription(undefined); }, [setDescription, resolved]);
  return <p {...props} id={resolved} style={{ margin: 0, color: 'var(--juice-soft)', ...style }} />;
}
function ModalHeader({ style, ...props }: DivProps) {
  return <div {...props} style={{ display: 'grid', gap: 6, ...style }} />;
}
function ModalFooter({ style, ...props }: DivProps) {
  return <div {...props} style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, ...style }} />;
}
function ModalClose({ disabled, onClick, className, ...props }: ButtonProps) {
  const layer = useSlot(LayerContext, 'Close');
  return <button type="button" {...props} className={clsx('j-chip', className)} disabled={disabled || layer.pending}
    onClick={after(onClick, () => layer.setOpen(false))} />;
}

export const Dialog = { Root: DialogRoot, Trigger: LayerTrigger, Portal: LayerPortal, Overlay, Content: ModalContent,
  Header: ModalHeader, Title: ModalTitle, Description: ModalDescription, Footer: ModalFooter, Close: ModalClose };
export const Sheet = { ...Dialog, Root: SheetRoot };

function MenuRoot(props: OpenProps) { return <LayerRoot {...props} kind="menu" />; }

function closeMenu(layer: Layer) {
  let current: Layer | null = layer;
  while (current?.kind === 'menu') {
    current.setOpen(false);
    current = current.parent;
  }
}
function MenuContent({ placement, onKeyDown, className, style, ...props }: DivProps & { placement?: FloatingPlacement }) {
  const layer = useSlot(LayerContext, 'MenuContent');
  const submenu = layer.parent?.kind === 'menu';
  const preferred = placement ?? (submenu ? 'right-start' : 'bottom-start');
  const { surface, trigger, open } = layer;
  useClientLayout(() => {
    const anchor = trigger.current;
    const node = surface.current;
    if (!open || !node || !anchor) return;
    const doc = node.ownerDocument;
    const win = doc.defaultView;
    if (!win) return;
    const position = () => {
      const { x, y, side } = placeFloating(anchor.getBoundingClientRect(), { width: node.offsetWidth, height: node.offsetHeight },
        { width: doc.documentElement.clientWidth, height: doc.documentElement.clientHeight }, preferred);
      Object.assign(node.style, { top: y + 'px', left: x + 'px' });
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
  }, [open, preferred, surface, trigger]);
  useLayerInteraction(layer);
  if (!open) return null;
  return <div aria-labelledby={props['aria-label'] ? undefined : trigger.current?.id || layer.id + '-trigger'}
    {...props} ref={surface} id={layer.id} role="menu" tabIndex={-1}
    className={clsx('j-floating-pop', 'j-menu-list', className)} style={{
      position: 'fixed', zIndex: 1001 + layer.depth * 2, minWidth: 'min(10rem, 95vw)',
      maxHeight: 'calc(100dvh - 16px)', maxWidth: 'calc(100vw - 16px)', overflowY: 'auto',
      animation: 'none', background: 'var(--fill-slab)', ...style,
    }}
    onKeyDown={after(onKeyDown, event => {
      if ((event.target as HTMLElement).closest('[role="menu"]') !== event.currentTarget) return;
      if (event.key === 'ArrowLeft' && submenu) {
        event.preventDefault();
        layer.setOpen(false);
      } else if (event.key === 'Tab') {
        closeMenu(layer);
      } else {
        moveFocus(event, menuItems(event.currentTarget), 'vertical');
      }
    })} />;
}
type MenuItemProps = Omit<ButtonProps, 'onSelect'> & {
  tone?: 'neutral' | 'danger'; onSelect?: (event: React.MouseEvent<HTMLButtonElement>) => void;
};
function MenuItem({ tone, disabled, onSelect, onClick, className, ...props }: MenuItemProps) {
  const layer = useSlot(LayerContext, 'MenuItem');
  return <button type="button" tabIndex={-1} {...props} role="menuitem" data-tone={tone} disabled={disabled}
    aria-disabled={disabled || undefined} className={clsx('j-menu-item', className)}
    onClick={after(onClick, after(onSelect, () => closeMenu(layer)))} />;
}
function SubTrigger({ className, ...props }: TriggerProps) {
  return <LayerTrigger {...props} className={clsx('j-menu-item', className)} role="menuitem" tabIndex={-1} />;
}
function MenuSeparator({ style, ...props }: DivProps) {
  return <div {...props} role="separator" style={{ height: 1, margin: '3px 6px', background: 'var(--juice-edge)', ...style }} />;
}
function MenuLabel({ style, ...props }: DivProps) {
  return <div {...props} style={{ padding: '5px 10px', fontSize: 12, color: 'var(--juice-mute)', ...style }} />;
}
function MenuGroup({ style, ...props }: DivProps) {
  return <div role="group" {...props} style={{ display: 'grid', gap: 2, ...style }} />;
}
export const DropdownMenu = { Root: MenuRoot, Trigger: LayerTrigger, Portal: LayerPortal, Content: MenuContent,
  Item: MenuItem, Separator: MenuSeparator, Label: MenuLabel, Group: MenuGroup, Sub: MenuRoot,
  SubTrigger, SubContent: MenuContent };

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
  const [current, setCurrent] = useControllableState<string | undefined>({ value, defaultValue,
    onChange: next => { if (next !== undefined) onValueChange?.(next); } });
  return <TabsContext.Provider value={{ id: id ?? generated, value: current, select: setCurrent, keepMounted, orientation }}>
    <div {...props} id={id ?? generated} />
  </TabsContext.Provider>;
}
function TabList({ className, style, onKeyDown, ...props }: DivProps) {
  const tabs = useSlot(TabsContext, 'Tabs.List');
  const ref = useRef<HTMLDivElement>(null);
  useClientLayout(() => {
    if (tabs.value === undefined && ref.current) {
      const first = itemsIn(ref.current, '[role="tablist"]', '[role="tab"]')[0]?.dataset.value;
      if (first !== undefined) tabs.select(first);
    }
  }, [tabs]);
  return <div {...props} ref={ref} role="tablist" aria-orientation={tabs.orientation}
    className={clsx('j-seg', className)} style={{ flexDirection: tabs.orientation === 'vertical' ? 'column' : 'row', ...style }}
    onKeyDown={after(onKeyDown, event => {
      const target = moveFocus(event, itemsIn(event.currentTarget, '[role="tablist"]', '[role="tab"]'), tabs.orientation);
      const next = target?.dataset.value;
      if (next !== undefined && next !== tabs.value) tabs.select(next);
    })} />;
}
function TabTrigger({ value, onClick, className, ...props }: ButtonProps & { value: string }) {
  const tabs = useSlot(TabsContext, 'Tabs.Trigger');
  const id = tabs.id + '-' + encodeURIComponent(value);
  const active = tabs.value === value;
  return <button type="button" {...props} role="tab" id={id + '-tab'} aria-controls={id + '-panel'}
    aria-selected={active} tabIndex={active ? 0 : -1} data-value={value} data-active={active}
    className={clsx('j-seg-btn', className)} onClick={after(onClick, () => { if (!active) tabs.select(value); })} />;
}
function TabPanel({ value, keepMounted, children, ...props }: DivProps & { value: string; keepMounted?: boolean }) {
  const tabs = useSlot(TabsContext, 'Tabs.Panel');
  const id = tabs.id + '-' + encodeURIComponent(value);
  const active = value === tabs.value;
  return <div {...props} role="tabpanel" id={id + '-panel'} aria-labelledby={id + '-tab'} tabIndex={0} hidden={!active}>
    {(active || (keepMounted ?? tabs.keepMounted)) && children}
  </div>;
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
export function ToastViewport({ placement = 'bottom-right', closeLabel = 'Dismiss', sound = false, style, ...props }:
  DivProps & { placement?: ToastPlacement; closeLabel?: string; sound?: boolean }) {
  const manager = useToastManager();
  const records = useSyncExternalStore(manager.subscribe, manager.getSnapshot, manager.getSnapshot);
  const vertical = placement.startsWith('top') ? 'top' : 'bottom';
  const horizontal = placement.endsWith('left') ? 'left' : 'right';
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
  return <div {...props} ref={ref} aria-live="polite" aria-relevant="additions text" data-placement={placement}
    style={{ position: 'fixed', zIndex: 2000, [vertical]: 12,
      ...(placement.endsWith('center') ? { left: '50%', transform: 'translateX(-50%)' } : { [horizontal]: 12 }),
      width: 'min(22rem, calc(100vw - 24px))', display: 'grid', gap: 6, pointerEvents: 'none', ...style }}>
    {records.map(({ id, title, description, tone = 'neutral', action, closeLabel: label }) =>
      <div key={id} data-toast-id={id} data-tone={tone} className="j-toast-item"
        style={{ position: 'relative', pointerEvents: 'auto' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <strong style={{ color: tone === 'neutral' ? 'var(--fill-on)' : `var(--juice-${tone})` }}>{title}</strong>
          {description != null && <div style={{ color: 'var(--juice-soft)' }}>{description}</div>}
        </div>
        {isToastAction(action) ? <button type="button" className="j-chip" onClick={action.onClick}>{action.label}</button> : action}
        <button type="button" className="j-chip" aria-label={label ?? closeLabel} onClick={() => manager.dismiss(id)}>
          <X size={14} aria-hidden="true" />
        </button>
      </div>)}
  </div>;
}

// Semantic table slots preserve native attributes, including scope, colSpan and rowSpan.
function tableSlot<Tag extends 'table' | 'thead' | 'tbody' | 'tfoot' | 'th' | 'td' | 'caption'>(
  tag: Tag, defaults?: CSSProperties,
) {
  return forwardRef<HTMLElementTagNameMap[Tag], ComponentPropsWithoutRef<Tag>>(function TableSlot(props, ref) {
    return createElement(tag, { ...props, ref, style: { ...defaults, ...props.style } });
  });
}
const TableRow = forwardRef<HTMLTableRowElement, ComponentPropsWithoutRef<'tr'>>(function TableRow(
  { style, onPointerEnter, onPointerLeave, ...props }, ref,
) {
  const [hovered, setHovered] = useState(false);
  return <tr {...props} ref={ref} onPointerEnter={after(onPointerEnter, e => setHovered(e.pointerType !== 'touch'))}
    onPointerLeave={after(onPointerLeave, () => setHovered(false))}
    style={{ background: hovered ? 'var(--juice-w4)' : undefined, ...style }} />;
});
const cellStyle: CSSProperties = { padding: '8px 12px', textAlign: 'start', borderBottom: '1px solid var(--juice-edge)' };
export const Table = {
  Root: tableSlot('table', { width: '100%', borderCollapse: 'collapse', color: 'var(--fill-on)', fontVariantNumeric: 'tabular-nums' }),
  Header: tableSlot('thead', { background: 'var(--juice-w6)' }),
  Body: tableSlot('tbody'), Footer: tableSlot('tfoot', { background: 'var(--juice-w4)' }), Row: TableRow,
  Head: tableSlot('th', { ...cellStyle, fontWeight: 600 }), Cell: tableSlot('td', cellStyle),
  Caption: tableSlot('caption', { paddingBlock: 6, color: 'var(--juice-mute)', textAlign: 'start' }),
};

type AvatarStatus = 'idle' | 'loading' | 'loaded' | 'error';
const AvatarContext = createContext<{ status: AvatarStatus; setStatus: (status: AvatarStatus) => void } | null>(null);
const avatarSizes = { xs: 20, sm: 28, md: 36, lg: 48 };
function AvatarRoot({ size = 'md', className, style, children, ...props }:
  HTMLAttributes<HTMLSpanElement> & { size?: keyof typeof avatarSizes | number }) {
  const [status, setStatus] = useState<AvatarStatus>('idle');
  const pixels = typeof size === 'number' ? size : avatarSizes[size];
  return <AvatarContext.Provider value={{ status, setStatus }}>
    <span {...props} className={clsx('j-avatar', className)} data-status={status}
      style={{ width: pixels, height: pixels, fontSize: pixels * .38, overflow: 'hidden', margin: 0, boxShadow: 'none', ...style }}>
      {children}
    </span>
  </AvatarContext.Provider>;
}
function AvatarImage({ src, srcSet, alt = '', onLoad, onError, style, ...props }: ComponentPropsWithoutRef<'img'>) {
  const { status, setStatus } = useSlot(AvatarContext, 'Avatar.Image');
  const ref = useRef<HTMLImageElement>(null);
  useClientLayout(() => {
    const image = ref.current;
    if (!image) setStatus('idle');
    else if (!image.complete) setStatus('loading');
    else setStatus(image.naturalWidth ? 'loaded' : 'error');
    return () => setStatus('idle');
  }, [src, srcSet, setStatus]);
  if (!src && !srcSet) return null;
  return <img {...props} key={JSON.stringify([src, srcSet])} ref={ref} alt={alt} src={src || undefined} srcSet={srcSet}
    onLoad={e => { setStatus('loaded'); onLoad?.(e); }} onError={e => { setStatus('error'); onError?.(e); }}
    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
      ...style, visibility: status === 'loaded' ? style?.visibility : 'hidden' }} />;
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
  return { key, label: series?.label ?? fallbackLabel ?? key,
    color: series?.color ?? entry.color ?? entry.fill ?? 'var(--juice-signal)' };
}
function Indicator({ kind, color }: { kind: ChartProps['indicator']; color: string }) {
  return <span aria-hidden="true" style={kind === 'dashed'
    ? { width: 12, borderTop: '2px dashed ' + color }
    : { width: kind === 'line' ? 12 : 8, height: kind === 'line' ? 3 : 8, borderRadius: 4, background: color }} />;
}
const seriesRow: CSSProperties = { display: 'flex', gap: 7, alignItems: 'center' };
export function ChartTooltipContent({ active = true, payload, label, config, indicator = 'dot', formatter,
  className, style }: ChartProps & {
  formatter?: (value: ChartValue | undefined, name: string | number, entry: SeriesEntry, index: number,
    payload: readonly SeriesEntry[]) => ReactNode;
}) {
  if (!active || !payload?.length) return null;
  return <div className={clsx('j-slab', className)} style={{ display: 'grid', gap: 5, padding: '8px 12px', ...style }}>
    {label != null && <strong>{label}</strong>}
    {payload.map((entry, i) => {
      if (entry.type === 'none') return null;
      const series = seriesDisplay(entry, config, entry.name);
      const formatted = formatter?.(entry.value, entry.name ?? series.key, entry, i, payload);
      // Recharts formatters may return [formattedValue, formattedName].
      const tuple = Array.isArray(formatted) && formatted.length === 2;
      return <div key={series.key + i} style={seriesRow}><Indicator kind={indicator} color={series.color} />
        <span>{tuple ? formatted[1] : series.label}</span>
        <span style={{ marginInlineStart: 'auto', fontVariantNumeric: 'tabular-nums' }}>
          {tuple ? formatted[0] : formatted ?? (Array.isArray(entry.value) ? entry.value.join(' – ') : entry.value)}
        </span>
      </div>;
    })}
  </div>;
}
export function ChartLegendContent({ active = true, payload, label, config, indicator = 'dot', formatter,
  className, style }: ChartProps & {
  formatter?: (value: ChartValue | undefined, entry: SeriesEntry, index: number) => ReactNode;
}) {
  if (!active || !payload?.length) return null;
  return <div className={className} style={{ ...seriesRow, flexWrap: 'wrap', gap: 12, ...style }}>
    {label != null && <strong>{label}</strong>}
    {payload.map((entry, i) => {
      if (entry.type === 'none') return null;
      const series = seriesDisplay(entry, config, entry.value ?? entry.name);
      return <span key={series.key + i} style={seriesRow}>
        <Indicator kind={indicator} color={series.color} />{formatter?.(entry.value, entry, i) ?? series.label}
      </span>;
    })}
  </div>;
}

// Each visible slot is a native text input. The form receives one contiguous code.
type OtpState = {
  value: string; change: (value: string) => void; length: number; disabled: boolean; invalid: boolean;
  slots: RefObject<Map<number, HTMLInputElement>>;
};
const OtpContext = createContext<OtpState | null>(null);
function OtpRoot({ value, defaultValue = '', onValueChange, maxLength = 6, name, disabled = false, invalid = false, children, ...props }:
  DivProps & { value?: string; defaultValue?: string; onValueChange?: (value: string) => void;
    maxLength?: number; name?: string; disabled?: boolean; invalid?: boolean }) {
  const [code, change] = useControllableState({ value, defaultValue, onChange: onValueChange });
  const slots = useRef(new Map<number, HTMLInputElement>());
  const length = Number.isFinite(maxLength) ? Math.max(1, Math.floor(maxLength)) : 6;
  const current = code.replace(/\D/g, '').slice(0, length);
  return <OtpContext.Provider value={{ value: current, change, length, disabled, invalid, slots }}>
    <div role="group" aria-disabled={disabled || undefined} aria-invalid={invalid || undefined} {...props}>
      {children}
      {name && <input type="hidden" name={name} value={current} disabled={disabled} />}
    </div>
  </OtpContext.Provider>;
}
function OtpGroup({ className, style, ...props }: DivProps) {
  return <div {...props} className={clsx('j-otp-grid', className)}
    style={{ gridTemplateColumns: 'none', gridAutoFlow: 'column', gridAutoColumns: 'minmax(0, 1fr)', ...style }} />;
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
  return <input type="text" inputMode="numeric" autoComplete={index === 0 ? 'one-time-code' : 'off'}
    aria-label={`Digit ${index + 1} of ${length}`} {...props} ref={setRef} value={value[index] ?? ''}
    disabled={disabled || props.disabled} aria-invalid={invalid || props['aria-invalid']} className={clsx('j-otp-slot', className)}
    data-filled={Boolean(value[index])} style={{ minWidth: 0, ...style }}
    onFocus={after(onFocus, event => event.currentTarget.select())}
    onPaste={after(onPaste, event => { event.preventDefault(); insert(event.clipboardData.getData('text')); })}
    onChange={after(onChange, event => {
      const text = event.currentTarget.value;
      if (!text) change(value.slice(0, start) + value.slice(start + 1));
      else {
        const native = event.nativeEvent as InputEvent;
        insert(native.inputType === 'insertText' && native.data?.length === 1 ? native.data : text);
      }
    })}
    onKeyDown={after(onKeyDown, event => {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        focus(index + (event.key === 'ArrowLeft' ? -1 : 1));
      } else if (event.key === 'Backspace') {
        event.preventDefault();
        const remove = value[index] ? index : Math.max(0, start - 1);
        change(value.slice(0, remove) + value.slice(remove + 1));
        focus(Math.max(0, Math.min(index - 1, remove)));
      }
    })} />;
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
    value, defaultValue: defaultValue ?? (type === 'multiple' ? [] : ''),
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
  return <AccordionContext.Provider value={{ expanded, toggle, locked, disabled }}>
    <div {...props} data-accordion-root="" style={{ display: 'grid', gap: 4, ...style }} onKeyDown={after(onKeyDown, event => {
      const nodes = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[data-accordion-trigger]:not(:disabled)'))
        .filter(node => node.closest('[data-accordion-root]') === event.currentTarget);
      moveFocus(event, nodes, 'vertical');
    })} />
  </AccordionContext.Provider>;
}
function AccordionItem({ value, disabled = false, className, ...props }: DivProps & { value: string; disabled?: boolean }) {
  const root = useSlot(AccordionContext, 'Accordion.Item');
  const id = useId();
  const expanded = root.expanded.includes(value);
  return <AccordionItemContext.Provider value={{ id, value, expanded, disabled: root.disabled || disabled }}>
    <div {...props} className={clsx('j-acc-item', className)} data-state={expanded ? 'open' : 'closed'} />
  </AccordionItemContext.Provider>;
}
function AccordionHeader({ style, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 {...props} style={{ margin: 0, ...style }} />;
}
function AccordionTrigger({ onClick, className, disabled, ...props }: ButtonProps) {
  const root = useSlot(AccordionContext, 'Accordion.Trigger');
  const item = useSlot(AccordionItemContext, 'Accordion.Trigger');
  return <button type="button" {...props} id={item.id + '-trigger'} data-accordion-trigger=""
    aria-expanded={item.expanded} aria-controls={item.id + '-panel'} disabled={disabled || item.disabled}
    aria-disabled={disabled || item.disabled || (item.expanded && root.locked) || undefined} className={clsx('j-acc-trigger', className)}
    onClick={after(onClick, () => root.toggle(item.value))} />;
}
function AccordionPanel({ className, ...props }: DivProps) {
  const item = useSlot(AccordionItemContext, 'Accordion.Panel');
  const ref = useRef<HTMLDivElement>(null);
  const { animate } = useJuice();
  useClientLayout(() => {
    const node = ref.current;
    if (!node || !item.expanded || !animate || node.ownerDocument.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const animation = node.animate?.([{ opacity: 0, transform: 'translateY(-3px)' }, { opacity: 1, transform: 'none' }],
      { duration: 150, easing: 'ease-out' });
    return () => animation?.cancel();
  }, [item.expanded, animate]);
  return <div {...props} ref={ref} id={item.id + '-panel'} role="region" aria-labelledby={item.id + '-trigger'}
    hidden={!item.expanded} className={clsx('j-acc-body', className)} />;
}
export const Accordion = { Root: AccordionRoot, Item: AccordionItem, Header: AccordionHeader, Trigger: AccordionTrigger, Panel: AccordionPanel };
