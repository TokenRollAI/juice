/**
 * Juice Procedural Sound Synthesizer (Zero-Asset Web Audio API)
 * Inspired by Bencho's procedural oscillator & filtered-noise recipes.
 * Zero external audio files; < 3KB footprint; deterministic and instant.
 */

export type JuiceSoundName =
  | 'tap'
  | 'latch'
  | 'pop'
  | 'scrub'
  | 'paid'
  | 'landed'
  | 'deny'
  | 'lift'
  | 'drop'
  | 'swipe'
  | 'chime'
  | 'tick';

type ToneLayer = {
  hz: number;
  to?: number;
  ms: number;
  gain: number;
  wave?: OscillatorType;
  cut?: number;
  atk?: number;
  at?: number;
  noise?: 'lowpass' | 'bandpass';
};

export const JUICE_SOUND_CATALOG: Record<
  JuiceSoundName,
  { label: string; category: 'Tactile' | 'State' | 'Motion'; layers: ToneLayer[] }
> = {
  tap: {
    label: 'Tap',
    category: 'Tactile',
    layers: [{ hz: 196, to: 130, ms: 95, gain: 0.065, wave: 'sine', cut: 900, atk: 3 }],
  },
  latch: {
    label: 'Latch',
    category: 'Tactile',
    layers: [
      { hz: 265, ms: 58, gain: 0.05, wave: 'square', cut: 2200, atk: 4 },
      { hz: 530, ms: 42, gain: 0.024, wave: 'triangle', cut: 2600, atk: 3, at: 22 },
    ],
  },
  pop: {
    label: 'Pop',
    category: 'Motion',
    layers: [
      { hz: 520, to: 880, ms: 42, gain: 0.052, wave: 'sine', atk: 2 },
      { hz: 980, to: 640, ms: 24, gain: 0.018, wave: 'sine', atk: 2, at: 14 },
    ],
  },
  scrub: {
    label: 'Scrub',
    category: 'Tactile',
    layers: [{ hz: 410, to: 280, ms: 22, gain: 0.042, wave: 'triangle', cut: 1400, atk: 2 }],
  },
  tick: {
    label: 'Tick',
    category: 'Tactile',
    layers: [{ hz: 680, to: 420, ms: 16, gain: 0.035, wave: 'sine', cut: 1800, atk: 1 }],
  },
  paid: {
    label: 'Paid',
    category: 'State',
    layers: [
      { hz: 587.33, ms: 170, gain: 0.052, wave: 'sine', cut: 2600, atk: 5 },
      { hz: 880, ms: 440, gain: 0.048, wave: 'sine', cut: 2800, atk: 6, at: 92 },
      { hz: 1760, ms: 280, gain: 0.011, wave: 'sine', atk: 8, at: 98 },
    ],
  },
  landed: {
    label: 'Landed',
    category: 'State',
    layers: [
      { hz: 330, to: 620, ms: 110, gain: 0.02, wave: 'triangle', cut: 1400, atk: 20 },
      { hz: 784, ms: 120, gain: 0.042, wave: 'sine', cut: 2600, atk: 4, at: 65 },
      { hz: 1046.5, ms: 130, gain: 0.042, wave: 'sine', cut: 2800, atk: 4, at: 130 },
      { hz: 1318.5, ms: 480, gain: 0.045, wave: 'sine', cut: 3000, atk: 5, at: 195 },
    ],
  },
  deny: {
    label: 'Deny',
    category: 'State',
    layers: [
      { hz: 210, to: 162, ms: 105, gain: 0.045, wave: 'triangle', cut: 540, atk: 6 },
      { hz: 168, to: 124, ms: 135, gain: 0.048, wave: 'triangle', cut: 480, atk: 6, at: 95 },
    ],
  },
  lift: {
    label: 'Lift',
    category: 'Motion',
    layers: [{ hz: 540, to: 690, ms: 44, gain: 0.032, wave: 'sine', atk: 4 }],
  },
  drop: {
    label: 'Drop',
    category: 'Motion',
    layers: [{ hz: 330, to: 220, ms: 82, gain: 0.038, wave: 'sine', cut: 760, atk: 6 }],
  },
  swipe: {
    label: 'Swipe',
    category: 'Motion',
    layers: [
      { hz: 380, to: 190, ms: 150, gain: 0.036, wave: 'sine', cut: 820, atk: 24 },
      { hz: 1200, to: 600, ms: 90, gain: 0.014, noise: 'bandpass', atk: 12 },
    ],
  },
  chime: {
    label: 'Chime',
    category: 'State',
    layers: [
      { hz: 659.25, ms: 240, gain: 0.04, wave: 'sine', atk: 5 },
      { hz: 987.77, ms: 380, gain: 0.038, wave: 'sine', atk: 6, at: 75 },
    ],
  },
};

let audioCtx: AudioContext | null = null;
let noiseBuffer: AudioBuffer | null = null;
let globalSoundEnabled = true;
const listeners = new Set<() => void>();

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    try {
      audioCtx = new Ctor();
    } catch {
      return null;
    }
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

function getNoiseBuffer(ctx: AudioContext): AudioBuffer {
  if (!noiseBuffer) {
    noiseBuffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.5), ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
  }
  return noiseBuffer;
}

export function isJuiceSoundEnabled(): boolean {
  return globalSoundEnabled;
}

export function setJuiceSoundEnabled(enabled: boolean): void {
  globalSoundEnabled = enabled;
  listeners.forEach((fn) => fn());
}

export function subscribeJuiceSound(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function playJuiceSound(name: JuiceSoundName, force = false): void {
  if (!globalSoundEnabled && !force) return;
  const spec = JUICE_SOUND_CATALOG[name];
  if (!spec) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const baseNow = ctx.currentTime;
  for (const layer of spec.layers) {
    const start = baseNow + (layer.at ?? 0) / 1000;
    const dur = Math.max(0.01, layer.ms / 1000);
    const atk = Math.min(dur * 0.45, Math.max(0.001, (layer.atk ?? 3) / 1000));

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0.0001, start);
    gainNode.gain.linearRampToValueAtTime(layer.gain, start + atk);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, start + dur);

    let lastNode: AudioNode = gainNode;

    if (layer.cut || layer.noise) {
      const filter = ctx.createBiquadFilter();
      filter.type = layer.noise ?? 'lowpass';
      filter.frequency.setValueAtTime(layer.cut ?? layer.hz, start);
      if (layer.to && layer.noise) {
        filter.frequency.exponentialRampToValueAtTime(Math.max(40, layer.to), start + dur);
      }
      filter. connect(gainNode);
      lastNode = filter;
    }

    gainNode.connect(ctx.destination);

    if (layer.noise) {
      const src = ctx.createBufferSource();
      src.buffer = getNoiseBuffer(ctx);
      src.connect(lastNode);
      src.start(start);
      src.stop(start + dur + 0.01);
    } else {
      const osc = ctx.createOscillator();
      osc.type = layer.wave ?? 'sine';
      osc.frequency.setValueAtTime(layer.hz, start);
      if (layer.to !== undefined && layer.to > 0) {
        osc.frequency.exponentialRampToValueAtTime(layer.to, start + dur);
      }
      osc.connect(lastNode);
      osc.start(start);
      osc.stop(start + dur + 0.01);
    }
  }
}
