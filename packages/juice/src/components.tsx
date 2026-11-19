import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
} from 'react';
import { clsx } from 'clsx';
import {
  ArrowRight,
  ArrowUp,
  Check,
  ChevronDown,
  ChevronRight,
  Command as CommandIcon,
  FileCode2,
  Loader2,
  Mic,
  MoveHorizontal,
  Paperclip,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Terminal,
  Undo2,
  Volume2,
  X,
  Zap,
} from 'lucide-react';
import {
  useControllableState,
  useJuice,
  useJuiceAgentNode,
  useRovingFocus,
  useScrubDrag,
} from './behaviors.tsx';

// ---------------------------------------------------------------------------
// Shared Primitives: Kbd, Badge, SegmentedControl, Switch
// ---------------------------------------------------------------------------

export function Kbd({ children, className, ...rest }: HTMLAttributes<HTMLElement>) {
  return (
    <kbd className={clsx('j-kbd', className)} {...rest}>
      {children}
    </kbd>
  );
}

export function Badge({
  tone = 'neutral',
  children,
  className,
  ...rest
}: HTMLAttributes<HTMLSpanElement> & {
  tone?: 'neutral' | 'ok' | 'warn' | 'danger' | 'signal';
}) {
  return (
    <span className={clsx('j-badge', className)} data-tone={tone} {...rest}>
      {children}
    </span>
  );
}

export type SegmentedOption<T extends string = string> = {
  value: T;
  label: ReactNode;
  icon?: ReactNode;
};

export function SegmentedControl<T extends string = string>({
  id,
  options,
  value: controlledValue,
  defaultValue,
  onChange,
  className,
}: {
  id?: string;
  options: readonly SegmentedOption<T>[];
  value?: T;
  defaultValue?: T;
  onChange?: (value: T) => void;
  className?: string;
}) {
  const { playSound } = useJuice();
  const fallback = defaultValue ?? options[0]?.value ?? ('' as T);
  const [value, setValue] = useControllableState<T>({
    value: controlledValue,
    defaultValue: fallback,
    onChange,
  });

  const itemValues = useMemo(() => options.map((o) => o.value), [options]);
  const select = (next: T) => {
    if (next !== value) {
      playSound('tap');
      setValue(next);
    }
  };
  const { onKeyDown } = useRovingFocus({
    items: itemValues,
    active: value,
    onSelect: select,
    orientation: 'horizontal',
  });

  useJuiceAgentNode(id, 'SegmentedControl', { value }, { select: (v: T) => select(v) });

  return (
    <div
      id={id}
      role="tablist"
      className={clsx('j-seg', className)}
      onKeyDown={onKeyDown}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            data-active={active ? 'true' : undefined}
            className="j-seg-btn"
            onClick={() => select(opt.value)}
          >
            {opt.icon}
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function Switch({
  id,
  checked: controlledChecked,
  defaultChecked = false,
  onChange,
  'aria-label': ariaLabel,
}: {
  id?: string;
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
  'aria-label'?: string;
}) {
  const { playSound } = useJuice();
  const [checked, setChecked] = useControllableState({
    value: controlledChecked,
    defaultValue: defaultChecked,
    onChange,
  });

  const toggle = () => {
    const next = !checked;
    playSound(next ? 'latch' : 'tap');
    setChecked(next);
  };

  useJuiceAgentNode(id, 'Switch', { checked }, { toggle, set: (v: boolean) => setChecked(Boolean(v)) });

  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      data-checked={checked ? 'true' : 'false'}
      className="j-switch"
      onClick={toggle}
    >
      <i className="j-switch-thumb" />
    </button>
  );
}

// ---------------------------------------------------------------------------
// 1. RollingNumber (NumberFlow-style Odometer with Deterministic Snapshot)
// ---------------------------------------------------------------------------

export function RollingNumber({
  value,
  prefix = '',
  suffix = '',
  decimals = 0,
  className,
  style,
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const formatted = useMemo(() => {
    const fixed = Number.isFinite(value) ? value.toFixed(decimals) : '0';
    const [intPart = '0', decPart] = fixed.split('.');
    const withCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return decPart !== undefined ? `${withCommas}.${decPart}` : withCommas;
  }, [value, decimals]);

  const chars = useMemo(() => formatted.split(''), [formatted]);

  return (
    <span className={clsx('j-rolling-num', className)} style={style}>
      {prefix && <span style={{ whiteSpace: 'pre' }}>{prefix}</span>}
      {chars.map((ch, idx) => {
        const digit = /\d/.test(ch) ? Number(ch) : null;
        if (digit === null) {
          return <span key={`sep-${idx}`}>{ch}</span>;
        }
        return (
          <span key={`col-${chars.length - idx}`} className="j-rolling-digit-col">
            <span
              className="j-rolling-digit-ribbon"
              style={{ transform: `translateY(-${digit * 10}%)` }}
            >
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                <span key={n}>{n}</span>
              ))}
            </span>
          </span>
        );
      })}
      {suffix && <span style={{ whiteSpace: 'pre' }}>{suffix}</span>}
    </span>
  );
}

// ---------------------------------------------------------------------------
// 2. StateButton (Bencho ConfirmSend / Multi-stage Tactile Payment & Action)
// ---------------------------------------------------------------------------

export type ActionButtonStage = 'idle' | 'confirming' | 'pending' | 'success' | 'error';

export function StateButton({
  id = 'confirm-send',
  title = 'Wire Transfer',
  recipient = 'studio@joplo.app',
  amount = 1280,
  stage: controlledStage,
  defaultStage = 'idle',
  onStageChange,
}: {
  id?: string;
  title?: string;
  recipient?: string;
  amount?: number;
  stage?: ActionButtonStage;
  defaultStage?: ActionButtonStage;
  onStageChange?: (stage: ActionButtonStage) => void;
}) {
  const { playSound, animate } = useJuice();
  const [stage, setStage] = useControllableState<ActionButtonStage>({
    value: controlledStage,
    defaultValue: defaultStage,
    onChange: onStageChange,
  });
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  const advance = () => {
    if (stage === 'idle') {
      playSound('tap');
      setStage('confirming');
    } else if (stage === 'confirming') {
      playSound('latch');
      if (!animate) {
        setStage('success');
        return;
      }
      setStage('pending');
      timerRef.current = window.setTimeout(() => {
        playSound('paid');
        setStage('success');
      }, 650);
    } else if (stage === 'success' || stage === 'error') {
      playSound('tap');
      setStage('idle');
    }
  };

  const reset = () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    playSound('tap');
    setStage('idle');
  };

  useJuiceAgentNode(
    id,
    'StateButton',
    { stage, amount, recipient },
    {
      press: advance,
      setStage: (s: ActionButtonStage) => setStage(s),
      reset,
    },
  );

  return (
    <div id={id} className="j-slab j-state-card" data-state={stage}>
      <div className="j-state-meta">
        <div>
          <div style={{ fontSize: 12, color: 'var(--juice-mute)', marginBottom: 2 }}>{title}</div>
          <div className="j-state-amount">
            <RollingNumber value={amount} prefix="$" decimals={2} />
          </div>
        </div>
        <Badge tone={stage === 'success' ? 'ok' : stage === 'confirming' ? 'signal' : stage === 'error' ? 'danger' : 'neutral'}>
          {stage === 'idle' && 'Ready'}
          {stage === 'confirming' && 'Confirm'}
          {stage === 'pending' && 'Signing…'}
          {stage === 'success' && 'Settled'}
          {stage === 'error' && 'Failed'}
        </Badge>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 11px',
          borderRadius: 11,
          background: 'var(--juice-w6)',
          fontSize: 12.5,
        }}
      >
        <span style={{ color: 'var(--juice-mute)' }}>Recipient</span>
        <span style={{ fontWeight: 500, fontFamily: 'var(--juice-font-mono)' }}>{recipient}</span>
      </div>

      <div style={{ display: 'flex', gap: 6 }}>
        <button
          type="button"
          className="j-state-btn"
          data-state={stage}
          disabled={stage === 'pending'}
          onClick={advance}
        >
          {stage === 'idle' && (
            <>
              <span>Send Transfer</span>
              <ArrowRight size={15} />
            </>
          )}
          {stage === 'confirming' && (
            <>
              <ShieldCheck size={16} />
              <span>Tap again to confirm ${amount}</span>
            </>
          )}
          {stage === 'pending' && (
            <>
              <Loader2 size={16} className="j-spin" />
              <span>Broadcasting…</span>
            </>
          )}
          {stage === 'success' && (
            <>
              <Check size={16} />
              <span>Receipt #8841 · Reset</span>
            </>
          )}
          {stage === 'error' && (
            <>
              <RotateCcw size={15} />
              <span>Retry transfer</span>
            </>
          )}
        </button>
        {stage === 'confirming' && (
          <button
            type="button"
            aria-label="Cancel confirmation"
            onClick={reset}
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              border: 0,
              background: 'var(--juice-w6)',
              color: 'var(--juice-mute)',
              cursor: 'pointer',
              display: 'grid',
              placeItems: 'center',
              flexShrink: 0,
            }}
          >
            <X size={16} />
          </button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 3. ScrubPanel (Bencho PathPanel Concentric Scrubbing Settings Card)
// ---------------------------------------------------------------------------

const ACCENT_SWATCHES = [
  { id: 'cobalt', color: '#2231dd', label: 'Cobalt' },
  { id: 'emerald', color: '#15803d', label: 'Emerald' },
  { id: 'ember', color: '#d94e1f', label: 'Ember' },
  { id: 'ink', color: '#17181a', label: 'Ink' },
] as const;

export function ScrubPanel({
  id = 'scrub-panel',
  tension: controlledTension,
  defaultTension = 72,
  radius: controlledRadius,
  defaultRadius = 14,
  swatch: controlledSwatch,
  defaultSwatch = 'cobalt',
  snapGrid: controlledSnap,
  defaultSnapGrid = true,
  onTensionChange,
  onRadiusChange,
}: {
  id?: string;
  tension?: number;
  defaultTension?: number;
  radius?: number;
  defaultRadius?: number;
  swatch?: string;
  defaultSwatch?: string;
  snapGrid?: boolean;
  defaultSnapGrid?: boolean;
  onTensionChange?: (v: number) => void;
  onRadiusChange?: (v: number) => void;
}) {
  const { playSound } = useJuice();
  const [tension, setTension] = useControllableState({
    value: controlledTension,
    defaultValue: defaultTension,
    onChange: onTensionChange,
  });
  const [radiusVal, setRadiusVal] = useControllableState({
    value: controlledRadius,
    defaultValue: defaultRadius,
    onChange: onRadiusChange,
  });
  const [swatch, setSwatch] = useControllableState({
    value: controlledSwatch,
    defaultValue: defaultSwatch,
  });
  const [snapGrid, setSnapGrid] = useControllableState({
    value: controlledSnap,
    defaultValue: defaultSnapGrid,
  });

  const tensionScrub = useScrubDrag({
    value: tension,
    min: 10,
    max: 100,
    step: 2,
    onChange: setTension,
    onScrubSound: () => playSound('scrub'),
  });

  const radiusScrub = useScrubDrag({
    value: radiusVal,
    min: 0,
    max: 24,
    step: 2,
    onChange: setRadiusVal,
    onScrubSound: () => playSound('tick'),
  });

  useJuiceAgentNode(
    id,
    'ScrubPanel',
    { tension, radius: radiusVal, swatch, snapGrid },
    {
      setTension: (v: number) => setTension(Number(v)),
      setRadius: (v: number) => setRadiusVal(Number(v)),
      setSwatch: (s: string) => setSwatch(String(s)),
      toggleSnap: () => setSnapGrid((prev) => !prev),
    },
  );

  return (
    <div id={id} className="j-slab j-scrub-panel">
      <div className="j-scrub-rows">
        {/* Row 1: Spring Tension Scrub Slider */}
        <div
          ref={(el) => {
            tensionScrub.trackRef.current = el;
          }}
          className="j-scrub-row"
          data-kind="slider"
          aria-label="Spring Tension"
          {...tensionScrub.scrubProps}
        >
          <span className="j-scrub-fill" style={{ width: `${tensionScrub.percent}%` }} />
          <span className="j-scrub-label">Tension</span>
          <span className="j-scrub-dots" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
            <i />
          </span>
          <span className="j-scrub-value">{tension}%</span>
        </div>

        {/* Row 2: Corner Radius Scrub Slider */}
        <div
          ref={(el) => {
            radiusScrub.trackRef.current = el;
          }}
          className="j-scrub-row"
          data-kind="slider"
          aria-label="Corner Radius"
          {...radiusScrub.scrubProps}
        >
          <span className="j-scrub-fill" style={{ width: `${radiusScrub.percent}%` }} />
          <span className="j-scrub-label">Corner</span>
          <span className="j-scrub-dots" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
            <i />
          </span>
          <span className="j-scrub-value">{radiusVal}px</span>
        </div>

        {/* Row 3: Accent Swatch Selector */}
        <div className="j-scrub-row" style={{ cursor: 'default' }}>
          <span className="j-scrub-label">Signal</span>
          <div className="j-swatch-group" role="radiogroup" aria-label="Signal color">
            {ACCENT_SWATCHES.map((s) => (
              <button
                key={s.id}
                type="button"
                role="radio"
                aria-checked={swatch === s.id}
                aria-label={s.label}
                data-active={swatch === s.id ? 'true' : undefined}
                className="j-swatch-dot"
                style={{ background: s.color }}
                onClick={() => {
                  playSound('pop');
                  setSwatch(s.id);
                }}
              />
            ))}
          </div>
        </div>

        {/* Row 4: Optical Grid Snap Switch */}
        <div
          className="j-scrub-row"
          onClick={() => {
            const next = !snapGrid;
            playSound(next ? 'latch' : 'tap');
            setSnapGrid(next);
          }}
        >
          <span className="j-scrub-label">Optical Snap</span>
          <div style={{ marginLeft: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <Switch
              aria-label="Optical Snap"
              checked={snapGrid}
              onChange={(v) => setSnapGrid(v)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 4. SlideConfirm (Bencho WakeSlider / High-Consequence Drag-to-Commit)
// ---------------------------------------------------------------------------

export function SlideConfirm({
  id = 'slide-confirm',
  label = 'Slide to deploy production',
  confirmedLabel = 'Production deployed · v2.4.0',
  confirmed: controlledConfirmed,
  defaultConfirmed = false,
  onConfirmChange,
}: {
  id?: string;
  label?: string;
  confirmedLabel?: string;
  confirmed?: boolean;
  defaultConfirmed?: boolean;
  onConfirmChange?: (confirmed: boolean) => void;
}) {
  const { playSound } = useJuice();
  const [confirmed, setConfirmed] = useControllableState({
    value: controlledConfirmed,
    defaultValue: defaultConfirmed,
    onChange: onConfirmChange,
  });
  const [dragProgress, setDragProgress] = useState(0);
  const [dragging, setDragging] = useState(false);
  const trackRef = useRef<HTMLDivElement | null>(null);

  const effectiveProgress = confirmed ? 1 : dragProgress;

  const commitConfirm = () => {
    setConfirmed(true);
    setDragProgress(1);
    setDragging(false);
    playSound('landed');
  };

  const resetConfirm = () => {
    setConfirmed(false);
    setDragProgress(0);
    playSound('tap');
  };

  useJuiceAgentNode(
    id,
    'SlideConfirm',
    { confirmed, progress: effectiveProgress },
    {
      confirm: commitConfirm,
      reset: resetConfirm,
    },
  );

  return (
    <div id={id} className="j-slab j-slide-wrap">
      <div
        ref={trackRef}
        className="j-slide-track"
        data-confirmed={confirmed ? 'true' : 'false'}
      >
        <div
          className="j-slide-progress"
          style={{ width: `${Math.max(15, effectiveProgress * 100)}%` }}
        />
        <div
          className="j-slide-label"
          style={{ opacity: confirmed ? 1 : Math.max(0.2, 1 - dragProgress * 1.15) }}
        >
          {confirmed ? confirmedLabel : label}
        </div>
        <button
          type="button"
          className="j-slide-thumb"
          data-dragging={dragging ? 'true' : undefined}
          aria-label={confirmed ? 'Reset deployment' : label}
          style={{
            transform: `translateX(${effectiveProgress * 244}px)`,
          }}
          onClick={() => {
            if (confirmed) resetConfirm();
          }}
          onKeyDown={(e) => {
            if ((e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight') && !confirmed) {
              e.preventDefault();
              commitConfirm();
            } else if ((e.key === 'Escape' || e.key === 'ArrowLeft') && confirmed) {
              e.preventDefault();
              resetConfirm();
            }
          }}
          onPointerDown={(e) => {
            if (confirmed) return;
            e.currentTarget.setPointerCapture(e.pointerId);
            setDragging(true);
            playSound('lift');
          }}
          onPointerMove={(e) => {
            if (!dragging || confirmed || !trackRef.current) return;
            const rect = trackRef.current.getBoundingClientRect();
            const maxTravel = Math.max(1, rect.width - 50);
            const raw = (e.clientX - rect.left - 25) / maxTravel;
            const clamped = Math.min(1, Math.max(0, raw));
            setDragProgress(clamped);
            if (clamped >= 0.92) {
              commitConfirm();
            }
          }}
          onPointerUp={() => {
            if (!dragging) return;
            setDragging(false);
            if (!confirmed) {
              if (dragProgress >= 0.85) {
                commitConfirm();
              } else {
                playSound('drop');
                setDragProgress(0);
              }
            }
          }}
        >
          {confirmed ? <Check size={17} /> : <ArrowRight size={17} />}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 5. DynamicIsland (Multi-State Morphing Status Capsule with Static-Safe Bars)
// ---------------------------------------------------------------------------

export type IslandMode = 'compact' | 'active' | 'expanded';

export function DynamicIsland({
  id = 'dynamic-island',
  mode: controlledMode,
  defaultMode = 'active',
  onModeChange,
}: {
  id?: string;
  mode?: IslandMode;
  defaultMode?: IslandMode;
  onModeChange?: (mode: IslandMode) => void;
}) {
  const { playSound } = useJuice();
  const [mode, setMode] = useControllableState<IslandMode>({
    value: controlledMode,
    defaultValue: defaultMode,
    onChange: onModeChange,
  });

  const cycleMode = (next: IslandMode) => {
    playSound(next === 'expanded' ? 'pop' : 'tap');
    setMode(next);
  };

  useJuiceAgentNode(id, 'DynamicIsland', { mode }, { setMode: (m: IslandMode) => cycleMode(m) });

  // Non-zero base heights so static screenshots / storyboards at t=0 look energetic
  const barHeights = [7, 13, 9, 15, 11, 6];

  return (
    <div id={id} className="j-island-stage">
      <div
        className="j-island"
        data-mode={mode}
        onClick={() => {
          if (mode === 'compact') cycleMode('active');
          else if (mode === 'active') cycleMode('expanded');
        }}
      >
        {mode === 'compact' && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12.5 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 500 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#34d17a' }} />
              Agent Idle
            </span>
            <span style={{ color: '#9a9a9e', fontVariantNumeric: 'tabular-nums' }}>00:42</span>
          </div>
        )}

        {mode === 'active' && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 500 }}>
              <Mic size={14} color="#34d17a" />
              <span>Voice Review</span>
            </span>
            <div className="j-wave-bars" aria-hidden="true">
              {barHeights.map((h, i) => (
                <span
                  key={i}
                  className="j-wave-bar"
                  style={{ height: `${h}px`, animationDelay: `${i * 110}ms` }}
                />
              ))}
            </div>
          </div>
        )}

        {mode === 'expanded' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 10,
                    background: 'rgba(52, 209, 122, 0.16)',
                    color: '#34d17a',
                    display: 'grid',
                    placeItems: 'center',
                  }}
                >
                  <Volume2 size={16} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>Live Design Walkthrough</div>
                  <div style={{ fontSize: 11.5, color: '#9a9a9e' }}>Step 3 of 5 · Syncing feedback</div>
                </div>
              </div>
              <div className="j-wave-bars" aria-hidden="true">
                {barHeights.map((h, i) => (
                  <span
                    key={i}
                    className="j-wave-bar"
                    style={{ height: `${h}px`, animationDelay: `${i * 110}ms` }}
                  />
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 6 }}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  cycleMode('compact');
                }}
                style={{
                  flex: 1,
                  height: 32,
                  borderRadius: 10,
                  border: 0,
                  background: 'rgba(255,255,255,0.1)',
                  color: '#f4f3f1',
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Minimize
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  playSound('paid');
                  cycleMode('active');
                }}
                style={{
                  flex: 1,
                  height: 32,
                  borderRadius: 10,
                  border: 0,
                  background: '#34d17a',
                  color: '#09140d',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Approve Step
              </button>
            </div>
          </div>
        )}
      </div>

      <SegmentedControl
        options={[
          { value: 'compact', label: 'Compact' },
          { value: 'active', label: 'Active' },
          { value: 'expanded', label: 'Expanded' },
        ]}
        value={mode}
        onChange={cycleMode}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// 6. MorphCard (Motion-Primitives Style In-Place Disclosure & Quick Edit)
// ---------------------------------------------------------------------------

export function MorphCard({
  id = 'morph-card',
  opened: controlledOpened,
  defaultOpened = false,
  onOpenedChange,
}: {
  id?: string;
  opened?: boolean;
  defaultOpened?: boolean;
  onOpenedChange?: (opened: boolean) => void;
}) {
  const { playSound } = useJuice();
  const [opened, setOpened] = useControllableState({
    value: controlledOpened,
    defaultValue: defaultOpened,
    onChange: onOpenedChange,
  });
  const [limit, setLimit] = useState(2500);
  const [savedNotice, setSavedNotice] = useState(false);

  const toggle = () => {
    const next = !opened;
    playSound(next ? 'pop' : 'tap');
    setOpened(next);
  };

  useJuiceAgentNode(
    id,
    'MorphCard',
    { opened, limit },
    {
      open: () => setOpened(true),
      close: () => setOpened(false),
      toggle,
      setLimit: (v: number) => setLimit(Number(v)),
    },
  );

  return (
    <div id={id} className="j-slab j-morph-card" data-opened={opened ? 'true' : 'false'}>
      <button
        type="button"
        className="j-morph-summary"
        aria-expanded={opened}
        onClick={toggle}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 9,
              background: 'var(--juice-w12)',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <Zap size={15} />
          </div>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 600 }}>Spend Cap · Edge Workers</div>
            <div style={{ fontSize: 12, color: 'var(--juice-mute)' }}>
              {savedNotice ? 'Updated just now' : 'Click to morph inline inspector'}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Badge tone="signal">
            <RollingNumber value={limit} prefix="$" />
          </Badge>
          <ChevronDown
            size={15}
            style={{
              color: 'var(--juice-mute)',
              transform: opened ? 'rotate(180deg)' : 'none',
              transition: 'transform 200ms var(--juice-out)',
            }}
          />
        </div>
      </button>

      {opened && (
        <div className="j-morph-detail">
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
            <span style={{ color: 'var(--juice-mute)' }}>Monthly Hard Limit</span>
            <span style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>${limit} / mo</span>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {[1000, 2500, 5000].map((preset) => (
              <button
                key={preset}
                type="button"
                className="j-chip"
                style={{
                  flex: 1,
                  justifyContent: 'center',
                  background: limit === preset ? 'var(--fill-on)' : 'var(--juice-w6)',
                  color: limit === preset ? 'var(--fill-slab)' : 'var(--juice-soft)',
                }}
                onClick={() => {
                  playSound('tick');
                  setLimit(preset);
                }}
              >
                ${preset}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, marginTop: 2 }}>
            <button
              type="button"
              className="j-chip"
              onClick={() => {
                playSound('paid');
                setSavedNotice(true);
                setOpened(false);
              }}
              style={{
                background: 'var(--fill-on)',
                color: 'var(--fill-slab)',
                padding: '0 12px',
              }}
            >
              <Check size={13} />
              <span>Apply Cap</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 7. MetricRibbon (Bencho IncomeFlow + RollingNumber Interactive Scrub Chart)
// ---------------------------------------------------------------------------

const DEFAULT_SERIES = [
  { key: 'Jun', value: 42800, delta: '+6.4%' },
  { key: 'Jul', value: 48200, delta: '+12.6%' },
  { key: 'Aug', value: 53900, delta: '+11.8%' },
  { key: 'Sep', value: 61400, delta: '+13.9%' },
  { key: 'Oct', value: 74200, delta: '+20.8%' },
  { key: 'Nov', value: 89600, delta: '+20.7%' },
] as const;

export function MetricRibbon({
  id = 'metric-ribbon',
  activeMonth: controlledMonth,
  defaultMonth = 'Nov',
  onMonthChange,
}: {
  id?: string;
  activeMonth?: string;
  defaultMonth?: string;
  onMonthChange?: (month: string) => void;
}) {
  const { playSound } = useJuice();
  const [month, setMonth] = useControllableState({
    value: controlledMonth,
    defaultValue: defaultMonth,
    onChange: onMonthChange,
  });

  const current = DEFAULT_SERIES.find((d) => d.key === month) ?? DEFAULT_SERIES[DEFAULT_SERIES.length - 1]!;
  const maxVal = Math.max(...DEFAULT_SERIES.map((d) => d.value));

  const selectMonth = (m: string) => {
    if (m !== month) {
      playSound('tick');
      setMonth(m);
    }
  };

  useJuiceAgentNode(id, 'MetricRibbon', { month, value: current.value }, { selectMonth });

  return (
    <div id={id} className="j-slab j-metric-card">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 12, color: 'var(--juice-mute)', marginBottom: 3 }}>
            Net Recurring Volume · {current.key}
          </div>
          <div style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-0.03em' }}>
            <RollingNumber value={current.value} prefix="$" />
          </div>
        </div>
        <Badge tone="ok">{current.delta}</Badge>
      </div>

      <div className="j-metric-bars" role="tablist" aria-label="Monthly volume">
        {DEFAULT_SERIES.map((item) => {
          const active = item.key === current.key;
          const heightPct = Math.round((item.value / maxVal) * 100);
          return (
            <button
              key={item.key}
              type="button"
              role="tab"
              aria-selected={active}
              data-active={active ? 'true' : undefined}
              className="j-metric-bar-btn"
              onPointerEnter={() => selectMonth(item.key)}
              onClick={() => selectMonth(item.key)}
            >
              <span className="j-metric-bar-fill" style={{ height: `${heightPct}%` }} />
              <span className="j-metric-bar-label">{item.key}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 8. Composer (Prompt Kit + Bencho AiChatInput Multi-Modal Agent Composer)
// ---------------------------------------------------------------------------

export function Composer({
  id = 'ai-composer',
  value: controlledValue,
  defaultValue = 'Refactor the checkout drawer into an inline morph card',
  model: controlledModel,
  defaultModel = 'Claude 4.6',
  onSend,
}: {
  id?: string;
  value?: string;
  defaultValue?: string;
  model?: string;
  defaultModel?: string;
  onSend?: (prompt: string) => void;
}) {
  const { playSound } = useJuice();
  const [text, setText] = useControllableState({
    value: controlledValue,
    defaultValue,
  });
  const [model, setModel] = useControllableState({
    value: controlledModel,
    defaultValue: defaultModel,
  });
  const [sentCount, setSentCount] = useState(0);
  const [attached, setAttached] = useState(true);

  const models = ['Claude 4.6', 'Gemini 4', 'Codex'];
  const cycleModel = () => {
    const next = models[(models.indexOf(model) + 1) % models.length]!;
    playSound('tap');
    setModel(next);
  };

  const submit = () => {
    if (!text.trim()) return;
    playSound('pop');
    setSentCount((c) => c + 1);
    onSend?.(text);
  };

  useJuiceAgentNode(
    id,
    'Composer',
    { text, model, attached, sentCount },
    {
      type: (v: string) => setText(String(v)),
      cycleModel,
      submit,
    },
  );

  return (
    <div id={id} className="j-slab j-composer">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
        <div className="j-composer-chips">
          {attached && (
            <button
              type="button"
              className="j-chip"
              onClick={() => {
                playSound('tap');
                setAttached(false);
              }}
            >
              <FileCode2 size={13} />
              <span>CheckoutDrawer.tsx</span>
              <X size={11} style={{ opacity: 0.6 }} />
            </button>
          )}
          {!attached && (
            <button
              type="button"
              className="j-chip"
              onClick={() => {
                playSound('tap');
                setAttached(true);
              }}
            >
              <Paperclip size={12} />
              <span>Attach context</span>
            </button>
          )}
        </div>
        <Badge tone={sentCount > 0 ? 'ok' : 'neutral'}>
          {sentCount > 0 ? `Dispatched #${sentCount}` : '18% ctx'}
        </Badge>
      </div>

      <textarea
        aria-label="Agent Prompt"
        className="j-composer-textarea"
        value={text}
        placeholder="Ask agent to build or refine UI…"
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
            e.preventDefault();
            submit();
          }
        }}
      />

      <div className="j-composer-footer">
        <div className="j-composer-chips">
          <button type="button" className="j-chip" onClick={cycleModel}>
            <Sparkles size={12} />
            <span>{model}</span>
          </button>
          <button
            type="button"
            className="j-chip"
            onClick={() => {
              playSound('tap');
              setText('Add concentric 20px -> 14px radii and Web Audio tap feedback');
            }}
          >
            <span>+ Polish tokens</span>
          </button>
        </div>

        <button
          type="button"
          className="j-send-circle"
          aria-label="Send prompt"
          disabled={!text.trim()}
          onClick={submit}
        >
          <ArrowUp size={15} />
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 9. ThinkingMorph (Agent Reasoning -> Tool Call -> Artifact Card)
// ---------------------------------------------------------------------------

export function ThinkingMorph({
  id = 'thinking-morph',
  step: controlledStep,
  defaultStep = 2,
}: {
  id?: string;
  step?: number;
  defaultStep?: number;
}) {
  const { playSound } = useJuice();
  const [step, setStep] = useControllableState({
    value: controlledStep,
    defaultValue: defaultStep,
  });
  const [expanded, setExpanded] = useState(true);

  const nextStep = () => {
    const next = (step + 1) % 3;
    playSound(next === 2 ? 'paid' : 'tap');
    setStep(next);
  };

  useJuiceAgentNode(id, 'ThinkingMorph', { step, expanded }, { nextStep, setStep: (s: number) => setStep(Number(s)) });

  return (
    <div id={id} className="j-slab j-thinking-card">
      <button
        type="button"
        className="j-thinking-header"
        onClick={() => {
          playSound('tap');
          setExpanded((e) => !e);
        }}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
          <Sparkles size={14} />
          <span>
            {step === 0 && 'Analyzing layout hierarchy…'}
            {step === 1 && 'Running patch on ScrubPanel.tsx…'}
            {step === 2 && 'Thought for 3.2s · 2 tools executed'}
          </span>
        </span>
        <ChevronRight
          size={14}
          style={{
            transform: expanded ? 'rotate(90deg)' : 'none',
            transition: 'transform 180ms var(--juice-out)',
          }}
        />
      </button>

      {expanded && (
        <div className="j-thinking-steps">
          <div className="j-thinking-step" data-status={step === 0 ? 'running' : 'done'}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Check size={13} />
              <span>Inspect token contrast ramp</span>
            </span>
            <Kbd>12ms</Kbd>
          </div>
          <div className="j-thinking-step" data-status={step === 1 ? 'running' : 'done'}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Terminal size={13} />
              <span>Write concentric 14px row styles</span>
            </span>
            <Kbd>{step >= 1 ? 'Done' : 'Wait'}</Kbd>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="j-artifact-pill">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileCode2 size={16} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>juice-tokens.css</div>
              <div style={{ fontSize: 11.5, color: 'var(--juice-mute)' }}>Artifact v2 · Ready for Joplo stage</div>
            </div>
          </div>
          <button type="button" className="j-chip" onClick={nextStep}>
            Replay
          </button>
        </div>
      )}
      {step < 2 && (
        <button type="button" className="j-chip" style={{ justifyContent: 'center' }} onClick={nextStep}>
          Advance Agent Step ({step + 1}/3) →
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 10. CommandPalette (UI SDK Roving Focus + Instant Filter + Kbd Badges)
// ---------------------------------------------------------------------------

const COMMAND_ITEMS = [
  { id: 'theme', label: 'Toggle Dark / Light Ramp', shortcut: '⌘J', tag: 'Appearance' },
  { id: 'sound', label: 'Synthesize Web Audio Chime', shortcut: '⌘S', tag: 'Audio' },
  { id: 'snapshot', label: 'Capture Deterministic Storyboard', shortcut: '⇧⌘P', tag: 'Joplo' },
  { id: 'copy', label: 'Copy Component JSX Snippet', shortcut: '⌘C', tag: 'Code' },
] as const;

export function CommandPalette({
  id = 'command-palette',
  onExecute,
}: {
  id?: string;
  onExecute?: (commandId: string) => void;
}) {
  const { playSound } = useJuice();
  const [query, setQuery] = useState('');
  const [activeId, setActiveId] = useState<string>(COMMAND_ITEMS[0]!.id);
  const [lastExecuted, setLastExecuted] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COMMAND_ITEMS;
    return COMMAND_ITEMS.filter(
      (item) => item.label.toLowerCase().includes(q) || item.tag.toLowerCase().includes(q),
    );
  }, [query]);

  const itemIds = useMemo(() => filtered.map((i) => i.id), [filtered]);
  const currentActive = itemIds.includes(activeId as any) ? activeId : (itemIds[0] ?? '');

  const { onKeyDown } = useRovingFocus({
    items: itemIds,
    active: currentActive,
    onSelect: (next) => {
      playSound('tick');
      setActiveId(next);
    },
    orientation: 'vertical',
  });

  const execute = (cmdId: string) => {
    playSound('pop');
    setLastExecuted(cmdId);
    onExecute?.(cmdId);
  };

  useJuiceAgentNode(
    id,
    'CommandPalette',
    { query, activeId: currentActive, lastExecuted },
    {
      search: (q: string) => setQuery(String(q)),
      execute: (cmdId?: string) => execute(cmdId ?? currentActive),
    },
  );

  return (
    <div id={id} className="j-slab j-cmd" onKeyDown={onKeyDown}>
      <div className="j-cmd-input-row">
        <Search size={14} style={{ color: 'var(--juice-mute)' }} />
        <input
          type="text"
          aria-label="Filter commands"
          className="j-cmd-input"
          placeholder="Type a command or search…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && currentActive) {
              e.preventDefault();
              execute(currentActive);
            }
          }}
        />
        {lastExecuted ? <Badge tone="ok">Ran: {lastExecuted}</Badge> : <Kbd>ESC</Kbd>}
      </div>

      <div className="j-cmd-list" role="listbox" aria-label="Commands">
        {filtered.map((item) => {
          const highlighted = item.id === currentActive;
          return (
            <button
              key={item.id}
              type="button"
              role="option"
              aria-selected={highlighted}
              data-highlighted={highlighted ? 'true' : undefined}
              className="j-cmd-item"
              onPointerEnter={() => setActiveId(item.id)}
              onClick={() => execute(item.id)}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <CommandIcon size={13} style={{ opacity: 0.6 }} />
                <span>{item.label}</span>
              </span>
              <Kbd>{item.shortcut}</Kbd>
            </button>
          );
        })}
        {filtered.length === 0 && (
          <div style={{ padding: '14px 10px', fontSize: 12.5, color: 'var(--juice-mute)', textAlign: 'center' }}>
            No matching commands
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 11. ToastStack (Emil Kowalski / Sonner Z-Axis Layered Stack with Undo)
// ---------------------------------------------------------------------------

type ToastEntry = { id: string; title: string; detail: string };

const INITIAL_TOASTS: ToastEntry[] = [
  { id: 't1', title: 'Theme tokens synced', detail: '6 color-mix steps active' },
  { id: 't2', title: 'Voice synthesis cached', detail: '12 procedural cues ready' },
  { id: 't3', title: 'Branch archived', detail: 'feat/concentric-slab' },
];

export function ToastStack({ id = 'toast-stack' }: { id?: string }) {
  const { playSound } = useJuice();
  const [toasts, setToasts] = useState<ToastEntry[]>(INITIAL_TOASTS);
  const [expanded, setExpanded] = useState(false);
  const counterRef = useRef(4);

  const pushToast = () => {
    const n = counterRef.current++;
    playSound('pop');
    setToasts((prev) => [
      ...prev.slice(-2),
      {
        id: `t${n}`,
        title: `Snapshot #${n} exported`,
        detail: 'Deterministic frame verified',
      },
    ]);
  };

  const undoTop = () => {
    playSound('tap');
    if (toasts.length <= 1) {
      setToasts(INITIAL_TOASTS);
    } else {
      setToasts((prev) => prev.slice(0, -1));
    }
  };

  useJuiceAgentNode(id, 'ToastStack', { count: toasts.length, expanded }, { pushToast, undoTop, setExpanded });

  return (
    <div id={id} className="j-toast-stage">
      <div
        className="j-toast-stack"
        onPointerEnter={() => setExpanded(true)}
        onPointerLeave={() => setExpanded(false)}
      >
        {toasts.map((t, idx) => {
          const depth = toasts.length - 1 - idx; // 0 = front
          const yOffset = expanded ? depth * -46 : depth * -10;
          const scale = expanded ? 1 : 1 - depth * 0.045;
          const opacity = depth > 2 ? 0 : 1 - depth * 0.18;
          return (
            <div
              key={t.id}
              className="j-toast-item"
              style={{
                zIndex: idx + 1,
                transform: `translateY(${yOffset}px) scale(${scale})`,
                opacity,
              }}
            >
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{t.title}</div>
                <div style={{ fontSize: 11.5, color: 'var(--juice-mute)' }}>{t.detail}</div>
              </div>
              {depth === 0 && (
                <button type="button" className="j-chip" onClick={undoTop}>
                  <Undo2 size={12} />
                  <span>Undo</span>
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button type="button" className="j-chip" onClick={pushToast}>
          + Trigger Event Toast
        </button>
        <button
          type="button"
          className="j-chip"
          onClick={() => {
            playSound('tap');
            setExpanded((e) => !e);
          }}
        >
          {expanded ? 'Collapse Stack' : 'Fan Out (Hover)'}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 12. SplitCompare (Interactive Before / After Craft Comparison)
// ---------------------------------------------------------------------------

export function SplitCompare({
  id = 'split-compare',
  split: controlledSplit,
  defaultSplit = 54,
}: {
  id?: string;
  split?: number;
  defaultSplit?: number;
}) {
  const { playSound } = useJuice();
  const [split, setSplit] = useControllableState({
    value: controlledSplit,
    defaultValue: defaultSplit,
  });

  const scrub = useScrubDrag({
    value: split,
    min: 12,
    max: 88,
    step: 2,
    onChange: setSplit,
    onScrubSound: () => playSound('scrub'),
  });

  useJuiceAgentNode(id, 'SplitCompare', { split }, { setSplit: (v: number) => setSplit(Number(v)) });

  return (
    <div id={id} className="j-slab j-split-card">
      <div
        ref={(el) => {
          scrub.trackRef.current = el;
        }}
        className="j-split-viewport"
        aria-label="Before and after UI craft comparison"
        {...scrub.scrubProps}
      >
        {/* Right / Base Layer: Juice Concentric Craft */}
        <div
          className="j-split-pane"
          style={{
            background: 'var(--fill-slab)',
            color: 'var(--fill-on)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Badge tone="neutral">Legacy Wireframe</Badge>
            <Badge tone="ok">Juice Concentric</Badge>
          </div>
          <div
            style={{
              padding: '10px 12px',
              borderRadius: 12,
              background: 'var(--juice-w6)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 500 }}>Zero-border tonal slab</span>
            <span style={{ fontSize: 14, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>99.4%</span>
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--juice-mute)', textAlign: 'right' }}>
            color-mix(in srgb, var(--fill-on) 6.5%, var(--fill-slab))
          </div>
        </div>

        {/* Left Clipped Layer: Legacy Dashed Wireframe */}
        <div
          className="j-split-pane"
          style={{
            clipPath: `inset(0 ${100 - scrub.percent}% 0 0)`,
            background: 'var(--juice-w12)',
            color: 'var(--fill-on)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Badge tone="neutral">Legacy Wireframe</Badge>
          </div>
          <div
            style={{
              padding: '10px 12px',
              borderRadius: 4,
              border: '1.5px dashed var(--juice-faint)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span style={{ fontSize: 13 }}>Boxy 1px border card</span>
            <span style={{ fontSize: 14 }}>99.4%</span>
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--juice-mute)' }}>Drag handle to compare →</div>
        </div>

        <div className="j-split-divider" style={{ left: `${scrub.percent}%` }} />
        <div className="j-split-knob" style={{ left: `${scrub.percent}%` }}>
          <MoveHorizontal size={14} />
        </div>
      </div>
    </div>
  );
}
