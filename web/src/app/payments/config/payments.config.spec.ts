import { describe, expect, it } from 'vitest';
import { getDefaultAmountLimits, PAYMENTS_CONFIG } from './payments.config';

describe('PAYMENTS_CONFIG', () => {
  it('points to the cloud mock verified in the connectivity spike', () => {
    expect(PAYMENTS_CONFIG.apiBaseUrl).toBe('https://bcp-wallet-mock.yefri.workers.dev/groups/4');
    expect(PAYMENTS_CONFIG.walletId).toBe('wallet-demo');
  });

  it('disables mock overrides by default (production-safe)', () => {
    expect(PAYMENTS_CONFIG.allowMockOverrides).toBe(false);
  });
});

describe('getDefaultAmountLimits', () => {
  it('returns the business range agreed in the HU (S/ 10 – S/ 1000, floor S/ 0.01)', () => {
    expect(getDefaultAmountLimits()).toEqual({
      minCaptureCents: 1,
      minBusinessCents: 1000,
      maxBusinessCents: 100000
    });
  });
});
