import { describe, expect, it } from 'vitest';
import { AmountLimits, validateAmount } from './amount-rules';

const limits: AmountLimits = {
  minCaptureCents: 1, // S/ 0.01
  minBusinessCents: 1000, // S/ 10.00
  maxBusinessCents: 100000 // S/ 1000.00
};

describe('validateAmount', () => {
  it('rejects a non-numeric amount', () => {
    expect(validateAmount(null, limits)).toEqual({ ok: false, reason: 'NOT_A_NUMBER' });
  });

  it('rejects an amount below the technical capture floor', () => {
    expect(validateAmount(0, limits)).toEqual({ ok: false, reason: 'BELOW_CAPTURE_FLOOR' });
  });

  it('rejects an amount between the capture floor and the business minimum', () => {
    expect(validateAmount(999, limits)).toEqual({ ok: false, reason: 'BELOW_BUSINESS_MIN' });
  });

  it('accepts the business minimum boundary', () => {
    expect(validateAmount(1000, limits)).toEqual({ ok: true });
  });

  it('accepts the business maximum boundary', () => {
    expect(validateAmount(100000, limits)).toEqual({ ok: true });
  });

  it('rejects an amount above the business maximum', () => {
    expect(validateAmount(100001, limits)).toEqual({ ok: false, reason: 'ABOVE_BUSINESS_MAX' });
  });

  it('accepts a typical mid-range amount', () => {
    expect(validateAmount(1500, limits)).toEqual({ ok: true });
  });
});
