import { describe, expect, it } from 'vitest';
import {
  JUICE_SOUND_CATALOG,
  isJuiceSoundEnabled,
  setJuiceSoundEnabled,
} from '../src/sound.ts';

describe('@tokenroll/juice procedural sound & catalog', () => {
  it('defines 12 zero-asset procedural sounds with valid frequencies', () => {
    const names = Object.keys(JUICE_SOUND_CATALOG);
    expect(names.length).toBe(12);
    for (const spec of Object.values(JUICE_SOUND_CATALOG)) {
      expect(spec.layers.length).toBeGreaterThan(0);
      expect(spec.layers[0]!.hz).toBeGreaterThan(40);
    }
  });

  it('toggles global sound state cleanly', () => {
    expect(isJuiceSoundEnabled()).toBe(true);
    setJuiceSoundEnabled(false);
    expect(isJuiceSoundEnabled()).toBe(false);
    setJuiceSoundEnabled(true);
    expect(isJuiceSoundEnabled()).toBe(true);
  });
});
