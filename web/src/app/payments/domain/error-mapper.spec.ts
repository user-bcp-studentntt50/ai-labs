import { describe, expect, it } from 'vitest';
import { mapHttpErrorToMessageKey } from './error-mapper';

describe('mapHttpErrorToMessageKey', () => {
  it('maps 409 INSUFFICIENT_FUNDS', () => {
    expect(mapHttpErrorToMessageKey(409, { error: 'INSUFFICIENT_FUNDS' })).toBe('error.insufficientFunds');
  });

  it('maps 409 WALLET_NOT_ACTIVE', () => {
    expect(mapHttpErrorToMessageKey(409, { error: 'WALLET_NOT_ACTIVE' })).toBe('error.walletNotActive');
  });

  it('maps an unrecognized 409 conflict to the generic unknown key', () => {
    expect(mapHttpErrorToMessageKey(409, { error: 'IDEMPOTENCY_CONFLICT' })).toBe('error.unknown');
  });

  it('maps 503 PROVIDER_UNAVAILABLE (confirmado en el spike real)', () => {
    expect(mapHttpErrorToMessageKey(503, { error: 'PROVIDER_UNAVAILABLE' })).toBe('error.providerUnavailable');
  });

  it('falls back to the HTTP status when the error code is unknown', () => {
    expect(mapHttpErrorToMessageKey(503, { error: 'SOMETHING_NEW' })).toBe('error.providerUnavailable');
  });

  it('maps 400 to the validation key', () => {
    expect(mapHttpErrorToMessageKey(400, null)).toBe('error.validation');
  });

  it('maps 404 to the not-found key', () => {
    expect(mapHttpErrorToMessageKey(404, null)).toBe('error.notFound');
  });

  it('maps 413 to the payload-too-large key', () => {
    expect(mapHttpErrorToMessageKey(413, null)).toBe('error.payloadTooLarge');
  });

  it('maps 429 to the group-limit key', () => {
    expect(mapHttpErrorToMessageKey(429, { error: 'GROUP_LIMIT_RESET_REQUIRED' })).toBe('error.groupLimit');
  });

  it('falls back to unknown for an unmapped status', () => {
    expect(mapHttpErrorToMessageKey(418, null)).toBe('error.unknown');
  });
});
