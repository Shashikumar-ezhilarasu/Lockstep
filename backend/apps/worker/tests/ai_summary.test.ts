import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateFailureSummary } from '../src/ai';

const originalEnv = process.env;

describe('generateFailureSummary', () => {
  beforeEach(() => {
    process.env = { ...originalEnv, GEMINI_API_KEY: 'test-key' };
    vi.useFakeTimers();
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it('returns null if GEMINI_API_KEY is missing', async () => {
    delete process.env.GEMINI_API_KEY;
    const summary = await generateFailureSummary({}, new Error('test'), 'test_queue', 1);
    expect(summary).toBeNull();
  });

  it('returns the parsed summary on successful API call', async () => {
    const mockResponse = {
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: 'The database connection failed. Check your connection string.' }] } }]
      })
    };
    global.fetch = vi.fn().mockResolvedValue(mockResponse);

    const summary = await generateFailureSummary({}, new Error('db error'), 'test_queue', 1);
    expect(summary).toBe('The database connection failed. Check your connection string.');
  });

  it('returns null and does not throw on API failure (e.g. 500 error)', async () => {
    const mockResponse = {
      ok: false,
      status: 500,
      text: async () => 'Internal Server Error'
    };
    global.fetch = vi.fn().mockResolvedValue(mockResponse);

    const summary = await generateFailureSummary({}, new Error('test'), 'test_queue', 1);
    expect(summary).toBeNull();
  });

  it('returns null and does not throw on network error', async () => {
    global.fetch = vi.fn().mockRejectedValue(new TypeError('fetch failed'));

    const summary = await generateFailureSummary({}, new Error('test'), 'test_queue', 1);
    expect(summary).toBeNull();
  });

  it('returns null and does not throw if API times out', async () => {
    // Mock fetch to simulate a hang that respects AbortSignal
    global.fetch = vi.fn().mockImplementation((url, options) => {
      return new Promise((resolve, reject) => {
        const timer = setTimeout(resolve, 10000);
        if (options?.signal) {
          options.signal.addEventListener('abort', () => {
            clearTimeout(timer);
            reject(new Error('AbortError'));
          });
        }
      });
    });

    const promise = generateFailureSummary({}, new Error('test'), 'test_queue', 1);
    
    // Fast forward past the 8-second timeout
    await vi.advanceTimersByTimeAsync(8500);

    const summary = await promise;
    expect(summary).toBeNull();
  });
});
