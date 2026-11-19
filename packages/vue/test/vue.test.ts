import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRenderer, createSSRApp, defineComponent, h, nextTick, ref } from 'vue';
import { renderToString } from 'vue/server-renderer';
import type { JuiceAgentBridge } from '@tokenroll/juice/core';

let juice: typeof import('../src/index.ts');
const browser: { __juiceAgent?: JuiceAgentBridge } = {};

beforeAll(async () => {
  vi.stubGlobal('window', browser);
  try {
    juice = await import('../src/index.ts');
  } finally {
    vi.unstubAllGlobals();
  }
});

afterAll(() => vi.unstubAllGlobals());

describe('@juice-ui/vue SSR', () => {
  it('renders provider tokens, concentric blocks and the React odometer structure', async () => {
    const { JProvider, JStateButton, JScrubPanel, JRollingNumber, JComposer,
      JToolApprovalGate, JGroundedAnswer, JSubagentSwarmBoard } = juice;

    const html = await renderToString(createSSRApp({
      render: () => h(JProvider, { theme: 'light', fill: 'solid', animate: false }, () => [
        h(JStateButton, { id: 'ssr-transfer', stage: 'confirming', amount: 12.5 }),
        h(JScrubPanel, { tension: 60, snapGrid: false }),
        h(JRollingNumber, { value: -1234.5, prefix: '$', decimals: 2, suffix: ' USD' }),
        h(JComposer, { modelValue: '<draft>', model: 'Codex' }),
        h(JToolApprovalGate, { status: 'denied', tool: 'search.docs', command: 'index <draft>' }),
        h(JGroundedAnswer, { activeCitation: 2 }),
        h(JSubagentSwarmBoard, { allDone: true }),
      ]),
    }));

    expect(html).toContain('class="juice-root" data-theme="light" data-fill="dark" data-tone="solid" data-animate="off"');
    expect(html).toContain('class="j-slab j-state-card" data-state="confirming"');
    expect(html).toContain('j-slab j-scrub-panel');
    expect(html).toContain('aria-valuenow="60"');
    expect(html).toContain('data-checked="false"');
    expect(html).toContain('aria-label="$-1,234.50 USD"');
    expect(html).toMatch(/class="j-rolling-digit-col"[^>]*><span class="j-rolling-digit-ribbon" style="transform:translateY\(-10%\);"><span>0<\/span><span>1<\/span>/);
    expect(html).toContain('j-slab j-composer');
    expect(html).toContain('&lt;draft&gt;');
    expect(html).toContain('Codex');
    expect(html).toContain('class="j-slab j-ai-card" data-state="denied"');
    expect(html).toContain('index &lt;draft&gt;');
    expect(html).toContain('data-citation="2"');
    expect(html).toContain('ui-sdk.dev/behaviors');
    expect(html).toContain('class="j-slab j-ai-card" data-state="done"');
    expect(html).toContain('3 completed');
    expect(browser.__juiceAgent?.query('ssr-transfer')).toEqual([]);
  });

  it('renders the remaining tactile and agent primitives', async () => {
    const { JBadge, JKbd, JSwitch, JSegmentedControl, JSlideConfirm, JDynamicIsland,
      JMorphCard, JToastStack, JThinkingMorph, JContextBudgetMeter } = juice;
    const html = await renderToString(createSSRApp({
      render: () => h('main', [
        h(JBadge, { tone: 'signal' }, () => 'Live'),
        h(JKbd, null, () => 'Enter'),
        h(JSwitch, { defaultChecked: true }),
        h(JSegmentedControl, { options: [{ value: 'one', label: 'One' }] }),
        h(JSlideConfirm, { confirmed: true }),
        h(JDynamicIsland, { mode: 'expanded' }),
        h(JMorphCard, { opened: true }),
        h(JToastStack),
        h(JThinkingMorph, { step: 1 }),
        h(JContextBudgetMeter, { compacted: true }),
      ]),
    }));

    for (const name of ['j-badge', 'j-kbd', 'j-switch', 'j-seg', 'j-slide-wrap',
      'j-island-stage', 'j-morph-card', 'j-toast-stage', 'j-thinking-card', 'j-ai-stack-bar']) {
      expect(html).toContain(name);
    }
    expect(html).toContain('data-checked="true"');
    expect(html).toContain('data-confirmed="true"');
    expect(html).toContain('data-mode="expanded"');
    expect(html).toContain('data-opened="true"');
    expect(html).toContain('data-step="1"');
    expect(html).toContain('aria-valuenow="42"');
  });
});

type HostNode = {
  parent: HostNode | null;
  children: HostNode[];
};

function hostNode(): HostNode {
  return { parent: null, children: [] };
}

// A minimal Vue renderer exercises mount, reactive props and unmount in Node.
const renderer = createRenderer<HostNode, HostNode>({
  createElement: hostNode,
  createText: hostNode,
  createComment: hostNode,
  setText() {},
  setElementText() {},
  patchProp() {},
  parentNode: node => node.parent,
  nextSibling: node => node.parent?.children[node.parent.children.indexOf(node) + 1] ?? null,
  insert(node, parent, anchor = null) {
    node.parent = parent;
    const index = anchor ? parent.children.indexOf(anchor) : parent.children.length;
    parent.children.splice(index, 0, node);
  },
  remove(node) {
    if (!node.parent) return;
    node.parent.children.splice(node.parent.children.indexOf(node), 1);
    node.parent = null;
  },
});

describe('@juice-ui/vue Agent Bridge', () => {
  function bridge() {
    const installed = browser.__juiceAgent;
    if (!installed) throw new Error('Juice did not install the Agent Bridge');
    return installed;
  }

  it('re-exports the shared bridge and sound runtime', async () => {
    const react = await import('@tokenroll/juice');
    expect(juice.JUICE_SOUND_CATALOG).toBe(react.JUICE_SOUND_CATALOG);
    expect(juice.playJuiceSound).toBe(react.playJuiceSound);
    expect(juice.registerJuiceAgentNode).toBe(react.registerJuiceAgentNode);

    let count = 0;
    const unregister = juice.registerJuiceAgentNode({
      id: 'external', type: 'Counter',
      getState: () => ({ count }),
      act(action, payload) {
        if (action !== 'add' || typeof payload !== 'number') return false;
        count += payload;
        return true;
      },
    });
    try {
      expect(bridge().act('external', 'add', 2)).toBe(true);
      expect(bridge().snapshot().external).toEqual({ type: 'Counter', state: { count: 2 } });
      expect(bridge().act('external', 'missing')).toBe(false);
    } finally {
      unregister();
    }
    expect(bridge().query('external')).toEqual([]);
  });

  it('drives Vue state and emits controlled updates, then unregisters on ID change and unmount', async () => {
    const { JSwitch, JComposer, JToolApprovalGate, JGroundedAnswer,
      JContextBudgetMeter, JSubagentSwarmBoard, useJuiceAgentNode } = juice;
    const checked = ref(false);
    const nodeId = ref<string | undefined>('vue-switch');
    const sent = vi.fn();
    const host = renderer.createApp(defineComponent({
      setup() {
        const calls = ref(0);
        useJuiceAgentNode('vue-counter', 'Counter', () => ({ calls: calls.value }), {
          increment: () => { calls.value++; },
        });
        return () => h('main', [
          h(JSwitch, {
            id: nodeId.value, modelValue: checked.value,
            'onUpdate:modelValue': (value: boolean) => { checked.value = value; },
          }),
          h(JComposer, { id: 'vue-composer', onSend: sent }),
          h(JToolApprovalGate, { id: 'vue-gate' }),
          h(JGroundedAnswer, { id: 'vue-answer' }),
          h(JContextBudgetMeter, { id: 'vue-budget' }),
          h(JSubagentSwarmBoard, { id: 'vue-swarm' }),
        ]);
      },
    }));

    host.mount(hostNode());
    try {
      const agent = bridge();
      expect(agent.act('vue-switch', 'toggle')).toBe(true);
      expect(checked.value).toBe(true);
      await nextTick();
      expect(agent.query('Switch')).toEqual([{ id: 'vue-switch', type: 'Switch', state: { checked: true } }]);
      expect(agent.act('vue-counter', 'constructor')).toBe(false);
      expect(agent.act('vue-counter', 'increment')).toBe(true);
      expect(agent.snapshot()['vue-counter']?.state.calls).toBe(1);

      expect(agent.act('vue-composer', 'submit')).toBe(true);
      expect(sent).not.toHaveBeenCalled();
      expect(agent.act('vue-composer', 'type', 'Check token contrast')).toBe(true);
      expect(agent.act('vue-composer', 'cycleModel')).toBe(true);
      expect(agent.act('vue-composer', 'submit')).toBe(true);
      expect(sent).toHaveBeenCalledExactlyOnceWith('Check token contrast');
      expect(agent.snapshot()['vue-composer']?.state).toEqual({
        text: 'Check token contrast', model: 'Gemini 4', sentCount: 1,
      });

      expect(agent.act('vue-gate', 'approve')).toBe(true);
      expect(agent.act('vue-answer', 'selectCitation', 3)).toBe(true);
      expect(agent.act('vue-budget', 'compact')).toBe(true);
      expect(agent.act('vue-swarm', 'completeAll')).toBe(true);
      const state = agent.snapshot();
      expect(state['vue-gate']?.state.status).toBe('approved');
      expect(state['vue-answer']?.state.activeCitation).toBe(3);
      expect(state['vue-budget']?.state.used).toBe(42);
      expect(state['vue-swarm']?.state.allDone).toBe(true);

      nodeId.value = 'vue-switch-renamed';
      await nextTick();
      expect(agent.act('vue-switch', 'toggle')).toBe(false);
      expect(agent.query('vue-switch-renamed')[0]?.state.checked).toBe(true);
    } finally {
      host.unmount();
    }
    expect(bridge().query()).toEqual([]);
  });

  it('settles a pending transfer and cancels stale timers on reset', async () => {
    const host = renderer.createApp({ render: () => h(juice.JStateButton, { id: 'vue-transfer' }) });
    vi.useFakeTimers();
    host.mount(hostNode());
    try {
      const agent = bridge();
      const stage = () => agent.snapshot()['vue-transfer']?.state.stage;
      expect(agent.act('vue-transfer', 'press')).toBe(true);
      expect(stage()).toBe('confirming');
      expect(agent.act('vue-transfer', 'press')).toBe(true);
      expect(stage()).toBe('pending');
      await vi.advanceTimersByTimeAsync(650);
      expect(stage()).toBe('success');
      agent.act('vue-transfer', 'reset');
      agent.act('vue-transfer', 'press');
      agent.act('vue-transfer', 'press');
      agent.act('vue-transfer', 'reset');
      await vi.advanceTimersByTimeAsync(650);
      expect(stage()).toBe('idle');
    } finally {
      host.unmount();
      vi.useRealTimers();
    }
    expect(bridge().query('vue-transfer')).toEqual([]);
  });
});
