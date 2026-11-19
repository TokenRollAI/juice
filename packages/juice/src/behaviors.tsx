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
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import {
  isJuiceSoundEnabled,
  playJuiceSound,
  setJuiceSoundEnabled,
  subscribeJuiceSound,
  type JuiceSoundName,
} from './sound.ts';

export type JuiceTheme = 'light' | 'dark';
export type JuiceFill = 'slab' | 'solid';

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
  defaultSound = true,
  defaultAnimate = true,
  theme: controlledTheme,
  fill: controlledFill,
  sound: controlledSound,
  animate: controlledAnimate,
  children,
}: JuiceProviderProps) {
  const [internalTheme, setInternalTheme] = useState<JuiceTheme>(defaultTheme);
  const [internalFill, setInternalFill] = useState<JuiceFill>(defaultFill);
  const [internalSound, setInternalSound] = useState<boolean>(() =>
    controlledSound !== undefined ? controlledSound : defaultSound && isJuiceSoundEnabled(),
  );
  const [internalAnimate, setInternalAnimate] = useState<boolean>(defaultAnimate);

  const theme = controlledTheme ?? internalTheme;
  const fill = controlledFill ?? internalFill;
  const sound = controlledSound ?? internalSound;
  const animate = controlledAnimate ?? internalAnimate;

  useEffect(() => {
    setJuiceSoundEnabled(sound);
  }, [sound]);

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

export function useJuice(): JuiceConfig {
  const ctx = useContext(JuiceContext);
  if (ctx) return ctx;
  return {
    theme: 'light',
    fill: 'slab',
    sound: isJuiceSoundEnabled(),
    animate: true,
    setTheme: () => {},
    setFill: () => {},
    setSound: setJuiceSoundEnabled,
    setAnimate: () => {},
    playSound: (name) => playJuiceSound(name),
  };
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

export type JuiceAgentNodeEntry = {
  id: string;
  type: string;
  getState: () => Record<string, unknown>;
  act: (action: string, payload?: unknown) => boolean;
};

const agentRegistry = new Map<string, JuiceAgentNodeEntry>();

export type JuiceAgentBridge = {
  snapshot: () => Record<string, { type: string; state: Record<string, unknown> }>;
  query: (typeOrId?: string) => Array<{ id: string; type: string; state: Record<string, unknown> }>;
  act: (id: string, action: string, payload?: unknown) => boolean;
};

if (typeof window !== 'undefined') {
  const bridge: JuiceAgentBridge = {
    snapshot() {
      const out: Record<string, { type: string; state: Record<string, unknown> }> = {};
      for (const [id, entry] of agentRegistry.entries()) {
        out[id] = { type: entry.type, state: entry.getState() };
      }
      return out;
    },
    query(typeOrId?: string) {
      const list: Array<{ id: string; type: string; state: Record<string, unknown> }> = [];
      for (const [id, entry] of agentRegistry.entries()) {
        if (!typeOrId || id === typeOrId || entry.type.toLowerCase().includes(typeOrId.toLowerCase())) {
          list.push({ id, type: entry.type, state: entry.getState() });
        }
      }
      return list;
    },
    act(id: string, action: string, payload?: unknown) {
      const entry = agentRegistry.get(id);
      if (!entry) return false;
      return entry.act(action, payload);
    },
  };
  (window as unknown as { __juiceAgent?: JuiceAgentBridge }).__juiceAgent = bridge;
}

export function registerJuiceAgentNode(entry: JuiceAgentNodeEntry): () => void {
  agentRegistry.set(entry.id, entry);
  return () => {
    agentRegistry.delete(entry.id);
  };
}

export function unregisterJuiceAgentNode(id: string): void {
  agentRegistry.delete(id);
}

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
