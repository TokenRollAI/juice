import { useEffect, useRef, useState } from 'react';
import {
  Bookmark,
  Check,
  ChevronRight,
  Clock,
  Cpu,
  FileCode2,
  Layers,
  Play,
  Plus,
  RefreshCw,
  Server,
  ShieldAlert,
  Terminal,
  Trash2,
  Undo2,
  X,
} from 'lucide-react';
import { useControllableState, useJuice, useJuiceAgentNode } from './behaviors.tsx';
import { Badge, Checkbox, Kbd, RollingNumber, SegmentedControl, Switch } from './components.tsx';

const inline = { display: 'inline-flex', alignItems: 'center', gap: 6 } as const;
const actions = { display: 'flex', flexWrap: 'wrap', gap: 6 } as const;
const codeBlock = { margin: 0, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' } as const;

function ProgressBar({ label, value }: { label: string; value: number }) {
  return (
    <div
      className="j-ai-stack-bar"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
    >
      <span className="j-ai-stack-seg" style={{ width: `${value}%`, background: 'var(--fill-on)' }} />
    </div>
  );
}

const APPROVAL_MODES = [
  { value: 'dry-run', label: 'Safe Dry-Run' },
  { value: 'execute', label: 'Full Execute' },
] as const;

type ApprovalMode = (typeof APPROVAL_MODES)[number]['value'];
type ApprovalStatus = 'pending' | 'approved' | 'denied';

const MIGRATION_TOOL = 'db.migrate';
const MIGRATION_COMMAND = 'ALTER TABLE users DROP COLUMN legacy_token;';

export function ToolApprovalGate({
  id = 'tool-approval-gate',
  status: controlledStatus,
  onStatusChange,
}: {
  id?: string;
  status?: ApprovalStatus;
  onStatusChange?: (status: ApprovalStatus) => void;
} = {}) {
  const { playSound } = useJuice();
  const [status, setStatus] = useControllableState<ApprovalStatus>({
    value: controlledStatus,
    defaultValue: 'pending',
    onChange: onStatusChange,
  });
  const [mode, setMode] = useState<ApprovalMode>('dry-run');

  const decide = (next: 'approved' | 'denied') => {
    if (status !== 'pending') return;
    playSound(next === 'approved' ? 'paid' : 'deny');
    setStatus(next);
  };
  const approve = () => decide('approved');
  const deny = () => decide('denied');
  const reset = () => {
    playSound('tap');
    setMode('dry-run');
    setStatus('pending');
  };

  useJuiceAgentNode(
    id,
    'ToolApprovalGate',
    { status, mode, tool: MIGRATION_TOOL, command: MIGRATION_COMMAND, risk: 'High Risk' },
    { approve, deny, reset },
  );

  return (
    <div id={id} className="j-slab j-ai-card">
      <div className="j-ai-header">
        <span className="j-ai-title"><ShieldAlert size={14} aria-hidden="true" /> Tool Approval</span>
        <Badge tone="warn">High Risk</Badge>
      </div>
      <div className="j-ai-mono-box">
        <strong>{MIGRATION_TOOL}</strong>
        <pre style={codeBlock}>{MIGRATION_COMMAND}</pre>
      </div>
      {status === 'pending' ? (
        <>
          <SegmentedControl options={APPROVAL_MODES} value={mode} onChange={setMode} />
          <div style={actions}>
            <button type="button" className="j-ai-pill-btn" data-primary="true" onClick={approve}>
              <Check size={13} aria-hidden="true" /> Approve
            </button>
            <button type="button" className="j-ai-pill-btn" onClick={deny}>
              <X size={13} aria-hidden="true" /> Deny
            </button>
          </div>
        </>
      ) : (
        <div className="j-ai-row">
          <span role="status">
            {status === 'approved' ? `Approved · ${mode === 'dry-run' ? 'Dry run' : 'Full execute'}` : 'Denied'}
          </span>
          <button type="button" className="j-ai-pill-btn" onClick={reset}>
            <Undo2 size={13} aria-hidden="true" /> Reset
          </button>
        </div>
      )}
    </div>
  );
}

const WORKERS = [
  {
    id: 'carbon', name: 'Carbon', role: 'UI Architect', progress: 76, tokens: 2480,
    log: 'Checking concentric radius and tonal contrast.',
    result: 'Approved the card geometry and tonal ramp.', finalTokens: 3120,
  },
  {
    id: 'sol-1', name: 'Sol-1', role: 'Vue Adapter', progress: 48, tokens: 1310,
    log: 'Wiring the Vue adapter to the agent bridge.',
    result: 'Verified the Vue adapter action bindings.', finalTokens: 2230,
  },
  {
    id: 'sol-2', name: 'Sol-2', role: 'AI Suite', progress: 64, tokens: 1860,
    log: 'Exercising approvals, memory and tool switches.',
    result: 'Passed the AI suite interaction checks.', finalTokens: 2780,
  },
] as const;

export function SubagentSwarmBoard({ id = 'subagent-swarm-board' }: { id?: string } = {}) {
  const { playSound } = useJuice();
  const [selectedWorkerId, setSelectedWorkerId] = useState<(typeof WORKERS)[number]['id']>(WORKERS[0].id);
  const [completed, setCompleted] = useState(false);
  const workers = WORKERS.map((worker) => ({
    id: worker.id,
    name: worker.name,
    role: worker.role,
    status: completed ? 'done' : 'working',
    progress: completed ? 100 : worker.progress,
    tokens: completed ? worker.finalTokens : worker.tokens,
    log: completed ? worker.result : worker.log,
  }));
  const selectedWorker = workers.find((worker) => worker.id === selectedWorkerId);

  const selectWorker = (workerId: string) => {
    const worker = WORKERS.find((entry) => entry.id === workerId);
    if (!worker) return;
    playSound('tap');
    setSelectedWorkerId(worker.id);
  };
  const completeAll = () => {
    if (completed) return;
    playSound('landed');
    setCompleted(true);
  };
  const resetSwarm = () => {
    playSound('tap');
    setCompleted(false);
    setSelectedWorkerId(WORKERS[0].id);
  };

  useJuiceAgentNode(id, 'SubagentSwarmBoard', { workers, selectedWorkerId }, {
    selectWorker, completeAll, resetSwarm,
  });

  return (
    <div id={id} className="j-slab j-ai-card">
      <div className="j-ai-header">
        <span className="j-ai-title"><Cpu size={14} aria-hidden="true" /> Subagent Swarm</span>
        <span className="j-ai-sub" style={inline}>
          <span className="j-status-dot" data-pulse={!completed} aria-hidden="true" />
          <span className={completed ? undefined : 'j-text-shimmer'}>{completed ? '3 done' : '3 working'}</span>
        </span>
      </div>
      {workers.map((worker) => {
        const selected = worker.id === selectedWorkerId;
        return (
          <button
            key={worker.id}
            type="button"
            className="j-ai-row"
            aria-pressed={selected}
            onClick={() => selectWorker(worker.id)}
            style={{
              border: 0, textAlign: 'left', cursor: 'pointer', color: 'inherit', fontFamily: 'inherit',
              backgroundColor: selected ? 'var(--juice-w12)' : undefined,
            }}
          >
            <span style={{ flex: 1, minWidth: 0 }}>
              <strong>{worker.name}</strong>
              <span className="j-ai-sub" style={{ display: 'block' }}>{worker.role}</span>
            </span>
            <span className="j-ai-sub" style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
              {worker.progress}% · {worker.tokens.toLocaleString('en-US')} tokens
              <span style={{ display: 'block' }}>{worker.status === 'done' ? 'Done' : 'Working'}</span>
            </span>
            <ChevronRight size={13} aria-hidden="true" style={{ flexShrink: 0 }} />
          </button>
        );
      })}
      <div className="j-ai-mono-box" role="status">{selectedWorker?.log}</div>
      <div style={actions}>
        <button
          type="button"
          className="j-ai-pill-btn"
          onClick={completed ? resetSwarm : completeAll}
        >
          {completed ? <Undo2 size={13} aria-hidden="true" /> : <Play size={13} aria-hidden="true" />}
          {completed ? 'Reset Swarm' : 'Advance Swarm'}
        </button>
      </div>
    </div>
  );
}

const PLAN_STEPS = [
  'Lock concentric token ramp',
  'Synthesize 12 Web Audio cues',
  'Mount 16 AI agent blocks',
  'Run live browser smoke check',
] as const;

export function AgentPlanChecklist({ id = 'agent-plan-checklist' }: { id?: string } = {}) {
  const { playSound } = useJuice();
  const [checked, setChecked] = useState(() => PLAN_STEPS.map(() => false));
  const firstIncomplete = checked.indexOf(false);
  const activeStep = firstIncomplete === -1 ? PLAN_STEPS.length : firstIncomplete;
  const progress = checked.filter(Boolean).length * 100 / PLAN_STEPS.length;

  const toggleStep = (index: number) => {
    setChecked((previous) => previous.map((done, i) => i === index ? !done : done));
  };
  const advanceStep = () => {
    if (activeStep === PLAN_STEPS.length) return;
    playSound('latch');
    setChecked((previous) => {
      const next = previous.indexOf(false);
      return previous.map((done, i) => done || i === next);
    });
  };
  const setProgressStep = (step: number) => {
    if (!Number.isFinite(step)) return;
    const count = Math.max(0, Math.min(PLAN_STEPS.length, Math.trunc(step)));
    setChecked(PLAN_STEPS.map((_, index) => index < count));
  };
  const resetPlan = () => {
    playSound('tap');
    setProgressStep(0);
  };

  useJuiceAgentNode(id, 'AgentPlanChecklist', { activeStep, progress, checked }, {
    advanceStep, setProgressStep, resetPlan,
  });

  return (
    <div id={id} className="j-slab j-ai-card">
      <div className="j-ai-header">
        <span className="j-ai-title"><Layers size={14} aria-hidden="true" /> Agent Plan</span>
        <Badge aria-hidden="true"><RollingNumber value={progress} suffix="%" /></Badge>
      </div>
      <ProgressBar label="Plan completion" value={progress} />
      {PLAN_STEPS.map((step, index) => (
        <div
          key={step}
          className="j-ai-row"
          aria-current={activeStep === index ? 'step' : undefined}
          style={{ backgroundColor: activeStep === index ? 'var(--juice-w12)' : undefined }}
        >
          <Checkbox checked={checked[index] ?? false} onChange={() => toggleStep(index)} aria-label={step} />
          <button
            type="button"
            className="j-ai-pill-btn"
            tabIndex={-1}
            aria-hidden="true"
            onClick={() => {
              playSound('latch');
              toggleStep(index);
            }}
            style={{ flex: 1, justifyContent: 'flex-start', padding: 0, background: 'transparent' }}
          >
            {step}
          </button>
        </div>
      ))}
      <div style={actions}>
        {activeStep < PLAN_STEPS.length && (
          <button type="button" className="j-ai-pill-btn" data-primary="true" onClick={advanceStep}>
            <ChevronRight size={13} aria-hidden="true" /> Advance Next Step
          </button>
        )}
        {progress > 0 && (
          <button type="button" className="j-ai-pill-btn" onClick={resetPlan}>Reset</button>
        )}
      </div>
    </div>
  );
}

const ARTIFACT_VIEWS = [
  { value: 'preview', label: 'Preview' },
  { value: 'code', label: 'Code' },
  { value: 'diff', label: 'Diff' },
] as const;
const ARTIFACT_VERSIONS = ['v1', 'v2', 'v3'] as const;
type ArtifactView = (typeof ARTIFACT_VIEWS)[number]['value'];
type ArtifactVersion = (typeof ARTIFACT_VERSIONS)[number];

const ARTIFACT_METRICS = {
  v1: { label: 'Runs', value: 18 },
  v2: { label: 'Verified runs', value: 24 },
  v3: { label: 'Verified runs', value: 32 },
} satisfies Record<ArtifactVersion, { label: string; value: number }>;

function artifactSource(version: ArtifactVersion) {
  const { label, value } = ARTIFACT_METRICS[version];
  return `import { useState } from 'react';

export function AgentWorkflow() {
  const [runs, setRuns] = useState(${value});

  return (
    <section>
      <strong>{runs}</strong> ${label}
      <button onClick={() => setRuns(runs + 1)}>
        Record run
      </button>
    </section>
  );
}`;
}

export function ArtifactCanvas({ id = 'artifact-canvas' }: { id?: string } = {}) {
  const { playSound } = useJuice();
  const [view, updateView] = useState<ArtifactView>('preview');
  const [version, updateVersion] = useState<ArtifactVersion>('v2');
  const [recordedRuns, setRecordedRuns] = useState({ v1: 0, v2: 0, v3: 0 });
  const metric = ARTIFACT_METRICS[version];
  const runs = metric.value + recordedRuns[version];

  const setView = (next: ArtifactView) => {
    if (ARTIFACT_VIEWS.some((option) => option.value === next)) updateView(next);
  };
  const setVersion = (next: ArtifactVersion) => {
    if (!ARTIFACT_VERSIONS.includes(next) || next === version) return;
    playSound('tap');
    updateVersion(next);
  };

  useJuiceAgentNode(id, 'ArtifactCanvas', { view, version, runs }, { setView, setVersion });

  return (
    <div id={id} className="j-slab j-ai-card">
      <div className="j-ai-header">
        <span className="j-ai-title"><FileCode2 size={14} aria-hidden="true" /> AgentWorkflow.tsx</span>
        <div role="group" aria-label="Artifact version" style={actions}>
          {ARTIFACT_VERSIONS.map((entry) => (
            <button
              key={entry}
              type="button"
              className="j-ai-pill-btn"
              aria-pressed={version === entry}
              data-active={version === entry}
              onClick={() => setVersion(entry)}
            >
              {entry}
            </button>
          ))}
        </div>
      </div>
      <SegmentedControl options={ARTIFACT_VIEWS} value={view} onChange={setView} />
      {view === 'preview' && (
        <div className="j-ai-surface">
          <span className="j-ai-sub">{metric.label}</span>
          <div style={{ ...inline, justifyContent: 'space-between' }}>
            <strong aria-label={String(runs)} style={{ fontSize: 24 }}>
              <span aria-hidden="true"><RollingNumber value={runs} /></span>
            </strong>
            <button
              type="button"
              className="j-chip"
              onClick={() => {
                playSound('latch');
                setRecordedRuns((previous) => ({ ...previous, [version]: previous[version] + 1 }));
              }}
            >
              <Plus size={12} aria-hidden="true" /> Record run
            </button>
          </div>
        </div>
      )}
      {view === 'code' && (
        <div className="j-ai-mono-box"><pre style={codeBlock}>{artifactSource(version)}</pre></div>
      )}
      {view === 'diff' && (
        <div className="j-ai-grid-2" aria-label="Changes from v1 to v2">
          <div className="j-ai-col">
            <span className="j-ai-sub">v1 · Removed</span>
            <div className="j-ai-mono-box" style={{ padding: 0, color: 'var(--juice-danger)' }}>
              <code>- useState({ARTIFACT_METRICS.v1.value})</code>
              <code>- {ARTIFACT_METRICS.v1.label}</code>
            </div>
          </div>
          <div className="j-ai-col">
            <span className="j-ai-sub">v2 · Added</span>
            <div className="j-ai-mono-box" style={{ padding: 0, color: 'var(--juice-ok)' }}>
              <code>+ useState({ARTIFACT_METRICS.v2.value})</code>
              <code>+ {ARTIFACT_METRICS.v2.label}</code>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

type Memory = { id: string; text: string; pinned: boolean };

const INITIAL_MEMORIES: Memory[] = [
  { id: 'memory-1', text: 'Use concentric 20px -> 14px radii', pinned: true },
  { id: 'memory-2', text: 'Prefer color-mix over 1px borders', pinned: false },
  { id: 'memory-3', text: 'Verify UI with 30s smoke check', pinned: false },
];
const SUGGESTED_MEMORIES = [
  'Reuse Juice primitives for shared interactions',
  'Keep progress visible during long-running tasks',
  'Exercise agent actions during the smoke check',
] as const;

export function AgentMemoryStore({ id = 'agent-memory-store' }: { id?: string } = {}) {
  const { playSound } = useJuice();
  const [memories, setMemories] = useState(INITIAL_MEMORIES);
  const [draft, setDraft] = useState('');
  const nextMemoryId = useRef(INITIAL_MEMORIES.length + 1);
  const orderedMemories = [...memories].sort((a, b) => Number(b.pinned) - Number(a.pinned));

  const addMemory = (text?: string) => {
    const next = nextMemoryId.current++;
    const suggestion = SUGGESTED_MEMORIES[(next - INITIAL_MEMORIES.length - 1) % SUGGESTED_MEMORIES.length];
    const entry = {
      id: `memory-${next}`,
      text: (typeof text === 'string' && text.trim()) || suggestion || SUGGESTED_MEMORIES[0],
      pinned: false,
    };
    playSound('pop');
    setMemories((previous) => [...previous, entry]);
  };
  const togglePin = (memoryId: string) => {
    playSound('latch');
    setMemories((previous) => previous.map((memory) => (
      memory.id === memoryId ? { ...memory, pinned: !memory.pinned } : memory
    )));
  };
  const removeMemory = (memoryId: string) => {
    playSound('drop');
    setMemories((previous) => previous.filter((memory) => memory.id !== memoryId));
  };
  const resetMemories = () => {
    playSound('tap');
    nextMemoryId.current = INITIAL_MEMORIES.length + 1;
    setMemories(INITIAL_MEMORIES);
    setDraft('');
  };

  useJuiceAgentNode(id, 'AgentMemoryStore', { memories: orderedMemories }, {
    addMemory, removeMemory, resetMemories,
  });

  return (
    <div id={id} className="j-slab j-ai-card">
      <div className="j-ai-header">
        <span className="j-ai-title"><Bookmark size={14} aria-hidden="true" /> Agent Memory</span>
        <Badge>{memories.filter((memory) => memory.pinned).length} pinned</Badge>
      </div>
      {orderedMemories.map((memory) => (
        <div key={memory.id} className="j-ai-row">
          <span style={{ overflowWrap: 'anywhere' }}>{memory.text}</span>
          <div style={inline}>
            <button
              type="button"
              className="j-ai-pill-btn"
              aria-label={`Pin ${memory.text}`}
              aria-pressed={memory.pinned}
              data-active={memory.pinned}
              onClick={() => togglePin(memory.id)}
              style={{ padding: '0 6px' }}
            >
              <Bookmark size={12} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="j-ai-pill-btn"
              aria-label={`Delete ${memory.text}`}
              onClick={() => removeMemory(memory.id)}
              style={{ padding: '0 6px' }}
            >
              <Trash2 size={12} aria-hidden="true" />
            </button>
          </div>
        </div>
      ))}
      {memories.length === 0 && <div className="j-ai-surface j-ai-sub">No saved rules.</div>}
      <form
        style={{ display: 'grid', gap: 6 }}
        onSubmit={(event) => {
          event.preventDefault();
          addMemory(draft);
          setDraft('');
        }}
      >
        <input
          type="text"
          className="j-ai-row"
          aria-label="New memory rule"
          placeholder="Write a rule"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          style={{ border: 0, color: 'inherit', fontFamily: 'inherit' }}
        />
        <div style={actions}>
          <button type="submit" className="j-ai-pill-btn">
            <Plus size={13} aria-hidden="true" /> Remember Rule
            {draft.trim() && <Kbd aria-hidden="true">Enter</Kbd>}
          </button>
          <button type="button" className="j-ai-pill-btn" onClick={resetMemories}>Reset</button>
        </div>
      </form>
    </div>
  );
}

type TerminalStatus = 'running' | 'passed' | 'failed';
const TEST_COMMAND = 'pnpm --filter @juice-ui/vue test';
const TEST_DURATION_MS = 118;

export function TerminalStreamCard({ id = 'terminal-stream-card' }: { id?: string } = {}) {
  const { animate, playSound } = useJuice();
  const [run, setRun] = useState<{ status: TerminalStatus; attempt: number }>({ status: 'running', attempt: 0 });
  const { status, attempt } = run;
  const exitCode = status === 'running' ? null : status === 'passed' ? 0 : 1;

  useEffect(() => {
    if (run.status !== 'running' || run.attempt === 0) return;
    const timer = setTimeout(() => {
      setRun((previous) => previous === run ? { ...previous, status: 'passed' } : previous);
    }, TEST_DURATION_MS);
    return () => clearTimeout(timer);
  }, [run]);

  const runPass = () => {
    playSound('landed');
    setRun((previous) => ({ ...previous, status: 'passed' }));
  };
  const runFail = () => {
    playSound('deny');
    setRun((previous) => ({ ...previous, status: 'failed' }));
  };
  const rerun = () => {
    playSound('tap');
    setRun((previous) => ({ status: animate ? 'running' : 'passed', attempt: previous.attempt + 1 }));
  };

  const lines = [
    attempt > 0 ? '› Applied the fixture fix. Rerunning tests…' : '› Starting Vue adapter tests…',
    '› Running agent bridge checks…',
  ];
  if (status === 'passed') lines.push('✓ 8 tests passed');
  if (status === 'failed') lines.push('✕ 1 failed · 7 passed — fixture mismatch');

  useJuiceAgentNode(id, 'TerminalStreamCard', { status, command: TEST_COMMAND, exitCode, attempt, lines }, {
    runPass, runFail, rerun,
  });

  return (
    <div id={id} className="j-slab j-ai-card">
      <div className="j-ai-header">
        <span className="j-ai-title"><Terminal size={14} aria-hidden="true" /> Terminal Stream</span>
        {exitCode === null ? (
          <span className="j-ai-sub" style={inline}>
            <span className="j-status-dot" data-pulse="true" aria-hidden="true" />
            <span className="j-text-shimmer">Running</span>
          </span>
        ) : (
          <span style={inline}>
            <Badge tone={exitCode === 0 ? 'ok' : 'danger'}>exit {exitCode}</Badge>
            <Badge>{TEST_DURATION_MS}ms</Badge>
          </span>
        )}
      </div>
      <div className="j-ai-mono-box" role="log">
        <strong>$ {TEST_COMMAND}</strong>
        {lines.map((line) => <span key={line}>{line}</span>)}
      </div>
      <div style={actions}>
        <button type="button" className="j-ai-pill-btn" onClick={runPass}>Pass</button>
        <button type="button" className="j-ai-pill-btn" onClick={runFail}>Fail (Exit 1)</button>
        <button type="button" className="j-ai-pill-btn" onClick={rerun}>
          <RefreshCw size={12} aria-hidden="true" /> Auto-Fix &amp; Rerun
        </button>
      </div>
    </div>
  );
}

const RATE_LIMIT_SECONDS = 30;
const LIMITED_MODEL = 'Claude 4.6 Opus';
const FALLBACK_MODEL = 'Gemini 4 Carbon';

function startRateLimit() {
  return { deadline: Date.now() + RATE_LIMIT_SECONDS * 1000, secondsRemaining: RATE_LIMIT_SECONDS };
}

export function RateLimitBanner({ id = 'rate-limit-banner' }: { id?: string } = {}) {
  const { playSound } = useJuice();
  const [{ deadline, secondsRemaining }, setLimit] = useState<{
    deadline: number | null;
    secondsRemaining: number;
  }>(startRateLimit);
  const status = deadline === null ? 'recovered' : 'limited';
  const model = status === 'recovered' ? FALLBACK_MODEL : LIMITED_MODEL;

  useEffect(() => {
    if (deadline === null) return;
    const timer = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setLimit((previous) => previous.deadline !== deadline || previous.secondsRemaining === remaining
        ? previous
        : { deadline: remaining === 0 ? null : deadline, secondsRemaining: remaining });
    }, 250);
    return () => clearInterval(timer);
  }, [deadline]);

  const triggerFallback = () => {
    if (deadline === null) return;
    playSound('paid');
    setLimit({ deadline: null, secondsRemaining: 0 });
  };
  const resetLimit = () => {
    playSound('tap');
    setLimit(startRateLimit());
  };

  useJuiceAgentNode(id, 'RateLimitBanner', { status, model, secondsRemaining }, {
    triggerFallback, resetLimit,
  });

  return (
    <div id={id} className="j-slab j-ai-card">
      <div className="j-ai-header">
        <span className="j-ai-title"><Clock size={14} aria-hidden="true" /> Model Fallback</span>
        <Badge tone={status === 'limited' ? 'warn' : 'neutral'}>
          {status === 'limited' ? '429 Rate Limit' : 'Recovered'}
        </Badge>
      </div>
      <div className="j-ai-surface">
        <strong className="j-ai-title" role="status">{model}</strong>
        {status === 'limited' && (
          <span className="j-ai-sub" role="timer" aria-label={`${secondsRemaining} seconds until fallback`}>
            <span aria-hidden="true">Automatic fallback in <RollingNumber value={secondsRemaining} suffix="s" /></span>
          </span>
        )}
      </div>
      <div style={actions}>
        {status === 'limited' ? (
          <button type="button" className="j-ai-pill-btn" data-primary="true" onClick={triggerFallback}>
            <ChevronRight size={13} aria-hidden="true" /> Fallback to Gemini 4 Carbon
          </button>
        ) : (
          <button type="button" className="j-ai-pill-btn" onClick={resetLimit}>
            <Undo2 size={13} aria-hidden="true" /> Reset Limit
          </button>
        )}
      </div>
    </div>
  );
}

const MCP_SERVERS = [
  { name: 'github-mcp', tools: 14, latency: 12 },
  { name: 'cloudflare-workers', tools: 9, latency: 12 },
  { name: 'ego-browser', tools: 11, latency: 12 },
] as const;

const MCP_SERVER_NAMES = MCP_SERVERS.map((server) => server.name);

export function McpServerRoster({ id = 'mcp-server-roster' }: { id?: string } = {}) {
  const { playSound } = useJuice();
  const [enabledServers, setEnabledServers] = useState<readonly string[]>(MCP_SERVER_NAMES);
  const servers = MCP_SERVERS.map((server) => ({ ...server, enabled: enabledServers.includes(server.name) }));
  const activeTools = servers.reduce((total, server) => total + (server.enabled ? server.tools : 0), 0);

  const setServerEnabled = (name: string, enabled: boolean) => {
    setEnabledServers((previous) => {
      const withoutServer = previous.filter((entry) => entry !== name);
      return enabled ? [...withoutServer, name] : withoutServer;
    });
  };
  const toggleServer = (name: string) => {
    if (!MCP_SERVERS.some((server) => server.name === name)) return;
    playSound('latch');
    setEnabledServers((previous) => previous.includes(name)
      ? previous.filter((entry) => entry !== name)
      : [...previous, name]);
  };
  const enableAll = () => {
    playSound('latch');
    setEnabledServers(MCP_SERVER_NAMES);
  };

  useJuiceAgentNode(id, 'McpServerRoster', { servers, activeTools }, { toggleServer, enableAll });

  return (
    <div id={id} className="j-slab j-ai-card">
      <div className="j-ai-header">
        <span className="j-ai-title"><Server size={14} aria-hidden="true" /> MCP Servers</span>
        <Badge aria-label={`${activeTools} active tools`}>
          <span aria-hidden="true"><RollingNumber value={activeTools} /> active tools</span>
        </Badge>
      </div>
      {servers.map((server) => (
        <div key={server.name} className="j-ai-row">
          <span style={inline}>
            <span className="j-status-dot" data-tone={server.enabled ? 'ok' : undefined} aria-hidden="true" />
            <span>
              <strong>{server.name}</strong>
              <span className="j-ai-sub" style={{ display: 'block' }}>{server.tools} tools</span>
            </span>
          </span>
          <span style={inline}>
            <Badge>{server.enabled ? `${server.latency}ms` : 'Off'}</Badge>
            <Switch
              checked={server.enabled}
              onChange={(checked) => setServerEnabled(server.name, checked)}
              aria-label={server.name}
            />
          </span>
        </div>
      ))}
      {enabledServers.length < MCP_SERVERS.length && (
        <div style={actions}>
          <button type="button" className="j-ai-pill-btn" onClick={enableAll}>Enable All</button>
        </div>
      )}
    </div>
  );
}
