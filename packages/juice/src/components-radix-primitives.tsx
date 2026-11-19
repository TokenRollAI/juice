import {
  createContext, useContext, useEffect, useId, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState,
  type ButtonHTMLAttributes, type CSSProperties, type KeyboardEvent, type LabelHTMLAttributes,
  type PointerEvent, type ReactNode, type Ref,
} from 'react';
import {
  AlignCenter, AlignLeft, AlignRight, ArrowUpRight, Bold, Check, ChevronDown, Copy, Grid, Italic,
  Maximize2, MousePointerClick, Pin, RefreshCw, ShieldAlert, Trash2, Underline,
} from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { useControllableState, useJuice, useJuiceAgentNode, useRovingFocus } from './behaviors.tsx';
import { Badge, Checkbox, Kbd, RollingNumber, SegmentedControl } from './components.tsx';

const row = { display: 'flex', alignItems: 'center', gap: 6 } as const;
const between = { ...row, justifyContent: 'space-between' } as const;
const card = { padding: 10, maxWidth: '100%' } as const;
const inset = { background: 'var(--juice-w6)', borderRadius: 14, padding: 10 } as const;
const muted = { color: 'var(--juice-soft)', fontSize: 12 } as const;
const caption = { fontSize: 14, fontWeight: 650, letterSpacing: '-0.025em', lineHeight: 1.25 } as const;
const visuallyHidden = {
  position: 'absolute', width: 1, height: 1, overflow: 'hidden', clipPath: 'inset(50%)', whiteSpace: 'nowrap',
} as const;

export function Separator({ orientation = 'horizontal', decorative = true, style }: {
  orientation?: 'horizontal' | 'vertical'; decorative?: boolean; style?: CSSProperties;
}) {
  return (
    <div
      role={decorative ? 'none' : 'separator'}
      aria-orientation={decorative ? undefined : orientation}
      data-orientation={orientation}
      style={{
        background: 'var(--juice-w12)', flexShrink: 0, alignSelf: 'stretch',
        ...(orientation === 'vertical' ? { width: 1, minHeight: 16 } : { height: 1, width: '100%' }),
        ...style,
      }}
    />
  );
}

export function AspectRatio({ ratio = 16 / 9, children, style }: {
  ratio?: number; children: ReactNode; style?: CSSProperties;
}) {
  const aspectRatio = Number.isFinite(ratio) && ratio > 0 ? ratio : 16 / 9;
  return (
    <div style={{ position: 'relative', width: '100%', aspectRatio, overflow: 'hidden', ...style }}>
      <div style={{ position: 'absolute', inset: 0 }}>{children}</div>
    </div>
  );
}

export function Label(props: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label {...props} />;
}

export function Collapsible({ open, defaultOpen = false, onOpenChange, trigger, children }: {
  open?: boolean; defaultOpen?: boolean; onOpenChange?: (open: boolean) => void;
  trigger: ReactNode; children: ReactNode;
}) {
  const contentId = useId();
  const [expanded, setExpanded] = useControllableState({ value: open, defaultValue: defaultOpen, onChange: onOpenChange });
  return (
    <div className="j-acc-item" data-state={expanded ? 'open' : 'closed'}>
      <button type="button" className="j-acc-trigger" aria-expanded={expanded} aria-controls={contentId}
        onClick={() => setExpanded(!expanded)}>
        {trigger}
        <ChevronDown aria-hidden="true" size={14} style={{ rotate: expanded ? '180deg' : undefined }} />
      </button>
      <div id={contentId} className="j-acc-body" hidden={!expanded}>{children}</div>
    </div>
  );
}

// Menus share selection, positioning, and keyboard behavior.

export type MenuItem = {
  id: string;
  label: string;
  icon?: ReactNode;
  shortcut?: string;
  checked?: boolean;
  disabled?: boolean;
  danger?: boolean;
  keepOpen?: boolean;
  onSelect: () => void;
};

export type MenuEntry = MenuItem | { label: string; items: readonly MenuItem[] } | { separator: true };

type MenuAnchor = { x: number; y: number } | (() => DOMRect | undefined);

function MenuPanel({ id, label, entries, anchor, onClose, initialFocus = 'first',
  onHorizontalArrow }: {
  id: string; label: string; entries: readonly MenuEntry[]; anchor: MenuAnchor;
  onClose: (restoreFocus: boolean) => void; initialFocus?: 'first' | 'last';
  onHorizontalArrow?: (key: 'ArrowLeft' | 'ArrowRight') => void;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const buttons = useRef(new Map<string, HTMLButtonElement>());
  const search = useRef({ value: '', at: 0 });
  const items = entries.flatMap((entry) => 'items' in entry ? entry.items : 'separator' in entry ? [] : [entry]);
  const itemIds = items.filter((item) => !item.disabled).map((item) => item.id);
  const [active, setActive] = useState<string | undefined>();
  const activeId = active && itemIds.includes(active) ? active : itemIds[0];

  function focusItem(item: string) {
    const button = buttons.current.get(item);
    if (!button || !panel.current) return;
    button.focus({ preventScroll: true });
    const bounds = panel.current.getBoundingClientRect();
    const target = button.getBoundingClientRect();
    if (target.top < bounds.top) panel.current.scrollTop += target.top - bounds.top;
    else if (target.bottom > bounds.bottom) panel.current.scrollTop += target.bottom - bounds.bottom;
  }

  const roving = useRovingFocus({ items: itemIds, active: activeId ?? '', onSelect: focusItem });

  useLayoutEffect(() => {
    const element = panel.current;
    if (!element) return;
    element.showPopover?.();
    const firstItem = initialFocus === 'last'
      ? Array.from(buttons.current.values()).findLast((button) => !button.disabled)
      : Array.from(buttons.current.values()).find((button) => !button.disabled);
    (firstItem ?? element).focus({ preventScroll: true });
  }, [initialFocus]);

  useLayoutEffect(() => {
    const element = panel.current;
    if (!element) return;
    const position = () => {
      const margin = 8;
      const viewport = element.ownerDocument.documentElement;
      const bounds = typeof anchor === 'function' ? anchor() : undefined;
      const x = typeof anchor === 'function' ? bounds?.left ?? margin : anchor.x;
      const y = typeof anchor === 'function' ? (bounds?.bottom ?? margin) + 4 : anchor.y;
      const height = element.offsetHeight;
      const top = bounds && y + height > viewport.clientHeight - margin && bounds.top - height >= margin
        ? bounds.top - height - 4 : y;
      element.style.left = `${Math.max(margin, Math.min(x, viewport.clientWidth - element.offsetWidth - margin))}px`;
      element.style.top = `${Math.max(margin, Math.min(top, viewport.clientHeight - height - margin))}px`;
    };
    position();
    window.addEventListener('resize', position);
    window.addEventListener('scroll', position, true);
    return () => {
      window.removeEventListener('resize', position);
      window.removeEventListener('scroll', position, true);
    };
  }, [anchor]);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      onClose(true);
      return;
    }
    if (event.key === 'Tab') {
      // Move back to the trigger so native Tab continues from its place in the page.
      onClose(true);
      return;
    }
    if (onHorizontalArrow && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
      event.preventDefault();
      onHorizontalArrow(event.key);
      return;
    }
    roving.onKeyDown(event);
    if (event.defaultPrevented || event.key.length !== 1 || event.key === ' ' || event.ctrlKey || event.metaKey || event.altKey) return;
    const key = event.key.toLowerCase();
    const at = Date.now();
    const previous = at - search.current.at < 700 ? search.current.value : '';
    const value = previous === key ? key : previous + key;
    search.current = { value, at };
    const enabled = items.filter((item) => !item.disabled);
    const start = value.length === 1 ? itemIds.indexOf(activeId ?? '') + 1 : 0;
    const match = [...enabled.slice(start), ...enabled.slice(0, start)]
      .find((item) => item.label.toLowerCase().startsWith(value));
    if (match) focusItem(match.id);
  }

  function renderItem(item: MenuItem, radio = false) {
    return (
      <button key={item.id} ref={(element) => {
        if (element) buttons.current.set(item.id, element);
        else buttons.current.delete(item.id);
      }} type="button" role={radio ? 'menuitemradio' : item.checked === undefined ? 'menuitem' : 'menuitemcheckbox'}
        aria-checked={radio ? Boolean(item.checked) : item.checked} className="j-menu-item" disabled={item.disabled}
        tabIndex={item.id === activeId ? 0 : -1} data-highlighted={item.id === activeId ? 'true' : undefined} data-menu-item={item.id}
        data-tone={item.danger ? 'danger' : undefined} onFocus={() => setActive(item.id)}
        onPointerMove={(event) => {
          if (event.pointerType === 'mouse' && item.id !== activeId) event.currentTarget.focus({ preventScroll: true });
        }} onClick={() => {
          item.onSelect();
          if (!item.keepOpen) onClose(true);
        }}>
        <span style={row}>{item.icon}{item.label}</span>
        {item.shortcut && <Kbd>{item.shortcut}</Kbd>}
        {item.checked && <Check size={13} aria-hidden="true" />}
      </button>
    );
  }

  return (
    <div ref={panel} id={id} role="menu" aria-label={label} popover="manual" tabIndex={-1}
      className="j-menu-list" onKeyDown={onKeyDown}
      style={{
        position: 'fixed', zIndex: 40, inset: 'auto', margin: 0, border: 0, color: 'var(--fill-on)',
        background: 'var(--fill-slab)', boxShadow: '0 0 0 1px var(--juice-edge), 0 14px 36px -8px rgba(0, 0, 0, 0.22)',
        minWidth: 'min(174px, calc(100vw - 16px))', maxWidth: 'calc(100vw - 16px)',
        maxHeight: 'calc(100dvh - 16px)', overflow: 'auto', boxSizing: 'border-box',
      }}>
      {entries.map((entry, index) => {
        if ('separator' in entry) return <Separator key={index} decorative={false} style={{ marginBlock: 2 }} />;
        if (!('items' in entry)) return renderItem(entry);
        return (
          <div key={entry.label} role="group" aria-label={entry.label} style={{ display: 'grid', gap: 2 }}>
            <div aria-hidden="true" style={{ ...muted, padding: '4px 10px 0' }}>{entry.label}</div>
            {entry.items.map((item) => renderItem(item, true))}
          </div>
        );
      })}
    </div>
  );
}

function useOutsidePointer(ref: { current: HTMLElement | null }, enabled: boolean, onOutside: () => void) {
  const handler = useRef(onOutside);
  handler.current = onOutside;
  useEffect(() => {
    if (!enabled) return;
    const document = ref.current?.ownerDocument;
    const dismiss = (event: globalThis.PointerEvent) => {
      if (ref.current && !event.composedPath().includes(ref.current)) handler.current();
    };
    document?.addEventListener('pointerdown', dismiss, true);
    return () => document?.removeEventListener('pointerdown', dismiss, true);
  }, [ref, enabled]);
}

export function ContextMenu({ trigger, children, items, open, onOpenChange, label = 'Context menu' }: {
  trigger: ReactNode; children: ReactNode; items: readonly MenuEntry[];
  open?: boolean; onOpenChange?: (open: boolean) => void; label?: string;
}) {
  const menuId = useId();
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const press = useRef<{ timer: ReturnType<typeof setTimeout>; point: { x: number; y: number } } | null>(null);
  const [expanded, setExpanded] = useControllableState({ value: open, defaultValue: false, onChange: onOpenChange });
  const [point, setPoint] = useState<{ x: number; y: number } | null>(null);
  const anchor = useMemo<MenuAnchor>(() => point ?? (() => button.current?.getBoundingClientRect()), [point]);
  const close = (restoreFocus: boolean) => {
    if (restoreFocus) button.current?.focus({ preventScroll: true });
    setExpanded(false);
    setPoint(null);
  };
  const show = (location: typeof point) => {
    setPoint(location);
    setExpanded(true);
  };
  const cancelPress = () => {
    if (press.current) clearTimeout(press.current.timer);
    press.current = null;
  };
  useEffect(() => cancelPress, []);
  useOutsidePointer(root, expanded, () => close(false));

  return (
    <div ref={root}
      onBlur={(event) => {
        if (expanded && event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) close(false);
      }}>
      <div onContextMenu={(event) => {
        event.preventDefault();
        cancelPress();
        show({ x: event.clientX, y: event.clientY });
      }} onPointerDown={(event) => {
        if (event.pointerType !== 'touch' && event.pointerType !== 'pen') return;
        cancelPress();
        const location = { x: event.clientX, y: event.clientY };
        press.current = { point: location, timer: setTimeout(() => show(location), 550) };
      }} onPointerMove={(event) => {
        const origin = press.current?.point;
        if (origin && Math.hypot(event.clientX - origin.x, event.clientY - origin.y) > 8) cancelPress();
      }} onPointerUp={cancelPress} onPointerCancel={cancelPress} onPointerLeave={cancelPress}>
        {children}
      </div>
      <button ref={button} type="button" className="j-btn" data-size="sm" data-variant="secondary"
        style={{ marginTop: 8 }} aria-haspopup="menu" aria-expanded={expanded} aria-controls={expanded ? menuId : undefined}
        onClick={() => expanded ? close(true) : show(null)} onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')) {
            event.preventDefault();
            show(null);
          }
        }}>
        {trigger}
      </button>
      {expanded && <MenuPanel id={menuId} label={label} entries={items} anchor={anchor} onClose={close} />}
    </div>
  );
}

export type MenubarMenu<T extends string> = { value: T; label: string; items: readonly MenuEntry[] };

export function Menubar<T extends string>({ menus, value, defaultValue = null, onValueChange, label = 'Application menu' }: {
  menus: readonly MenubarMenu<T>[]; value?: T | null; defaultValue?: T | null;
  onValueChange?: (value: T | null) => void; label?: string;
}) {
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const triggers = useRef(new Map<T, HTMLButtonElement>());
  const [open, setOpen] = useControllableState({ value, defaultValue, onChange: onValueChange });
  const [focused, setFocused] = useState<T>();
  const [initialFocus, setInitialFocus] = useState<'first' | 'last'>('first');
  const values = menus.map((menu) => menu.value);
  const current = menus.find((menu) => menu.value === open);
  const tabStop = focused && values.includes(focused) ? focused : current?.value ?? values[0];
  const anchor = useMemo(() => () => open === null ? undefined : triggers.current.get(open)?.getBoundingClientRect(), [open]);

  function close(restoreFocus: boolean) {
    if (restoreFocus && open !== null) triggers.current.get(open)?.focus({ preventScroll: true });
    setOpen(null);
  }

  function moveFocus(next: T) {
    if (current) setOpen(next);
    setInitialFocus('first');
    triggers.current.get(next)?.focus({ preventScroll: true });
  }

  const roving = useRovingFocus({ items: values, active: tabStop ?? ('' as T), onSelect: moveFocus, orientation: 'horizontal' });
  useOutsidePointer(root, Boolean(current), () => close(false));

  return (
    <div ref={root} onBlur={(event) => {
      if (current && event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) close(false);
    }}>
      <div role="menubar" aria-label={label} aria-orientation="horizontal" style={{ ...row, gap: 2 }}>
        {menus.map((menu, index) => {
          const expanded = current?.value === menu.value;
          const menuId = `${id}-${index}`;
          return (
            <button key={menu.value} ref={(element) => {
              if (element) triggers.current.set(menu.value, element);
              else triggers.current.delete(menu.value);
            }} type="button" role="menuitem" className="j-btn" data-size="sm"
              data-variant={expanded ? 'secondary' : 'ghost'} tabIndex={tabStop === menu.value ? 0 : -1}
              aria-haspopup="menu" aria-expanded={expanded} aria-controls={expanded ? menuId : undefined}
              onFocus={() => setFocused(menu.value)} onPointerEnter={(event) => {
                if (event.pointerType === 'mouse' && current && !expanded) {
                  setInitialFocus('first');
                  setOpen(menu.value);
                }
              }} onKeyDown={(event) => {
                if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                  event.preventDefault();
                  setInitialFocus(event.key === 'ArrowUp' ? 'last' : 'first');
                  setOpen(menu.value);
                  return;
                }
                roving.onKeyDown(event);
              }} onClick={() => {
                setInitialFocus('first');
                if (expanded) close(true);
                else setOpen(menu.value);
              }}>
              {menu.label}
            </button>
          );
        })}
      </div>
      {current && (
        <MenuPanel key={current.value} id={`${id}-${menus.indexOf(current)}`} label={current.label} entries={current.items}
          anchor={anchor} initialFocus={initialFocus} onClose={close} onHorizontalArrow={(key) => {
            const offset = key === 'ArrowRight' ? 1 : -1;
            const next = values[(values.indexOf(current.value) + offset + values.length) % values.length];
            if (next !== undefined) moveFocus(next);
          }} />
      )}
    </div>
  );
}

export type NavigationMenuSection<T extends string> = { value: T; label: string; children: ReactNode };

export function NavigationMenu<T extends string>({ sections, value, defaultValue = null, onValueChange, label = 'Navigation' }: {
  sections: readonly NavigationMenuSection<T>[]; value?: T | null; defaultValue?: T | null;
  onValueChange?: (value: T | null) => void; label?: string;
}) {
  const viewportId = useId();
  const root = useRef<HTMLElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const triggers = useRef(new Map<T, HTMLButtonElement>());
  const [selected, setSelected] = useControllableState({ value, defaultValue, onChange: onValueChange });
  const [focusContent, setFocusContent] = useState(false);
  const { animate } = useJuice();
  const reducedMotion = useReducedMotion();
  const active = sections.find((section) => section.value === selected);
  const sectionValues = sections.map((section) => section.value);

  function contentLinks() {
    return Array.from(viewport.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])') ?? []);
  }

  useLayoutEffect(() => {
    if (!active || !focusContent) return;
    contentLinks()[0]?.focus();
    setFocusContent(false);
  }, [active, focusContent]);
  useOutsidePointer(root, Boolean(active), () => setSelected(null));

  return (
    <nav ref={root} aria-label={label} onBlur={(event) => {
      if (active && event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) setSelected(null);
    }} onKeyDown={(event) => {
      if (event.key === 'Escape' && active) {
        event.preventDefault();
        event.stopPropagation();
        triggers.current.get(active.value)?.focus();
        setSelected(null);
      }
    }}>
      <ul style={{ ...row, listStyle: 'none', margin: 0, padding: 0 }}>
        {sections.map((section, index) => {
          const expanded = active?.value === section.value;
          return (
            <li key={section.value}>
              <button id={`${viewportId}-trigger-${index}`} ref={(element) => {
                if (element) triggers.current.set(section.value, element);
                else triggers.current.delete(section.value);
              }} type="button" className="j-btn" data-size="sm" data-variant={expanded ? 'secondary' : 'ghost'}
                aria-expanded={expanded} aria-controls={expanded ? viewportId : undefined}
                style={{ boxShadow: expanded ? 'inset 0 -2px var(--fill-on)' : undefined }}
                onClick={() => setSelected(expanded ? null : section.value)} onKeyDown={(event) => {
                  const left = event.key === 'ArrowLeft';
                  if (left || event.key === 'ArrowRight' || event.key === 'Home' || event.key === 'End') {
                    event.preventDefault();
                    const direction = getComputedStyle(event.currentTarget).direction === 'rtl' ? -1 : 1;
                    const nextIndex = event.key === 'Home' ? 0 : event.key === 'End' ? sections.length - 1
                      : (index + (left ? -direction : direction) + sections.length) % sections.length;
                    const next = sectionValues[nextIndex];
                    if (next !== undefined) triggers.current.get(next)?.focus();
                  } else if (event.key === 'ArrowDown') {
                    event.preventDefault();
                    setSelected(section.value);
                    setFocusContent(true);
                  } else if (event.key === 'Tab' && !event.shiftKey && expanded) {
                    const firstLink = contentLinks()[0];
                    if (!firstLink) return;
                    event.preventDefault();
                    firstLink.focus();
                  }
                }}>
                {section.label}<ChevronDown aria-hidden="true" size={12} />
              </button>
            </li>
          );
        })}
      </ul>
      {active && (
        <div id={viewportId} ref={viewport} aria-labelledby={`${viewportId}-trigger-${sections.indexOf(active)}`}
          style={{ ...inset, marginTop: 6, padding: 6 }} onKeyDown={(event) => {
            const links = contentLinks();
            const index = links.indexOf(event.target as HTMLElement);
            if (index === -1) return;
            if (event.key === 'Tab' && event.shiftKey && index === 0) {
              event.preventDefault();
              triggers.current.get(active.value)?.focus();
              return;
            }
            const next = { Home: 0, End: links.length - 1, ArrowRight: index + 1, ArrowLeft: index - 1,
              ArrowDown: index + 1, ArrowUp: index - 1 }[event.key];
            if (next === undefined) return;
            event.preventDefault();
            links[(next + links.length) % links.length]?.focus();
          }}>
          <motion.div key={active.value} initial={animate && !reducedMotion ? { opacity: 0, y: 3 } : false}
            animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.16 }}>
            {active.children}
          </motion.div>
        </div>
      )}
    </nav>
  );
}

const RovingButtonsContext = createContext(false);

type Orientation = 'horizontal' | 'vertical';
type RovingButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { 'data-roving-button'?: string };

function RovingButton({ tabIndex, ...props }: RovingButtonProps) {
  const roving = useContext(RovingButtonsContext);
  return <button type="button" {...props} tabIndex={roving ? -1 : tabIndex} data-roving-button={roving ? '' : undefined} />;
}

function RovingButtons({ role, label, orientation, children }: {
  role: 'toolbar' | 'group' | 'radiogroup'; label?: string; orientation: Orientation; children: ReactNode;
}) {
  const root = useRef<HTMLDivElement>(null);
  const current = useRef<HTMLButtonElement>(null);
  const findButtons = () => Array.from(root.current?.querySelectorAll<HTMLButtonElement>('[data-roving-button]:not(:disabled)') ?? []);

  function setTabStop(target: HTMLButtonElement | undefined) {
    if (!target) return;
    const previous = current.current;
    if (previous && previous !== target) previous.tabIndex = -1;
    target.tabIndex = 0;
    current.current = target;
  }

  useLayoutEffect(() => {
    if (!root.current) return;
    const sync = () => {
      const buttons = findButtons();
      setTabStop(current.current && buttons.includes(current.current) ? current.current : buttons[0]);
    };
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(root.current, { subtree: true, childList: true, attributes: true, attributeFilter: ['disabled'] });
    return () => observer.disconnect();
  }, []);

  return (
    <RovingButtonsContext.Provider value>
      <div ref={root} role={role} aria-label={label} aria-orientation={role === 'toolbar' ? orientation : undefined}
        style={{ ...row, gap: 3, flexDirection: orientation === 'vertical' ? 'column' : 'row' }}
        onFocus={(event) => {
          if (event.target instanceof HTMLButtonElement && event.target.hasAttribute('data-roving-button')) setTabStop(event.target);
        }} onKeyDown={(event) => {
          if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
          const buttons = findButtons();
          const index = buttons.indexOf(event.target as HTMLButtonElement);
          if (index === -1) return;
          const rtl = getComputedStyle(event.currentTarget).direction === 'rtl';
          const previous = orientation === 'vertical' ? 'ArrowUp' : rtl ? 'ArrowRight' : 'ArrowLeft';
          const next = orientation === 'vertical' ? 'ArrowDown' : rtl ? 'ArrowLeft' : 'ArrowRight';
          const destination = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1
            : event.key === previous ? index - 1 : event.key === next ? index + 1 : undefined;
          if (destination === undefined) return;
          event.preventDefault();
          buttons[(destination + buttons.length) % buttons.length]?.focus();
        }}>
        {children}
      </div>
    </RovingButtonsContext.Provider>
  );
}

function toggleAppearance(pressed: boolean, disabled?: boolean): CSSProperties {
  return {
    justifyContent: 'center', minWidth: 29, paddingInline: 6,
    background: pressed ? 'var(--juice-w20)' : undefined, color: pressed ? 'var(--fill-on)' : undefined,
    opacity: disabled ? 0.5 : undefined,
  };
}

export function Toggle({ pressed, defaultPressed = false, onPressedChange, disabled, children, 'aria-label': ariaLabel }: {
  pressed?: boolean; defaultPressed?: boolean; onPressedChange?: (pressed: boolean) => void;
  disabled?: boolean; children: ReactNode; 'aria-label'?: string;
}) {
  const { playSound } = useJuice();
  const [active, setActive] = useControllableState({ value: pressed, defaultValue: defaultPressed, onChange: onPressedChange });
  return (
    <RovingButton className="j-chip" aria-label={ariaLabel} aria-pressed={active} disabled={disabled}
      data-state={active ? 'on' : 'off'} style={toggleAppearance(active, disabled)} onClick={() => {
        playSound(active ? 'tap' : 'latch');
        setActive(!active);
      }}>
      {children}
    </RovingButton>
  );
}

export function Toolbar({ label, orientation = 'horizontal', children }: {
  label: string; orientation?: Orientation; children: ReactNode;
}) {
  return <RovingButtons role="toolbar" label={label} orientation={orientation}>{children}</RovingButtons>;
}

export function ToolbarButton({ className = 'j-chip', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <RovingButton className={className} {...props} />;
}

const ToggleGroupContext = createContext<{
  type: 'single' | 'multiple'; selected: readonly string[]; toggle: (value: string) => void; disabled?: boolean;
} | null>(null);

type ToggleGroupProps = {
  label: string; children: ReactNode; disabled?: boolean; orientation?: Orientation;
} & ({ type: 'single'; value?: string; defaultValue?: string; onValueChange?: (value: string) => void }
  | { type: 'multiple'; value?: string[]; defaultValue?: string[]; onValueChange?: (value: string[]) => void });

export function ToggleGroup({ label, children, disabled, orientation = 'horizontal', ...props }: ToggleGroupProps) {
  const inToolbar = useContext(RovingButtonsContext);
  const [value, setValue] = useControllableState<string | string[]>({
    value: props.value, defaultValue: props.defaultValue ?? (props.type === 'single' ? '' : []),
    onChange: (next) => {
      if (props.type === 'single' && typeof next === 'string') props.onValueChange?.(next);
      if (props.type === 'multiple' && Array.isArray(next)) props.onValueChange?.(next);
    },
  });
  const selected = typeof value === 'string' ? (value ? [value] : []) : value;
  const toggle = (item: string) => {
    const active = selected.includes(item);
    if (props.type === 'single') setValue(active ? '' : item);
    else setValue(active ? selected.filter((entry) => entry !== item) : [...selected, item]);
  };
  const role = props.type === 'single' ? 'radiogroup' : 'group';
  return (
    <ToggleGroupContext.Provider value={{ type: props.type, selected, toggle, disabled }}>
      {inToolbar
        ? <div role={role} aria-label={label} style={{ ...row, gap: 3 }}>{children}</div>
        : <RovingButtons role={role} label={label} orientation={orientation}>{children}</RovingButtons>}
    </ToggleGroupContext.Provider>
  );
}

export function ToggleGroupItem({ value, children, disabled, 'aria-label': ariaLabel }: {
  value: string; children: ReactNode; disabled?: boolean; 'aria-label'?: string;
}) {
  const group = useContext(ToggleGroupContext);
  const { playSound } = useJuice();
  if (!group) throw new Error('ToggleGroupItem must be used within ToggleGroup');
  const active = group.selected.includes(value);
  const single = group.type === 'single';
  const isDisabled = disabled || group.disabled;
  return (
    <RovingButton className="j-chip" role={single ? 'radio' : undefined} aria-checked={single ? active : undefined}
      aria-pressed={single ? undefined : active} aria-label={ariaLabel} data-state={active ? 'on' : 'off'}
      disabled={isDisabled} style={toggleAppearance(active, isDisabled)} onClick={() => {
        playSound(active ? 'tap' : 'latch');
        group.toggle(value);
      }}>
      {children}
    </RovingButton>
  );
}

export function AlertDialog({ open, defaultOpen = false, onOpenChange, trigger, title, description, action,
  cancelLabel = 'Cancel', actionLabel = 'Confirm', dismissOnEscape = true }: {
  open?: boolean; defaultOpen?: boolean; onOpenChange?: (open: boolean) => void; trigger: ReactNode;
  title: ReactNode; description: ReactNode; action: () => void;
  cancelLabel?: string; actionLabel?: string; dismissOnEscape?: boolean;
}) {
  const id = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const confirm = useRef<HTMLButtonElement>(null);
  const triggerButton = useRef<HTMLButtonElement>(null);
  const [expanded, setExpanded] = useControllableState({ value: open, defaultValue: defaultOpen, onChange: onOpenChange });
  const { playSound } = useJuice();

  useLayoutEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (expanded && !element.open) {
      element.showModal();
      cancel.current?.focus();
    } else if (!expanded && element.open) {
      element.close();
      triggerButton.current?.focus();
    }
  }, [expanded]);

  const dismiss = () => {
    playSound('tap');
    setExpanded(false);
  };
  return (
    <>
      <button ref={triggerButton} type="button" className="j-btn" data-size="sm" data-variant="danger"
        aria-haspopup="dialog" aria-controls={id} onClick={() => {
          playSound('tap');
          setExpanded(true);
        }}>
        {trigger}
      </button>
      <dialog ref={dialog} id={id} role="alertdialog" aria-modal="true" aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-description`} onKeyDown={(event) => {
          if (event.key !== 'Tab') return;
          const source = event.shiftKey ? cancel.current : confirm.current;
          if (event.target !== source) return;
          event.preventDefault();
          (event.shiftKey ? confirm.current : cancel.current)?.focus();
        }} onCancel={(event) => {
          event.preventDefault();
          if (dismissOnEscape) dismiss();
        }} style={{
          background: 'var(--fill-slab)', color: 'var(--fill-on)', border: 0, borderRadius: 20, padding: 16,
          boxSizing: 'border-box', width: 'min(340px, calc(100vw - 24px))',
          boxShadow: '0 0 0 1px var(--juice-edge), 0 20px 56px -12px rgba(0, 0, 0, 0.28)',
        }}>
        <h2 id={`${id}-title`} style={{ ...row, margin: 0, fontSize: 15 }}>{title}</h2>
        <div id={`${id}-description`} style={{ ...muted, margin: '7px 0 14px', lineHeight: 1.45 }}>{description}</div>
        <div style={{ ...row, justifyContent: 'flex-end' }}>
          <button ref={cancel} type="button" className="j-btn" data-size="sm" data-variant="ghost" onClick={dismiss}>
            {cancelLabel}
          </button>
          <button ref={confirm} type="button" className="j-btn" data-size="sm" data-variant="danger" onClick={() => {
            playSound('paid');
            action();
            setExpanded(false);
          }}>
            {actionLabel}
          </button>
        </div>
      </dialog>
    </>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function ScrollArea({ children, label, style, viewportRef, onScrollProgress }: {
  children: ReactNode; label: string; style?: CSSProperties; viewportRef?: Ref<HTMLDivElement>;
  onScrollProgress?: (progress: number) => void;
}) {
  const viewport = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const drag = useRef<{ pointer: number; offset: number } | null>(null);
  const [metrics, setMetrics] = useState({ progress: 0, ratio: 1, trackHeight: 0 });
  const progressListener = useRef(onScrollProgress);
  progressListener.current = onScrollProgress;
  useImperativeHandle(viewportRef, () => viewport.current!, []);

  function measure() {
    const element = viewport.current;
    if (!element) return;
    const maximum = element.scrollHeight - element.clientHeight;
    const progress = maximum > 0 ? clamp(element.scrollTop / maximum, 0, 1) : 0;
    const ratio = element.scrollHeight > 0 ? element.clientHeight / element.scrollHeight : 1;
    const trackHeight = track.current?.clientHeight ?? 0;
    setMetrics((previous) => previous.progress === progress && previous.ratio === ratio && previous.trackHeight === trackHeight
      ? previous : { progress, ratio, trackHeight });
    progressListener.current?.(progress);
  }

  useLayoutEffect(() => {
    measure();
    const observer = new ResizeObserver(measure);
    if (viewport.current) observer.observe(viewport.current);
    if (content.current) observer.observe(content.current);
    return () => observer.disconnect();
  }, []);

  const thumbSize = clamp(metrics.ratio * metrics.trackHeight, Math.min(18, metrics.trackHeight), metrics.trackHeight);
  const thumbTravel = metrics.trackHeight - thumbSize;
  const scrollToPointer = (event: PointerEvent<HTMLDivElement>, offset: number) => {
    const element = viewport.current;
    if (!element || thumbTravel <= 0) return;
    const y = event.clientY - event.currentTarget.getBoundingClientRect().top - offset;
    element.scrollTop = clamp(y / thumbTravel, 0, 1) * (element.scrollHeight - element.clientHeight);
  };

  return (
    <div style={{ ...inset, position: 'relative', height: 140, padding: 0, overflow: 'hidden', ...style }}>
      <div ref={viewport} style={{ height: '100%', overflow: 'auto', overscrollBehavior: 'contain', scrollbarWidth: 'none' }}
        role="region" aria-label={label} tabIndex={0} onScroll={measure}>
        <div ref={content} style={{ padding: '4px 14px 4px 6px' }}>{children}</div>
      </div>
      <div ref={track} aria-hidden="true" style={{ position: 'absolute', inset: '5px 4px 5px auto', width: 8,
        background: 'var(--juice-w12)', borderRadius: 10, touchAction: 'none', cursor: 'default',
        visibility: metrics.ratio < 1 ? 'visible' : 'hidden' }} onPointerDown={(event) => {
          if (event.button !== 0 || drag.current) return;
          event.preventDefault();
          const top = event.currentTarget.getBoundingClientRect().top + metrics.progress * thumbTravel;
          const offset = event.target === event.currentTarget ? thumbSize / 2 : event.clientY - top;
          drag.current = { pointer: event.pointerId, offset };
          event.currentTarget.setPointerCapture(event.pointerId);
          scrollToPointer(event, offset);
        }} onPointerMove={(event) => {
          if (drag.current?.pointer === event.pointerId) scrollToPointer(event, drag.current.offset);
        }} onLostPointerCapture={(event) => {
          if (drag.current?.pointer === event.pointerId) drag.current = null;
        }}>
        <div style={{ position: 'absolute', top: metrics.progress * thumbTravel, insetInline: 1, height: thumbSize,
          background: 'var(--juice-mute)', borderRadius: 9 }} />
      </div>
    </div>
  );
}

type RangeValue = [number, number];
type ThumbIndex = 0 | 1;

function sliderScale(min: number, max: number, step: number, minStepsBetweenThumbs: number) {
  const minimum = Number.isFinite(min) ? min : 0;
  const maximum = Number.isFinite(max) && max >= minimum ? max : minimum;
  const increment = Number.isFinite(step) && step > 0 ? step : 1;
  const steps = Math.floor(Number(((maximum - minimum) / increment).toPrecision(15)));
  const gap = Number.isFinite(minStepsBetweenThumbs) ? clamp(Math.ceil(minStepsBetweenThumbs), 0, steps) : 0;
  const toIndex = (value: number) => Number.isFinite(value) ? clamp(Math.round((value - minimum) / increment), 0, steps) : 0;
  const toValue = (index: number) => Number((minimum + index * increment).toPrecision(15));
  const toPercent = (index: number) => steps > 0 ? index / steps * 100 : 0;
  return { steps, gap, toIndex, toValue, toPercent };
}

function normalizeRange(value: RangeValue, scale: ReturnType<typeof sliderScale>): RangeValue {
  const a = scale.toIndex(value[0]);
  const b = scale.toIndex(value[1]);
  const low = Math.min(a, b, scale.steps - scale.gap);
  return [low, Math.max(low + scale.gap, a, b)];
}

export function DualRangeSlider({ value, defaultValue, onValueChange, onValueCommit, min = 0, max = 100, step = 1,
  minStepsBetweenThumbs = 0, disabled = false, thumbIds, thumbLabelIds, thumbLabels = ['Minimum', 'Maximum'],
  formatValue, name }: {
  value?: RangeValue; defaultValue?: RangeValue; onValueChange?: (value: RangeValue) => void;
  onValueCommit?: (value: RangeValue) => void; min?: number; max?: number; step?: number;
  minStepsBetweenThumbs?: number; disabled?: boolean; thumbIds?: [string, string]; thumbLabelIds?: [string, string];
  thumbLabels?: [string, string]; formatValue?: (value: number) => string; name?: string;
}) {
  const scale = sliderScale(min, max, step, minStepsBetweenThumbs);
  const [rawValues, setValues] = useControllableState({ value, defaultValue: defaultValue ?? [min, max], onChange: onValueChange });
  const values = normalizeRange(rawValues, scale);
  const thumbs = useRef<[HTMLButtonElement | null, HTMLButtonElement | null]>([null, null]);
  const drag = useRef<{ thumb: ThumbIndex; pointer: number; offset: number; initial: RangeValue; current: RangeValue } | null>(null);
  const lastThumb = useRef<ThumbIndex>(0);

  function change(thumb: ThumbIndex, index: number, current: RangeValue) {
    const low = thumb === 0 ? clamp(index, 0, current[1] - scale.gap) : current[0];
    const high = thumb === 1 ? clamp(index, current[0] + scale.gap, scale.steps) : current[1];
    if (low === current[0] && high === current[1]) return current;
    setValues([scale.toValue(low), scale.toValue(high)]);
    return [low, high] satisfies RangeValue;
  }

  const pointerIndex = (event: PointerEvent<HTMLDivElement>, offset = 0) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    return bounds.width > 0 ? Math.round(clamp((event.clientX - bounds.left - offset) / bounds.width, 0, 1) * scale.steps) : 0;
  };

  function updatePointer(event: PointerEvent<HTMLDivElement>) {
    const activeDrag = drag.current;
    if (!disabled && activeDrag?.pointer === event.pointerId) {
      activeDrag.current = change(activeDrag.thumb, pointerIndex(event, activeDrag.offset), activeDrag.current);
    }
  }

  function endPointer(event: PointerEvent<HTMLDivElement>, canceled: boolean) {
    const activeDrag = drag.current;
    if (!activeDrag || activeDrag.pointer !== event.pointerId) return;
    drag.current = null;
    const [low, high] = activeDrag.current;
    if (!canceled && (low !== activeDrag.initial[0] || high !== activeDrag.initial[1])) {
      onValueCommit?.([scale.toValue(low), scale.toValue(high)]);
    }
  }

  function moveThumb(event: KeyboardEvent<HTMLButtonElement>, thumb: ThumbIndex) {
    const current = values[thumb];
    const next = { ArrowLeft: current - 1, ArrowDown: current - 1, ArrowRight: current + 1, ArrowUp: current + 1,
      PageDown: current - 10, PageUp: current + 10, Home: 0, End: scale.steps }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    const updated = change(thumb, next, values);
    if (updated !== values) onValueCommit?.([scale.toValue(updated[0]), scale.toValue(updated[1])]);
  }

  return (
    <>
      <div className="j-slider-track" data-disabled={disabled || undefined} data-orientation="horizontal"
        style={{ marginInline: 9, cursor: disabled ? 'default' : undefined, opacity: disabled ? 0.5 : undefined }}
        onPointerDown={(event) => {
          if (disabled || event.button !== 0 || drag.current) return;
          const index = pointerIndex(event);
          const target = event.target;
          const lowerDistance = Math.abs(index - values[0]);
          const upperDistance = Math.abs(index - values[1]);
          let thumb = lastThumb.current;
          if (target === thumbs.current[0] || target === thumbs.current[1]) thumb = target === thumbs.current[0] ? 0 : 1;
          else if (values[0] === values[1] && index !== values[0]) thumb = index < values[0] ? 0 : 1;
          else if (lowerDistance !== upperDistance) thumb = lowerDistance < upperDistance ? 0 : 1;
          event.preventDefault();
          thumbs.current[thumb]?.focus({ preventScroll: true });
          const directThumb = target === thumbs.current[thumb];
          const bounds = event.currentTarget.getBoundingClientRect();
          const offset = directThumb ? event.clientX - bounds.left - bounds.width * scale.toPercent(values[thumb]) / 100 : 0;
          drag.current = { thumb, pointer: event.pointerId, offset, initial: values,
            current: directThumb ? values : change(thumb, index, values) };
          event.currentTarget.setPointerCapture(event.pointerId);
        }} onPointerMove={updatePointer} onPointerUp={(event) => {
          updatePointer(event);
          endPointer(event, false);
        }} onPointerCancel={(event) => endPointer(event, true)} onLostPointerCapture={(event) => endPointer(event, true)}>
        <div className="j-slider-rail" aria-hidden="true">
          <div className="j-slider-fill" style={{ left: `${scale.toPercent(values[0])}%`, right: `${100 - scale.toPercent(values[1])}%` }} />
        </div>
        {([0, 1] as const).map((thumb) => {
          const numericValue = scale.toValue(values[thumb]);
          return (
            <button key={thumb} ref={(element) => { thumbs.current[thumb] = element; }} id={thumbIds?.[thumb]}
              type="button" role="slider" className="j-slider-thumb" disabled={disabled}
              aria-label={thumbLabelIds?.[thumb] ? undefined : thumbLabels[thumb]} aria-labelledby={thumbLabelIds?.[thumb]}
              aria-valuemin={scale.toValue(thumb === 0 ? 0 : values[0] + scale.gap)}
              aria-valuemax={scale.toValue(thumb === 0 ? values[1] - scale.gap : scale.steps)}
              aria-valuenow={numericValue} aria-valuetext={formatValue?.(numericValue)} aria-orientation="horizontal"
              style={{ left: `${scale.toPercent(values[thumb])}%`, border: 0, padding: 0, pointerEvents: 'auto', cursor: 'inherit' }}
              onFocus={() => { lastThumb.current = thumb; }} onKeyDown={(event) => moveThumb(event, thumb)} />
          );
        })}
      </div>
      {name && values.map((index, thumb) => (
        <input key={thumb} type="hidden" name={`${name}[]`} value={scale.toValue(index)} disabled={disabled} />
      ))}
    </>
  );
}

export const RangeSlider = DualRangeSlider;

// Bench showcases

type KitProps = { id?: string };
type ZoomLevel = '100%' | '200%';
const contextCommands = [
  { id: 'reload', label: 'Reload', shortcut: '⌘R', icon: RefreshCw },
  { id: 'copy-selector', label: 'Copy Selector', shortcut: '⌘C', icon: Copy },
  { id: 'delete-layer', label: 'Delete Layer', shortcut: '⌫', icon: Trash2, danger: true },
] as const;

function commandId(command: string) {
  return typeof command === 'string' ? command.trim().toLowerCase().replace(/\s+/g, '-') : '';
}

export function ContextMenuKit({ id = 'context-menu-kit' }: KitProps = {}) {
  const { playSound } = useJuice();
  const [open, setOpen] = useState(false);
  const [grid, setGrid] = useState(false);
  const [zoomLevel, setZoom] = useState<ZoomLevel>('100%');
  const [deleted, setDeleted] = useState(false);
  const [notice, setNotice] = useState('');
  const feedbackVersion = useRef(0);
  const layerId = `${id}-layer`;

  const toggleGrid = () => {
    playSound(grid ? 'tap' : 'latch');
    setGrid((previous) => !previous);
  };
  const setZoomLevel = (level: ZoomLevel) => {
    if ((level !== '100%' && level !== '200%') || level === zoomLevel) return;
    playSound('tap');
    setZoom(level);
  };

  async function triggerAction(action: string) {
    const command = contextCommands.find((item) => item.id === commandId(action));
    if (!command || (deleted && command.id !== 'reload')) return;
    const version = ++feedbackVersion.current;
    setOpen(false);
    playSound('tap');
    if (command.id === 'reload') {
      setDeleted(false);
      setNotice('Layer reloaded');
    } else if (command.id === 'delete-layer') {
      setDeleted(true);
      setNotice('Layer deleted');
    } else {
      try {
        const selector = `#${CSS.escape(layerId)}`;
        await navigator.clipboard.writeText(selector);
        if (version === feedbackVersion.current) setNotice('Selector copied');
      } catch {
        if (version === feedbackVersion.current) setNotice('Clipboard unavailable');
      }
    }
  }

  const commands = contextCommands.map(({ icon: Icon, ...command }) => ({ ...command,
    icon: <Icon size={13} aria-hidden="true" />, disabled: deleted && command.id !== 'reload',
    onSelect: () => { void triggerAction(command.id); },
  }));
  const items: MenuEntry[] = [
    ...commands.slice(0, 2),
    { separator: true },
    { id: 'grid', label: 'Show Pixel Grid', icon: <Grid size={13} aria-hidden="true" />,
      checked: grid, onSelect: toggleGrid, keepOpen: true },
    { label: 'Zoom', items: (['100%', '200%'] as const).map((level) => ({ id: level, label: level,
      checked: zoomLevel === level, onSelect: () => setZoomLevel(level), keepOpen: true })) },
    { separator: true },
    ...commands.slice(2),
  ];
  useJuiceAgentNode(id, 'ContextMenuKit', { open, grid, zoomLevel, deleted, notice }, {
    openContextMenu: () => setOpen(true), toggleGrid, setZoomLevel, triggerAction,
  });

  return (
    <div id={id} className="j-slab j-fnd-card" style={card}>
      <div style={between}><strong style={caption}>Layer actions</strong><Badge>{zoomLevel}</Badge></div>
      <div onKeyDown={(event) => {
        if (!open || event.defaultPrevented || event.altKey || event.shiftKey) return;
        const key = event.key.toLowerCase();
        const command = (event.metaKey || event.ctrlKey) ? { r: 'reload', c: 'copy-selector' }[key]
          : key === 'backspace' ? 'delete-layer' : undefined;
        if (!command) return;
        const selected = items.find((item) => 'id' in item && item.id === command);
        if (!selected || !('id' in selected) || selected.disabled) return;
        event.preventDefault();
        // The menu handles focus restoration on selection, including shortcuts.
        const button = event.currentTarget.querySelector<HTMLButtonElement>(`[data-menu-item="${command}"]`);
        button?.click();
      }}>
        <ContextMenu trigger={<><MousePointerClick size={13} aria-hidden="true" /> Open layer menu</>}
          label="Layer actions" items={items} open={open} onOpenChange={setOpen}>
          <div style={{ ...inset, minHeight: 96, display: 'grid', placeItems: 'center', overflow: 'hidden',
            backgroundImage: grid ? 'linear-gradient(var(--juice-w12) 1px, transparent 1px), linear-gradient(90deg, var(--juice-w12) 1px, transparent 1px)' : undefined,
            backgroundSize: zoomLevel === '200%' ? '16px 16px' : '8px 8px' }}>
            {deleted ? <button type="button" className="j-btn" data-size="sm" data-variant="secondary"
              onClick={() => void triggerAction('reload')}>Restore layer</button> : (
              <span id={layerId} style={{ position: 'relative', padding: '5px 9px', fontSize: 22, fontWeight: 600,
                letterSpacing: '-0.045em', lineHeight: 1.2, outline: '1px solid var(--juice-faint)',
                scale: zoomLevel === '200%' ? 2 : 1 }}>
                Hero layer
                {['0%','100%'].flatMap((left) => ['0%','100%'].map((top) => (
                  <i key={left + top} aria-hidden="true" style={{ position: 'absolute', left, top, translate: '-50% -50%',
                    width: 4, height: 4, background: 'var(--fill-slab)', outline: '1px solid var(--juice-soft)' }} />
                )))}
              </span>
            )}
          </div>
        </ContextMenu>
      </div>
      <span role="status" style={muted}>{notice || 'Right-click the layer for commands.'}</span>
    </div>
  );
}

const menuNames = ['File', 'Edit', 'View', 'Profiles'] as const;
type MenuName = (typeof menuNames)[number];

function downloadSampleSvg(preview: SVGSVGElement) {
  const svg = preview.cloneNode(true) as SVGSVGElement;
  const colors = getComputedStyle(preview);
  svg.style.color = colors.color;
  svg.style.background = colors.backgroundColor;
  svg.setAttribute('fill', colors.backgroundColor);
  const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'juice-workspace.svg';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function MenubarKit({ id = 'menubar-kit' }: KitProps = {}) {
  const { playSound } = useJuice();
  const [menu, setMenu] = useState<MenuName | null>(null);
  const [windows, setWindows] = useState(1);
  const preview = useRef<SVGSVGElement>(null);
  const [rulers, setRulers] = useState(true);
  const [profile, setProfile] = useState<'Studio' | 'Minimal'>('Studio');
  const [notice, setNotice] = useState('');
  const runCommand = (input: string) => {
    const command = commandId(input);
    if (command === 'new-window') {
      setWindows((count) => count + 1);
      setNotice('Window added');
    } else if (command === 'export-svg') {
      if (!preview.current) return;
      downloadSampleSvg(preview.current);
      setNotice('Workspace SVG exported');
    } else if (command === 'toggle-rulers') {
      setRulers((previous) => !previous);
      setNotice(rulers ? 'Rulers hidden' : 'Rulers visible');
    } else if (command === 'studio' || command === 'minimal') {
      setProfile(command === 'studio' ? 'Studio' : 'Minimal');
      setNotice('Profile applied');
    } else return;
    playSound('tap');
  };
  useJuiceAgentNode(id, 'MenubarKit', { menu, windows, rulers, profile, notice }, {
    openMenu: (name: MenuName) => { if (menuNames.includes(name)) setMenu(name); }, runCommand,
  });
  const newWindow = { id: 'new-window', label: 'New Window', shortcut: '⌘N', onSelect: () => runCommand('new-window') };
  const exportSvg = { id: 'export-svg', label: 'Export SVG', shortcut: '⇧⌘E', onSelect: () => runCommand('export-svg') };
  const menus: MenubarMenu<MenuName>[] = [
    { value: 'File', label: 'File', items: [newWindow] },
    { value: 'Edit', label: 'Edit', items: [exportSvg] },
    { value: 'View', label: 'View', items: [{ id: 'toggle-rulers', label: 'Toggle Rulers', checked: rulers,
      onSelect: () => runCommand('toggle-rulers') }] },
    { value: 'Profiles', label: 'Profiles', items: [{ label: 'Profile', items: ['Studio', 'Minimal'].map((name) => ({
      id: name, label: name, checked: name === profile, onSelect: () => runCommand(name),
    })) }] },
  ];

  return (
    <div id={id} className="j-slab j-fnd-card" style={card}>
      <div style={between}><strong style={caption}>Workspace</strong><Badge>{profile}</Badge></div>
      <div style={{ ...inset, padding: 5 }} onKeyDown={(event) => {
        if (event.defaultPrevented || event.altKey || (!event.metaKey && !event.ctrlKey)) return;
        const key = event.key.toLowerCase();
        const command = key === 'n' && !event.shiftKey ? newWindow : key === 'e' && event.shiftKey ? exportSvg : undefined;
        if (!command) return;
        event.preventDefault();
        if (menu) event.currentTarget.querySelector<HTMLButtonElement>('[role="menubar"] [aria-expanded="true"]')?.focus();
        setMenu(null);
        command.onSelect();
      }}>
        <Menubar menus={menus} value={menu} onValueChange={setMenu} label="Workspace commands" />
        <svg ref={preview} viewBox="0 0 280 82" width="100%" height="82" role="img"
          aria-label={`${profile} workspace with ${windows} ${windows === 1 ? 'window' : 'windows'} and rulers ${rulers ? 'on' : 'off'}`}
          fill="var(--fill-slab)" style={{ display: 'block', borderRadius: 10, marginTop: 4,
            color: 'var(--fill-on)', background: 'var(--fill-slab)' }}>
          <rect width="280" height="82" />
          {rulers && <path d="M0 2H280" fill="none" stroke="currentColor" strokeOpacity=".35" strokeWidth="4" strokeDasharray="1 7" />}
          {Array.from({ length: Math.min(windows, 3) }, (_, i) => (
            <g key={i} transform={`translate(${84 + i * 8} ${17 + i * 4})`}>
              <rect width="108" height="45" rx="4" stroke="currentColor" strokeOpacity=".48" />
              <path d="M1 9H107" stroke="currentColor" strokeOpacity=".25" />
              {profile === 'Studio' && <rect x="1" y="10" width="24" height="34" fill="currentColor" opacity=".08" />}
            </g>
          ))}
        </svg>
      </div>
      <div style={{ ...between, ...muted, paddingInline: 3 }}>
        <span>{windows} {windows === 1 ? 'window' : 'windows'}</span>
        <span>Rulers {rulers ? 'on' : 'off'}</span>
      </div>
      <span role="status" style={visuallyHidden}>{notice}</span>
    </div>
  );
}

const navigationSections = [
  { value: 'primitives', label: 'Primitives', links: [
    { target: 'button-kit', name: 'Buttons', description: 'Sizes, variants, and loading states.' },
    { target: 'dialog-modal', name: 'Dialog', description: 'A focused confirmation flow.' },
  ] },
  { value: 'behaviors', label: 'Behaviors', links: [
    { target: 'scrub-panel', name: 'Scrub', description: 'Drag to adjust a numerical value.' },
    { target: 'morph-card', name: 'Morph', description: 'A card that expands in place.' },
  ] },
  { value: 'audio', label: 'Audio', links: [
    { target: 'audio-wave-trim', name: 'Wave Trim', description: 'Set in and out points on a waveform.' },
    { target: 'slide-confirm', name: 'Slide Confirm', description: 'Hear the confirmation cue on release.' },
  ] },
] as const;
type Section = (typeof navigationSections)[number]['value'];

export function NavigationMenuKit({ id = 'navigation-menu-kit' }: KitProps = {}) {
  const { playSound } = useJuice();
  const [section, setSection] = useState<Section | null>('primitives');
  const [selected, setSelected] = useState<string | null>(null);
  const selectSection = (next: Section | null) => {
    if (next !== null && !navigationSections.some(({ value }) => value === next)) return;
    if (next !== section) playSound('tap');
    setSection(next);
  };
  useJuiceAgentNode(id, 'NavigationMenuKit', { section, selected }, { selectSection });

  return (
    <div id={id} className="j-slab j-fnd-card" style={card}>
      <NavigationMenu label="Browse Juice examples" value={section} onValueChange={selectSection}
        sections={navigationSections.map(({ links, ...item }) => ({ ...item, children: (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 5 }}>
            {links.map((link) => (
              <a key={link.target} href={`#${link.target}`} aria-current={selected === link.target ? 'location' : undefined}
                onClick={() => { setSelected(link.target); playSound('tap'); }}
                style={{ display: 'grid', alignContent: 'start', gap: 4, padding: 8, background: 'var(--fill-slab)',
                  color: 'inherit', textDecoration: 'none', borderRadius: 10 }}>
                <span style={{ ...between, ...caption }}>{link.name}{selected === link.target
                  ? <Check size={13} aria-hidden="true" /> : <ArrowUpRight size={13} aria-hidden="true" />}</span>
                <span style={{ ...muted, lineHeight: 1.35 }}>{link.description}</span>
              </a>
            ))}
          </div>
        ) }))} />
    </div>
  );
}

const textStyles = [
  { value: 'bold', label: 'Bold', icon: Bold },
  { value: 'italic', label: 'Italic', icon: Italic },
  { value: 'underline', label: 'Underline', icon: Underline },
] as const;
const alignments = [
  { value: 'left', label: 'Align left', icon: AlignLeft },
  { value: 'center', label: 'Align center', icon: AlignCenter },
  { value: 'right', label: 'Align right', icon: AlignRight },
] as const;
type TextStyle = (typeof textStyles)[number]['value'];
type Alignment = (typeof alignments)[number]['value'];

export function ToggleToolbarKit({ id = 'toggle-toolbar-kit' }: KitProps = {}) {
  const [styles, setStyles] = useState<string[]>([]);
  const [align, updateAlign] = useState<Alignment>('left');
  const [pinned, setPinned] = useState(false);
  const setAlign = (value: string) => {
    const alignment = alignments.find((item) => item.value === value);
    if (alignment) updateAlign(alignment.value);
  };
  useJuiceAgentNode(id, 'ToggleToolbarKit', { styles, align, pinned }, {
    toggleStyle: (style: TextStyle) => {
      if (textStyles.some((item) => item.value === style)) {
        setStyles((current) => current.includes(style) ? current.filter((item) => item !== style) : [...current, style]);
      }
    }, setAlign, togglePin: () => setPinned((current) => !current),
  });

  return (
    <div id={id} className="j-slab j-fnd-card" style={card}>
      <div style={between}><strong style={caption}>Text formatting</strong>{pinned && <Badge tone="signal">Pinned</Badge>}</div>
      <div style={{ ...inset, padding: 5 }}>
        <Toolbar label="Text formatting">
          <ToggleGroup label="Text style" type="multiple" value={styles} onValueChange={setStyles}>
            {textStyles.map(({ value, label, icon: Icon }) => (
              <ToggleGroupItem key={value} value={value} aria-label={label}><Icon size={14} aria-hidden="true" /></ToggleGroupItem>
            ))}
          </ToggleGroup>
          <Separator orientation="vertical" style={{ marginInline: 3 }} />
          <ToggleGroup label="Text alignment" type="single" value={align} onValueChange={setAlign}>
            {alignments.map(({ value, label, icon: Icon }) => (
              <ToggleGroupItem key={value} value={value} aria-label={label}><Icon size={14} aria-hidden="true" /></ToggleGroupItem>
            ))}
          </ToggleGroup>
          <Separator orientation="vertical" style={{ marginInline: 3 }} />
          <Toggle pressed={pinned} onPressedChange={setPinned} aria-label="Pin preview"><Pin size={14} aria-hidden="true" /></Toggle>
        </Toolbar>
      </div>
      <div style={{ ...inset, padding: '16px 12px', textAlign: align, fontSize: 22, lineHeight: 1.15,
        letterSpacing: '-0.04em', fontWeight: styles.includes('bold') ? 750 : 400,
        fontStyle: styles.includes('italic') ? 'italic' : undefined, textDecoration: styles.includes('underline') ? 'underline' : undefined }}>
        Notes from the studio.
      </div>
    </div>
  );
}

const eventLog = [
  ['10:42:08', 'Workspace resumed'], ['10:42:09', 'Session authenticated'],
  ['10:42:11', 'Loaded 24 layers'], ['10:42:15', 'Components indexed'],
  ['10:42:16', 'Token checks passed'], ['10:42:18', 'Preview built in 82 ms'],
  ['10:42:20', 'Canvas synced'], ['10:42:21', 'Snapshot saved'],
  ['10:42:25', 'Export queued'], ['10:42:26', 'Export ready'],
] as const;
const scrollStops = [
  { value: 'top', label: 'Top', fraction: 0 }, { value: 'middle', label: 'Middle', fraction: 0.5 },
  { value: 'bottom', label: 'Bottom', fraction: 1 },
] as const;
type ScrollPosition = (typeof scrollStops)[number]['value'];

export function ScrollAreaKit({ id = 'scroll-area-kit' }: KitProps = {}) {
  const viewport = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const scrollToPos = (position: ScrollPosition) => {
    const stop = scrollStops.find(({ value }) => value === position);
    const element = viewport.current;
    if (stop && element) element.scrollTop = (element.scrollHeight - element.clientHeight) * stop.fraction;
  };
  useJuiceAgentNode(id, 'ScrollAreaKit', { progress }, { scrollToPos });

  return (
    <div id={id} className="j-slab j-fnd-card" style={card}>
      <div style={between}>
        <strong style={caption}>Event log</strong>
        <span style={{ ...muted, fontVariantNumeric: 'tabular-nums' }} aria-label={`Scroll progress ${progress}%`}>
          <span aria-hidden="true"><RollingNumber value={progress} suffix="%" /></span>
        </span>
      </div>
      <ScrollArea label="Workspace events" viewportRef={viewport} onScrollProgress={(value) => setProgress(Math.round(value * 100))}>
        <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {eventLog.map(([time, message], index) => (
            <li key={time} style={{ ...row, minHeight: 24, paddingInline: 4, fontSize: 12,
              borderBottom: index < eventLog.length - 1 ? '1px solid var(--juice-w12)' : undefined }}>
              <time style={{ ...muted, fontFamily: 'var(--juice-font-mono)', fontSize: 10.5 }}>{time}</time>
              <span>{message}</span>
            </li>
          ))}
        </ol>
      </ScrollArea>
      <div style={row}>
        {scrollStops.map((stop) => (
          <button key={stop.value} type="button" className="j-chip" onClick={() => scrollToPos(stop.value)}>{stop.label}</button>
        ))}
      </div>
    </div>
  );
}

const ratios = [
  { value: '16:9', label: '16:9', name: 'Widescreen', ratio: 16 / 9 },
  { value: '4:3', label: '4:3', name: 'Classic', ratio: 4 / 3 },
  { value: '1:1', label: '1:1', name: 'Square', ratio: 1 },
  { value: '21:9', label: '21:9', name: 'Cinema', ratio: 21 / 9 },
] as const;
type Ratio = (typeof ratios)[number]['value'];

export function AspectRatioKit({ id = 'aspect-ratio-kit' }: KitProps = {}) {
  const [ratio, updateRatio] = useState<Ratio>('16:9');
  const [size, setSize] = useState({ width: 0, height: 0 });
  const preview = useRef<HTMLDivElement>(null);
  const current = ratios.find((option) => option.value === ratio) ?? ratios[0];
  const setRatio = (next: Ratio) => { if (ratios.some((option) => option.value === next)) updateRatio(next); };

  useLayoutEffect(() => {
    const element = preview.current;
    if (!element) return;
    const measure = () => {
      const { width, height } = element.getBoundingClientRect();
      const next = { width: Math.round(width), height: Math.round(height) };
      setSize((previous) => previous.width === next.width && previous.height === next.height ? previous : next);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  useJuiceAgentNode(id, 'AspectRatioKit', { ratio, ...size }, { setRatio });

  return (
    <div id={id} className="j-slab j-fnd-card" style={card}>
      <div style={between}>
        <strong style={{ ...row, ...caption }}><Maximize2 size={13} aria-hidden="true" /> Crop frame</strong>
        <span style={{ ...muted, fontFamily: 'var(--juice-font-mono)' }}>{size.width} × {size.height} px</span>
      </div>
      <SegmentedControl options={ratios} value={ratio} onChange={setRatio} />
      <AspectRatio ratio={current.ratio} style={{ ...inset, padding: 0 }}>
        <div ref={preview} style={{ width: '100%', height: '100%', position: 'relative', display: 'grid', placeItems: 'center' }}>
          <div aria-hidden="true" style={{ position: 'absolute', left: '33.333%', top: '50%', translate: '-50% -50%',
            width: '55%', aspectRatio: '1', borderRadius: '50%',
            background: 'repeating-conic-gradient(var(--juice-soft) 0deg 10deg, var(--fill-slab) 10deg 20deg)' }} />
          {[1, 2].map((line) => (
            <div key={line} aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
              <i style={{ position: 'absolute', top: 0, bottom: 0, left: `${line * 100 / 3}%`, width: 1, background: 'var(--juice-w20)' }} />
              <i style={{ position: 'absolute', left: 0, right: 0, top: `${line * 100 / 3}%`, height: 1, background: 'var(--juice-w20)' }} />
            </div>
          ))}
          <span style={{ ...muted, position: 'absolute', right: 8, bottom: 8, padding: '3px 6px',
            borderRadius: 5, background: 'var(--fill-slab)' }}>{current.name}</span>
        </div>
      </AspectRatio>
    </div>
  );
}

export function AlertDialogKit({ id = 'alert-dialog-kit' }: KitProps = {}) {
  const [open, setOpen] = useState(false);
  const [revoked, setRevoked] = useState(false);
  const [sample, setSample] = useState(1);
  const openAlert = () => {
    if (revoked) {
      setSample((number) => number + 1);
      setRevoked(false);
    }
    setOpen(true);
  };
  const cancelAlert = () => setOpen(false);
  const confirmRevoke = () => {
    if (!open) return;
    setRevoked(true);
    setOpen(false);
  };
  useJuiceAgentNode(id, 'AlertDialogKit', { open, revoked, sample }, { openAlert, cancelAlert, confirmRevoke });

  return (
    <div id={id} className="j-slab j-fnd-card" style={card}>
      <div style={between}>
        <strong style={caption}>Production API token</strong>
        <span role="status"><Badge tone={revoked ? 'danger' : 'ok'}>{revoked ? 'Revoked' : 'Active'}</Badge></span>
      </div>
      <div style={{ ...inset, ...between }}>
        <code style={{ ...muted, fontFamily: 'var(--juice-font-mono)' }}>sample_{String(sample).padStart(3, '0')}</code>
        <AlertDialog open={open} onOpenChange={(next) => next ? openAlert() : cancelAlert()}
          trigger={revoked ? 'Try a new sample' : 'Revoke token'} dismissOnEscape={false}
          title={<><ShieldAlert size={17} aria-hidden="true" style={{ color: 'var(--juice-danger)' }} /> Revoke Production API Token?</>}
          description="Requests using this sample token will fail immediately. Revocation cannot be undone."
          actionLabel="Revoke Token" action={confirmRevoke} />
      </div>
    </div>
  );
}

const rangeScale = sliderScale(0, 100, 5, 2);
const thresholdRules = [
  'Warn when latency crosses the upper bound',
  'Flag readings below the lower bound',
  'Include both limits in exports',
];

export function CollapsibleRangeKit({ id = 'collapsible-range-kit' }: KitProps = {}) {
  const labelId = useId();
  const lowerId = useId();
  const upperId = useId();
  const [range, updateRange] = useState<RangeValue>([20, 75]);
  const [open, setOpen] = useState(false);
  const [rules, setRules] = useState([true, false, true]);
  const setRange = (next: RangeValue) => {
    if (!Array.isArray(next) || next.length !== 2 || !next.every(Number.isFinite)) return;
    const [lower, upper] = normalizeRange(next, rangeScale);
    updateRange([rangeScale.toValue(lower), rangeScale.toValue(upper)]);
  };
  useJuiceAgentNode(id, 'CollapsibleRangeKit', { range, open, rules }, { setRange, toggleCollapsible: () => setOpen((current) => !current) });

  return (
    <div id={id} className="j-slab j-fnd-card" style={card}>
      <div style={inset}>
        <div style={between}>
          <Label id={labelId} htmlFor={lowerId} style={caption}>Latency band</Label>
          <output htmlFor={`${lowerId} ${upperId}`} style={{ ...muted, fontFamily: 'var(--juice-font-mono)' }}>
            {range[0]}ms – {range[1]}ms
          </output>
        </div>
        <Label id={`${lowerId}-label`} htmlFor={lowerId} style={visuallyHidden}>Minimum latency</Label>
        <Label id={`${upperId}-label`} htmlFor={upperId} style={visuallyHidden}>Maximum latency</Label>
        <RangeSlider value={range} onValueChange={setRange} step={5} minStepsBetweenThumbs={2}
          thumbIds={[lowerId, upperId]} thumbLabelIds={[`${lowerId}-label`, `${upperId}-label`]} formatValue={(value) => `${value} milliseconds`} />
      </div>
      <Collapsible open={open} onOpenChange={setOpen} trigger="3 Advanced Threshold Rules">
        <div style={{ display: 'grid', gap: 7, paddingTop: 3 }}>
          {thresholdRules.map((rule, index) => {
            const ruleId = `${labelId}-rule-${index}`;
            return (
              <div key={rule} style={row}>
                <Checkbox id={ruleId} checked={rules[index]} onChange={(checked) => setRules((previous) =>
                  previous.map((value, i) => i === index ? checked : value))} />
                <Label htmlFor={ruleId} style={{ cursor: 'pointer' }}>{rule}</Label>
              </div>
            );
          })}
        </div>
      </Collapsible>
    </div>
  );
}
