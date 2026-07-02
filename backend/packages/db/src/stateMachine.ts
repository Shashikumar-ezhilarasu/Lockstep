export const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  queued: ['claimed', 'cancelled'],
  scheduled: ['claimed', 'cancelled'],
  claimed: ['running', 'failed'], // Failed can happen if it crashes immediately
  running: ['completed', 'failed'],
  failed: ['scheduled', 'dead_letter'],
  dead_letter: ['queued'],
  completed: [],
  cancelled: [],
};

export function assertValidTransition(from: string, to: string) {
  const allowed = ALLOWED_TRANSITIONS[from];
  if (!allowed) {
    throw new Error(`Invalid original state: ${from}`);
  }
  if (!allowed.includes(to)) {
    throw new Error(`Invalid state transition: ${from} -> ${to}`);
  }
}
