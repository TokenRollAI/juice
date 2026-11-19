import { useMemo, useRef, useState } from 'react';
import {
  AtSign,
  Bot,
  Check,
  ChevronRight,
  Crosshair,
  FileText,
  GitBranch,
  Globe,
  Mic,
  MicOff,
  RefreshCw,
  Send,
  Sliders,
  ThumbsUp,
  Volume2,
  Zap,
} from 'lucide-react';
import { useControllableState, useJuice, useJuiceAgentNode } from './behaviors.tsx';
import { Badge, Kbd, RollingNumber, SegmentedControl } from './components.tsx';

// ---------------------------------------------------------------------------
// 1. SlashMentionComposer (Interactive /skill + @file Prompt Router)
// ---------------------------------------------------------------------------

const SLASH_SKILLS = ['/architect', '/review', '/sql', '/bench'] as const;
const CONTEXT_FILES = ['@styles.css', '@behaviors.tsx'] as const;

export function SlashMentionComposer({
  id = 'slash-mention-composer',
  skill: controlledSkill,
  defaultSkill = '/architect',
  mentions: controlledMentions,
  defaultMentions = ['@styles.css'],
  value: controlledValue,
  defaultValue = 'Audit concentric surface contrast and bridge actions',
  onSkillChange,
  onMentionsChange,
  onSubmit,
}: {
  id?: string;
  skill?: string;
  defaultSkill?: string;
  mentions?: string[];
  defaultMentions?: string[];
  value?: string;
  defaultValue?: string;
  onSkillChange?: (skill: string) => void;
  onMentionsChange?: (mentions: string[]) => void;
  onSubmit?: (payload: { skill: string; mentions: string[]; prompt: string }) => void;
}) {
  const { playSound } = useJuice();
  const [skill, setSkill] = useControllableState<string>({
    value: controlledSkill,
    defaultValue: defaultSkill,
    onChange: onSkillChange,
  });
  const [mentions, setMentions] = useControllableState<string[]>({
    value: controlledMentions,
    defaultValue: defaultMentions,
    onChange: onMentionsChange,
  });
  const [prompt, setPrompt] = useControllableState<string>({
    value: controlledValue,
    defaultValue,
  });
  const [schemaPinned, setSchemaPinned] = useState(true);
  const [sentCount, setSentCount] = useState(0);

  const selectSkill = (rawSkill: string) => {
    const normalized = rawSkill.startsWith('/') ? rawSkill : `/${rawSkill}`;
    playSound('tap');
    setSkill(normalized);
  };

  const toggleMention = (rawFile: string) => {
    const normalized = rawFile.startsWith('@') ? rawFile : `@${rawFile}`;
    playSound('tap');
    setMentions((prev) =>
      prev.includes(normalized) ? prev.filter((item) => item !== normalized) : [...prev, normalized],
    );
  };

  const submit = () => {
    if (!prompt.trim() && !skill) return;
    playSound('pop');
    setSentCount((c) => c + 1);
    onSubmit?.({ skill, mentions, prompt });
  };

  useJuiceAgentNode(
    id,
    'SlashMentionComposer',
    { skill, mentions, prompt, schemaPinned, sentCount },
    {
      selectSkill: (s: string) => selectSkill(String(s)),
      toggleMention: (f: string) => toggleMention(String(f)),
      submit,
    },
  );

  return (
    <div id={id} className="j-slab j-ai-card">
      <div className="j-ai-header">
        <span className="j-ai-title">
          <span className="j-status-dot" data-tone="ok" />
          <span>Slash &amp; Context Composer</span>
        </span>
        <Badge tone={sentCount > 0 ? 'ok' : 'neutral'}>
          {sentCount > 0 ? `Dispatched #${sentCount}` : `${mentions.length + (schemaPinned ? 1 : 0)} ctx`}
        </Badge>
      </div>

      {/* Slash skill selector row */}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }} role="toolbar" aria-label="Slash skills">
        {SLASH_SKILLS.map((item) => {
          const active = skill === item;
          return (
            <button
              key={item}
              type="button"
              className="j-ai-pill-btn"
              data-active={active ? 'true' : undefined}
              aria-pressed={active}
              onClick={() => selectSkill(item)}
              style={{ flex: 1, padding: '0 7px', fontFamily: 'var(--juice-font-mono)', fontSize: 11.5 }}
            >
              {item}
            </button>
          );
        })}
      </div>

      {/* Composed prompt surface */}
      <div className="j-ai-surface" style={{ gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
          <Kbd>{skill}</Kbd>
          {mentions.map((file) => (
            <Kbd key={file}>{file}</Kbd>
          ))}
        </div>

        <textarea
          aria-label="Prompt input"
          className="j-composer-textarea"
          style={{ minHeight: 40, padding: '2px 0' }}
          value={prompt}
          placeholder="Type / for skills or @ to ground files…"
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
              e.preventDefault();
              submit();
            }
          }}
        />

        {/* @file context toggles */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
          {CONTEXT_FILES.map((file) => {
            const included = mentions.includes(file);
            return (
              <button
                key={file}
                type="button"
                className="j-ai-pill-btn"
                data-active={included ? 'true' : undefined}
                aria-pressed={included}
                onClick={() => toggleMention(file)}
                style={{ height: 24, padding: '0 8px', fontSize: 11.5 }}
              >
                <AtSign size={11} />
                <span>{file.slice(1)}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active attachment chip + send trigger */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
        <button
          type="button"
          className="j-chip"
          aria-pressed={schemaPinned}
          onClick={() => {
            playSound('tap');
            setSchemaPinned((prev) => !prev);
          }}
          style={{ opacity: schemaPinned ? 1 : 0.55 }}
        >
          <FileText size={12} />
          <span style={{ fontFamily: 'var(--juice-font-mono)', fontSize: 11.5 }}>
            schema.prisma · 100%
          </span>
        </button>

        <button
          type="button"
          className="j-ai-pill-btn"
          data-primary="true"
          aria-label="Send prompt"
          disabled={!prompt.trim() && !skill}
          onClick={submit}
          style={{ padding: '0 11px' }}
        >
          <span>Send</span>
          <Send size={12} />
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 2. ModelEffortPicker (Model Selector + Reasoning Effort + Live Budget)
// ---------------------------------------------------------------------------

export type ReasoningEffort = 'low' | 'medium' | 'high' | 'max';

type ModelProfile = {
  name: 'Claude 4.6 Opus' | 'Gemini 4 Carbon' | 'GPT-6.2 Sol';
  windowLabel: string;
  baseTokPerSec: number;
  baseLatencyMs: number;
};

const MODEL_PROFILES: readonly ModelProfile[] = [
  { name: 'Claude 4.6 Opus', windowLabel: '200k ctx', baseTokPerSec: 68, baseLatencyMs: 920 },
  { name: 'Gemini 4 Carbon', windowLabel: '1M ctx', baseTokPerSec: 124, baseLatencyMs: 540 },
  { name: 'GPT-6.2 Sol', windowLabel: '256k ctx', baseTokPerSec: 108, baseLatencyMs: 640 },
] as const;

const EFFORT_PROFILES: Record<
  ReasoningEffort,
  { budgetK: number; speedScale: number; latencyAddMs: number }
> = {
  low: { budgetK: 2, speedScale: 1.15, latencyAddMs: 0 },
  medium: { budgetK: 8, speedScale: 1.0, latencyAddMs: 480 },
  high: { budgetK: 16, speedScale: 0.88, latencyAddMs: 1250 },
  max: { budgetK: 32, speedScale: 0.74, latencyAddMs: 2600 },
};

export function ModelEffortPicker({
  id = 'model-effort-picker',
  model: controlledModel,
  defaultModel = 'Claude 4.6 Opus',
  effort: controlledEffort,
  defaultEffort = 'high',
  onModelChange,
  onEffortChange,
}: {
  id?: string;
  model?: string;
  defaultModel?: string;
  effort?: ReasoningEffort;
  defaultEffort?: ReasoningEffort;
  onModelChange?: (model: string) => void;
  onEffortChange?: (effort: ReasoningEffort) => void;
}) {
  const { playSound } = useJuice();
  const [model, setModelState] = useControllableState<string>({
    value: controlledModel,
    defaultValue: defaultModel,
    onChange: onModelChange,
  });
  const [effort, setEffortState] = useControllableState<ReasoningEffort>({
    value: controlledEffort,
    defaultValue: defaultEffort,
    onChange: onEffortChange,
  });

  const activeProfile = useMemo(
    () =>
      MODEL_PROFILES.find((m) => m.name.toLowerCase() === model.toLowerCase()) ??
      MODEL_PROFILES[0]!,
    [model],
  );

  const effortSpec = EFFORT_PROFILES[effort] ?? EFFORT_PROFILES.high;
  const tokPerSec = Math.round(activeProfile.baseTokPerSec * effortSpec.speedScale);
  const thinkingBudget = effortSpec.budgetK;
  const latencySec = ((activeProfile.baseLatencyMs + effortSpec.latencyAddMs) / 1000).toFixed(1);

  const selectModel = (nextModel: string) => {
    const matched = MODEL_PROFILES.find(
      (m) =>
        m.name.toLowerCase() === nextModel.toLowerCase() ||
        m.name.toLowerCase().includes(nextModel.toLowerCase()),
    );
    const resolved = matched ? matched.name : nextModel;
    if (resolved !== model) {
      playSound('tap');
      setModelState(resolved);
    }
  };

  const selectEffort = (nextEffort: ReasoningEffort) => {
    const valid: ReasoningEffort =
      nextEffort === 'low' || nextEffort === 'medium' || nextEffort === 'high' || nextEffort === 'max'
        ? nextEffort
        : 'high';
    if (valid !== effort) {
      playSound('tick');
      setEffortState(valid);
    }
  };

  useJuiceAgentNode(
    id,
    'ModelEffortPicker',
    { model: activeProfile.name, effort, tokPerSec, thinkingBudgetK: thinkingBudget, latencySec },
    {
      setModel: (m: string) => selectModel(String(m)),
      setEffort: (e: ReasoningEffort) => selectEffort(e),
    },
  );

  return (
    <div id={id} className="j-slab j-ai-card">
      <div className="j-ai-header">
        <span className="j-ai-title">
          <Sliders size={13} />
          <span>Model &amp; Reasoning Effort</span>
        </span>
        <Badge tone="neutral">{activeProfile.windowLabel}</Badge>
      </div>

      {/* Model selector rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }} role="radiogroup" aria-label="Model">
        {MODEL_PROFILES.map((item) => {
          const selected = item.name === activeProfile.name;
          return (
            <button
              key={item.name}
              type="button"
              role="radio"
              aria-checked={selected}
              className="j-ai-row"
              onClick={() => selectModel(item.name)}
              style={{
                border: 0,
                width: '100%',
                font: 'inherit',
                color: 'var(--fill-on)',
                cursor: 'pointer',
                background: selected ? 'var(--juice-w12)' : 'var(--juice-w6)',
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontWeight: selected ? 600 : 500 }}>
                <span className="j-status-dot" data-tone={selected ? 'ok' : undefined} />
                <span>{item.name}</span>
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--juice-mute)', fontSize: 11.5 }}>
                <span style={{ fontFamily: 'var(--juice-font-mono)' }}>{item.baseTokPerSec} tok/s</span>
                {selected && <Check size={12} style={{ color: 'var(--fill-on)' }} />}
              </span>
            </button>
          );
        })}
      </div>

      {/* Reasoning effort segmented control */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 2px' }}>
          <span className="j-ai-sub">Reasoning Effort</span>
          <span className="j-ai-sub" style={{ fontFamily: 'var(--juice-font-mono)' }}>
            ~{latencySec}s TTFT
          </span>
        </div>
        <SegmentedControl
          options={[
            { value: 'low', label: 'Low' },
            { value: 'medium', label: 'Med' },
            { value: 'high', label: 'High' },
            { value: 'max', label: 'Max' },
          ]}
          value={effort}
          onChange={selectEffort}
          className="j-effort-seg"
        />
      </div>

      {/* Live speed & thinking budget */}
      <div className="j-ai-grid-2">
        <div className="j-ai-col" style={{ gap: 2 }}>
          <span className="j-ai-sub">Throughput</span>
          <div style={{ fontSize: 15, fontWeight: 600 }}>
            <RollingNumber value={tokPerSec} suffix=" tok/s" />
          </div>
        </div>
        <div className="j-ai-col" style={{ gap: 2 }}>
          <span className="j-ai-sub">Thinking Budget</span>
          <div style={{ fontSize: 15, fontWeight: 600 }}>
            <RollingNumber value={thinkingBudget} suffix="k tok" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 3. ContextBudgetMeter (4-Segment Stack Bar + /compact 60% Reduction)
// ---------------------------------------------------------------------------

const MAX_CONTEXT_K = 128;

export function ContextBudgetMeter({
  id = 'context-budget-meter',
  compacted: controlledCompacted,
  defaultCompacted = false,
  onCompactedChange,
}: {
  id?: string;
  compacted?: boolean;
  defaultCompacted?: boolean;
  onCompactedChange?: (compacted: boolean) => void;
}) {
  const { playSound } = useJuice();
  const [compacted, setCompacted] = useControllableState<boolean>({
    value: controlledCompacted,
    defaultValue: defaultCompacted,
    onChange: onCompactedChange,
  });

  // Uncompacted: 12 + 38 + 28 + 16 = 94k / 128k
  // Compacted (-60% on Files & Chat + summarized reasoning): 12 + 15 + 11 + 4 = 42k / 128k
  const segments = useMemo(
    () => [
      { id: 'system', label: 'System', k: 12, color: 'var(--fill-on)' },
      { id: 'files', label: 'Files', k: compacted ? 15 : 38, color: 'var(--juice-signal)' },
      { id: 'chat', label: 'Chat', k: compacted ? 11 : 28, color: 'var(--juice-ok)' },
      { id: 'reasoning', label: 'Reasoning', k: compacted ? 4 : 16, color: 'var(--juice-warn)' },
    ],
    [compacted],
  );

  const totalK = useMemo(() => segments.reduce((sum, seg) => sum + seg.k, 0), [segments]);
  const pctUsed = Math.round((totalK / MAX_CONTEXT_K) * 100);

  const compact = () => {
    if (!compacted) {
      playSound('paid');
      setCompacted(true);
    } else {
      playSound('tap');
    }
  };

  const restore = () => {
    if (compacted) {
      playSound('tap');
      setCompacted(false);
    }
  };

  useJuiceAgentNode(
    id,
    'ContextBudgetMeter',
    { compacted, totalK, maxK: MAX_CONTEXT_K, segments },
    { compact, restore },
  );

  return (
    <div id={id} className="j-slab j-ai-card">
      <div className="j-ai-header">
        <span className="j-ai-title">
          <Zap size={13} />
          <span>Context Window</span>
        </span>
        <Badge tone={compacted ? 'ok' : pctUsed > 70 ? 'warn' : 'neutral'}>
          {compacted ? 'Compacted −52k' : `${pctUsed}% used`}
        </Badge>
      </div>

      <div className="j-ai-surface" style={{ gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 18, fontWeight: 600 }}>
            <RollingNumber value={totalK} suffix="k" />
            <span style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--juice-mute)' }}>
              {' '}
              / {MAX_CONTEXT_K}k
            </span>
          </div>
          <span className="j-ai-sub" style={{ fontFamily: 'var(--juice-font-mono)' }}>
            {MAX_CONTEXT_K - totalK}k free
          </span>
        </div>

        <div className="j-ai-stack-bar" role="img" aria-label={`Token usage ${totalK}k of ${MAX_CONTEXT_K}k`}>
          {segments.map((seg) => (
            <span
              key={seg.id}
              className="j-ai-stack-seg"
              style={{
                width: `${(seg.k / MAX_CONTEXT_K) * 100}%`,
                background: seg.color,
              }}
            />
          ))}
        </div>

        <div className="j-ai-grid-2" style={{ gap: 5 }}>
          {segments.map((seg) => (
            <div
              key={seg.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: 11.5,
                padding: '2px 4px',
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--juice-soft)' }}>
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: seg.color,
                    flexShrink: 0,
                  }}
                />
                <span>{seg.label}</span>
              </span>
              <span style={{ fontFamily: 'var(--juice-font-mono)', fontWeight: 600 }}>
                {seg.k}k
              </span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6 }}>
        <button
          type="button"
          className="j-ai-pill-btn"
          data-primary="true"
          onClick={compact}
          style={{ flex: 1, opacity: compacted ? 0.6 : 1 }}
        >
          <span>Compact Context (/compact)</span>
        </button>
        <button
          type="button"
          className="j-ai-pill-btn"
          onClick={restore}
          disabled={!compacted}
          style={{ opacity: compacted ? 1 : 0.45 }}
        >
          <RefreshCw size={11} />
          <span>Restore</span>
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 4. GroundedAnswer (Inline [1][2][3] Citations + Source Quote Preview)
// ---------------------------------------------------------------------------

type CitationSpec = {
  index: 1 | 2 | 3;
  sourceLabel: string;
  quote: string;
  loc: string;
};

const CITATIONS: readonly CitationSpec[] = [
  {
    index: 1,
    sourceLabel: 'bencho.dev/tokens · 99% match',
    quote: 'Derive all six contrast steps from --fill-on and --fill-slab so nested rows never need 1px border chrome.',
    loc: 'tokens.css · L34–42',
  },
  {
    index: 2,
    sourceLabel: 'ui-sdk.dev/behaviors · 96% match',
    quote: 'Dual-driven primitives reconcile external timeline props with live pointer play and agent bridge actions.',
    loc: 'behaviors.tsx · L157–184',
  },
  {
    index: 3,
    sourceLabel: 'aisdkagents.com/patterns · 94% match',
    quote: 'Inline provenance pills keep source verification one tap away without breaking reading flow.',
    loc: 'grounding.md · L18–26',
  },
] as const;

export function GroundedAnswer({
  id = 'grounded-answer',
  activeCitation: controlledCitation,
  defaultCitation = 1,
  onCitationChange,
}: {
  id?: string;
  activeCitation?: number;
  defaultCitation?: number;
  onCitationChange?: (index: number) => void;
}) {
  const { playSound } = useJuice();
  const [activeIndex, setActiveIndex] = useControllableState<number>({
    value: controlledCitation,
    defaultValue: defaultCitation,
    onChange: onCitationChange,
  });

  const selectCitation = (rawIndex: number) => {
    const clamped = Math.min(3, Math.max(1, Number(rawIndex) || 1));
    playSound('tick');
    setActiveIndex(clamped);
  };

  const activeSource = useMemo(
    () => CITATIONS.find((c) => c.index === activeIndex) ?? CITATIONS[0]!,
    [activeIndex],
  );

  useJuiceAgentNode(
    id,
    'GroundedAnswer',
    { activeCitation: activeSource.index, source: activeSource.sourceLabel },
    { selectCitation: (idx: number) => selectCitation(idx) },
  );

  return (
    <div id={id} className="j-slab j-ai-card">
      <div className="j-ai-header">
        <span className="j-ai-title">
          <Globe size={13} />
          <span>Grounded Synthesis</span>
        </span>
        <Badge tone="ok">3 sources</Badge>
      </div>

      {/* Answer passage with inline clickable citations */}
      <div
        className="j-ai-surface"
        style={{ fontSize: 12.5, lineHeight: 1.55, color: 'var(--fill-on)', display: 'block' }}
      >
        Concentric 20px → 14px slabs derive every tonal step via{' '}
        <code style={{ fontFamily: 'var(--juice-font-mono)', fontSize: 11.5 }}>color-mix</code>
        <button
          type="button"
          className="j-cite-pill"
          data-active={activeSource.index === 1 ? 'true' : undefined}
          aria-label="Citation 1: bencho.dev/tokens"
          onClick={() => selectCitation(1)}
        >
          [1]
        </button>
        , pairing dual-driven state hooks
        <button
          type="button"
          className="j-cite-pill"
          data-active={activeSource.index === 2 ? 'true' : undefined}
          aria-label="Citation 2: ui-sdk.dev/behaviors"
          onClick={() => selectCitation(2)}
        >
          [2]
        </button>{' '}
        with inline verifiable quotes
        <button
          type="button"
          className="j-cite-pill"
          data-active={activeSource.index === 3 ? 'true' : undefined}
          aria-label="Citation 3: aisdkagents.com/patterns"
          onClick={() => selectCitation(3)}
        >
          [3]
        </button>{' '}
        so operators audit claims in place.
      </div>

      {/* Grounded quote preview card */}
      <div className="j-ai-surface" style={{ gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
          <span
            style={{
              fontSize: 11.5,
              fontWeight: 600,
              fontFamily: 'var(--juice-font-mono)',
              color: 'var(--fill-on)',
            }}
          >
            {activeSource.sourceLabel}
          </span>
          <Kbd>[{activeSource.index}]</Kbd>
        </div>
        <div style={{ fontSize: 12, lineHeight: 1.45, color: 'var(--juice-soft)' }}>
          &ldquo;{activeSource.quote}&rdquo;
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span className="j-ai-sub" style={{ fontFamily: 'var(--juice-font-mono)' }}>
            {activeSource.loc}
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, color: 'var(--juice-mute)' }}>
            <span>Passage verified</span>
            <ChevronRight size={11} />
          </span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 5. MessageBranchThread (1/3 Version Pager + Stream Interrupted Recovery)
// ---------------------------------------------------------------------------

type BranchRevision = {
  branch: 1 | 2 | 3;
  tag: string;
  partialText: string;
  completedTail: string;
  finalTokens: number;
};

const BRANCH_REVISIONS: readonly BranchRevision[] = [
  {
    branch: 1,
    tag: 'Direct Patch',
    partialText: 'Replace the blocking confirmation modal with an inline StateButton stage machine (`idle → confirming →',
    completedTail: ' pending → settled`) so pointer focus and scroll anchor stay intact.',
    finalTokens: 142,
  },
  {
    branch: 2,
    tag: 'Minimal Diff',
    partialText: 'Keep existing RPC handlers untouched; swap `<Dialog>` wrapper for `.j-slab.j-ai-card` and wire Escape to',
    completedTail: ' revert optimistic state within a 4-second undo window.',
    finalTokens: 128,
  },
  {
    branch: 3,
    tag: 'Audit Checklist',
    partialText: '1. Remove nested 1px card borders. 2. Step dark fill tokens from w6 to w12. 3. Lock button width during',
    completedTail: ' async settlement to prevent horizontal layout shift.',
    finalTokens: 156,
  },
] as const;

export function MessageBranchThread({
  id = 'message-branch-thread',
  branch: controlledBranch,
  defaultBranch = 1,
  interrupted: controlledInterrupted,
  defaultInterrupted = true,
  onBranchChange,
  onInterruptedChange,
}: {
  id?: string;
  branch?: number;
  defaultBranch?: number;
  interrupted?: boolean;
  defaultInterrupted?: boolean;
  onBranchChange?: (branch: number) => void;
  onInterruptedChange?: (interrupted: boolean) => void;
}) {
  const { playSound } = useJuice();
  const [branch, setBranchState] = useControllableState<number>({
    value: controlledBranch,
    defaultValue: defaultBranch,
    onChange: onBranchChange,
  });
  const [interrupted, setInterrupted] = useControllableState<boolean>({
    value: controlledInterrupted,
    defaultValue: defaultInterrupted,
    onChange: onInterruptedChange,
  });

  const activeRevision = useMemo(
    () => BRANCH_REVISIONS.find((r) => r.branch === branch) ?? BRANCH_REVISIONS[0]!,
    [branch],
  );

  const setBranch = (next: number) => {
    const clamped = Math.min(3, Math.max(1, Number(next) || 1));
    playSound('tap');
    setBranchState(clamped);
  };

  const continueStream = () => {
    playSound('paid');
    setInterrupted(false);
  };

  const interruptStream = () => {
    playSound('tap');
    setInterrupted(true);
  };

  useJuiceAgentNode(
    id,
    'MessageBranchThread',
    {
      branch: activeRevision.branch,
      interrupted,
      tokens: interrupted ? 84 : activeRevision.finalTokens,
    },
    {
      setBranch: (n: number) => setBranch(n),
      continueStream,
      interruptStream,
    },
  );

  return (
    <div id={id} className="j-slab j-ai-card">
      <div className="j-ai-header">
        <span className="j-ai-title">
          <GitBranch size={13} />
          <span>Assistant · {activeRevision.tag}</span>
        </span>

        {/* Version branch pager: ← 1/3 → */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
          <button
            type="button"
            className="j-ai-pill-btn"
            aria-label="Previous revision"
            onClick={() => setBranch(activeRevision.branch === 1 ? 3 : activeRevision.branch - 1)}
            style={{ height: 22, padding: '0 6px', fontSize: 11 }}
          >
            &larr;
          </button>
          <span
            style={{
              fontFamily: 'var(--juice-font-mono)',
              fontSize: 11.5,
              fontWeight: 600,
              padding: '0 4px',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {activeRevision.branch}/3
          </span>
          <button
            type="button"
            className="j-ai-pill-btn"
            aria-label="Next revision"
            onClick={() => setBranch(activeRevision.branch === 3 ? 1 : activeRevision.branch + 1)}
            style={{ height: 22, padding: '0 6px', fontSize: 11 }}
          >
            &rarr;
          </button>
        </div>
      </div>

      {/* Response body preserving partial artifact when interrupted */}
      <div className="j-ai-surface" style={{ fontSize: 12.5, lineHeight: 1.5, gap: 6 }}>
        <div>
          <span>{activeRevision.partialText}</span>
          {!interrupted ? (
            <span>{activeRevision.completedTail}</span>
          ) : (
            <span style={{ color: 'var(--juice-warn)', fontFamily: 'var(--juice-font-mono)' }}> ▍</span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span className="j-ai-sub" style={{ fontFamily: 'var(--juice-font-mono)' }}>
            {interrupted ? '84 tok · Partial preserved' : `${activeRevision.finalTokens} tok · Complete`}
          </span>
          {!interrupted && (
            <button
              type="button"
              className="j-ai-pill-btn"
              onClick={interruptStream}
              style={{ height: 22, padding: '0 7px', fontSize: 11 }}
            >
              Simulate Drop
            </button>
          )}
        </div>
      </div>

      {/* Interrupted recovery bar */}
      {interrupted && (
        <button
          type="button"
          className="j-ai-pill-btn"
          data-primary="true"
          onClick={continueStream}
          style={{ width: '100%', height: 32, justifyContent: 'space-between', padding: '0 10px', fontSize: 11.5 }}
        >
          <span>Stream interrupted at 84 tokens · Continue generating</span>
          <ChevronRight size={13} />
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 6. ModelArenaCompare (Side-by-Side Claude 4.6 vs GPT-6.2 Sol Evaluation)
// ---------------------------------------------------------------------------

export function ModelArenaCompare({
  id = 'model-arena-compare',
  winner: controlledWinner,
  defaultWinner = null,
  onWinnerChange,
}: {
  id?: string;
  winner?: 'A' | 'B' | null;
  defaultWinner?: 'A' | 'B' | null;
  onWinnerChange?: (winner: 'A' | 'B' | null) => void;
}) {
  const { playSound } = useJuice();
  const [winner, setWinner] = useControllableState<'A' | 'B' | null>({
    value: controlledWinner,
    defaultValue: defaultWinner,
    onChange: onWinnerChange,
  });

  const pickWinner = (choice: 'A' | 'B' | null) => {
    const normalized: 'A' | 'B' | null =
      choice === 'A' || choice === 'B' ? choice : null;
    playSound(normalized ? 'paid' : 'tap');
    setWinner(normalized);
  };

  useJuiceAgentNode(
    id,
    'ModelArenaCompare',
    { winner },
    { pickWinner: (m: 'A' | 'B' | null) => pickWinner(m) },
  );

  return (
    <div id={id} className="j-slab j-ai-card">
      <div className="j-ai-header">
        <span className="j-ai-title">
          <Bot size={13} />
          <span>Model Arena</span>
        </span>
        <Badge tone={winner ? 'ok' : 'neutral'}>
          {winner === 'A' ? 'Claude 4.6 Wins' : winner === 'B' ? 'GPT-6.2 Sol Wins' : 'Side-by-Side'}
        </Badge>
      </div>

      <div className="j-ai-grid-2">
        {/* Column A: Claude 4.6 */}
        <div className="j-ai-col" data-selected={winner === 'A' ? 'true' : undefined}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <span style={{ fontSize: 12, fontWeight: 600 }}>Claude 4.6</span>
            <Badge tone="neutral" style={{ alignSelf: 'flex-start', height: 19, padding: '0 6px', fontSize: 10.5 }}>
              68 tok/s
            </Badge>
          </div>

          <div className="j-ai-mono-box" style={{ fontSize: 10.5, padding: '6px 7px' }}>
            <span>--w6: mix(on 6.5%);</span>
            <span>border-radius: 14px;</span>
            <span style={{ color: 'var(--juice-mute)' }}>/* zero border */</span>
          </div>

          <button
            type="button"
            className="j-ai-pill-btn"
            data-active={winner === 'A' ? 'true' : undefined}
            aria-pressed={winner === 'A'}
            onClick={() => pickWinner(winner === 'A' ? null : 'A')}
            style={{ width: '100%', fontSize: 11.5 }}
          >
            <ThumbsUp size={11} />
            <span>{winner === 'A' ? 'Voted A' : 'Vote Winner'}</span>
          </button>
        </div>

        {/* Column B: GPT-6.2 Sol */}
        <div className="j-ai-col" data-selected={winner === 'B' ? 'true' : undefined}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <span style={{ fontSize: 12, fontWeight: 600 }}>GPT-6.2 Sol</span>
            <Badge tone="neutral" style={{ alignSelf: 'flex-start', height: 19, padding: '0 6px', fontSize: 10.5 }}>
              112 tok/s
            </Badge>
          </div>

          <div className="j-ai-mono-box" style={{ fontSize: 10.5, padding: '6px 7px' }}>
            <span>const r = 20 - 6;</span>
            <span>act(id, &apos;press&apos;);</span>
            <span style={{ color: 'var(--juice-mute)' }}>/* typed rpc */</span>
          </div>

          <button
            type="button"
            className="j-ai-pill-btn"
            data-active={winner === 'B' ? 'true' : undefined}
            aria-pressed={winner === 'B'}
            onClick={() => pickWinner(winner === 'B' ? null : 'B')}
            style={{ width: '100%', fontSize: 11.5 }}
          >
            <ThumbsUp size={11} />
            <span>{winner === 'B' ? 'Voted B' : 'Vote Winner'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 7. VisionRegionAsk (Bounding Box Inspection + Localized Auto-Fix)
// ---------------------------------------------------------------------------

export type VisionRegionId = 'nav' | 'cta' | 'contrast';

const VISION_DIAGNOSES: Record<
  VisionRegionId,
  {
    boxLabel: string;
    fixedBoxLabel: string;
    issue: string;
    fixedSummary: string;
  }
> = {
  nav: {
    boxLabel: 'Header Nav · 99%',
    fixedBoxLabel: 'Header Nav · Locked',
    issue: 'Breadcrumb baseline drifts 2px from trailing status pill.',
    fixedSummary: 'Aligned header items on a 32px flex row with optical 8px gap.',
  },
  cta: {
    boxLabel: 'Confirm CTA · 96%',
    fixedBoxLabel: 'Confirm CTA · Concentric',
    issue: 'Inner CTA uses 999px pill radius inside a 20px outer card.',
    fixedSummary: 'Updated CTA radius to concentric 14px (20px outer − 6px pad).',
  },
  contrast: {
    boxLabel: 'Contrast 3.8:1 · Warn',
    fixedBoxLabel: 'Contrast 7.4:1 · AA+',
    issue: 'Muted helper copy drops to 3.8:1 against dark solid slab.',
    fixedSummary: 'Stepped token from --juice-faint up to --juice-soft (7.4:1 AA+).',
  },
};

export function VisionRegionAsk({
  id = 'vision-region-ask',
  region: controlledRegion,
  defaultRegion = 'contrast',
  onRegionChange,
}: {
  id?: string;
  region?: VisionRegionId;
  defaultRegion?: VisionRegionId;
  onRegionChange?: (region: VisionRegionId) => void;
}) {
  const { playSound } = useJuice();
  const [region, setRegion] = useControllableState<VisionRegionId>({
    value: controlledRegion,
    defaultValue: defaultRegion,
    onChange: onRegionChange,
  });
  const [fixedMap, setFixedMap] = useState<Record<VisionRegionId, boolean>>({
    nav: false,
    cta: false,
    contrast: false,
  });

  const selectRegion = (next: VisionRegionId) => {
    const resolved: VisionRegionId =
      next === 'nav' || next === 'cta' || next === 'contrast' ? next : 'contrast';
    playSound('pop');
    setRegion(resolved);
  };

  const fixRegion = () => {
    playSound('paid');
    setFixedMap((prev) => ({ ...prev, [region]: true }));
  };

  const isCurrentFixed = fixedMap[region];
  const currentDiag = VISION_DIAGNOSES[region];

  useJuiceAgentNode(
    id,
    'VisionRegionAsk',
    { region, fixed: isCurrentFixed, fixedMap },
    {
      selectRegion: (r: VisionRegionId) => selectRegion(r),
      fixRegion,
    },
  );

  return (
    <div id={id} className="j-slab j-ai-card">
      <div className="j-ai-header">
        <span className="j-ai-title">
          <Crosshair size={13} />
          <span>Vision Grounding</span>
        </span>
        <Badge tone={isCurrentFixed ? 'ok' : region === 'contrast' ? 'warn' : 'neutral'}>
          {isCurrentFixed ? 'Patched' : region === 'contrast' ? 'WCAG Warn' : '3 regions'}
        </Badge>
      </div>

      {/* Bounding box inspection stage */}
      <div className="j-vision-stage" role="group" aria-label="Detected UI regions">
        <button
          type="button"
          className="j-vision-box"
          data-active={region === 'nav' ? 'true' : undefined}
          onClick={() => selectRegion('nav')}
          style={{ top: 8, left: 8, right: 8, height: 30, alignItems: 'center' }}
        >
          <span>{fixedMap.nav ? VISION_DIAGNOSES.nav.fixedBoxLabel : VISION_DIAGNOSES.nav.boxLabel}</span>
          <span className="j-status-dot" data-tone="ok" />
        </button>

        <button
          type="button"
          className="j-vision-box"
          data-active={region === 'contrast' ? 'true' : undefined}
          onClick={() => selectRegion('contrast')}
          style={{ top: 45, left: 8, width: 158, height: 64 }}
        >
          <span>
            {fixedMap.contrast
              ? VISION_DIAGNOSES.contrast.fixedBoxLabel
              : VISION_DIAGNOSES.contrast.boxLabel}
          </span>
          <span className="j-status-dot" data-tone={fixedMap.contrast ? 'ok' : 'warn'} />
        </button>

        <button
          type="button"
          className="j-vision-box"
          data-active={region === 'cta' ? 'true' : undefined}
          onClick={() => selectRegion('cta')}
          style={{ top: 45, right: 8, width: 118, height: 64 }}
        >
          <span>{fixedMap.cta ? VISION_DIAGNOSES.cta.fixedBoxLabel : VISION_DIAGNOSES.cta.boxLabel}</span>
          <span className="j-status-dot" data-tone="ok" />
        </button>
      </div>

      {/* Localized Vision Agent diagnosis + one-click fix */}
      <div className="j-ai-surface" style={{ gap: 8 }}>
        <div style={{ fontSize: 12, lineHeight: 1.45, color: 'var(--juice-soft)' }}>
          {isCurrentFixed ? currentDiag.fixedSummary : currentDiag.issue}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
          <Kbd>#{region}</Kbd>
          {isCurrentFixed ? (
            <button
              type="button"
              className="j-ai-pill-btn"
              data-tone="ok"
              onClick={() => {
                playSound('tap');
                setFixedMap((prev) => ({ ...prev, [region]: false }));
              }}
            >
              <Check size={12} />
              <span>Applied · Undo</span>
            </button>
          ) : (
            <button
              type="button"
              className="j-ai-pill-btn"
              data-primary="true"
              onClick={fixRegion}
            >
              <span>Auto-Fix Region</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 8. VoiceOrbSession (12 Static-Safe Waveform Bars + Bilingual Transcript)
// ---------------------------------------------------------------------------

export type VoiceOrbState = 'listening' | 'thinking' | 'speaking' | 'muted';

const WAVE_BARS_12 = [9, 16, 24, 14, 28, 20, 30, 18, 25, 13, 21, 10] as const;

const VOICE_TRANSCRIPTS: Record<
  VoiceOrbState,
  { badge: string; tone: 'ok' | 'warn' | 'neutral'; en: string; zh: string }
> = {
  listening: {
    badge: 'Listening · 24kHz',
    tone: 'ok',
    en: '“Keep the checkout form inline and preserve draft inputs on timeout.”',
    zh: '“把结账表单保持内联展开，并在超时后保留已填草稿。”',
  },
  thinking: {
    badge: 'Synthesizing…',
    tone: 'warn',
    en: 'Resolving concentric 14px tokens and idempotent retry state…',
    zh: '正在推导 14px 同心圆角与幂等重试状态机…',
  },
  speaking: {
    badge: 'Speaking · Live',
    tone: 'ok',
    en: '“Done — MorphCard expands in place with Esc undo and draft lock.”',
    zh: '“已完成——MorphCard 现支持就地展开、Esc 撤销与草稿保护。”',
  },
  muted: {
    badge: 'Mic Muted',
    tone: 'neutral',
    en: 'Microphone muted. Session state and bilingual transcript stay active.',
    zh: '麦克风已静音，当前会话上下文与双语字幕保持就绪。',
  },
};

export function VoiceOrbSession({
  id = 'voice-orb-session',
  voiceState: controlledState,
  defaultVoiceState = 'speaking',
  onVoiceStateChange,
}: {
  id?: string;
  voiceState?: VoiceOrbState;
  defaultVoiceState?: VoiceOrbState;
  onVoiceStateChange?: (state: VoiceOrbState) => void;
}) {
  const { playSound } = useJuice();
  const [voiceState, setVoiceStateInternal] = useControllableState<VoiceOrbState>({
    value: controlledState,
    defaultValue: defaultVoiceState,
    onChange: onVoiceStateChange,
  });
  const lastUnmutedRef = useRef<Exclude<VoiceOrbState, 'muted'>>(
    defaultVoiceState === 'muted' ? 'listening' : defaultVoiceState,
  );

  const setVoiceState = (next: VoiceOrbState) => {
    const valid: VoiceOrbState =
      next === 'listening' || next === 'thinking' || next === 'speaking' || next === 'muted'
        ? next
        : 'listening';
    if (valid !== 'muted') {
      lastUnmutedRef.current = valid;
    }
    playSound(valid === 'muted' ? 'tap' : 'latch');
    setVoiceStateInternal(valid);
  };

  const toggleMute = () => {
    if (voiceState === 'muted') {
      playSound('latch');
      setVoiceStateInternal(lastUnmutedRef.current);
    } else {
      lastUnmutedRef.current = voiceState;
      playSound('tap');
      setVoiceStateInternal('muted');
    }
  };

  useJuiceAgentNode(
    id,
    'VoiceOrbSession',
    { voiceState, muted: voiceState === 'muted' },
    {
      setVoiceState: (s: VoiceOrbState) => setVoiceState(s),
      toggleMute,
    },
  );

  const spec = VOICE_TRANSCRIPTS[voiceState];
  const heightScale =
    voiceState === 'speaking'
      ? 1
      : voiceState === 'listening'
        ? 0.82
        : voiceState === 'thinking'
          ? 0.48
          : 0.22;

  const barColor =
    voiceState === 'speaking'
      ? 'var(--juice-signal)'
      : voiceState === 'listening'
        ? 'var(--juice-ok)'
        : voiceState === 'thinking'
          ? 'var(--juice-warn)'
          : 'var(--juice-faint)';

  return (
    <div id={id} className="j-slab j-ai-card">
      <div className="j-ai-header">
        <span className="j-ai-title">
          <span
            className="j-status-dot"
            data-tone={voiceState === 'muted' ? undefined : spec.tone}
            data-pulse={voiceState === 'listening' || voiceState === 'speaking' ? 'true' : undefined}
          />
          <span>Voice Duplex Session</span>
        </span>
        <Badge tone={spec.tone}>{spec.badge}</Badge>
      </div>

      {/* Tactile Voice Orb + 12 static-safe waveform bars */}
      <div
        className="j-ai-surface"
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 14px',
        }}
      >
        <button
          type="button"
          aria-label={voiceState === 'muted' ? 'Unmute microphone' : 'Mute microphone'}
          onClick={toggleMute}
          style={{
            width: 38,
            height: 38,
            borderRadius: '50%',
            border: 0,
            background:
              voiceState === 'muted'
                ? 'var(--juice-w12)'
                : `color-mix(in srgb, ${barColor} 16%, var(--fill-slab))`,
            color: voiceState === 'muted' ? 'var(--juice-mute)' : barColor,
            display: 'grid',
            placeItems: 'center',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          {voiceState === 'muted' && <MicOff size={16} />}
          {voiceState === 'listening' && <Mic size={16} />}
          {voiceState === 'speaking' && <Volume2 size={16} />}
          {voiceState === 'thinking' && <RefreshCw size={15} />}
        </button>

        <div
          className="j-wave-bars"
          aria-hidden="true"
          style={{ height: 32, gap: 4, flex: 1, justifyContent: 'center' }}
        >
          {WAVE_BARS_12.map((baseH, idx) => {
            const h = Math.max(4, Math.round(baseH * heightScale));
            return (
              <span
                key={idx}
                className="j-wave-bar"
                style={{
                  width: 3.5,
                  height: `${h}px`,
                  background: barColor,
                  animationPlayState: voiceState === 'muted' ? 'paused' : 'running',
                  animationDelay: `${idx * 75}ms`,
                }}
              />
            );
          })}
        </div>

        <Kbd>{voiceState === 'muted' ? 'OFF' : 'EN/ZH'}</Kbd>
      </div>

      {/* Live bilingual transcript preview */}
      <div className="j-ai-surface" style={{ gap: 4 }}>
        <div
          className={voiceState === 'thinking' ? 'j-text-shimmer' : undefined}
          style={{ fontSize: 12, lineHeight: 1.45, fontWeight: 500, color: 'var(--fill-on)' }}
        >
          {spec.en}
        </div>
        <div style={{ fontSize: 11.5, lineHeight: 1.45, color: 'var(--juice-mute)' }}>
          {spec.zh}
        </div>
      </div>

      {/* State toggle controls */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4 }}>
        {(
          [
            { key: 'listening', label: 'Listen' },
            { key: 'thinking', label: 'Think' },
            { key: 'speaking', label: 'Speak' },
          ] as const
        ).map((item) => (
          <button
            key={item.key}
            type="button"
            className="j-ai-pill-btn"
            data-active={voiceState === item.key ? 'true' : undefined}
            aria-pressed={voiceState === item.key}
            onClick={() => setVoiceState(item.key)}
            style={{ padding: '0 6px', fontSize: 11.5 }}
          >
            {item.label}
          </button>
        ))}
        <button
          type="button"
          className="j-ai-pill-btn"
          data-tone={voiceState === 'muted' ? 'danger' : undefined}
          aria-pressed={voiceState === 'muted'}
          onClick={toggleMute}
          style={{ padding: '0 6px', fontSize: 11.5 }}
        >
          {voiceState === 'muted' ? 'Unmute' : 'Mute'}
        </button>
      </div>
    </div>
  );
}
