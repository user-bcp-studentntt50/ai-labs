import { describe, expect, it } from 'vitest';
import { getSessionDisplayName } from './session-user';

describe('getSessionDisplayName', () => {
  it('returns a non-empty demo display name', () => {
    expect(getSessionDisplayName().trim().length).toBeGreaterThan(0);
  });
});
