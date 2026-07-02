export function calculateRetryDelay(
  strategy: 'fixed' | 'linear' | 'exponential',
  baseDelayMs: number,
  attempt: number,
  multiplier?: number,
  maxDelayMs?: number
): number {
  let delay = baseDelayMs;

  if (strategy === 'linear') {
    delay = baseDelayMs * attempt;
  } else if (strategy === 'exponential') {
    const p = multiplier || 2;
    delay = baseDelayMs * Math.pow(p, attempt - 1);
  }

  if (maxDelayMs && delay > maxDelayMs) {
    delay = maxDelayMs;
  }

  // Add small jitter (e.g., +/- 10%)
  const jitter = delay * 0.1 * (Math.random() * 2 - 1);
  return Math.max(0, Math.floor(delay + jitter));
}
