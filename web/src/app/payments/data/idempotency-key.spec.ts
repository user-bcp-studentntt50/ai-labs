import { describe, expect, it } from 'vitest';
import { newIdempotencyKey } from './idempotency-key';

describe('newIdempotencyKey', () => {
  it('generates a non-empty key within the 1-200 character range required by the contract', () => {
    const key = newIdempotencyKey();
    expect(key.length).toBeGreaterThanOrEqual(1);
    expect(key.length).toBeLessThanOrEqual(200);
  });

  it('generates a different key on each call (no reuse between attempts)', () => {
    expect(newIdempotencyKey()).not.toBe(newIdempotencyKey());
  });
});
