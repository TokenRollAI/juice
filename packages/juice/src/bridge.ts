export type JuiceTheme = 'light' | 'dark';
export type JuiceFill = 'slab' | 'solid';

export type JuiceAgentNodeEntry = {
  id: string;
  type: string;
  getState: () => Record<string, unknown>;
  act: (action: string, payload?: unknown) => boolean;
};

export type JuiceAgentBridge = {
  snapshot: () => Record<string, { type: string; state: Record<string, unknown> }>;
  query: (typeOrId?: string) => Array<{ id: string; type: string; state: Record<string, unknown> }>;
  act: (id: string, action: string, payload?: unknown) => boolean;
};

const agentRegistry = new Map<string, JuiceAgentNodeEntry>();

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

export function ensureJuiceAgentBridge(): JuiceAgentBridge | null {
  if (typeof window === 'undefined') return null;
  const host = window as unknown as { __juiceAgent?: JuiceAgentBridge };
  if (!host.__juiceAgent) {
    host.__juiceAgent = bridge;
  }
  return host.__juiceAgent;
}

ensureJuiceAgentBridge();

export function registerJuiceAgentNode(entry: JuiceAgentNodeEntry): () => void {
  ensureJuiceAgentBridge();
  agentRegistry.set(entry.id, entry);
  return () => {
    agentRegistry.delete(entry.id);
  };
}

export function unregisterJuiceAgentNode(id: string): void {
  agentRegistry.delete(id);
}
