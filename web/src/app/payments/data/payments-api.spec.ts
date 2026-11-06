import { afterEach, describe, expect, it, vi } from 'vitest';
import { PaymentsConfig } from '../config/payments.config';
import { PaymentsApi } from './payments-api';

const testConfig: PaymentsConfig = {
  apiBaseUrl: 'https://mock.test/groups/4',
  walletId: 'wallet-demo',
  pollIntervalMs: 10,
  pollTimeoutMs: 100,
  limitsByChannel: { default: { minCaptureCents: 1, minBusinessCents: 1000, maxBusinessCents: 100000 } },
  allowMockOverrides: false
};

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status });
}

function stubFetch(response: Response | (() => Response) | (() => Promise<Response>)): ReturnType<typeof vi.fn> {
  const fn = vi.fn(async () => (typeof response === 'function' ? response() : response));
  vi.stubGlobal('fetch', fn);
  return fn;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('PaymentsApi.getWallet', () => {
  it('calls the wallet endpoint and normalizes the confirmed response shape', async () => {
    const fetchMock = stubFetch(
      jsonResponse(200, { id: 'wallet-demo', status: 'ACTIVE', balance: 93300, reserved: 1500, available: 91800, currency: 'PEN' })
    );
    const api = new PaymentsApi(testConfig);

    const result = await api.getWallet('wallet-demo');

    expect(fetchMock).toHaveBeenCalledWith(
      'https://mock.test/groups/4/wallets/wallet-demo',
      expect.objectContaining({ method: 'GET' })
    );
    expect(result).toEqual({
      kind: 'ok',
      value: { id: 'wallet-demo', status: 'ACTIVE', availableCents: 91800, currency: 'PEN' }
    });
  });
});

describe('PaymentsApi.createPayment', () => {
  it('sends a camelCase body with the Idempotency-Key header and normalizes the snake_case response', async () => {
    const fetchMock = stubFetch(
      jsonResponse(202, {
        id: 'pay_4453fdde44ec4fc8',
        wallet_id: 'wallet-demo',
        recipient: 'contact-demo',
        amount: 1500,
        status: 'PENDING',
        scenario: 'APPROVED',
        idem: '37cf97b1-e418-4310-a4d4-badfc780f361',
        fingerprint: '["contact-demo",1500,"PEN","APPROVED",null]'
      })
    );
    const api = new PaymentsApi(testConfig);

    const result = await api.createPayment(
      { walletId: 'wallet-demo', recipient: 'contact-demo', amountCents: 1500, currency: 'PEN' },
      'idem-key-1'
    );

    expect(fetchMock).toHaveBeenCalledWith(
      'https://mock.test/groups/4/payments',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'Idempotency-Key': 'idem-key-1', 'Content-Type': 'application/json' }),
        body: JSON.stringify({ walletId: 'wallet-demo', recipient: 'contact-demo', amountCents: 1500, currency: 'PEN' })
      })
    );
    expect(result).toEqual({
      kind: 'ok',
      value: { id: 'pay_4453fdde44ec4fc8', walletId: 'wallet-demo', recipient: 'contact-demo', amountCents: 1500, status: 'PENDING' }
    });
  });

  it('returns httpError with the body for a 409 INSUFFICIENT_FUNDS (confirmed shape)', async () => {
    stubFetch(jsonResponse(409, { error: 'INSUFFICIENT_FUNDS' }));
    const api = new PaymentsApi(testConfig);

    const result = await api.createPayment(
      { walletId: 'wallet-demo', recipient: 'contact-demo', amountCents: 99999999, currency: 'PEN' },
      'idem-key-2'
    );

    expect(result).toEqual({ kind: 'httpError', status: 409, body: { error: 'INSUFFICIENT_FUNDS' } });
  });

  it('returns httpError with paymentId for a 504 TIMEOUT_AFTER_PROCESSING (confirmed shape in the spike)', async () => {
    stubFetch(jsonResponse(504, { error: 'PROVIDER_TIMEOUT', paymentId: 'pay_c08ad4ff9b994c79', status: 'PENDING' }));
    const api = new PaymentsApi(testConfig);

    const result = await api.createPayment(
      { walletId: 'wallet-demo', recipient: 'contact-demo', amountCents: 3000, currency: 'PEN', scenario: 'TIMEOUT_AFTER_PROCESSING' },
      'idem-key-3'
    );

    expect(result).toEqual({
      kind: 'httpError',
      status: 504,
      body: { error: 'PROVIDER_TIMEOUT', paymentId: 'pay_c08ad4ff9b994c79', status: 'PENDING' }
    });
  });

  it('returns httpError for a 503 PROVIDER_UNAVAILABLE (confirmed shape in the spike)', async () => {
    stubFetch(jsonResponse(503, { error: 'PROVIDER_UNAVAILABLE', processed: false }));
    const api = new PaymentsApi(testConfig);

    const result = await api.createPayment(
      { walletId: 'wallet-demo', recipient: 'merchant-demo', amountCents: 2000, currency: 'PEN', scenario: 'PROVIDER_ERROR' },
      'idem-key-4'
    );

    expect(result).toEqual({ kind: 'httpError', status: 503, body: { error: 'PROVIDER_UNAVAILABLE', processed: false } });
  });

  it('returns networkError when fetch rejects unexpectedly', async () => {
    stubFetch(() => {
      throw new TypeError('Failed to fetch');
    });
    const api = new PaymentsApi(testConfig);

    const result = await api.createPayment(
      { walletId: 'wallet-demo', recipient: 'contact-demo', amountCents: 1500, currency: 'PEN' },
      'idem-key-5'
    );

    expect(result).toEqual({ kind: 'networkError' });
  });

  it('returns aborted (not networkError) when the request is cancelled deliberately', async () => {
    stubFetch(() => {
      throw new DOMException('The operation was aborted.', 'AbortError');
    });
    const api = new PaymentsApi(testConfig);

    const result = await api.createPayment(
      { walletId: 'wallet-demo', recipient: 'contact-demo', amountCents: 1500, currency: 'PEN' },
      'idem-key-6'
    );

    expect(result).toEqual({ kind: 'aborted' });
  });
});

describe('PaymentsApi.getPayment', () => {
  it('calls GET /payments/{id} and normalizes the response', async () => {
    const fetchMock = stubFetch(
      jsonResponse(200, {
        id: 'pay_1',
        wallet_id: 'wallet-demo',
        recipient: 'contact-demo',
        amount: 1500,
        status: 'SUCCEEDED',
        scenario: 'APPROVED',
        idem: 'idem-1',
        fingerprint: '[]'
      })
    );
    const api = new PaymentsApi(testConfig);

    const result = await api.getPayment('pay_1');

    expect(fetchMock).toHaveBeenCalledWith('https://mock.test/groups/4/payments/pay_1', expect.objectContaining({ method: 'GET' }));
    expect(result).toEqual({
      kind: 'ok',
      value: { id: 'pay_1', walletId: 'wallet-demo', recipient: 'contact-demo', amountCents: 1500, status: 'SUCCEEDED' }
    });
  });
});
