"use client";
import {
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type PointerEvent,
  type ReactNode,
  type Ref,
  type RefObject,
} from 'react';
import { clsx } from 'clsx';
import {
  AlertCircle,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Maximize2,
  MessageSquare,
  Minus,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Send,
  ShieldCheck,
  Trash2,
  Volume2,
  X,
} from 'lucide-react';
import { useControllableState, useJuice, useJuiceAgentNode } from './behaviors.tsx';
import { Badge, SegmentedControl, Switch } from './components.tsx';

const row = { display: 'flex', alignItems: 'center', gap: 6 } as const;
const between = { ...row, justifyContent: 'space-between' } as const;
const inset = { background: 'var(--juice-w6)', borderRadius: 14, padding: 10 } as const;
const muted = { color: 'var(--juice-soft)', fontSize: 12 } as const;
const heading = { fontSize: 14, fontWeight: 650, letterSpacing: '-0.025em', lineHeight: 1.25 } as const;
const mono = { fontFamily: 'var(--juice-font-mono)', fontSize: 11, fontVariantNumeric: 'tabular-nums' } as const;
const header = { ...between, minHeight: 28, paddingInline: 3 } as const;
const card = { padding: 10, maxWidth: '100%' } as const;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

type DataAttributes = {
  [key: `data-${string}`]: string | number | boolean | undefined;
};

function IconButton({
  label, children, onClick, disabled, primary, pressed, buttonRef, extraProps,
}: {
  label: string;
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
  pressed?: boolean;
  buttonRef?: Ref<HTMLButtonElement>;
  extraProps?: HTMLAttributes<HTMLButtonElement> & DataAttributes;
}) {
  const {
    className: extraClassName,
    style: extraStyle,
    onClick: extraOnClick,
    'aria-label': extraAriaLabel,
    title: extraTitle,
    ...restExtra
  } = extraProps ?? {};
  const resolvedLabel = extraAriaLabel ?? label;

  return (
    <button
      {...restExtra}
      ref={buttonRef}
      type="button"
      className={clsx('j-btn', extraClassName)}
      data-size="xs"
      data-variant={primary ? 'primary' : 'ghost'}
      aria-label={resolvedLabel}
      aria-pressed={pressed ?? restExtra['aria-pressed']}
      title={extraTitle ?? (restExtra['aria-describedby'] ? undefined : resolvedLabel)}
      style={{ width: 28, height: 28, padding: 0, flexShrink: 0, ...extraStyle }}
      disabled={disabled}
      onClick={(event) => {
        extraOnClick?.(event);
        if (!event.defaultPrevented) onClick();
      }}
    >
      {children}
    </button>
  );
}

export function ProgressRing({ value, size = 16 }: { value: number; size?: number }) {
  const percent = Number.isFinite(value) ? clamp(value, 0, 100) : 0;
  return (
    <svg className="j-ring-svg" width={size} height={size} viewBox="0 0 20 20" aria-hidden="true">
      <circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" strokeWidth="2" opacity=".22" />
      {percent > 0 && (
        <circle
          cx="10" cy="10" r="8" fill="none" stroke="currentColor" strokeWidth="2"
          pathLength="100" strokeDasharray={`${percent} 100`} strokeLinecap="round"
        />
      )}
    </svg>
  );
}

async function writeClipboard(text: string): Promise<{ ok: true } | { ok: false; error: unknown }> {
  try {
    if (!navigator?.clipboard?.writeText) {
      throw new Error('Clipboard API unavailable');
    }
    await navigator.clipboard.writeText(text);
    return { ok: true };
  } catch (error) {
    return { ok: false, error };
  }
}

export type CopySnippetProps = Omit<HTMLAttributes<HTMLDivElement>, 'onCopy'> & DataAttributes & {
  code?: string;
  copyText?: string;
  children?: ReactNode;
  label?: string;
  copyLabel?: string;
  copiedLabel?: string;
  errorLabel?: string;
  onCopied?: (code: string) => void;
  onCopyError?: (err: unknown) => void;
  copyButtonRef?: Ref<HTMLButtonElement>;
};

export function CopySnippet({
  code,
  copyText,
  children,
  label,
  copyLabel,
  copiedLabel = 'Copied to clipboard',
  errorLabel = 'Clipboard unavailable. Use your device’s Copy command.',
  onCopied,
  onCopyError,
  copyButtonRef,
  className,
  style,
  ...rest
}: CopySnippetProps) {
  const { playSound } = useJuice();
  const snippet = useRef<HTMLElement>(null);
  const [feedback, setFeedback] = useState<{ target: string; copied: boolean }>();
  const request = useRef(0);

  const explicitTarget = copyText ?? code ?? (typeof children === 'string' ? children : undefined);
  const activeKey = explicitTarget ?? '__children__';
  const status = feedback?.target === activeKey ? feedback : undefined;

  useEffect(() => {
    if (!feedback?.copied) return;
    const timer = window.setTimeout(() => setFeedback(undefined), 2000);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  const copy = async () => {
    const textToCopy = explicitTarget ?? snippet.current?.textContent ?? '';
    const key = explicitTarget ?? '__children__';
    const attempt = ++request.current;
    const result = await writeClipboard(textToCopy);
    if (attempt !== request.current) return;
    setFeedback({ target: key, copied: result.ok });
    if (result.ok) {
      playSound('tap');
      onCopied?.(textToCopy);
    } else {
      onCopyError?.(result.error);
      if (snippet.current) {
        try {
          const selected = window.getSelection();
          const range = document.createRange();
          range.selectNodeContents(snippet.current);
          selected?.removeAllRanges();
          selected?.addRange(range);
        } catch {
          // Selection fallback is best-effort across environments.
        }
      }
    }
  };

  const resolvedCopyLabel = copyLabel ?? (label ? `Copy ${label}` : 'Copy snippet');
  const displayContent = children !== undefined ? children : code;
  const copyButton = (
    <button
      ref={copyButtonRef}
      type="button"
      className="j-btn"
      data-size="xs"
      data-variant="ghost"
      aria-label={resolvedCopyLabel}
      title={resolvedCopyLabel}
      onClick={copy}
      style={{ width: 28, padding: 0, flexShrink: 0 }}
    >
      {status?.copied ? (
        <Check size={14} aria-hidden="true" />
      ) : status?.copied === false ? (
        <AlertCircle size={14} aria-hidden="true" style={{ color: 'var(--juice-danger)' }} />
      ) : (
        <Copy size={14} aria-hidden="true" />
      )}
    </button>
  );

  return (
    <div
      {...rest}
      className={clsx('j-copy-snippet', className)}
      role={rest.role ?? 'group'}
      aria-label={rest['aria-label'] ?? label}
      data-status={status ? (status.copied ? 'copied' : 'error') : undefined}
      style={{
        position: 'relative',
        borderRadius: 14,
        padding: label !== undefined ? '6px 10px 10px' : '7px 8px 7px 11px',
        display: 'grid',
        justifyContent: 'stretch',
        gap: 2,
        ...style,
      }}
    >
      {label !== undefined ? (
        <>
          <div style={between}>
            <strong style={{ ...muted, fontFamily: 'var(--juice-font-ui)', textTransform: 'capitalize' }}>{label}</strong>
            {copyButton}
          </div>
          <code ref={snippet} style={{ userSelect: 'text', WebkitUserSelect: 'text', wordBreak: 'normal', overflowWrap: 'anywhere', lineHeight: 1.6 }}>
            {displayContent}
          </code>
        </>
      ) : (
        <div style={between}>
          <code ref={snippet} style={{ userSelect: 'text', WebkitUserSelect: 'text', wordBreak: 'normal', overflowWrap: 'anywhere', lineHeight: 1.6, minWidth: 0 }}>
            {displayContent}
          </code>
          {copyButton}
        </div>
      )}
      <span
        role="status"
        aria-live="polite"
        style={
          status?.copied === false
            ? { ...muted, color: 'var(--juice-danger)', fontFamily: 'var(--juice-font-ui)', paddingTop: 2 }
            : { position: 'absolute', width: 1, height: 1, overflow: 'hidden', clipPath: 'inset(50%)' }
        }
      >
        {status && (status.copied ? copiedLabel : errorLabel)}
      </span>
    </div>
  );
}

const speedOptions = ['1x', '1.5x', '2x'].map((speed) => ({ value: speed, label: speed }));
const demoSteps = ['Init', 'Auth', 'Query', 'Stream', 'Done'];

export type MediaTransportButtonKey = 'restart' | 'previous' | 'play' | 'next';

export type MediaTransportLabels = {
  controls: string;
  restart: string;
  previous: string;
  play: string;
  pause: string;
  next: string;
};

const defaultMediaTransportLabels: MediaTransportLabels = {
  controls: 'Media controls',
  restart: 'Restart',
  previous: 'Previous step',
  play: 'Play',
  pause: 'Pause',
  next: 'Next step',
};

export function MediaTransport({
  playing,
  onTogglePlay,
  onRestart,
  onPrevious,
  onNext,
  canGoBack = true,
  canGoNext = true,
  labels,
  primaryLabel,
  primaryButtonRef,
  getButtonProps,
  className,
  style,
  children,
}: {
  playing: boolean;
  onTogglePlay: () => void;
  onRestart: () => void;
  onPrevious: () => void;
  onNext: () => void;
  canGoBack?: boolean;
  canGoNext?: boolean;
  labels?: Partial<MediaTransportLabels>;
  primaryLabel?: string;
  primaryButtonRef?: Ref<HTMLButtonElement>;
  getButtonProps?: (key: MediaTransportButtonKey) => HTMLAttributes<HTMLButtonElement> & DataAttributes;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}) {
  const copy = { ...defaultMediaTransportLabels, ...labels };
  const playProps = getButtonProps?.('play');
  const {
    className: playClassName,
    style: playStyle,
    onClick: playOnClick,
    'aria-label': playAriaLabel,
    title: playTitle,
    ...restPlayProps
  } = playProps ?? {};
  const resolvedPlayLabel = playAriaLabel ?? primaryLabel ?? (playing ? copy.pause : copy.play);

  return (
    <div
      className={clsx('j-transport-bar', className)}
      role="group"
      aria-label={copy.controls}
      style={{ flexWrap: 'wrap', ...style }}
    >
      <div style={{ ...row, gap: 2 }}>
        <IconButton label={copy.restart} onClick={onRestart} extraProps={getButtonProps?.('restart')}>
          <RotateCcw size={13} aria-hidden="true" />
        </IconButton>
        <IconButton label={copy.previous} disabled={!canGoBack} onClick={onPrevious} extraProps={getButtonProps?.('previous')}>
          <ChevronLeft size={15} aria-hidden="true" />
        </IconButton>
        {primaryLabel !== undefined ? (
          <button
            {...restPlayProps}
            ref={primaryButtonRef}
            type="button"
            className={clsx('j-btn', playClassName)}
            data-size="xs"
            data-variant="primary"
            aria-label={resolvedPlayLabel}
            title={playTitle ?? (restPlayProps['aria-describedby'] ? undefined : resolvedPlayLabel)}
            style={{ height: 28, paddingInline: 10, gap: 5, flexShrink: 0, ...playStyle }}
            onClick={(event) => {
              playOnClick?.(event);
              if (!event.defaultPrevented) onTogglePlay();
            }}
          >
            {playing ? <Pause size={13} aria-hidden="true" /> : <Play size={13} aria-hidden="true" />}
            <span>{primaryLabel}</span>
          </button>
        ) : (
          <IconButton
            label={resolvedPlayLabel}
            onClick={onTogglePlay}
            primary
            buttonRef={primaryButtonRef}
            extraProps={playProps}
          >
            {playing ? <Pause size={13} aria-hidden="true" /> : <Play size={13} aria-hidden="true" />}
          </IconButton>
        )}
        <IconButton label={copy.next} disabled={!canGoNext} onClick={onNext} extraProps={getButtonProps?.('next')}>
          <ChevronRight size={15} aria-hidden="true" />
        </IconButton>
      </div>
      {children}
    </div>
  );
}

export type TimelineStepDwell = {
  durationMs: number;
  elapsedMs: number;
  paused?: boolean;
};

export type TimelineStepItem = {
  id: string | number;
  numberLabel?: string;
  label: ReactNode;
  state?: 'done' | 'active' | 'todo' | 'upcoming';
  dwell?: TimelineStepDwell;
  badge?: ReactNode;
  'data-testid'?: string;
};

export type StepTimelineLabels = {
  timeline: string;
  completed: string;
};

const defaultStepTimelineLabels: StepTimelineLabels = {
  timeline: 'Step timeline',
  completed: 'Completed',
};

function isTimelineStepItem(step: ReactNode | TimelineStepItem): step is TimelineStepItem {
  return (
    typeof step === 'object' &&
    step !== null &&
    !isValidElement(step) &&
    !Array.isArray(step) &&
    'id' in step &&
    'label' in step
  );
}

export function StepTimeline({
  steps,
  activeStep,
  onSelect,
  zoom = 100,
  compactInactive = false,
  labels,
  className,
  style,
}: {
  steps: readonly (ReactNode | TimelineStepItem)[];
  activeStep: number;
  onSelect: (index: number) => void;
  zoom?: number;
  compactInactive?: boolean;
  labels?: Partial<StepTimelineLabels>;
  className?: string;
  style?: CSSProperties;
}) {
  const copy = { ...defaultStepTimelineLabels, ...labels };
  const track = useRef<HTMLDivElement>(null);
  const active = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const container = track.current;
    const chip = active.current;
    if (!container || !chip) return;
    const bounds = container.getBoundingClientRect();
    const item = chip.getBoundingClientRect();
    if (item.left < bounds.left) container.scrollLeft += item.left - bounds.left;
    if (item.right > bounds.right) container.scrollLeft += item.right - bounds.right;
  }, [activeStep, compactInactive, steps, zoom]);

  return (
    <div
      className={clsx('j-timeline-track', className)}
      ref={track}
      role="group"
      aria-label={copy.timeline}
      style={{ gap: 3, padding: '3px 2px', ...style }}
    >
      {steps.map((rawStep, index) => {
        const rich = isTimelineStepItem(rawStep) ? rawStep : null;
        const stepKey = rich ? rich.id : index;
        const numberText = rich?.numberLabel ?? String(index + 1).padStart(2, '0');
        const stepLabel: ReactNode = isTimelineStepItem(rawStep) ? rawStep.label : rawStep;
        const stateValue = rich?.state ?? (index < activeStep ? 'done' : index === activeStep ? 'active' : 'upcoming');
        const isActive = stateValue === 'active';
        const isDone = stateValue === 'done';
        const isUpcoming = !isActive && !isDone;
        const dwellRatio =
          rich?.dwell && rich.dwell.durationMs > 0
            ? clamp(rich.dwell.elapsedMs / rich.dwell.durationMs, 0, 1)
            : null;
        const isCompactChip = compactInactive && !isActive;
        const plainStepText =
          typeof stepLabel === 'string' || typeof stepLabel === 'number' ? String(stepLabel) : undefined;

        if (compactInactive) {
          return (
            <button
              key={stepKey}
              type="button"
              className="j-timeline-chip"
              data-testid={rich?.['data-testid']}
              data-state={stateValue}
              data-compact={isCompactChip ? 'true' : 'false'}
              aria-current={isActive ? 'step' : undefined}
              aria-label={
                isCompactChip && plainStepText
                  ? `${numberText ? `${numberText} · ` : ''}${plainStepText}${isDone ? ` (${copy.completed})` : ''}`
                  : undefined
              }
              title={isCompactChip ? plainStepText : undefined}
              ref={isActive ? active : undefined}
              style={{
                flex: '0 0 auto',
                height: 28,
                padding: isActive ? '0 10px' : '0 8px',
                boxSizing: 'border-box',
                gap: 5,
                background: isUpcoming ? 'var(--fill-slab)' : undefined,
                color: isUpcoming ? 'var(--juice-soft)' : undefined,
              }}
              onClick={() => onSelect(index)}
            >
              {dwellRatio !== null && (
                <span
                  aria-hidden="true"
                  className="j-timeline-dwell"
                  data-paused={rich?.dwell?.paused ? 'true' : undefined}
                  style={{ width: `${dwellRatio * 100}%` }}
                />
              )}
              <span style={{ ...row, gap: 5, position: 'relative', zIndex: 1 }}>
                {numberText !== '' && <span style={mono}>{numberText}</span>}
                {isDone && <Check size={10} aria-label={copy.completed} />}
                {isActive && <span>{stepLabel}</span>}
                {rich?.badge}
              </span>
            </button>
          );
        }

        return (
          <button
            key={stepKey}
            type="button"
            className="j-timeline-chip"
            data-testid={rich?.['data-testid']}
            data-state={stateValue}
            aria-current={isActive ? 'step' : undefined}
            ref={isActive ? active : undefined}
            style={{
              flex: `0 0 calc((100% - ${(steps.length - 1) * 3}px) * ${zoom / (100 * Math.max(1, steps.length))})`,
              minWidth: 'max-content',
              height: 48,
              boxSizing: 'border-box',
              padding: '6px',
              flexDirection: 'column',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 2,
              background: isUpcoming ? 'var(--fill-slab)' : undefined,
              color: isUpcoming ? 'var(--juice-soft)' : undefined,
            }}
            onClick={() => onSelect(index)}
          >
            {dwellRatio !== null && (
              <span
                aria-hidden="true"
                className="j-timeline-dwell"
                data-paused={rich?.dwell?.paused ? 'true' : undefined}
                style={{ width: `${dwellRatio * 100}%` }}
              />
            )}
            <span style={{ ...row, ...mono, width: '100%', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
              <span style={{ ...row, gap: 4 }}>
                {numberText}
                {rich?.badge}
              </span>
              {isDone && <Check size={10} aria-label={copy.completed} />}
            </span>
            <span style={{ position: 'relative', zIndex: 1 }}>{stepLabel}</span>
          </button>
        );
      })}
    </div>
  );
}

export function MediaTransportDock({ id = 'media-transport-dock' }: { id?: string } = {}) {
  const { playSound } = useJuice();
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setPlaybackSpeed] = useState('1x');
  const [zoom, setTimelineZoom] = useState(100);
  const last = demoSteps.length - 1;

  useEffect(() => {
    if (!playing) return;
    const timer = window.setTimeout(() => {
      if (step === last) setPlaying(false);
      else setStep(step + 1);
    }, 1200 / Number.parseFloat(speed));
    return () => window.clearTimeout(timer);
  }, [last, playing, speed, step]);

  const togglePlay = () => {
    playSound('tap');
    if (!playing && step === last) setStep(0);
    setPlaying(!playing);
  };
  const selectStep = (index: number) => {
    playSound('tap');
    setStep(clamp(index, 0, last));
  };
  const nextStep = () => selectStep(step + 1);
  const prevStep = () => selectStep(step - 1);
  const setSpeed = (value: string) => {
    if (speedOptions.some((option) => option.value === value)) setPlaybackSpeed(value);
  };
  const setZoom = (value: number) => {
    if (Number.isFinite(value)) setTimelineZoom(clamp(value, 50, 200));
  };

  useJuiceAgentNode(id, 'MediaTransportDock', { step, playing, speed, zoom }, {
    togglePlay, nextStep, prevStep, setSpeed, setZoom,
  });

  return (
    <div id={id} className="j-slab j-fnd-card" style={card}>
      <div style={header}>
        <strong style={heading}>Media transport</strong>
        <span style={{ ...muted, ...row, gap: 5 }}>
          {playing ? <Play size={10} fill="currentColor" /> : <Pause size={10} />}
          {playing ? 'Playing' : 'Paused'}
        </span>
      </div>
      <div style={inset}>
        <div style={{ ...between, marginBottom: 5 }}>
          <span style={{ ...muted, fontWeight: 550 }}>Step timeline</span>
          <div className="j-zoom-bar" role="group" aria-label="Timeline zoom" style={{ height: 30 }}>
            <IconButton label="Zoom out" disabled={zoom <= 50} onClick={() => setZoom(zoom - 25)}><Minus size={12} /></IconButton>
            <output style={{ ...mono, minWidth: 32, textAlign: 'center' }}>{zoom}%</output>
            <IconButton label="Zoom in" disabled={zoom >= 200} onClick={() => setZoom(zoom + 25)}><Plus size={12} /></IconButton>
          </div>
        </div>
        <StepTimeline steps={demoSteps} activeStep={step} onSelect={selectStep} zoom={zoom} />
      </div>
      <MediaTransport
        playing={playing} onTogglePlay={togglePlay} onRestart={() => selectStep(0)}
        onPrevious={prevStep} onNext={nextStep} canGoBack={step > 0} canGoNext={step < last}
      >
        <div role="group" aria-label="Playback speed"><SegmentedControl options={speedOptions} value={speed} onChange={setSpeed} /></div>
      </MediaTransport>
    </div>
  );
}

export function useIdleVisibility(
  enabled: boolean,
  delayMs = 1800,
  activityRef?: RefObject<HTMLElement | null>,
): { visible: boolean; poke: () => void } {
  const [faded, setFaded] = useState(false);
  const timerRef = useRef<number | undefined>(undefined);
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;
  const delayRef = useRef(delayMs);
  delayRef.current = delayMs;

  const scheduleFade = useCallback(() => {
    window.clearTimeout(timerRef.current);
    timerRef.current = undefined;
    if (!enabledRef.current) return;
    const ms = Number.isFinite(delayRef.current) ? Math.max(0, delayRef.current) : 1800;
    timerRef.current = window.setTimeout(() => {
      timerRef.current = undefined;
      setFaded(true);
    }, ms);
  }, []);

  const poke = useCallback(() => {
    setFaded(false);
    scheduleFade();
  }, [scheduleFade]);

  useEffect(() => {
    window.clearTimeout(timerRef.current);
    timerRef.current = undefined;
    setFaded(false);
    if (!enabled) return;

    const target: EventTarget | null = activityRef
      ? activityRef.current
      : typeof window !== 'undefined'
        ? window
        : null;
    if (!target) return;

    const onActivity = () => {
      setFaded(false);
      scheduleFade();
    };

    scheduleFade();
    const events = activityRef
      ? (['pointerenter', 'pointermove', 'pointerdown', 'keydown', 'wheel', 'touchstart'] as const)
      : (['pointermove', 'pointerdown', 'keydown', 'wheel', 'touchstart'] as const);
    for (const eventName of events) {
      target.addEventListener(eventName, onActivity, { passive: true });
    }
    return () => {
      window.clearTimeout(timerRef.current);
      timerRef.current = undefined;
      for (const eventName of events) {
        target.removeEventListener(eventName, onActivity);
      }
    };
  }, [activityRef, delayMs, enabled, scheduleFade]);

  return { visible: !enabled || !faded, poke };
}

export function IdleAutoHideBar({
  idle,
  children,
  delay = 1000,
  activityRef,
  className,
  style,
  inactiveOpacity = 0.18,
  onVisibilityChange,
  pointerEventsWhenHidden,
}: {
  idle: boolean;
  children: ReactNode;
  delay?: number;
  activityRef?: RefObject<HTMLElement | null>;
  className?: string;
  style?: CSSProperties;
  inactiveOpacity?: number;
  onVisibilityChange?: (visible: boolean) => void;
  pointerEventsWhenHidden?: boolean;
}) {
  const { animate } = useJuice();
  const bar = useRef<HTMLDivElement>(null);
  const [focusedWithin, setFocusedWithin] = useState(false);
  const { visible, poke } = useIdleVisibility(idle && !focusedWithin, delay, activityRef ?? bar);
  const onVisibilityChangeRef = useRef(onVisibilityChange);
  onVisibilityChangeRef.current = onVisibilityChange;
  const previousVisible = useRef<boolean | undefined>(undefined);

  useEffect(() => {
    if (previousVisible.current !== visible) {
      previousVisible.current = visible;
      onVisibilityChangeRef.current?.(visible);
    }
  }, [visible]);

  const resolvedInactiveOpacity = Number.isFinite(inactiveOpacity) ? clamp(inactiveOpacity, 0, 1) : 0.18;
  const disablePointerEvents =
    !visible &&
    (pointerEventsWhenHidden !== undefined
      ? !pointerEventsWhenHidden
      : resolvedInactiveOpacity === 0 && Boolean(activityRef));

  return (
    <div
      ref={bar}
      className={clsx('j-transport-bar', className)}
      data-idle={!visible}
      onPointerEnter={() => {
        if (idle) poke();
      }}
      onPointerMove={() => {
        if (idle) poke();
      }}
      onFocusCapture={() => setFocusedWithin(true)}
      onBlurCapture={(event) => {
        if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) {
          setFocusedWithin(false);
        }
      }}
      style={{
        position: 'absolute',
        bottom: 10,
        left: '50%',
        translate: '-50% 0',
        borderRadius: 999,
        whiteSpace: 'nowrap',
        background: 'var(--fill-slab)',
        boxShadow: '0 0 0 1px var(--juice-edge)',
        opacity: visible ? 1 : resolvedInactiveOpacity,
        pointerEvents: disablePointerEvents ? 'none' : undefined,
        transition: animate ? 'opacity 180ms ease' : undefined,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

const captions = [
  { initials: 'MJ', speaker: 'Maya Jones', subtitle: 'Let’s start with the overview.', audio: 'Live' },
  { initials: 'SL', speaker: 'Sam Lee', subtitle: 'Here’s the next example.', audio: 'Live' },
  { initials: 'MJ', speaker: 'Maya Jones', subtitle: 'That’s the end of the preview.', audio: 'Live' },
];

export function IdleFullscreenPill({ id = 'idle-fullscreen-pill' }: { id?: string } = {}) {
  const { playSound } = useJuice();
  const [idle, updateIdle] = useState(false);
  const [captionIndex, setCaptionIndex] = useState(0);
  const [followCamera, setFollowCamera] = useState(false);
  const stage = useRef<HTMLDivElement>(null);
  const caption = captions[captionIndex] ?? captions[0]!;

  const setIdle = (value: boolean) => updateIdle(Boolean(value));
  const nextCaption = () => {
    playSound('tap');
    setCaptionIndex((index) => (index + 1) % captions.length);
  };
  const toggleFollowCamera = () => {
    playSound('tap');
    setFollowCamera((value) => !value);
  };

  useJuiceAgentNode(id, 'IdleFullscreenPill', { idle, captionIndex, followCamera }, { setIdle, nextCaption, toggleFollowCamera });

  return (
    <div id={id} className="j-slab j-fnd-card" style={card}>
      <div style={header}>
        <strong style={heading}>Stage preview</strong>
        <div style={row}>
          <span style={muted}>Auto-hide</span>
          <Switch checked={idle} onChange={setIdle} aria-label="Auto-hide transport" />
        </div>
      </div>
      <div ref={stage} style={{ ...inset, position: 'relative', padding: '14px 14px 60px', overflow: 'hidden' }}>
        <div role="status">
          <div style={between}>
            <span style={row}>
              <span aria-hidden="true" style={{ ...mono, display: 'grid', placeItems: 'center', width: 26, height: 26, borderRadius: '50%', background: 'var(--fill-on)', color: 'var(--fill-slab)' }}>{caption.initials}</span>
              <strong style={{ ...muted, fontWeight: 600 }}>{caption.speaker}</strong>
            </span>
            <Badge><Volume2 size={12} /> {caption.audio}</Badge>
          </div>
          <p style={{ margin: '14px 0 2px', maxWidth: '17ch', minHeight: '2.4em', fontSize: 23, fontWeight: 550, letterSpacing: '-0.045em', lineHeight: 1.2 }}>
            {caption.subtitle}
          </p>
        </div>
        <IdleAutoHideBar idle={idle} activityRef={stage}>
          <span aria-label={`Caption ${captionIndex + 1} of ${captions.length}`} style={{ ...mono, paddingLeft: 4 }}>{captionIndex + 1}/{captions.length}</span>
          <IconButton label="Next caption" onClick={nextCaption}><ChevronRight size={15} /></IconButton>
          <button type="button" className="j-chip" aria-pressed={followCamera} onClick={toggleFollowCamera}
            style={followCamera ? { background: 'var(--fill-on)', color: 'var(--fill-slab)' } : undefined}
          >
            <Maximize2 size={12} /> Follow camera
          </button>
        </IdleAutoHideBar>
      </div>
    </div>
  );
}

const corners = ['bottom-right', 'bottom-left', 'top-right', 'top-left'] as const;
export type SnapCorner = (typeof corners)[number];
export type OrbPosition = { x: number; y: number };
const defaultOrbWidth = 98;
const defaultOrbHeight = 34;
const cornerInset = 10;

type OrbDrag = {
  pointer: number;
  x: number;
  y: number;
  left: number;
  top: number;
  moved: boolean;
};

export type CornerSnapOrbProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'title'> & DataAttributes & {
  mode?: 'corners' | 'free';
  corner?: SnapCorner;
  onSnap?: (corner: SnapCorner) => void;
  position?: OrbPosition;
  defaultPosition?: OrbPosition;
  onPositionChange?: (pos: OrbPosition) => void;
  onActivate: () => void;
  expanded?: boolean;
  controls?: string;
  orbWidth?: number;
  orbHeight?: number;
  inset?: number;
  title?: string;
  'aria-label'?: string;
  children: ReactNode;
  buttonRef?: Ref<HTMLButtonElement>;
  ref?: Ref<HTMLButtonElement>;
};

function clampNormalizedPosition(pos: OrbPosition): OrbPosition {
  return {
    x: Number.isFinite(pos.x) ? clamp(pos.x, 0, 1) : 1,
    y: Number.isFinite(pos.y) ? clamp(pos.y, 0, 1) : 1,
  };
}

function getStageMetrics(button: HTMLButtonElement): { stage: HTMLElement | null; width: number; height: number } {
  const stage =
    button.offsetParent instanceof HTMLElement
      ? button.offsetParent
      : button.parentElement;
  const rect = stage?.getBoundingClientRect();
  const width = stage && stage.clientWidth > 0 ? stage.clientWidth : rect && rect.width > 0 ? rect.width : 320;
  const height = stage && stage.clientHeight > 0 ? stage.clientHeight : rect && rect.height > 0 ? rect.height : 180;
  return { stage, width, height };
}

export function CornerSnapOrb({
  mode = 'corners',
  corner = 'bottom-right',
  onSnap,
  position: controlledPosition,
  defaultPosition = { x: 1, y: 1 },
  onPositionChange,
  onActivate,
  expanded,
  controls,
  orbWidth: orbWidthProp = defaultOrbWidth,
  orbHeight: orbHeightProp = defaultOrbHeight,
  inset: insetProp,
  title,
  'aria-label': ariaLabel,
  children,
  buttonRef,
  ref,
  className,
  style,
  onClick,
  onKeyDown,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  onLostPointerCapture,
  ...rest
}: CornerSnapOrbProps) {
  const resolvedOrbWidth = Number.isFinite(orbWidthProp) ? Math.max(24, orbWidthProp) : defaultOrbWidth;
  const resolvedOrbHeight = Number.isFinite(orbHeightProp) ? Math.max(24, orbHeightProp) : defaultOrbHeight;
  const resolvedCornerInset = insetProp !== undefined && Number.isFinite(insetProp) ? Math.max(0, insetProp) : cornerInset;
  const resolvedFreeInset = insetProp !== undefined && Number.isFinite(insetProp) ? Math.max(0, insetProp) : 0;

  const [freePosition, setFreePosition] = useControllableState<OrbPosition>({
    value: controlledPosition,
    defaultValue: defaultPosition,
    onChange: onPositionChange,
  });
  const clampedFree = clampNormalizedPosition(freePosition);

  const drag = useRef<OrbDrag | null>(null);
  const skipClick = useRef(false);
  const [dragPixels, setDragPixels] = useState<{ left: number; top: number } | null>(null);
  const vertical = corner.startsWith('top') ? 'top' : 'bottom';
  const horizontal = corner.endsWith('left') ? 'left' : 'right';

  const startDrag = (event: PointerEvent<HTMLButtonElement>) => {
    onPointerDown?.(event);
    if (event.defaultPrevented || !event.isPrimary || event.button !== 0) return;
    skipClick.current = false;
    const orb = event.currentTarget;
    const { width: stageW, height: stageH } = getStageMetrics(orb);
    const spanX = Math.max(0, stageW - resolvedOrbWidth - resolvedFreeInset * 2);
    const spanY = Math.max(0, stageH - resolvedOrbHeight - resolvedFreeInset * 2);
    const fallbackLeft =
      mode === 'free'
        ? resolvedFreeInset + clampedFree.x * spanX
        : horizontal === 'left'
          ? resolvedCornerInset
          : Math.max(0, stageW - resolvedOrbWidth - resolvedCornerInset);
    const fallbackTop =
      mode === 'free'
        ? resolvedFreeInset + clampedFree.y * spanY
        : vertical === 'top'
          ? resolvedCornerInset
          : Math.max(0, stageH - resolvedOrbHeight - resolvedCornerInset);

    drag.current = {
      pointer: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      left: orb.offsetLeft || fallbackLeft,
      top: orb.offsetTop || fallbackTop,
      moved: false,
    };
    orb.setPointerCapture?.(event.pointerId);
  };

  const computeClampedDrag = (event: PointerEvent<HTMLButtonElement>, start: OrbDrag, stageW: number, stageH: number) => {
    const pad = mode === 'free' ? resolvedFreeInset : 0;
    const maxLeft = Math.max(pad, stageW - resolvedOrbWidth - pad);
    const maxTop = Math.max(pad, stageH - resolvedOrbHeight - pad);
    return {
      left: clamp(start.left + event.clientX - start.x, pad, maxLeft),
      top: clamp(start.top + event.clientY - start.y, pad, maxTop),
      pad,
      spanX: Math.max(0, maxLeft - pad),
      spanY: Math.max(0, maxTop - pad),
    };
  };

  const moveDrag = (event: PointerEvent<HTMLButtonElement>) => {
    onPointerMove?.(event);
    const start = drag.current;
    if (start?.pointer !== event.pointerId) return;
    if (!start.moved && Math.hypot(event.clientX - start.x, event.clientY - start.y) < 4) return;
    start.moved = true;
    const { width: stageW, height: stageH } = getStageMetrics(event.currentTarget);
    const { left, top, pad, spanX, spanY } = computeClampedDrag(event, start, stageW, stageH);
    setDragPixels({ left, top });
    if (mode === 'free') {
      setFreePosition({
        x: spanX > 0 ? clamp((left - pad) / spanX, 0, 1) : 0,
        y: spanY > 0 ? clamp((top - pad) / spanY, 0, 1) : 0,
      });
    }
  };

  const finishDrag = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.type === 'pointerup') onPointerUp?.(event);
    else if (event.type === 'pointercancel') onPointerCancel?.(event);
    else onLostPointerCapture?.(event);

    const start = drag.current;
    if (start?.pointer !== event.pointerId) return;
    drag.current = null;
    setDragPixels(null);
    const moved = start.moved || Math.hypot(event.clientX - start.x, event.clientY - start.y) >= 4;
    skipClick.current = moved || event.type !== 'pointerup';
    if (!moved || event.type !== 'pointerup') return;

    const { width: stageW, height: stageH } = getStageMetrics(event.currentTarget);
    const { left, top, pad, spanX, spanY } = computeClampedDrag(event, start, stageW, stageH);
    if (mode === 'free') {
      setFreePosition({
        x: spanX > 0 ? clamp((left - pad) / spanX, 0, 1) : 0,
        y: spanY > 0 ? clamp((top - pad) / spanY, 0, 1) : 0,
      });
    } else {
      const nextVertical = top + resolvedOrbHeight / 2 < stageH / 2 ? 'top' : 'bottom';
      const nextHorizontal = left + resolvedOrbWidth / 2 < stageW / 2 ? 'left' : 'right';
      onSnap?.(`${nextVertical}-${nextHorizontal}`);
    }
  };

  const resolvedTitle =
    title ?? (mode === 'free' ? 'Drag to reposition or use the arrow keys' : 'Drag to a corner or use the arrow keys');

  const computedLeft =
    dragPixels?.left ??
    (mode === 'free'
      ? `calc(${resolvedFreeInset}px + ${clampedFree.x} * (100% - ${resolvedOrbWidth + resolvedFreeInset * 2}px))`
      : horizontal === 'left'
        ? resolvedCornerInset
        : `calc(100% - ${resolvedOrbWidth + resolvedCornerInset}px)`);

  const computedTop =
    dragPixels?.top ??
    (mode === 'free'
      ? `calc(${resolvedFreeInset}px + ${clampedFree.y} * (100% - ${resolvedOrbHeight + resolvedFreeInset * 2}px))`
      : vertical === 'top'
        ? resolvedCornerInset
        : `calc(100% - ${resolvedOrbHeight + resolvedCornerInset}px)`);

  return (
    <button
      {...rest}
      type="button"
      className={clsx('j-drag-orb', className)}
      ref={buttonRef ?? ref}
      title={resolvedTitle}
      aria-label={ariaLabel}
      aria-expanded={expanded}
      aria-controls={expanded ? controls : undefined}
      data-mode={mode}
      data-corner={mode === 'corners' ? corner : undefined}
      data-dragging={dragPixels !== null}
      style={{
        width: resolvedOrbWidth,
        height: resolvedOrbHeight,
        justifyContent: 'center',
        touchAction: 'none',
        left: computedLeft,
        top: computedTop,
        ...style,
      }}
      onPointerDown={startDrag}
      onPointerMove={moveDrag}
      onPointerUp={finishDrag}
      onPointerCancel={finishDrag}
      onLostPointerCapture={finishDrag}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented) return;
        if (event.detail === 0 || !skipClick.current) onActivate();
        skipClick.current = false;
      }}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        if (event.defaultPrevented) return;
        if (mode === 'free') {
          const stepPx = event.shiftKey ? 32 : 8;
          let dx = 0;
          let dy = 0;
          switch (event.key) {
            case 'ArrowLeft': dx = -stepPx; break;
            case 'ArrowRight': dx = stepPx; break;
            case 'ArrowUp': dy = -stepPx; break;
            case 'ArrowDown': dy = stepPx; break;
            default: return;
          }
          event.preventDefault();
          const { width: stageW, height: stageH } = getStageMetrics(event.currentTarget);
          const spanX = Math.max(1, stageW - resolvedOrbWidth - resolvedFreeInset * 2);
          const spanY = Math.max(1, stageH - resolvedOrbHeight - resolvedFreeInset * 2);
          setFreePosition({
            x: clamp((clampedFree.x * spanX + dx) / spanX, 0, 1),
            y: clamp((clampedFree.y * spanY + dy) / spanY, 0, 1),
          });
          return;
        }
        switch (event.key) {
          case 'ArrowLeft': onSnap?.(`${vertical}-left`); break;
          case 'ArrowRight': onSnap?.(`${vertical}-right`); break;
          case 'ArrowUp': onSnap?.(`top-${horizontal}`); break;
          case 'ArrowDown': onSnap?.(`bottom-${horizontal}`); break;
          default: return;
        }
        event.preventDefault();
      }}
    >
      {children}
    </button>
  );
}

export function DraggableSnapOrb({ id = 'draggable-snap-orb' }: { id?: string } = {}) {
  const { playSound } = useJuice();
  const panelId = useId();
  const orb = useRef<HTMLButtonElement>(null);
  const [corner, setCorner] = useState<SnapCorner>('bottom-right');
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [status, setStatus] = useState<'Note sent' | 'Approved'>();
  const snapToCorner = (value: SnapCorner) => {
    if (!corners.includes(value)) return;
    playSound('tap');
    setCorner(value);
  };
  const togglePopover = () => {
    playSound('tap');
    setStatus(undefined);
    setOpen((value) => !value);
  };
  const closeNote = () => {
    setOpen(false);
    orb.current?.focus();
  };
  const submitNote = (text?: string) => {
    if (!(typeof text === 'string' ? text : draft).trim()) return;
    playSound('paid');
    setDraft('');
    setStatus('Note sent');
    closeNote();
  };

  useJuiceAgentNode(id, 'DraggableSnapOrb', { corner, open, draft, status }, { snapToCorner, togglePopover, submitNote });

  return (
    <div id={id} className="j-slab j-fnd-card" style={card}>
      <div style={header}>
        <strong style={heading}>Snap orb</strong>
        <button type="button" className="j-chip" onClick={() => {
          const next = (corners.indexOf(corner) + 1) % corners.length;
          snapToCorner(corners[next]!);
        }}>
          <RotateCcw size={12} /> Cycle corner
        </button>
      </div>
      <div className="j-snap-stage" style={{
        backgroundImage: 'radial-gradient(var(--juice-w20) 0.9px, transparent 1px)', backgroundSize: '10px 10px',
        touchAction: 'pan-y',
      }}>
        {corners.map((target) => {
          const top = target.startsWith('top');
          const left = target.endsWith('left');
          return (
            <i key={target} aria-hidden="true" style={{
              position: 'absolute', width: 15, height: 15, borderColor: 'var(--juice-faint)', borderStyle: 'solid',
              borderWidth: `${top ? 2 : 0}px ${left ? 0 : 2}px ${top ? 0 : 2}px ${left ? 2 : 0}px`,
              [top ? 'top' : 'bottom']: 8, [left ? 'left' : 'right']: 8,
            }} />
          );
        })}
        <CornerSnapOrb buttonRef={orb} corner={corner} onSnap={snapToCorner} onActivate={togglePopover} expanded={open} controls={panelId}>
          <MessageSquare size={14} /> Feedback
        </CornerSnapOrb>
      </div>
      {open && (
        <form
          id={panelId}
          aria-label="Draft note"
          onKeyDown={(event) => { if (event.key === 'Escape') closeNote(); }}
          onSubmit={(event) => {
            event.preventDefault();
            submitNote();
          }}
          style={{ ...inset, display: 'grid', gap: 8 }}
        >
          <div className="j-input-box" style={{ background: 'var(--fill-slab)' }}>
            <input autoFocus className="j-input-el" aria-label="Note" placeholder="Leave a note…" value={draft} onChange={(event) => setDraft(event.target.value)} />
          </div>
          <div style={{ ...row, justifyContent: 'flex-end' }}>
            <button type="button" className="j-btn" data-size="sm" data-variant="ghost" onClick={() => {
              playSound('paid');
              setStatus('Approved');
              closeNote();
            }}>
              <Check size={14} /> Approve
            </button>
            <button type="submit" className="j-btn" data-size="sm" disabled={!draft.trim()}>
              <Send size={13} /> Send Note
            </button>
          </div>
        </form>
      )}
      <div style={{ ...between, ...muted, padding: '0 3px 2px' }}>
        <span role="status">{status ?? 'Drag to snap'}</span>
        <output style={{ ...mono, textTransform: 'capitalize' }}>{corner.replace('-', ' ')}</output>
      </div>
    </div>
  );
}

export function TaskProgressCard({
  step,
  value,
  onCancel,
  onRetry,
  retryLabel = 'Retry',
  cancelLabel = 'Cancel',
  ariaLabel = 'Task progress',
  cancelButtonProps,
  children,
}: {
  step: string;
  value: number;
  onCancel?: () => void;
  onRetry?: () => void;
  retryLabel?: string;
  cancelLabel?: string;
  ariaLabel?: string;
  cancelButtonProps?: HTMLAttributes<HTMLButtonElement> & DataAttributes;
  children?: ReactNode;
}) {
  const percent = Number.isFinite(value) ? clamp(value, 0, 100) : 0;
  const {
    className: cancelClassName,
    onClick: cancelOnClick,
    ...restCancelProps
  } = cancelButtonProps ?? {};

  return (
    <div style={{ ...inset, display: 'grid', gap: 8 }}>
      <div style={between}>
        <span role="status" style={heading}>{step} · {percent}%</span>
        {(onCancel || onRetry) && (
          <div style={row}>
            {onCancel && (
              <button
                {...restCancelProps}
                type="button"
                className={clsx('j-btn', cancelClassName)}
                data-size="xs"
                data-variant="ghost"
                onClick={(event) => {
                  cancelOnClick?.(event);
                  if (!event.defaultPrevented) onCancel();
                }}
              >
                {cancelLabel}
              </button>
            )}
            {onRetry && (
              <button
                type="button"
                className="j-btn"
                data-size="xs"
                data-variant="secondary"
                onClick={onRetry}
              >
                {retryLabel}
              </button>
            )}
          </div>
        )}
      </div>
      <div
        role="progressbar"
        aria-label={ariaLabel}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        style={{ height: 5, borderRadius: 999, background: 'var(--juice-w12)' }}
      >
        <div style={{ width: `${percent}%`, height: '100%', borderRadius: 'inherit', background: 'var(--fill-on)', transition: 'width 160ms ease' }} />
      </div>
      {children}
    </div>
  );
}

const frameTotal = 5;
type Job = { status: 'idle' | 'running' | 'complete' | 'canceled'; frame: number };

export function BackgroundTaskMenu({ id = 'background-task-menu' }: { id?: string } = {}) {
  const { playSound } = useJuice();
  const panelId = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [job, setJob] = useState<Job>({ status: 'idle', frame: 0 });
  const { status, frame } = job;
  const percent = (frame / frameTotal) * 100;
  const running = status === 'running';

  const advanceJob = () => {
    setJob((current) => {
      if (current.status !== 'running') return current;
      const next = current.frame + 1;
      return { status: next === frameTotal ? 'complete' : 'running', frame: next };
    });
  };

  useEffect(() => {
    if (!running) return;
    const timer = window.setTimeout(advanceJob, 1000);
    return () => window.clearTimeout(timer);
  }, [frame, running]);

  const startJob = () => {
    setOpen(true);
    if (running) return;
    playSound('tap');
    setJob({ status: 'running', frame: 0 });
  };
  const cancelJob = () => {
    setJob((current) => current.status === 'running' ? { ...current, status: 'canceled' } : current);
  };

  useJuiceAgentNode(id, 'BackgroundTaskMenu', { status, frame, percent, open }, { startJob, advanceJob, cancelJob });

  const triggerLabel = { idle: 'Start export', running: 'Exporting', complete: 'Export complete', canceled: 'Export canceled' }[status];
  const progressLabel = status === 'complete' ? 'All frames recorded' : status === 'canceled' ? 'Export canceled' : frame === 0 ? 'Preparing frames' : `Recording frame ${frame} / ${frameTotal}`;
  const closeDetails = () => {
    setOpen(false);
    trigger.current?.focus();
  };

  return (
    <div id={id} className="j-slab j-fnd-card" style={card}>
      <div style={header}>
        <strong style={heading}>Frame export</strong>
        <button
          ref={trigger} type="button" className="j-btn" data-size="sm" data-variant={status === 'idle' ? 'primary' : 'secondary'}
          aria-expanded={open} aria-controls={open ? panelId : undefined}
          onClick={() => status === 'idle' ? startJob() : setOpen((value) => !value)}
        >
          <ProgressRing value={percent} /> {triggerLabel}{running && ` · ${percent}%`}
        </button>
      </div>
      <div role="img" aria-label={`Frame sequence, ${frame} of ${frameTotal} recorded`} style={{ ...inset, display: 'flex', gap: 3, padding: 6 }}>
        {Array.from({ length: frameTotal }, (_, index) => {
          const phase = index / (frameTotal - 1);
          const height = Math.sin(Math.PI * phase);
          return (
            <div key={index} aria-hidden="true" style={{
              position: 'relative', flex: 1, height: 62, overflow: 'hidden', borderRadius: index === 0 ? '9px 2px 2px 9px' : index === frameTotal - 1 ? '2px 9px 9px 2px' : 2,
              background: index < frame ? 'var(--fill-on)' : 'var(--fill-slab)',
              color: index < frame ? 'var(--fill-slab)' : 'var(--juice-soft)',
            }}>
              <span style={{ position: 'absolute', bottom: 8, left: '16%', right: '16%', height: 1, background: 'currentColor', opacity: 0.18 }} />
              <span style={{ position: 'absolute', width: 13, height: 13, borderRadius: '50%', background: 'currentColor', left: `${20 + 40 * phase}%`, bottom: 9 + 20 * height }} />
              <span style={{ position: 'absolute', top: 4, left: 5, ...mono, fontSize: 9 }}>{String(index + 1).padStart(2, '0')}</span>
            </div>
          );
        })}
      </div>
      {open && (
        <div id={panelId} role="region" aria-label="Export details" onKeyDown={(event) => { if (event.key === 'Escape') closeDetails(); }}>
          <TaskProgressCard
            step={progressLabel} value={percent}
            onCancel={running ? cancelJob : undefined}
            onRetry={running ? undefined : startJob}
            retryLabel={status === 'complete' ? 'Run again' : 'Retry'}
          >
            <div style={between}>
              <span style={muted}>{running && 'You can close this panel during export.'}</span>
              <IconButton label="Close export details" onClick={closeDetails}><X size={14} /></IconButton>
            </div>
          </TaskProgressCard>
        </div>
      )}
    </div>
  );
}

const command = 'npx create-juice-app@latest --template studio';
const shareUrl = 'https://juice-ui.dev/share/v03';

export function CopySnippetFlash({ id = 'copy-snippet-flash' }: { id?: string } = {}) {
  const [flash, setFlash] = useState<{ code: string }>();
  const copyCommand = useRef<HTMLButtonElement>(null);
  const copyShareUrl = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!flash) return;
    const timer = window.setTimeout(() => setFlash(undefined), 2600);
    return () => window.clearTimeout(timer);
  }, [flash]);

  const onCopied = (code: string) => setFlash({ code });

  useJuiceAgentNode(id, 'CopySnippetFlash', { copied: flash?.code ?? null }, {
    copyCommand: () => copyCommand.current?.click(),
    copyShareUrl: () => copyShareUrl.current?.click(),
  });

  return (
    <div id={id} className="j-slab j-fnd-card" style={card}>
      <div style={header}>
        <strong style={heading}>Setup snippets</strong>
        <span aria-hidden="true">
          {flash && <Badge tone="ok"><Check size={12} /> {flash.code === command ? 'Command copied' : 'URL copied'}</Badge>}
        </span>
      </div>
      <CopySnippet code={command} label="command" onCopied={onCopied} copyButtonRef={copyCommand} />
      <CopySnippet code={shareUrl} label="share URL" onCopied={onCopied} copyButtonRef={copyShareUrl} />
    </div>
  );
}

export type MaskedSecretFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & DataAttributes & {
  ref?: Ref<HTMLInputElement>;
  label?: string;
  hint?: ReactNode;
  error?: string;
  revealLabel?: string;
  hideLabel?: string;
  revealed?: boolean;
  defaultRevealed?: boolean;
  onRevealedChange?: (revealed: boolean) => void;
};

export function MaskedSecretField({
  ref,
  id,
  label,
  hint,
  error,
  revealLabel = 'Show secret',
  hideLabel = 'Hide secret',
  revealed: controlledRevealed,
  defaultRevealed = false,
  onRevealedChange,
  className,
  disabled,
  readOnly,
  autoComplete = 'off',
  ...rest
}: MaskedSecretFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [revealed, setRevealed] = useControllableState({
    value: controlledRevealed,
    defaultValue: defaultRevealed,
    onChange: onRevealedChange,
  });

  const describedBy = clsx(
    rest['aria-describedby'],
    hint && `${inputId}-hint`,
    error && `${inputId}-error`,
  );
  const invalid = error ? true : rest['aria-invalid'];
  const toggleLabel = revealed ? hideLabel : revealLabel;

  return (
    <div className="j-field">
      {label !== undefined && (
        <div className="j-field-label-row">
          <label htmlFor={inputId}>{label}</label>
        </div>
      )}
      <div
        className="j-input-box"
        style={{ opacity: disabled ? 0.55 : undefined }}
        data-invalid={invalid && invalid !== 'false' ? true : undefined}
      >
        <KeyRound size={14} aria-hidden="true" style={{ color: 'var(--juice-mute)', flexShrink: 0 }} />
        <input
          {...rest}
          ref={ref}
          id={inputId}
          type={revealed ? 'text' : 'password'}
          className={clsx('j-input-el', className)}
          disabled={disabled}
          readOnly={readOnly}
          autoComplete={autoComplete}
          aria-label={rest['aria-label'] ?? (label === undefined ? rest.placeholder : undefined)}
          aria-invalid={invalid}
          aria-describedby={describedBy || undefined}
        />
        <button
          type="button"
          className="j-btn"
          data-size="xs"
          data-variant="ghost"
          disabled={disabled}
          aria-label={toggleLabel}
          aria-pressed={revealed}
          title={toggleLabel}
          style={{ width: 24, height: 24, padding: 0, flexShrink: 0 }}
          onClick={() => setRevealed(!revealed)}
        >
          {revealed ? <EyeOff size={14} aria-hidden="true" /> : <Eye size={14} aria-hidden="true" />}
        </button>
      </div>
      {hint !== undefined && (
        <div id={`${inputId}-hint`} className="j-field-hint">
          {hint}
        </div>
      )}
      <div
        aria-live="polite"
        className="j-field-error"
        id={`${inputId}-error`}
        style={{ display: error ? undefined : 'contents' }}
      >
        {error}
      </div>
    </div>
  );
}

export function MaskedSecretInput({
  label, onSave, onCancel,
}: {
  label: string;
  onSave: (secret: string) => void;
  onCancel?: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <form
      style={{ display: 'grid', gap: 6 }}
      onKeyDown={(event) => { if (event.key === 'Escape') onCancel?.(); }}
      onSubmit={(event) => {
        event.preventDefault();
        const field = input.current;
        if (!field) return;
        const secret = field.value;
        if (Array.from(secret.trim()).length < 5) {
          field.setCustomValidity('Enter at least 5 characters.');
          field.reportValidity();
          return;
        }
        field.value = '';
        onSave(secret);
      }}
    >
      <div className="j-input-box" style={{ background: 'var(--fill-slab)' }}>
        <KeyRound size={14} aria-hidden="true" />
        <input
          className="j-input-el"
          ref={input}
          autoFocus
          aria-label={label}
          type="password"
          autoComplete="new-password"
          placeholder={label}
          minLength={5}
          onInput={(event) => event.currentTarget.setCustomValidity('')}
          required
        />
      </div>
      <div style={{ ...row, justifyContent: 'flex-end' }}>
        {onCancel && <button type="button" className="j-btn" data-size="xs" data-variant="ghost" onClick={onCancel}>Cancel</button>}
        <button type="submit" className="j-btn" data-size="xs">Save key</button>
      </div>
    </form>
  );
}

const providers = ['OpenAI', 'ElevenLabs'] as const;
type Provider = (typeof providers)[number];
type SaveKeyPayload = { provider: string; rawKey?: string };
type SecretEntry = { suffix?: string; message?: string };

function isProvider(value: string): value is Provider {
  return providers.some((provider) => provider === value);
}

export function MaskedSecretManager({ id = 'masked-secret-manager' }: { id?: string } = {}) {
  const { playSound } = useJuice();
  const [entries, setEntries] = useState<Record<Provider, SecretEntry>>({
    OpenAI: { suffix: '8f2a' },
    ElevenLabs: { suffix: '4c91' },
  });
  const [editing, setEditing] = useState<Provider | null>(null);
  const editButtons = useRef<Partial<Record<Provider, HTMLButtonElement | null>>>({});

  const saveKey = (provider: string, rawKey?: string) => {
    if (!isProvider(provider)) return;
    if (typeof rawKey !== 'string') {
      setEditing(provider);
      return;
    }
    const characters = Array.from(rawKey.trim());
    if (characters.length < 5) {
      setEntries((current) => ({ ...current, [provider]: { ...current[provider], message: 'Enter at least 5 characters.' } }));
      return;
    }
    const suffix = characters.slice(-4).join('');
    setEntries((current) => ({ ...current, [provider]: { suffix, message: 'Key saved.' } }));
    setEditing((current) => current === provider ? null : current);
    if (editing === provider) editButtons.current[provider]?.focus();
    playSound('paid');
  };
  const testConnection = (provider: string) => {
    if (!isProvider(provider)) return;
    setEntries((current) => {
      if (!current[provider].suffix) return current;
      return { ...current, [provider]: { ...current[provider], message: '200 OK · 38ms (simulated)' } };
    });
  };
  const removeKey = (provider: string) => {
    if (!isProvider(provider)) return;
    setEntries((current) => ({ ...current, [provider]: { message: 'Key removed.' } }));
    setEditing((current) => current === provider ? null : current);
    editButtons.current[provider]?.focus();
  };

  useJuiceAgentNode(id, 'MaskedSecretManager', { entries, editing }, {
    saveKey: (payload?: string | SaveKeyPayload) => {
      if (typeof payload === 'string') saveKey(payload);
      else if (payload) saveKey(payload.provider, payload.rawKey);
    },
    testConnection,
    removeKey,
  });

  return (
    <div id={id} className="j-slab j-fnd-card" style={card}>
      <div style={header}>
        <strong style={heading}>API keys</strong>
        <span style={{ ...row, ...muted }}><KeyRound size={12} /> {providers.filter((provider) => entries[provider].suffix).length} saved</span>
      </div>
      <div style={{ ...inset, paddingBlock: 0 }}>
      {providers.map((provider) => {
        const entry = entries[provider];
        const editLabel = entry.suffix ? 'Replace key' : 'Add key';
        const closeEditor = () => {
          setEditing(null);
          editButtons.current[provider]?.focus();
        };
        return (
          <div key={provider} role="group" aria-label={provider} style={{
            display: 'grid', gap: 7, paddingBlock: 10,
            borderTop: provider === providers[0] ? undefined : '1px solid var(--juice-edge)',
          }}>
            <div style={between}>
              <span style={{ display: 'grid', gap: 3 }}>
                <strong style={heading}>{provider}</strong>
                {entry.suffix
                  ? <code aria-label={`Key ending in ${entry.suffix}`} style={{ ...muted, ...mono, letterSpacing: '0.08em' }}>••••{entry.suffix}</code>
                  : <span style={muted}>No key saved</span>}
              </span>
              <div style={row}>
                <button type="button" ref={(node) => { editButtons.current[provider] = node; }}
                  className="j-btn" data-size="xs" data-variant="secondary"
                  aria-expanded={editing === provider}
                  onClick={() => editing === provider ? closeEditor() : saveKey(provider)}
                >{editLabel}</button>
                {entry.suffix && <IconButton label={`Remove ${provider} key`} onClick={() => removeKey(provider)}><Trash2 size={13} /></IconButton>}
              </div>
            </div>
            {editing === provider ? (
              <MaskedSecretInput label={`New ${provider} key`} onSave={(secret) => saveKey(provider, secret)} onCancel={closeEditor} />
            ) : (
              entry.suffix && <button type="button" className="j-chip" style={{ justifySelf: 'start' }} onClick={() => testConnection(provider)}>
                <ShieldCheck size={13} /> Test connection
              </button>
            )}
            {entry.message && <div role="status" style={{ ...muted, lineHeight: 1.4 }}>{entry.message}</div>}
          </div>
        );
      })}
      </div>
    </div>
  );
}
