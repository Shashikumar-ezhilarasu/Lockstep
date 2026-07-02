import { describe, it, expect } from 'vitest';
import { assertValidTransition } from 'db';

describe('Job State Machine Guard', () => {
  it('allows valid transitions', () => {
    expect(() => assertValidTransition('queued', 'claimed')).not.toThrow();
    expect(() => assertValidTransition('claimed', 'running')).not.toThrow();
    expect(() => assertValidTransition('running', 'completed')).not.toThrow();
    expect(() => assertValidTransition('dead_letter', 'queued')).not.toThrow();
  });

  it('rejects invalid transitions', () => {
    expect(() => assertValidTransition('queued', 'completed')).toThrowError('Invalid state transition: queued -> completed');
    expect(() => assertValidTransition('completed', 'failed')).toThrowError('Invalid state transition: completed -> failed');
    expect(() => assertValidTransition('dead_letter', 'running')).toThrowError('Invalid state transition: dead_letter -> running');
  });

  it('rejects invalid original states', () => {
    expect(() => assertValidTransition('unknown_state', 'queued')).toThrowError('Invalid original state: unknown_state');
  });
});
