"use client";
/**
 * Juice Composable Headless Behaviors & Agent/Joplo Bridge
 * Inspired by ui-sdk.dev (@ui-sdk/core) + Joplo Engine Contract.
 *
 * Key Invariants:
 * 1. Dual-Driven State: Every component supports both uncontrolled (audience live play)
 *    and controlled (external React state or Joplo scripted timeline step).
 * 2. Engine-Clocked Determinism: When `animate: false` (e.g. Joplo storyboard / screenshot),
 *    transitions resolve immediately to their target steady state.
 * 3. Agent Bridge (`window.__juiceAgent`): Exposes `snapshot()`, `act(id, action, payload)`,
 *    and `query()` so AI agents or host players can read and drive components programmatically.
 */

import {
  cloneElement,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactElement,
  type ReactNode,
  type Ref,
  type SyntheticEvent,
} from 'react';
import { clsx } from 'clsx';
import {
  isJuiceSoundEnabled,
  playJuiceSound,
  setJuiceSoundEnabled,
  subscribeJuiceSound,
  type JuiceSoundName,
} from './sound.ts';
import {
  ensureJuiceAgentBridge,
  registerJuiceAgentNode,
  unregisterJuiceAgentNode,
  type JuiceAgentBridge,
  type JuiceAgentNodeEntry,
  type JuiceFill,
  type JuiceTheme,
} from './bridge.ts';

export {
  ensureJuiceAgentBridge,
  registerJuiceAgentNode,
  unregisterJuiceAgentNode,
  type JuiceAgentBridge,
  type JuiceAgentNodeEntry,
  type JuiceFill,
  type JuiceTheme,
};

export type JuiceConfig = {
  theme: JuiceTheme;
  fill: JuiceFill;
  sound: boolean;
  /** When false, disables spring motion so static screenshots / storyboards settle at t=1 immediately. */
  animate: boolean;
  setTheme: (theme: JuiceTheme) => void;
  setFill: (fill: JuiceFill) => void;
  setSound: (enabled: boolean) => void;
  setAnimate: (animate: boolean) => void;
  playSound: (name: JuiceSoundName) => void;
};

const JuiceContext = createContext<JuiceConfig | null>(null);

export type JuiceProviderProps = {
  defaultTheme?: JuiceTheme;
  defaultFill?: JuiceFill;
  defaultSound?: boolean;
  defaultAnimate?: boolean;
  theme?: JuiceTheme;
  fill?: JuiceFill;
  sound?: boolean;
  animate?: boolean;
  children: ReactNode;
};

export function JuiceProvider({
  defaultTheme = 'light',
  defaultFill = 'slab',
  defaultSound,
  defaultAnimate = true,
  theme: controlledTheme,
  fill: controlledFill,
  sound: controlledSound,
  animate: controlledAnimate,
  children,
}: JuiceProviderProps) {
  const parentCtx = useContext(JuiceContext);
  const [internalTheme, setInternalTheme] = useState<JuiceTheme>(defaultTheme);
  const [internalFill, setInternalFill] = useState<JuiceFill>(defaultFill);
  const [internalSound, setInternalSound] = useState<boolean>(() =>
    controlledSound !== undefined
      ? controlledSound
      : defaultSound !== undefined
        ? defaultSound
        : parentCtx !== null
          ? parentCtx.sound
          : isJuiceSoundEnabled(),
  );
  const [internalAnimate, setInternalAnimate] = useState<boolean>(defaultAnimate);

  const theme = controlledTheme ?? internalTheme;
  const fill = controlledFill ?? internalFill;
  const sound = controlledSound ?? internalSound;
  const animate = controlledAnimate ?? internalAnimate;

  useEffect(() => {
    if (parentCtx === null || controlledSound !== undefined || defaultSound !== undefined) {
      setJuiceSoundEnabled(sound);
    }
  }, [sound, parentCtx, controlledSound, defaultSound]);

  useEffect(() => {
    return subscribeJuiceSound(() => {
      setInternalSound(isJuiceSoundEnabled());
    });
  }, []);

  const playSound = useCallback(
    (name: JuiceSoundName) => {
      if (sound) playJuiceSound(name);
    },
    [sound],
  );

  const value = useMemo<JuiceConfig>(
    () => ({
      theme,
      fill,
      sound,
      animate,
      setTheme: setInternalTheme,
      setFill: setInternalFill,
      setSound: (next: boolean) => {
        setInternalSound(next);
        setJuiceSoundEnabled(next);
      },
      setAnimate: setInternalAnimate,
      playSound,
    }),
    [theme, fill, sound, animate, playSound],
  );

  return (
    <JuiceContext.Provider value={value}>
      <div
        className="juice-root"
        data-theme={theme}
        data-fill={fill === 'solid' ? 'dark' : theme === 'dark' ? 'dark' : 'light'}
        data-tone={fill}
        data-animate={animate ? 'on' : 'off'}
      >
        {children}
      </div>
    </JuiceContext.Provider>
  );
}

type FallbackJuiceSnapshot = {
  theme: JuiceTheme;
  fill: JuiceFill;
  sound: boolean;
  animate: boolean;
};

let fallbackJuiceState: FallbackJuiceSnapshot = {
  theme: 'light',
  fill: 'slab',
  sound: isJuiceSoundEnabled(),
  animate: true,
};

const fallbackJuiceListeners = new Set<() => void>();

function notifyFallbackJuice() {
  for (const listener of fallbackJuiceListeners) listener();
}

function updateFallbackJuice(patch: Partial<FallbackJuiceSnapshot>) {
  const next: FallbackJuiceSnapshot = { ...fallbackJuiceState, ...patch };
  if (
    next.theme === fallbackJuiceState.theme &&
    next.fill === fallbackJuiceState.fill &&
    next.sound === fallbackJuiceState.sound &&
    next.animate === fallbackJuiceState.animate
  ) {
    return;
  }
  fallbackJuiceState = next;
  notifyFallbackJuice();
}

function subscribeFallbackJuice(listener: () => void): () => void {
  fallbackJuiceListeners.add(listener);
  const unsubSound = subscribeJuiceSound(() => {
    const enabled = isJuiceSoundEnabled();
    if (fallbackJuiceState.sound !== enabled) {
      fallbackJuiceState = { ...fallbackJuiceState, sound: enabled };
      listener();
    }
  });
  return () => {
    fallbackJuiceListeners.delete(listener);
    unsubSound();
  };
}

function getFallbackJuiceSnapshot(): FallbackJuiceSnapshot {
  const currentSound = isJuiceSoundEnabled();
  if (fallbackJuiceState.sound !== currentSound) {
    fallbackJuiceState = { ...fallbackJuiceState, sound: currentSound };
  }
  return fallbackJuiceState;
}

const fallbackSetTheme = (next: JuiceTheme) => updateFallbackJuice({ theme: next });
const fallbackSetFill = (next: JuiceFill) => updateFallbackJuice({ fill: next });
const fallbackSetSound = (enabled: boolean) => {
  setJuiceSoundEnabled(enabled);
  updateFallbackJuice({ sound: enabled });
};
const fallbackSetAnimate = (next: boolean) => updateFallbackJuice({ animate: next });
const fallbackPlaySound = (name: JuiceSoundName) => {
  if (fallbackJuiceState.sound && isJuiceSoundEnabled()) {
    playJuiceSound(name);
  }
};

export function useJuice(): JuiceConfig {
  const ctx = useContext(JuiceContext);
  const fallback = useSyncExternalStore(
    subscribeFallbackJuice,
    getFallbackJuiceSnapshot,
    getFallbackJuiceSnapshot,
  );

  // Ensure window.__juiceAgent is available even when used without <JuiceProvider>
  ensureJuiceAgentBridge();

  return useMemo<JuiceConfig>(() => {
    if (ctx) return ctx;
    return {
      theme: fallback.theme,
      fill: fallback.fill,
      sound: fallback.sound,
      animate: fallback.animate,
      setTheme: fallbackSetTheme,
      setFill: fallbackSetFill,
      setSound: fallbackSetSound,
      setAnimate: fallbackSetAnimate,
      playSound: fallbackPlaySound,
    };
  }, [ctx, fallback]);
}

// ---------------------------------------------------------------------------
// 1. Controllable State Behavior (Dual-Driven: Timeline Script + Free Play)
// ---------------------------------------------------------------------------

export function useControllableState<T>({
  value,
  defaultValue,
  onChange,
}: {
  value?: T;
  defaultValue: T;
  onChange?: (next: T) => void;
}): [T, (next: T | ((prev: T) => T)) => void] {
  const [internal, setInternal] = useState<T>(defaultValue);
  const isControlled = value !== undefined;
  const current = isControlled ? value : internal;
  const currentRef = useRef(current);
  currentRef.current = current;

  const set = useCallback(
    (next: T | ((prev: T) => T)) => {
      const resolved = typeof next === 'function' ? (next as (prev: T) => T)(currentRef.current) : next;
      if (!isControlled) {
        setInternal(resolved);
      }
      onChange?.(resolved);
    },
    [isControlled, onChange],
  );

  return [current, set];
}

// ---------------------------------------------------------------------------
// 2. Scrub Drag Behavior (Direct Manipulation Row / Slider + Keyboard Arrows)
// ---------------------------------------------------------------------------

export function useScrubDrag({
  value,
  min = 0,
  max = 100,
  step = 1,
  disabled = false,
  onChange,
  onScrubSound,
}: {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  onChange: (next: number) => void;
  onScrubSound?: () => void;
}) {
  const [held, setHeld] = useState(false);
  const trackRef = useRef<HTMLElement | null>(null);
  const lastSoundStepRef = useRef<number>(value);

  const clampAndSnap = useCallback(
    (raw: number) => {
      const clamped = Math.min(max, Math.max(min, raw));
      const stepped = Math.round((clamped - min) / step) * step + min;
      return Number(Math.min(max, Math.max(min, stepped)).toFixed(4));
    },
    [min, max, step],
  );

  const updateFromClientX = useCallback(
    (clientX: number) => {
      const el = trackRef.current;
      if (!el || disabled) return;
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0) return;
      const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      const next = clampAndSnap(min + ratio * (max - min));
      if (next !== lastSoundStepRef.current) {
        lastSoundStepRef.current = next;
        onScrubSound?.();
        onChange(next);
      }
    },
    [clampAndSnap, disabled, max, min, onChange, onScrubSound],
  );

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLElement>) => {
      if (disabled) return;
      e.currentTarget.setPointerCapture?.(e.pointerId);
      setHeld(true);
      updateFromClientX(e.clientX);
    },
    [disabled, updateFromClientX],
  );

  const onPointerMove = useCallback(
    (e: ReactPointerEvent<HTMLElement>) => {
      if (!held || disabled) return;
      updateFromClientX(e.clientX);
    },
    [disabled, held, updateFromClientX],
  );

  const onPointerUp = useCallback(() => {
    if (held) setHeld(false);
  }, [held]);

  const onKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLElement>) => {
      if (disabled) return;
      const largeStep = Math.max(step, (max - min) / 10);
      let next: number | null = null;
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') next = clampAndSnap(value + step);
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') next = clampAndSnap(value - step);
      else if (e.key === 'PageUp') next = clampAndSnap(value + largeStep);
      else if (e.key === 'PageDown') next = clampAndSnap(value - largeStep);
      else if (e.key === 'Home') next = min;
      else if (e.key === 'End') next = max;

      if (next !== null && next !== value) {
        e.preventDefault();
        lastSoundStepRef.current = next;
        onScrubSound?.();
        onChange(next);
      }
    },
    [clampAndSnap, disabled, max, min, onChange, onScrubSound, step, value],
  );

  const percent = max > min ? Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100)) : 0;

  return {
    trackRef,
    held,
    percent,
    scrubProps: {
      role: 'slider' as const,
      tabIndex: disabled ? -1 : 0,
      'aria-valuemin': min,
      'aria-valuemax': max,
      'aria-valuenow': value,
      'data-held': held ? 'true' : undefined,
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: onPointerUp,
      onKeyDown,
    },
  };
}

// ---------------------------------------------------------------------------
// 3. Roving Focus Behavior (Keyboard Navigation across List / Command / Tabs)
// ---------------------------------------------------------------------------

export function useRovingFocus<T extends string>({
  items,
  active,
  onSelect,
  orientation = 'vertical',
}: {
  items: readonly T[];
  active: T;
  onSelect: (item: T) => void;
  orientation?: 'horizontal' | 'vertical' | 'both';
}) {
  const onKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLElement>) => {
      if (items.length === 0) return;
      const idx = Math.max(0, items.indexOf(active));
      const nextKeys =
        orientation === 'horizontal'
          ? ['ArrowRight']
          : orientation === 'vertical'
            ? ['ArrowDown']
            : ['ArrowRight', 'ArrowDown'];
      const prevKeys =
        orientation === 'horizontal'
          ? ['ArrowLeft']
          : orientation === 'vertical'
            ? ['ArrowUp']
            : ['ArrowLeft', 'ArrowUp'];

      if (nextKeys.includes(e.key)) {
        e.preventDefault();
        const nextItem = items[(idx + 1) % items.length];
        if (nextItem !== undefined) onSelect(nextItem);
      } else if (prevKeys.includes(e.key)) {
        e.preventDefault();
        const prevItem = items[(idx - 1 + items.length) % items.length];
        if (prevItem !== undefined) onSelect(prevItem);
      } else if (e.key === 'Home') {
        e.preventDefault();
        const first = items[0];
        if (first !== undefined) onSelect(first);
      } else if (e.key === 'End') {
        e.preventDefault();
        const last = items[items.length - 1];
        if (last !== undefined) onSelect(last);
      }
    },
    [active, items, onSelect, orientation],
  );

  return { onKeyDown };
}

// ---------------------------------------------------------------------------
// 4. UI SDK-Style Agent Bridge (`window.__juiceAgent`: snapshot / act / query)
// ---------------------------------------------------------------------------

export function useJuiceAgentNode(
  id: string | undefined,
  type: string,
  state: Record<string, unknown>,
  actions: Record<string, (payload?: any) => void>,
) {
  const stateRef = useRef(state);
  stateRef.current = state;
  const actionsRef = useRef(actions);
  actionsRef.current = actions;

  useEffect(() => {
    if (!id) return;
    return registerJuiceAgentNode({
      id,
      type,
      getState: () => stateRef.current,
      act: (action: string, payload?: unknown) => {
        const fn = actionsRef.current[action];
        if (!fn) return false;
        fn(payload);
        return true;
      },
    });
  }, [id, type]);
}

// ---------------------------------------------------------------------------
// 5. SSR-Safe Layout Effect, Native Reduced Motion, and `asChild` / `render` Slot
// ---------------------------------------------------------------------------

export const useIsomorphicLayoutEffect = typeof document === 'undefined' ? useEffect : useLayoutEffect;

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState<boolean>(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduced(media.matches);
    sync();
    media.addEventListener?.('change', sync);
    return () => media.removeEventListener?.('change', sync);
  }, []);

  return reduced;
}

export type RenderProp<P = Record<string, unknown>> = ReactElement | ((props: P) => ReactElement);

export type SlottableProps<P = Record<string, unknown>> = {
  asChild?: boolean;
  render?: RenderProp<P>;
};

export function assignRef<T>(ref: Ref<T> | undefined, value: T | null): (() => void) | void {
  if (typeof ref === 'function') return ref(value) ?? undefined;
  if (ref && typeof ref === 'object') {
    (ref as { current: T | null }).current = value;
  }
}

export function composeRefs<T>(...refs: Array<Ref<T> | undefined>): (node: T | null) => (() => void) | void {
  return (node: T | null) => {
    const cleanups: Array<() => void> = [];
    for (const ref of refs) {
      const cleanup = assignRef(ref, node);
      if (typeof cleanup === 'function') cleanups.push(cleanup);
    }
    if (cleanups.length > 0) {
      return () => {
        for (const cleanup of cleanups) cleanup();
      };
    }
  };
}

export function chainEvent<E extends SyntheticEvent>(
  first?: (event: E) => void,
  second?: (event: E) => void,
): ((event: E) => void) | undefined {
  if (!first) return second;
  if (!second) return first;
  return (event: E) => {
    first(event);
    if (!event.defaultPrevented) second(event);
  };
}

type AnyRecord = Record<string, any>;

const CHAINABLE_EVENTS = [
  'onClick',
  'onKeyDown',
  'onKeyUp',
  'onPointerDown',
  'onPointerUp',
  'onPointerEnter',
  'onPointerLeave',
  'onPointerMove',
  'onMouseDown',
  'onMouseEnter',
  'onMouseLeave',
  'onFocus',
  'onBlur',
  'onContextMenu',
] as const;

export function renderSlottedElement<E extends HTMLElement = HTMLElement>(
  element: ReactElement,
  slotProps: AnyRecord,
  ref?: Ref<E>,
  options?: { asChild?: boolean; children?: ReactNode; wrapChildren?: (childContent: ReactNode) => ReactNode },
): ReactElement {
  if (!isValidElement<AnyRecord>(element)) {
    throw new Error('Slotted component (asChild/render) requires a single valid React element.');
  }
  const child = element.props;
  // React 18 stores ref on the element; React 19 exposes ref on props.
  const childRef =
    Object.getOwnPropertyDescriptor(child, 'ref')?.value ??
    Object.getOwnPropertyDescriptor(element, 'ref')?.value;

  const merged: AnyRecord = { ...slotProps, ...child };

  // Keep ARIA / data attributes from slotProps unless child explicitly overrides them
  for (const key of Object.keys(slotProps)) {
    if ((key.startsWith('aria-') || key.startsWith('data-')) && child[key] === undefined) {
      merged[key] = slotProps[key];
    }
  }

  // Only pass `type` when rendering a native `<button>` or when child already defines `type`
  if (element.type !== 'button' && child.type === undefined) {
    delete merged.type;
  } else {
    merged.type = child.type ?? slotProps.type ?? (element.type === 'button' ? 'button' : undefined);
  }

  if (slotProps.disabled || child.disabled) {
    merged.disabled = true;
  }

  merged.className = clsx(slotProps.className, child.className);
  if (slotProps.style || child.style) {
    merged.style = { ...(slotProps.style as CSSProperties), ...(child.style as CSSProperties) };
  }

  for (const evt of CHAINABLE_EVENTS) {
    if (child[evt] && slotProps[evt]) {
      merged[evt] = chainEvent(child[evt], slotProps[evt]);
    } else if (slotProps[evt]) {
      merged[evt] = slotProps[evt];
    }
  }

  const baseChildren = options?.asChild ? child.children : (options?.children ?? child.children);
  merged.children = options?.wrapChildren ? options.wrapChildren(baseChildren) : baseChildren;
  merged.ref = composeRefs(childRef, ref);

  return cloneElement(element, merged);
}
