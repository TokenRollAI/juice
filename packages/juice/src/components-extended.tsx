import { useMemo, useRef, useState } from 'react';
import {
  Archive,
  Bold,
  Calendar,
  Check,
  ChevronDown,
  ChevronRight,
  Code,
  Database,
  Eye,
  EyeOff,
  FileCode2,
  Folder,
  FolderOpen,
  GitBranch,
  Link2,
  Play,
  Plus,
  RefreshCw,
  Scissors,
  Sparkles,
  Trash2,
  Undo2,
  X,
} from 'lucide-react';
import {
  useControllableState,
  useJuice,
  useJuiceAgentNode,
  useRovingFocus,
  useScrubDrag,
} from './behaviors.tsx';
import { Badge, Checkbox, Kbd, RollingNumber, SegmentedControl } from './components.tsx';

// ---------------------------------------------------------------------------
// 13. OtpField (OneTimeCode — 6-Digit Auto-Advance & Paste Verification)
// ---------------------------------------------------------------------------

export function OtpField({
  id = 'otp-field',
  code: controlledCode,
  defaultCode = '4289',
  onCodeChange,
}: {
  id?: string;
  code?: string;
  defaultCode?: string;
  onCodeChange?: (code: string) => void;
}) {
  const { playSound } = useJuice();
  const [code, setCode] = useControllableState({
    value: controlledCode,
    defaultValue: defaultCode,
    onChange: onCodeChange,
  });
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);
  const digits = useMemo(() => Array.from({ length: 6 }, (_, i) => code[i] ?? ''), [code]);
  const isComplete = code.length === 6;

  const updateDigit = (index: number, char: string) => {
    const clean = char.replace(/\D/g, '').slice(-1);
    const nextArr = [...digits];
    nextArr[index] = clean;
    const nextCode = nextArr.join('');
    setCode(nextCode);
    if (clean) {
      if (nextCode.length === 6) {
        playSound('paid');
      } else {
        playSound('tick');
        inputsRef.current[Math.min(5, index + 1)]?.focus();
      }
    }
  };

  const fillDemoCode = (val = '428910') => {
    const clean = val.replace(/\D/g, '').slice(0, 6);
    setCode(clean);
    playSound(clean.length === 6 ? 'paid' : 'tap');
  };

  useJuiceAgentNode(
    id,
    'OtpField',
    { code, isComplete },
    {
      fill: (v?: string) => fillDemoCode(v ?? '428910'),
      clear: () => {
        playSound('tap');
        setCode('');
      },
    },
  );

  return (
    <div id={id} className="j-slab j-otp-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 13.5, fontWeight: 600 }}>2FA Security Code</div>
          <div style={{ fontSize: 11.5, color: 'var(--juice-mute)' }}>Sent to device · Auto-verifies on 6th digit</div>
        </div>
        <Badge tone={isComplete ? 'ok' : 'neutral'}>{isComplete ? 'Verified' : `${code.length}/6`}</Badge>
      </div>

      <div className="j-otp-grid" role="group" aria-label="One-time passcode">
        {digits.map((d, idx) => (
          <input
            key={idx}
            ref={(el) => {
              inputsRef.current[idx] = el;
            }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            aria-label={`Digit ${idx + 1}`}
            value={d}
            data-filled={d ? 'true' : undefined}
            className="j-otp-slot"
            onChange={(e) => updateDigit(idx, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Backspace' && !d && idx > 0) {
                playSound('tap');
                const nextArr = [...digits];
                nextArr[idx - 1] = '';
                setCode(nextArr.join(''));
                inputsRef.current[idx - 1]?.focus();
              } else if (e.key === 'ArrowLeft' && idx > 0) {
                inputsRef.current[idx - 1]?.focus();
              } else if (e.key === 'ArrowRight' && idx < 5) {
                inputsRef.current[idx + 1]?.focus();
              }
            }}
            onPaste={(e) => {
              e.preventDefault();
              fillDemoCode(e.clipboardData.getData('text'));
            }}
          />
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button type="button" className="j-chip" onClick={() => fillDemoCode('428910')}>
          Paste 428-910
        </button>
        <button
          type="button"
          className="j-chip"
          onClick={() => {
            playSound('tap');
            setCode('');
            inputsRef.current[0]?.focus();
          }}
        >
          Clear
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 14. PassStrength (PassReveal — Optical Blur Mask & Live Entropy Meter)
// ---------------------------------------------------------------------------

export function PassStrength({
  id = 'pass-strength',
  value: controlledValue,
  defaultValue = 'Juice#Craft2026!',
  revealed: controlledRevealed,
  defaultRevealed = false,
}: {
  id?: string;
  value?: string;
  defaultValue?: string;
  revealed?: boolean;
  defaultRevealed?: boolean;
}) {
  const { playSound } = useJuice();
  const [val, setVal] = useControllableState({
    value: controlledValue,
    defaultValue,
  });
  const [revealed, setRevealed] = useControllableState({
    value: controlledRevealed,
    defaultValue: defaultRevealed,
  });

  const checks = useMemo(() => {
    const len = val.length >= 10;
    const upper = /[A-Z]/.test(val) && /[a-z]/.test(val);
    const num = /\d/.test(val);
    const sym = /[^A-Za-z0-9]/.test(val);
    const score = [len, upper, num, sym].filter(Boolean).length;
    return { len, upper, num, sym, score };
  }, [val]);

  const toggleReveal = () => {
    playSound('pop');
    setRevealed((r) => !r);
  };

  useJuiceAgentNode(
    id,
    'PassStrength',
    { length: val.length, score: checks.score, revealed },
    {
      toggleReveal,
      setPassword: (next: string) => setVal(String(next)),
    },
  );

  const barColor =
    checks.score >= 4
      ? 'var(--juice-ok)'
      : checks.score >= 2
        ? 'var(--juice-warn)'
        : 'var(--juice-danger)';

  return (
    <div id={id} className="j-slab j-pass-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>Vault Signing Key</span>
        <Badge tone={checks.score === 4 ? 'ok' : checks.score >= 2 ? 'warn' : 'danger'}>
          {checks.score === 4 ? 'Vault Grade' : checks.score >= 2 ? 'Moderate' : 'Weak'}
        </Badge>
      </div>

      <div className="j-pass-input-wrap">
        <input
          type="text"
          aria-label="Signing key password"
          className="j-pass-input"
          data-masked={revealed ? 'false' : 'true'}
          value={val}
          onChange={(e) => setVal(e.target.value)}
        />
        <button
          type="button"
          className="j-chip"
          aria-label={revealed ? 'Blur password' : 'Unblur password'}
          onClick={toggleReveal}
        >
          {revealed ? <EyeOff size={13} /> : <Eye size={13} />}
          <span>{revealed ? 'Blur' : 'Peek'}</span>
        </button>
      </div>

      <div className="j-pass-bars" aria-hidden="true">
        {[1, 2, 3, 4].map((level) => (
          <div
            key={level}
            className="j-pass-bar"
            style={{ background: checks.score >= level ? barColor : undefined }}
          />
        ))}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {[
          { label: '10+ chars', ok: checks.len },
          { label: 'Mixed case', ok: checks.upper },
          { label: 'Number', ok: checks.num },
          { label: 'Symbol', ok: checks.sym },
        ].map((rule) => (
          <Badge key={rule.label} tone={rule.ok ? 'ok' : 'neutral'}>
            {rule.ok && <Check size={10} />}
            <span>{rule.label}</span>
          </Badge>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 15. TimeSlotPicker (StandingCalendar — Day Strip + Slot Matrix)
// ---------------------------------------------------------------------------

const DAYS = [
  { id: 'mon', day: 'Mon', date: '18' },
  { id: 'tue', day: 'Tue', date: '19' },
  { id: 'wed', day: 'Wed', date: '20' },
  { id: 'thu', day: 'Thu', date: '21' },
  { id: 'fri', day: 'Fri', date: '22' },
] as const;

const SLOTS = ['09:30', '11:00', '14:00', '16:30'] as const;

export function TimeSlotPicker({
  id = 'time-slot-picker',
  defaultDay = 'wed',
  defaultSlot = '14:00',
}: {
  id?: string;
  defaultDay?: string;
  defaultSlot?: string;
}) {
  const { playSound } = useJuice();
  const [day, setDay] = useState(defaultDay);
  const [slot, setSlot] = useState(defaultSlot);
  const [booked, setBooked] = useState(false);

  useJuiceAgentNode(
    id,
    'TimeSlotPicker',
    { day, slot, booked },
    {
      selectDay: (d: string) => {
        playSound('tick');
        setDay(String(d));
        setBooked(false);
      },
      selectSlot: (s: string) => {
        playSound('tap');
        setSlot(String(s));
        setBooked(false);
      },
      book: () => {
        playSound('paid');
        setBooked(true);
      },
    },
  );

  return (
    <div id={id} className="j-slab j-slot-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '2px 4px' }}>
        <span style={{ fontSize: 13, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Calendar size={14} />
          <span>Design Review · Nov</span>
        </span>
        <Badge tone={booked ? 'ok' : 'signal'}>{booked ? 'Booked' : `${day.toUpperCase()} ${slot}`}</Badge>
      </div>

      <div className="j-day-strip" role="tablist" aria-label="Select day">
        {DAYS.map((d) => (
          <button
            key={d.id}
            type="button"
            role="tab"
            aria-selected={day === d.id}
            data-active={day === d.id ? 'true' : undefined}
            className="j-day-btn"
            onClick={() => {
              playSound('tick');
              setDay(d.id);
              setBooked(false);
            }}
          >
            <span style={{ fontSize: 10.5, opacity: 0.7 }}>{d.day}</span>
            <span style={{ fontSize: 13.5, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{d.date}</span>
          </button>
        ))}
      </div>

      <div className="j-time-grid">
        {SLOTS.map((s) => (
          <button
            key={s}
            type="button"
            data-selected={slot === s ? 'true' : undefined}
            className="j-time-pill"
            onClick={() => {
              playSound('tap');
              setSlot(s);
              setBooked(false);
            }}
          >
            <span>{s}</span>
            <span style={{ fontSize: 10.5, opacity: 0.7 }}>PST</span>
          </button>
        ))}
      </div>

      <button
        type="button"
        className="j-state-btn"
        style={{ height: 36, fontSize: 12.5 }}
        data-state={booked ? 'success' : 'idle'}
        onClick={() => {
          playSound(booked ? 'tap' : 'paid');
          setBooked((b) => !b);
        }}
      >
        {booked ? (
          <>
            <Check size={14} />
            <span>Confirmed · Tap to reschedule</span>
          </>
        ) : (
          <span>Hold Slot · {slot} PST</span>
        )}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 16. RadialDial (Rotary Arc Gauge & Hardware Detent Scrub Dial)
// ---------------------------------------------------------------------------

export function RadialDial({
  id = 'radial-dial',
  value: controlledValue,
  defaultValue = 68,
}: {
  id?: string;
  value?: number;
  defaultValue?: number;
}) {
  const { playSound } = useJuice();
  const [val, setVal] = useControllableState({
    value: controlledValue,
    defaultValue,
  });

  const scrub = useScrubDrag({
    value: val,
    min: 0,
    max: 100,
    step: 4,
    onChange: setVal,
    onScrubSound: () => playSound('tick'),
  });

  useJuiceAgentNode(id, 'RadialDial', { value: val }, { setValue: (v: number) => setVal(Number(v)) });

  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const arcLength = circumference * 0.75; // 270 deg sweep
  const dashOffset = arcLength - (val / 100) * arcLength;
  const tone = val > 85 ? 'danger' : val > 65 ? 'warn' : 'ok';

  return (
    <div id={id} className="j-slab j-dial-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>Context Window Pressure</span>
        <Badge tone={tone}>{val > 85 ? 'Critical' : val > 65 ? 'Elevated' : 'Optimal'}</Badge>
      </div>

      <div
        ref={(el) => {
          scrub.trackRef.current = el;
        }}
        className="j-dial-stage"
        aria-label="Context Window Pressure Dial"
        {...scrub.scrubProps}
      >
        <svg width="96" height="96" viewBox="0 0 96 96" style={{ overflow: 'visible' }}>
          <circle
            cx="48"
            cy="48"
            r={radius}
            fill="none"
            stroke="var(--juice-w12)"
            strokeWidth="8"
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeLinecap="round"
            transform="rotate(135 48 48)"
          />
          <circle
            cx="48"
            cy="48"
            r={radius}
            fill="none"
            stroke={val > 85 ? 'var(--juice-danger)' : val > 65 ? 'var(--juice-warn)' : 'var(--fill-on)'}
            strokeWidth="8"
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            transform="rotate(135 48 48)"
            style={{ transition: 'stroke-dashoffset 140ms var(--juice-out), stroke 180ms ease' }}
          />
          <text
            x="48"
            y="53"
            textAnchor="middle"
            fill="var(--fill-on)"
            style={{ fontSize: 18, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}
          >
            {val}%
          </text>
        </svg>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
          <div style={{ fontSize: 22, fontWeight: 650, letterSpacing: '-0.02em' }}>
            <RollingNumber value={Math.round(val * 1.28)} suffix="k" />
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--juice-mute)' }}>of 128k tokens · Drag to scrub</div>
          <div style={{ display: 'flex', gap: 4 }}>
            {[32, 68, 92].map((preset) => (
              <button
                key={preset}
                type="button"
                className="j-chip"
                style={{ height: 22, padding: '0 7px', fontSize: 11 }}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => {
                  playSound('tick');
                  setVal(preset);
                }}
              >
                {preset}%
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 17. SwipeCard (UI SDK SwipeActions — Action Reveal & Optimistic Undo)
// ---------------------------------------------------------------------------

type SwipeItem = {
  id: string;
  title: string;
  meta: string;
  offset: number; // -72 = archive revealed, 0 = rest, +72 = approve revealed
  status: 'pending' | 'approved' | 'archived';
};

export function SwipeCard({ id = 'swipe-card' }: { id?: string }) {
  const { playSound } = useJuice();
  const [items, setItems] = useState<SwipeItem[]>([
    { id: 'pr-1', title: 'feat(tokens): concentric 14px row ramp', meta: 'PR #412 · +84 -12', offset: 0, status: 'pending' },
    { id: 'pr-2', title: 'fix(sound): Web Audio lowpass envelope', meta: 'PR #415 · +29 -4', offset: 0, status: 'pending' },
  ]);

  const setItemState = (itemId: string, patch: Partial<SwipeItem>) => {
    setItems((prev) => prev.map((it) => (it.id === itemId ? { ...it, ...patch } : it)));
  };

  useJuiceAgentNode(
    id,
    'SwipeCard',
    { items: items.map((i) => ({ id: i.id, status: i.status, offset: i.offset })) },
    {
      peekApprove: () => {
        playSound('swipe');
        setItemState('pr-1', { offset: 78, status: 'pending' });
      },
      approveFirst: () => {
        playSound('paid');
        setItemState('pr-1', { offset: 0, status: 'approved' });
      },
      reset: () => {
        playSound('tap');
        setItems((prev) => prev.map((i) => ({ ...i, offset: 0, status: 'pending' })));
      },
    },
  );

  return (
    <div id={id} className="j-slab j-swipe-card">
      {items.map((item) => (
        <div key={item.id} className="j-swipe-row-wrap">
          <div className="j-swipe-under">
            <button
              type="button"
              onClick={() => {
                playSound('paid');
                setItemState(item.id, { offset: 0, status: 'approved' });
              }}
              style={{
                border: 0,
                background: 'var(--juice-ok)',
                color: '#fff',
                borderRadius: 8,
                padding: '4px 9px',
                fontSize: 11.5,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Approve
            </button>
            <button
              type="button"
              onClick={() => {
                playSound('drop');
                setItemState(item.id, { offset: 0, status: 'archived' });
              }}
              style={{
                border: 0,
                background: 'var(--juice-danger)',
                color: '#fff',
                borderRadius: 8,
                padding: '4px 9px',
                fontSize: 11.5,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Archive
            </button>
          </div>

          <div
            className="j-swipe-surface"
            style={{ transform: `translateX(${item.offset}px)` }}
          >
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {item.title}
              </div>
              <div style={{ fontSize: 11, color: 'var(--juice-mute)' }}>{item.meta}</div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
              {item.status === 'pending' ? (
                <>
                  <button
                    type="button"
                    className="j-chip"
                    style={{ height: 24, padding: '0 7px' }}
                    aria-label="Reveal approve action"
                    onClick={() => {
                      playSound('swipe');
                      setItemState(item.id, { offset: item.offset === 76 ? 0 : 76 });
                    }}
                  >
                    <Check size={12} />
                  </button>
                  <button
                    type="button"
                    className="j-chip"
                    style={{ height: 24, padding: '0 7px' }}
                    aria-label="Reveal archive action"
                    onClick={() => {
                      playSound('swipe');
                      setItemState(item.id, { offset: item.offset === -76 ? 0 : -76 });
                    }}
                  >
                    <Archive size={12} />
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="j-chip"
                  style={{ height: 24, padding: '0 8px' }}
                  onClick={() => {
                    playSound('tap');
                    setItemState(item.id, { status: 'pending', offset: 0 });
                  }}
                >
                  <Undo2 size={11} />
                  <span>{item.status === 'approved' ? 'Merged · Undo' : 'Archived · Undo'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 18. SelectionToolbar (FormatBar — Floating Contextual Toolbar Morph)
// ---------------------------------------------------------------------------

export function SelectionToolbar({ id = 'selection-toolbar' }: { id?: string }) {
  const { playSound } = useJuice();
  const [formats, setFormats] = useState<string[]>(['bold']);
  const [aiMode, setAiMode] = useState(false);
  const [text, setText] = useState('Concentric tokens replace 1px borders with color-mix ramps.');

  const toggleFormat = (fmt: string) => {
    playSound('tap');
    setFormats((prev) => (prev.includes(fmt) ? prev.filter((f) => f !== fmt) : [...prev, fmt]));
  };

  const applyAiPolish = () => {
    playSound('paid');
    setText('Zero-border surfaces derive 6 tonal steps directly from --fill-on and --fill-slab.');
    setAiMode(false);
  };

  useJuiceAgentNode(
    id,
    'SelectionToolbar',
    { formats, aiMode, text },
    {
      toggleFormat: (f: string) => toggleFormat(String(f)),
      openAi: () => {
        playSound('pop');
        setAiMode(true);
      },
      applyAiPolish,
    },
  );

  return (
    <div id={id} className="j-slab j-sel-card">
      <div className="j-sel-bar" role="toolbar" aria-label="Text formatting toolbar">
        {!aiMode ? (
          <>
            <button
              type="button"
              className="j-sel-tool"
              data-active={formats.includes('bold') ? 'true' : undefined}
              onClick={() => toggleFormat('bold')}
            >
              <Bold size={13} />
              <span>Bold</span>
            </button>
            <button
              type="button"
              className="j-sel-tool"
              data-active={formats.includes('code') ? 'true' : undefined}
              onClick={() => toggleFormat('code')}
            >
              <Code size={13} />
              <span>Code</span>
            </button>
            <button
              type="button"
              className="j-sel-tool"
              data-active={formats.includes('link') ? 'true' : undefined}
              onClick={() => toggleFormat('link')}
            >
              <Link2 size={13} />
            </button>
            <button
              type="button"
              className="j-sel-tool"
              style={{ marginLeft: 'auto', opacity: 1 }}
              onClick={() => {
                playSound('pop');
                setAiMode(true);
              }}
            >
              <span className="j-status-dot" data-tone="signal" />
              <span>Rewrite</span>
            </button>
          </>
        ) : (
          <>
            <button type="button" className="j-sel-tool" data-active="true" onClick={applyAiPolish}>
              <span className="j-status-dot" data-tone="ok" />
              <span>Tighten copy</span>
            </button>
            <button
              type="button"
              className="j-sel-tool"
              onClick={() => {
                playSound('paid');
                setText('--juice-w6: color-mix(in srgb, var(--fill-on) 6.5%, var(--fill-slab));');
                setFormats(['code']);
                setAiMode(false);
              }}
            >
              <Code size={12} />
              <span>To CSS</span>
            </button>
            <button
              type="button"
              className="j-sel-tool"
              style={{ marginLeft: 'auto' }}
              aria-label="Close AI rewrite"
              onClick={() => {
                playSound('tap');
                setAiMode(false);
              }}
            >
              <X size={13} />
            </button>
          </>
        )}
      </div>

      <div
        style={{
          padding: '10px 12px',
          borderRadius: 12,
          background: 'var(--juice-w6)',
          fontSize: 13,
          lineHeight: 1.5,
          fontWeight: formats.includes('bold') ? 600 : 400,
          fontFamily: formats.includes('code') ? 'var(--juice-font-mono)' : 'inherit',
          textDecoration: formats.includes('link') ? 'underline' : 'none',
        }}
      >
        {text}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 19. DataGrid (Coss UI + UI SDK InlineEdit — High-Density Operator Table)
// ---------------------------------------------------------------------------

type WorkerRow = { id: string; service: string; region: string; quota: number; selected: boolean };

export function DataGrid({ id = 'data-grid' }: { id?: string }) {
  const { playSound } = useJuice();
  const [rows, setRows] = useState<WorkerRow[]>([
    { id: 'r1', service: 'auth-edge', region: 'sjc', quota: 250, selected: false },
    { id: 'r2', service: 'juice-sync', region: 'fra', quota: 640, selected: true },
    { id: 'r3', service: 'render-worker', region: 'iad', quota: 1200, selected: false },
  ]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftQuota, setDraftQuota] = useState<string>('640');

  const selectedCount = rows.filter((r) => r.selected).length;

  const commitEdit = (rowId: string, val: number) => {
    playSound('latch');
    setRows((prev) => prev.map((r) => (r.id === rowId ? { ...r, quota: Math.max(10, val) } : r)));
    setEditingId(null);
  };

  useJuiceAgentNode(
    id,
    'DataGrid',
    { selectedCount, editingId, quotas: rows.map((r) => ({ id: r.id, quota: r.quota })) },
    {
      editSecondRow: () => {
        playSound('tap');
        setEditingId('r2');
        setDraftQuota('980');
      },
      commitSecondRow: () => commitEdit('r2', 980),
      boostSelected: () => {
        playSound('paid');
        setRows((prev) => prev.map((r) => (r.selected ? { ...r, quota: r.quota + 200 } : r)));
      },
    },
  );

  return (
    <div id={id} className="j-slab j-grid-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '2px 6px' }}>
        <span style={{ fontSize: 12.5, fontWeight: 600 }}>Worker Quotas (Click cell to edit)</span>
        {selectedCount > 0 ? (
          <button
            type="button"
            className="j-chip"
            style={{ height: 22, padding: '0 8px', fontSize: 11 }}
            onClick={() => {
              playSound('paid');
              setRows((prev) => prev.map((r) => (r.selected ? { ...r, quota: r.quota + 200 } : r)));
            }}
          >
            +200 RPS ({selectedCount})
          </button>
        ) : (
          <Badge tone="neutral">3 services</Badge>
        )}
      </div>

      <table className="j-grid-table">
        <thead>
          <tr>
            <th style={{ width: 24 }} />
            <th>Service</th>
            <th>Region</th>
            <th style={{ textAlign: 'right' }}>RPS Cap</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="j-grid-row" data-selected={row.selected ? 'true' : undefined}>
              <td style={{ verticalAlign: 'middle' }}>
                <Checkbox
                  aria-label={`Select ${row.service}`}
                  checked={row.selected}
                  onChange={(next) => {
                    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, selected: next } : r)));
                  }}
                />
              </td>
              <td style={{ fontWeight: 500 }}>{row.service}</td>
              <td>
                <Kbd>{row.region}</Kbd>
              </td>
              <td style={{ textAlign: 'right' }}>
                {editingId === row.id ? (
                  <input
                    type="number"
                    aria-label="Edit RPS Cap"
                    className="j-inline-input"
                    autoFocus
                    value={draftQuota}
                    onChange={(e) => setDraftQuota(e.target.value)}
                    onBlur={() => commitEdit(row.id, Number(draftQuota) || row.quota)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitEdit(row.id, Number(draftQuota) || row.quota);
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                  />
                ) : (
                  <button
                    type="button"
                    className="j-chip"
                    style={{ height: 23, padding: '0 7px', marginLeft: 'auto' }}
                    onClick={() => {
                      playSound('tap');
                      setEditingId(row.id);
                      setDraftQuota(String(row.quota));
                    }}
                  >
                    <RollingNumber value={row.quota} />
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 20. TreeExplorer (UI SDK TreeCollection — Hierarchical File Navigator)
// ---------------------------------------------------------------------------

export function TreeExplorer({ id = 'tree-explorer' }: { id?: string }) {
  const { playSound } = useJuice();
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({ src: true, tokens: true });
  const [activeFile, setActiveFile] = useState<string>('styles.css');

  const toggleFolder = (folder: string) => {
    playSound('tap');
    setOpenFolders((prev) => ({ ...prev, [folder]: !prev[folder] }));
  };

  const selectFile = (file: string) => {
    playSound('tick');
    setActiveFile(file);
  };

  useJuiceAgentNode(
    id,
    'TreeExplorer',
    { activeFile, openFolders },
    {
      selectFile: (f: string) => selectFile(String(f)),
      toggleFolder: (f: string) => toggleFolder(String(f)),
    },
  );

  return (
    <div id={id} className="j-slab j-tree-card" role="tree" aria-label="Package source tree">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 8px' }}>
        <span style={{ fontSize: 12, color: 'var(--juice-mute)', fontFamily: 'var(--juice-font-mono)' }}>
          packages/juice/{activeFile}
        </span>
        <Badge tone="ok">+142</Badge>
      </div>

      <button type="button" className="j-tree-row" onClick={() => toggleFolder('src')}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          {openFolders.src ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          {openFolders.src ? <FolderOpen size={14} /> : <Folder size={14} />}
          <span>src</span>
        </span>
        <span style={{ fontSize: 11, color: 'var(--juice-mute)' }}>4 files</span>
      </button>

      {openFolders.src && (
        <div style={{ paddingLeft: 14, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {[
            { name: 'styles.css', diff: '+96', tone: 'ok' as const },
            { name: 'behaviors.tsx', diff: 'M', tone: 'signal' as const },
            { name: 'sound.ts', diff: '3KB', tone: 'neutral' as const },
            { name: 'components.tsx', diff: '+46', tone: 'ok' as const },
          ].map((file) => (
            <button
              key={file.name}
              type="button"
              role="treeitem"
              aria-selected={activeFile === file.name}
              data-active={activeFile === file.name ? 'true' : undefined}
              className="j-tree-row"
              onClick={() => selectFile(file.name)}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <FileCode2 size={13} />
                <span>{file.name}</span>
              </span>
              <Badge tone={file.tone}>{file.diff}</Badge>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 21. ResizableSplit (UI SDK Resize — Dual-Pane Workspace Splitter)
// ---------------------------------------------------------------------------

export function ResizableSplit({
  id = 'resizable-split',
  ratio: controlledRatio,
  defaultRatio = 42,
}: {
  id?: string;
  ratio?: number;
  defaultRatio?: number;
}) {
  const { playSound } = useJuice();
  const [ratio, setRatio] = useControllableState({
    value: controlledRatio,
    defaultValue: defaultRatio,
  });

  const scrub = useScrubDrag({
    value: ratio,
    min: 24,
    max: 76,
    step: 2,
    onChange: setRatio,
    onScrubSound: () => playSound('tick'),
  });

  useJuiceAgentNode(
    id,
    'ResizableSplit',
    { leftPct: ratio, rightPct: 100 - ratio },
    {
      setRatio: (v: number) => {
        playSound('tap');
        setRatio(Number(v));
      },
      reset50: () => {
        playSound('pop');
        setRatio(50);
      },
    },
  );

  return (
    <div id={id} className="j-slab j-resize-card">
      <div
        ref={(el) => {
          scrub.trackRef.current = el;
        }}
        className="j-resize-box"
        aria-label="Resizable workspace panels"
        {...scrub.scrubProps}
      >
        <div
          style={{
            width: `${scrub.percent}%`,
            padding: 12,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            background: 'var(--juice-w6)',
          }}
        >
          <span style={{ fontSize: 11.5, color: 'var(--juice-mute)' }}>Nav Pane</span>
          <div style={{ fontSize: 18, fontWeight: 650, fontVariantNumeric: 'tabular-nums' }}>{ratio}%</div>
        </div>

        <div
          className="j-resize-handle"
          data-held={scrub.held ? 'true' : undefined}
          onDoubleClick={() => {
            playSound('pop');
            setRatio(50);
          }}
        >
          <span className="j-resize-pill" />
        </div>

        <div
          style={{
            flex: 1,
            padding: 12,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            background: 'var(--fill-slab)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11.5, color: 'var(--juice-mute)' }}>Main Stage</span>
            <Kbd>2×Click = 50%</Kbd>
          </div>
          <div style={{ fontSize: 18, fontWeight: 650, fontVariantNumeric: 'tabular-nums' }}>{100 - ratio}%</div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 22. FilterBar (Faceted Token Filter & Inline Operator Cycler)
// ---------------------------------------------------------------------------

export function FilterBar({ id = 'filter-bar' }: { id?: string }) {
  const { playSound } = useJuice();
  const [status, setStatus] = useState<'Active' | 'Canary' | 'Paused'>('Active');
  const [latency, setLatency] = useState<'< 50ms' | '< 120ms' | 'Any'>('< 50ms');
  const [region, setRegion] = useState<string | null>('us-east');

  const cycleStatus = () => {
    playSound('tap');
    const order = ['Active', 'Canary', 'Paused'] as const;
    setStatus(order[(order.indexOf(status) + 1) % order.length]!);
  };

  const cycleLatency = () => {
    playSound('tap');
    const order = ['< 50ms', '< 120ms', 'Any'] as const;
    setLatency(order[(order.indexOf(latency) + 1) % order.length]!);
  };

  const matchCount = status === 'Active' ? (latency === '< 50ms' ? 18 : 34) : status === 'Canary' ? 6 : 2;

  useJuiceAgentNode(
    id,
    'FilterBar',
    { status, latency, region, matchCount },
    {
      cycleStatus,
      cycleLatency,
      toggleRegion: () => {
        playSound('pop');
        setRegion((r) => (r ? null : 'us-east'));
      },
    },
  );

  return (
    <div id={id} className="j-slab j-filter-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 12.5, fontWeight: 600 }}>Faceted Query Tokens</span>
        <Badge tone="signal">
          <RollingNumber value={matchCount} suffix=" matches" />
        </Badge>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
        <div className="j-filter-token">
          <span className="j-filter-token-key">Status</span>
          <button type="button" className="j-filter-token-val" onClick={cycleStatus}>
            {status}
          </button>
        </div>

        <div className="j-filter-token">
          <span className="j-filter-token-key">p99</span>
          <button type="button" className="j-filter-token-val" onClick={cycleLatency}>
            {latency}
          </button>
        </div>

        {region ? (
          <div className="j-filter-token">
            <span className="j-filter-token-key">Region</span>
            <button
              type="button"
              className="j-filter-token-val"
              onClick={() => {
                playSound('tap');
                setRegion(null);
              }}
            >
              {region} ×
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="j-chip"
            onClick={() => {
              playSound('pop');
              setRegion('us-east');
            }}
          >
            <Plus size={12} />
            <span>Region</span>
          </button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 23. DrawerSheet (Vaul-Style Scaled Backdrop Non-Blocking Sheet)
// ---------------------------------------------------------------------------

export function DrawerSheet({
  id = 'drawer-sheet',
  open: controlledOpen,
  defaultOpen = false,
}: {
  id?: string;
  open?: boolean;
  defaultOpen?: boolean;
}) {
  const { playSound } = useJuice();
  const [open, setOpen] = useControllableState({
    value: controlledOpen,
    defaultValue: defaultOpen,
  });

  const toggle = () => {
    const next = !open;
    playSound(next ? 'pop' : 'drop');
    setOpen(next);
  };

  useJuiceAgentNode(id, 'DrawerSheet', { open }, { open: () => setOpen(true), close: () => setOpen(false), toggle });

  return (
    <div id={id} className="j-slab j-drawer-card">
      <div className="j-drawer-viewport" data-open={open ? 'true' : 'false'}>
        <div className="j-drawer-backdrop-stage">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Production Environment</div>
              <div style={{ fontSize: 11.5, color: 'var(--juice-mute)' }}>Scaled background context</div>
            </div>
            <Badge tone="ok">Healthy</Badge>
          </div>

          <button
            type="button"
            className="j-state-btn"
            style={{ height: 38, fontSize: 13 }}
            onClick={toggle}
          >
            <span>Open Rollback Sheet</span>
          </button>
        </div>

        <div className="j-drawer-sheet" role="dialog" aria-label="Rollback options">
          <div
            style={{
              width: 32,
              height: 4,
              borderRadius: 99,
              background: 'var(--juice-w20)',
              margin: '0 auto 8px',
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Instant Rollback · v2.3.9</span>
            <button type="button" className="j-chip" style={{ height: 24 }} onClick={toggle}>
              Close
            </button>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              type="button"
              className="j-chip"
              style={{
                flex: 1,
                justifyContent: 'center',
                background: 'var(--fill-on)',
                color: 'var(--fill-slab)',
              }}
              onClick={() => {
                playSound('paid');
                setOpen(false);
              }}
            >
              Promote v2.3.9
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 24. TabsMorph (Animated Workspace Tabs with Roving Focus)
// ---------------------------------------------------------------------------

export function TabsMorph({ id = 'tabs-morph' }: { id?: string }) {
  const [tab, setTab] = useState<'overview' | 'bindings' | 'logs'>('overview');

  useJuiceAgentNode(id, 'TabsMorph', { tab }, { setTab: (t: 'overview' | 'bindings' | 'logs') => setTab(t) });

  return (
    <div id={id} className="j-slab j-tabs-card">
      <SegmentedControl
        options={[
          { value: 'overview', label: 'Overview' },
          { value: 'bindings', label: 'Bindings (3)' },
          { value: 'logs', label: 'Live Tail' },
        ]}
        value={tab}
        onChange={setTab}
      />

      <div className="j-tabs-panel">
        {tab === 'overview' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, color: 'var(--juice-mute)' }}>Global Edge Requests</span>
              <Badge tone="ok">99.98% SLA</Badge>
            </div>
            <div style={{ fontSize: 22, fontWeight: 650 }}>
              <RollingNumber value={48290} suffix=" req/s" />
            </div>
          </>
        )}
        {tab === 'bindings' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12.5 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>D1 · MAIN_DB</span>
              <Kbd>Connected</Kbd>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>KV · SESSION_STORE</span>
              <Kbd>Connected</Kbd>
            </div>
          </div>
        )}
        {tab === 'logs' && (
          <div style={{ fontFamily: 'var(--juice-font-mono)', fontSize: 11.5, color: 'var(--juice-soft)', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div>20:18:02 GET /api/bench 200 4ms</div>
            <div>20:18:04 POST /api/act 200 7ms</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 25. AudioWaveTrim (Bencho WaveTrim — Static-Safe Waveform & Range Trimmer)
// ---------------------------------------------------------------------------

const WAVE_AMPLITUDES = [28, 42, 65, 50, 82, 95, 74, 60, 88, 70, 52, 90, 98, 76, 62, 84, 68, 45, 72, 86, 58, 40, 32, 24];

export function AudioWaveTrim({ id = 'audio-wave-trim' }: { id?: string }) {
  const { playSound } = useJuice();
  const [startPct, setStartPct] = useState(16);
  const [endPct, setEndPct] = useState(78);

  const cycleTrim = () => {
    playSound('scrub');
    if (startPct === 16 && endPct === 78) {
      setStartPct(28);
      setEndPct(64);
    } else {
      setStartPct(16);
      setEndPct(78);
    }
  };

  useJuiceAgentNode(
    id,
    'AudioWaveTrim',
    { startPct, endPct },
    {
      tightenTrim: () => {
        playSound('scrub');
        setStartPct(28);
        setEndPct(64);
      },
      resetTrim: () => {
        playSound('tap');
        setStartPct(16);
        setEndPct(78);
      },
    },
  );

  return (
    <div id={id} className="j-slab j-trim-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 13, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Scissors size={13} />
          <span>Voiceover Take #3</span>
        </span>
        <Badge tone="signal">
          {(startPct * 0.2).toFixed(1)}s → {(endPct * 0.2).toFixed(1)}s
        </Badge>
      </div>

      <div className="j-trim-track" onClick={cycleTrim} style={{ cursor: 'pointer' }}>
        <div
          className="j-trim-window"
          style={{ left: `${startPct}%`, width: `${endPct - startPct}%` }}
        />
        {WAVE_AMPLITUDES.map((amp, idx) => {
          const pct = (idx / (WAVE_AMPLITUDES.length - 1)) * 100;
          const inside = pct >= startPct && pct <= endPct;
          return (
            <span
              key={idx}
              style={{
                width: 3,
                height: `${Math.round(amp * 0.44)}px`,
                borderRadius: 99,
                background: inside ? 'var(--fill-on)' : 'var(--juice-w20)',
                transition: 'background-color 150ms ease',
              }}
            />
          );
        })}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6 }}>
        <button type="button" className="j-chip" onClick={() => playSound('chime')}>
          <Play size={12} />
          <span>Audition Slice</span>
        </button>
        <button type="button" className="j-chip" onClick={cycleTrim}>
          <span>Toggle Trim Window</span>
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 26. CodeDiffReveal (AI Code Patch Morph: Diff -> Clean Applied State)
// ---------------------------------------------------------------------------

export function CodeDiffReveal({
  id = 'code-diff-reveal',
  applied: controlledApplied,
  defaultApplied = false,
}: {
  id?: string;
  applied?: boolean;
  defaultApplied?: boolean;
}) {
  const { playSound } = useJuice();
  const [applied, setApplied] = useControllableState({
    value: controlledApplied,
    defaultValue: defaultApplied,
  });

  const toggle = () => {
    const next = !applied;
    playSound(next ? 'paid' : 'tap');
    setApplied(next);
  };

  useJuiceAgentNode(id, 'CodeDiffReveal', { applied }, { apply: () => setApplied(true), revert: () => setApplied(false), toggle });

  return (
    <div id={id} className="j-slab j-diff-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '2px 4px' }}>
        <span style={{ fontSize: 12.5, fontWeight: 600, fontFamily: 'var(--juice-font-mono)' }}>
          tokens.css · Patch #19
        </span>
        <Badge tone={applied ? 'ok' : 'warn'}>{applied ? 'Applied' : '+2 -1 lines'}</Badge>
      </div>

      <div className="j-diff-code">
        <div className="j-diff-line">.j-slab {'{'}</div>
        {!applied && (
          <div className="j-diff-line" data-kind="del">
            - border: 1px solid #d0d5dd;
          </div>
        )}
        <div className="j-diff-line" data-kind={applied ? undefined : 'add'}>
          {applied ? '  ' : '+ '}border-radius: 20px;
        </div>
        <div className="j-diff-line" data-kind={applied ? undefined : 'add'}>
          {applied ? '  ' : '+ '}background: var(--fill-slab);
        </div>
        <div className="j-diff-line">{'}'}</div>
      </div>

      <button
        type="button"
        className="j-chip"
        style={{
          justifyContent: 'center',
          background: applied ? 'var(--juice-w6)' : 'var(--fill-on)',
          color: applied ? 'var(--juice-soft)' : 'var(--fill-slab)',
        }}
        onClick={toggle}
      >
        {applied ? (
          <>
            <Undo2 size={12} />
            <span>Undo Patch</span>
          </>
        ) : (
          <>
            <Check size={12} />
            <span>Apply AI Patch</span>
          </>
        )}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 27. SkeletonMorph (Async Lifecycle: Shimmer Skeleton -> Live Card)
// ---------------------------------------------------------------------------

export function SkeletonMorph({
  id = 'skeleton-morph',
  loading: controlledLoading,
  defaultLoading = false,
}: {
  id?: string;
  loading?: boolean;
  defaultLoading?: boolean;
}) {
  const { playSound } = useJuice();
  const [loading, setLoading] = useControllableState({
    value: controlledLoading,
    defaultValue: defaultLoading,
  });

  const toggle = () => {
    const next = !loading;
    playSound(next ? 'tap' : 'pop');
    setLoading(next);
  };

  useJuiceAgentNode(id, 'SkeletonMorph', { loading }, { setLoading: (v: boolean) => setLoading(Boolean(v)), toggle });

  return (
    <div id={id} className="j-slab j-skel-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 12.5, fontWeight: 600 }}>Async Surface Morph</span>
        <button type="button" className="j-chip" style={{ height: 23 }} onClick={toggle}>
          <RefreshCw size={11} />
          <span>{loading ? 'Resolve Data' : 'Simulate Load'}</span>
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '6px 0' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div className="j-skel-bar" style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0 }} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div className="j-skel-bar" style={{ width: '68%', height: 12 }} />
              <div className="j-skel-bar" style={{ width: '44%', height: 10 }} />
            </div>
          </div>
          <div className="j-skel-bar" style={{ width: '100%', height: 32, borderRadius: 10 }} />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '4px 0' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: 'var(--juice-w12)',
                display: 'grid',
                placeItems: 'center',
                fontWeight: 700,
              }}
            >
              CF
            </div>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 600 }}>Workers Production Cluster</div>
              <div style={{ fontSize: 11.5, color: 'var(--juice-mute)' }}>310 edge locations · 0 cold starts</div>
            </div>
          </div>
          <div
            style={{
              height: 32,
              borderRadius: 10,
              background: 'var(--juice-w6)',
              padding: '0 10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: 12,
            }}
          >
            <span style={{ color: 'var(--juice-mute)' }}>Last deploy</span>
            <span style={{ fontWeight: 600 }}>14s ago · Verified</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 28. TransferList (UI SDK Transfer — Dual-Column Integration Connector)
// ---------------------------------------------------------------------------

export function TransferList({ id = 'transfer-list' }: { id?: string }) {
  const { playSound } = useJuice();
  const [connected, setConnected] = useState<string[]>(['GitHub', 'Cloudflare']);
  const allSources = ['GitHub', 'Cloudflare', 'Postgres', 'Linear'];
  const available = allSources.filter((s) => !connected.includes(s));

  const move = (item: string) => {
    const isConn = connected.includes(item);
    playSound(isConn ? 'tap' : 'pop');
    setConnected((prev) => (isConn ? prev.filter((x) => x !== item) : [...prev, item]));
  };

  useJuiceAgentNode(
    id,
    'TransferList',
    { connected, available },
    {
      toggleSource: (s: string) => move(String(s)),
      connectAll: () => {
        playSound('paid');
        setConnected(allSources);
      },
    },
  );

  return (
    <div id={id} className="j-slab j-transfer-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 12.5, fontWeight: 600 }}>MCP Source Bindings</span>
        <Badge tone="ok">{connected.length} Connected</Badge>
      </div>

      <div className="j-transfer-cols">
        <div className="j-transfer-col">
          <div style={{ fontSize: 11, color: 'var(--juice-mute)', fontWeight: 500 }}>Available ({available.length})</div>
          {available.map((item) => (
            <button key={item} type="button" className="j-transfer-item" onClick={() => move(item)}>
              <span>{item}</span>
              <Plus size={12} />
            </button>
          ))}
        </div>

        <div className="j-transfer-col">
          <div style={{ fontSize: 11, color: 'var(--juice-mute)', fontWeight: 500 }}>Active ({connected.length})</div>
          {connected.map((item) => (
            <button key={item} type="button" className="j-transfer-item" onClick={() => move(item)}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <Database size={11} />
                <span>{item}</span>
              </span>
              <Check size={12} style={{ color: 'var(--juice-ok)' }} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
