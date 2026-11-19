import { useEffect, useId, useRef, useState, type PointerEvent, type ReactNode, type RefObject } from 'react';
import {
  Check, ChevronLeft, ChevronRight, Copy, KeyRound, Maximize2, MessageSquare,
  Minus, Pause, Play, Plus, RotateCcw, Send, ShieldCheck, Trash2, Volume2, X,
} from 'lucide-react';
import { useJuice, useJuiceAgentNode } from './behaviors.tsx';
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

function IconButton({
  label, children, onClick, disabled, primary, pressed,
}: {
  label: string;
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
  pressed?: boolean;
}) {
  return (
    <button
      type="button"
      className="j-btn"
      data-size="xs"
      data-variant={primary ? 'primary' : 'ghost'}
      aria-label={label}
      aria-pressed={pressed}
      title={label}
      style={{ width: 28, height: 28, padding: 0, flexShrink: 0 }}
      disabled={disabled}
      onClick={onClick}
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

async function writeClipboard(code: string) {
  try {
    await navigator.clipboard.writeText(code);
    return true;
  } catch {
    return false;
  }
}

export function CopySnippet({ code, label, onCopied, copyButtonRef }: {
  code: string; label?: string; onCopied?: (code: string) => void; copyButtonRef?: RefObject<HTMLButtonElement | null>;
}) {
  const { playSound } = useJuice();
  const snippet = useRef<HTMLElement>(null);
  const [feedback, setFeedback] = useState<{ code: string; copied: boolean }>();
  const request = useRef(0);
  const status = feedback?.code === code ? feedback : undefined;

  useEffect(() => {
    if (!feedback?.copied) return;
    const timer = window.setTimeout(() => setFeedback(undefined), 2000);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  const copy = async () => {
    const attempt = ++request.current;
    const copied = await writeClipboard(code);
    if (attempt !== request.current) return;
    setFeedback({ code, copied });
    if (copied) {
      playSound('tap');
      onCopied?.(code);
    } else if (snippet.current) {
      const selected = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(snippet.current);
      selected?.removeAllRanges();
      selected?.addRange(range);
    }
  };

  return (
    <div className="j-copy-snippet" role="group" aria-label={label} style={{ position: 'relative', borderRadius: 14,
      padding: '6px 10px 10px', display: 'grid', justifyContent: 'stretch', gap: 2 }}>
      <div style={between}>
        <strong style={{ ...muted, fontFamily: 'var(--juice-font-ui)', textTransform: 'capitalize' }}>{label ?? 'Snippet'}</strong>
        <button ref={copyButtonRef} type="button" className="j-btn" data-size="xs" data-variant="ghost"
          aria-label={`Copy ${label ?? 'snippet'}`} title={`Copy ${label ?? 'snippet'}`} onClick={copy} style={{ width: 28, padding: 0 }}>
          {status?.copied ? <Check size={14} /> : <Copy size={14} />}
        </button>
      </div>
      <code ref={snippet} style={{ userSelect: 'text', WebkitUserSelect: 'text', wordBreak: 'normal', overflowWrap: 'anywhere', lineHeight: 1.6 }}>{code}</code>
      <span role="status" style={status?.copied === false ? { ...muted, fontFamily: 'var(--juice-font-ui)' }
        : { position: 'absolute', width: 1, height: 1, overflow: 'hidden', clipPath: 'inset(50%)' }}>
        {status && (status.copied ? 'Copied to clipboard' : 'Clipboard unavailable. Use your device’s Copy command.')}
      </span>
    </div>
  );
}

const speedOptions = ['1x', '1.5x', '2x'].map((speed) => ({ value: speed, label: speed }));
const demoSteps = ['Init', 'Auth', 'Query', 'Stream', 'Done'];

export function MediaTransport({
  playing, onTogglePlay, onRestart, onPrevious, onNext, canGoBack = true, canGoNext = true, children,
}: {
  playing: boolean;
  onTogglePlay: () => void;
  onRestart: () => void;
  onPrevious: () => void;
  onNext: () => void;
  canGoBack?: boolean;
  canGoNext?: boolean;
  children?: ReactNode;
}) {
  return (
    <div className="j-transport-bar" role="group" aria-label="Media controls" style={{ flexWrap: 'wrap' }}>
      <div style={{ ...row, gap: 2 }}>
        <IconButton label="Restart" onClick={onRestart}><RotateCcw size={13} /></IconButton>
        <IconButton label="Previous step" disabled={!canGoBack} onClick={onPrevious}><ChevronLeft size={15} /></IconButton>
        <IconButton label={playing ? 'Pause' : 'Play'} onClick={onTogglePlay} primary>
          {playing ? <Pause size={13} /> : <Play size={13} />}
        </IconButton>
        <IconButton label="Next step" disabled={!canGoNext} onClick={onNext}><ChevronRight size={15} /></IconButton>
      </div>
      {children}
    </div>
  );
}

export function StepTimeline({
  steps, activeStep, onSelect, zoom = 100,
}: {
  steps: readonly ReactNode[];
  activeStep: number;
  onSelect: (index: number) => void;
  zoom?: number;
}) {
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
  }, [activeStep, steps, zoom]);

  return (
    <div className="j-timeline-track" ref={track} role="group" aria-label="Step timeline" style={{ gap: 3, padding: '3px 2px' }}>
      {steps.map((label, index) => (
        <button
          key={index}
          type="button"
          className="j-timeline-chip"
          data-state={index < activeStep ? 'done' : index === activeStep ? 'active' : 'upcoming'}
          aria-current={index === activeStep ? 'step' : undefined}
          ref={index === activeStep ? active : undefined}
          style={{
            flex: `0 0 calc((100% - ${(steps.length - 1) * 3}px) * ${zoom / (100 * steps.length)})`,
            minWidth: 'max-content', height: 48, boxSizing: 'border-box', padding: '6px',
            flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2,
            background: index > activeStep ? 'var(--fill-slab)' : undefined,
            color: index > activeStep ? 'var(--juice-soft)' : undefined,
          }}
          onClick={() => onSelect(index)}
        >
          <span style={{ ...row, ...mono, width: '100%', justifyContent: 'space-between' }}>
            {String(index + 1).padStart(2, '0')}
            {index < activeStep && <Check size={10} aria-label="Completed" />}
          </span>
          {label}
        </button>
      ))}
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

export function IdleAutoHideBar({
  idle, children, delay = 1000, activityRef,
}: {
  idle: boolean;
  children: ReactNode;
  delay?: number;
  activityRef?: RefObject<HTMLElement | null>;
}) {
  const [faded, setFaded] = useState(false);
  const bar = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = bar.current;
    const activity = activityRef?.current ?? element;
    setFaded(false);
    if (!idle || !element || !activity) return;
    let timer: number | undefined;
    const scheduleFade = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setFaded(true), delay);
    };
    const wake = () => {
      setFaded(false);
      if (element.contains(document.activeElement)) window.clearTimeout(timer);
      else scheduleFade();
    };
    const onFocusOut = (event: FocusEvent) => {
      if (!(event.relatedTarget instanceof Node) || !element.contains(event.relatedTarget)) scheduleFade();
    };
    wake();
    activity.addEventListener('pointerenter', wake);
    activity.addEventListener('pointermove', wake);
    element.addEventListener('focusin', wake);
    element.addEventListener('focusout', onFocusOut);
    return () => {
      window.clearTimeout(timer);
      activity.removeEventListener('pointerenter', wake);
      activity.removeEventListener('pointermove', wake);
      element.removeEventListener('focusin', wake);
      element.removeEventListener('focusout', onFocusOut);
    };
  }, [activityRef, delay, idle]);

  return (
    <div
      ref={bar}
      className="j-transport-bar"
      data-idle={idle && faded}
      style={{
        position: 'absolute', bottom: 10, left: '50%', translate: '-50% 0', borderRadius: 999, whiteSpace: 'nowrap',
        background: 'var(--fill-slab)', boxShadow: '0 0 0 1px var(--juice-edge)',
        opacity: idle && faded ? 0.18 : 1,
        transition: idle && faded ? 'opacity 180ms ease' : undefined,
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
const orbWidth = 98;
const orbHeight = 34;
const cornerInset = 10;

type OrbDrag = {
  pointer: number;
  x: number;
  y: number;
  left: number;
  top: number;
  moved: boolean;
};

export function CornerSnapOrb({
  corner, onSnap, onActivate, expanded, controls, children, buttonRef,
}: {
  corner: SnapCorner;
  onSnap: (corner: SnapCorner) => void;
  onActivate: () => void;
  expanded?: boolean;
  controls?: string;
  children: ReactNode;
  buttonRef?: RefObject<HTMLButtonElement | null>;
}) {
  const drag = useRef<OrbDrag | null>(null);
  const skipClick = useRef(false);
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);
  const vertical = corner.startsWith('top') ? 'top' : 'bottom';
  const horizontal = corner.endsWith('left') ? 'left' : 'right';

  const startDrag = (event: PointerEvent<HTMLButtonElement>) => {
    if (!event.isPrimary || event.button !== 0) return;
    skipClick.current = false;
    const orb = event.currentTarget;
    drag.current = {
      pointer: event.pointerId, x: event.clientX, y: event.clientY,
      left: orb.offsetLeft, top: orb.offsetTop, moved: false,
    };
    orb.setPointerCapture(event.pointerId);
  };
  const dragPosition = (event: PointerEvent<HTMLButtonElement>, start: OrbDrag, stage: HTMLElement) => ({
    left: clamp(start.left + event.clientX - start.x, 0, Math.max(0, stage.clientWidth - orbWidth)),
    top: clamp(start.top + event.clientY - start.y, 0, Math.max(0, stage.clientHeight - orbHeight)),
  });
  const moveDrag = (event: PointerEvent<HTMLButtonElement>) => {
    const start = drag.current;
    const stage = event.currentTarget.offsetParent;
    if (start?.pointer !== event.pointerId || !(stage instanceof HTMLElement)) return;
    if (!start.moved && Math.hypot(event.clientX - start.x, event.clientY - start.y) < 4) return;
    start.moved = true;
    setPosition(dragPosition(event, start, stage));
  };
  const finishDrag = (event: PointerEvent<HTMLButtonElement>) => {
    const start = drag.current;
    if (start?.pointer !== event.pointerId) return;
    drag.current = null;
    setPosition(null);
    const moved = start.moved || Math.hypot(event.clientX - start.x, event.clientY - start.y) >= 4;
    skipClick.current = moved || event.type !== 'pointerup';
    const stage = event.currentTarget.offsetParent;
    if (!moved || event.type !== 'pointerup' || !(stage instanceof HTMLElement)) return;
    const { left, top } = dragPosition(event, start, stage);
    const nextVertical = top + orbHeight / 2 < stage.clientHeight / 2 ? 'top' : 'bottom';
    const nextHorizontal = left + orbWidth / 2 < stage.clientWidth / 2 ? 'left' : 'right';
    onSnap(`${nextVertical}-${nextHorizontal}`);
  };

  return (
    <button
      type="button"
      className="j-drag-orb"
      ref={buttonRef}
      title="Drag to a corner or use the arrow keys"
      aria-expanded={expanded}
      aria-controls={expanded ? controls : undefined}
      data-corner={corner}
      data-dragging={position !== null}
      style={{
        width: orbWidth, justifyContent: 'center', touchAction: 'none',
        left: position?.left ?? (horizontal === 'left' ? cornerInset : `calc(100% - ${orbWidth + cornerInset}px)`),
        top: position?.top ?? (vertical === 'top' ? cornerInset : `calc(100% - ${orbHeight + cornerInset}px)`),
      }}
      onPointerDown={startDrag}
      onPointerMove={moveDrag}
      onPointerUp={finishDrag}
      onPointerCancel={finishDrag}
      onLostPointerCapture={finishDrag}
      onClick={(event) => {
        if (event.detail === 0 || !skipClick.current) onActivate();
        skipClick.current = false;
      }}
      onKeyDown={(event) => {
        switch (event.key) {
          case 'ArrowLeft': onSnap(`${vertical}-left`); break;
          case 'ArrowRight': onSnap(`${vertical}-right`); break;
          case 'ArrowUp': onSnap(`top-${horizontal}`); break;
          case 'ArrowDown': onSnap(`bottom-${horizontal}`); break;
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
  step, value, onCancel, onRetry, retryLabel = 'Retry', children,
}: {
  step: string;
  value: number;
  onCancel?: () => void;
  onRetry?: () => void;
  retryLabel?: string;
  children?: ReactNode;
}) {
  const percent = Number.isFinite(value) ? clamp(value, 0, 100) : 0;
  return (
    <div style={{ ...inset, display: 'grid', gap: 8 }}>
      <div style={between}>
        <span role="status" style={heading}>{step} · {percent}%</span>
        {(onCancel || onRetry) && <button type="button" className="j-btn" data-size="xs"
          data-variant={onCancel ? 'ghost' : 'secondary'} onClick={onCancel ?? onRetry}>
          {onCancel ? 'Cancel' : retryLabel}
        </button>}
        {onCancel && onRetry && <button type="button" className="j-btn" data-size="xs"
          data-variant="secondary" onClick={onRetry}>{retryLabel}</button>}
      </div>
      <div role="progressbar" aria-label="Task progress" aria-valuenow={percent} style={{ height: 5, borderRadius: 999, background: 'var(--juice-w12)' }}>
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
