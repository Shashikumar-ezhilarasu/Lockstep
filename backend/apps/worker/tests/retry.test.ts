import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { calculateRetryDelay } from '../src/retry';

describe('calculateRetryDelay', () => {
  beforeEach(() => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5); // Fixed random for predictable jitter
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calculates fixed delay', () => {
    const delay = calculateRetryDelay('fixed', 1000, 2);
    // delay = 1000, jitter = 1000 * 0.1 * (1 - 1) = 0 because 0.5 * 2 - 1 = 0
    expect(delay).toBe(1000);
  });

  it('calculates linear delay', () => {
    const delay = calculateRetryDelay('linear', 1000, 3);
    // 1000 * 3 = 3000
    expect(delay).toBe(3000);
  });

  it('calculates exponential delay', () => {
    const delay1 = calculateRetryDelay('exponential', 1000, 1, 2); // 1000 * 2^0 = 1000
    const delay2 = calculateRetryDelay('exponential', 1000, 2, 2); // 1000 * 2^1 = 2000
    const delay3 = calculateRetryDelay('exponential', 1000, 3, 2); // 1000 * 2^2 = 4000
    
    expect(delay1).toBe(1000);
    expect(delay2).toBe(2000);
    expect(delay3).toBe(4000);
  });

  it('respects maxDelayMs', () => {
    const delay = calculateRetryDelay('exponential', 1000, 10, 2, 10000); 
    // 1000 * 2^9 = 512,000, capped at 10000
    expect(delay).toBe(10000);
  });
});
