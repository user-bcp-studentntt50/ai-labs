import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PaymentsConfig } from '../config/payments.config';
import { ApiResult, PaymentsApiPort } from '../data/payments-api';
import { Payment } from '../data/payment-dto';
import { PaymentAttemptState } from '../domain/payment-status';
import { PaymentOrchestrator } from './payment-orchestrator';
import { PendingPaymentStorage } from './pending-payment-storage';

const testConfig: PaymentsConfig = {
  apiBaseUrl: 'https://mock.test/groups/4',
  walletId: 'wallet-demo',
  pollIntervalMs: 1000,
  pollTimeoutMs: 5000,
  limitsByChannel: { default: { minCaptureCents: 1, minBusinessCents: 1000, maxBusinessCents: 100000 } },
  allowMockOverrides: false
};

function createMemoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
    clear: () => data.clear(),
    key: () => null,
    get length() {
      return data.size;
    }
  };
}

function payment(status: Payment['status'], id = 'pay_1'): ApiResult<Payment> {
  return { kind: 'ok', value: { id, walletId: 'wallet-demo', recipient: 'contact-demo', amountCents: 1500, status } };
}

/** Doble de prueba de `PaymentsApiPort`: una cola de respuestas de POST y otra de GET consecutivos. */
class FakeApi implements PaymentsApiPort {
  createPaymentResponses: ApiResult<Payment>[] = [];
  getPaymentResponses: ApiResult<Payment>[] = [];
  createPaymentCalls = 0;
  getPaymentCalls = 0;

  getWallet(): Promise<ApiResult<never>> {
    throw new Error('not used in these tests');
  }

  async createPayment(): Promise<ApiResult<Payment>> {
    this.createPaymentCalls += 1;
    return this.createPaymentResponses.shift() ?? { kind: 'networkError' };
  }

  async getPayment(): Promise<ApiResult<Payment>> {
    this.getPaymentCalls += 1;
    return this.getPaymentResponses.shift() ?? { kind: 'networkError' };
  }
}

function createOrchestrator(api: FakeApi, config: PaymentsConfig = testConfig) {
  const storage = new PendingPaymentStorage(createMemoryStorage());
  let keyCount = 0;
  const orchestrator = new PaymentOrchestrator({
    api,
    storage,
    config,
    createIdempotencyKey: () => `key-${++keyCount}`,
    now: () => Date.now()
  });
  return { orchestrator, storage };
}

async function flushMicrotasks(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

beforeEach(() => {
  vi.useFakeTimers();
});

describe('PaymentOrchestrator — camino feliz (APPROVED)', () => {
  it('pasa por SUBMITTING, PROCESSING y termina en SUCCEEDED', async () => {
    const api = new FakeApi();
    api.createPaymentResponses = [payment('PENDING')];
    api.getPaymentResponses = [payment('PENDING'), payment('SUCCEEDED')];
    const { orchestrator, storage } = createOrchestrator(api);

    const submitPromise = orchestrator.submit('contact-demo', 1500);
    expect(orchestrator.getState().phase).toBe('SUBMITTING');
    await submitPromise;

    expect(orchestrator.getState()).toEqual({ phase: 'PROCESSING', paymentId: 'pay_1' });
    expect(storage.load()).toEqual(expect.objectContaining({ paymentId: 'pay_1' }));

    await vi.advanceTimersByTimeAsync(testConfig.pollIntervalMs);
    expect(orchestrator.getState()).toEqual({ phase: 'PROCESSING', paymentId: 'pay_1' });

    await vi.advanceTimersByTimeAsync(testConfig.pollIntervalMs);
    expect(orchestrator.getState()).toEqual({ phase: 'SUCCEEDED', paymentId: 'pay_1' });
    expect(storage.load()).toBeNull();
  });
});

describe('PaymentOrchestrator — REJECTED', () => {
  it('termina en FAILED cuando el polling devuelve REJECTED', async () => {
    const api = new FakeApi();
    api.createPaymentResponses = [payment('PENDING')];
    api.getPaymentResponses = [payment('REJECTED')];
    const { orchestrator } = createOrchestrator(api);

    await orchestrator.submit('contact-demo', 1500);
    await vi.advanceTimersByTimeAsync(testConfig.pollIntervalMs);

    const state = orchestrator.getState();
    expect(state.phase).toBe('FAILED');
    expect((state as Extract<PaymentAttemptState, { phase: 'FAILED' }>).messageKey).toBe('error.unknown');
  });
});

describe('PaymentOrchestrator — REVERSED', () => {
  it('termina en FAILED con mensaje propio cuando el polling devuelve REVERSED', async () => {
    const api = new FakeApi();
    api.createPaymentResponses = [payment('PENDING')];
    api.getPaymentResponses = [payment('REVERSED')];
    const { orchestrator } = createOrchestrator(api);

    await orchestrator.submit('contact-demo', 1500);
    await vi.advanceTimersByTimeAsync(testConfig.pollIntervalMs);

    const state = orchestrator.getState();
    expect(state.phase).toBe('FAILED');
    expect((state as Extract<PaymentAttemptState, { phase: 'FAILED' }>).messageKey).toBe('error.reversed');
  });
});

describe('PaymentOrchestrator — PENDING / DELAYED_APPROVAL sin resolución', () => {
  it('termina en EXPIRED al agotar el tiempo máximo de polling', async () => {
    const api = new FakeApi();
    api.createPaymentResponses = [payment('PENDING')];
    // Nunca sale de PENDING (simula que nadie entrega el evento, ver hallazgo del spike).
    api.getPaymentResponses = [payment('PENDING'), payment('PENDING'), payment('PENDING'), payment('PENDING'), payment('PENDING')];
    const { orchestrator, storage } = createOrchestrator(api);

    await orchestrator.submit('contact-demo', 1500);
    await vi.advanceTimersByTimeAsync(testConfig.pollTimeoutMs + testConfig.pollIntervalMs);

    expect(orchestrator.getState()).toEqual({ phase: 'EXPIRED', paymentId: 'pay_1' });
    expect(storage.load()).toBeNull();
  });
});

describe('PaymentOrchestrator — TIMEOUT_AFTER_PROCESSING (504, ADR-002)', () => {
  it('no declara Fallido ni Expirado ante un 504 con paymentId: continúa el polling hasta un terminal', async () => {
    const api = new FakeApi();
    api.createPaymentResponses = [{ kind: 'httpError', status: 504, body: { error: 'PROVIDER_TIMEOUT', paymentId: 'pay_504', status: 'PENDING' } }];
    api.getPaymentResponses = [payment('PENDING', 'pay_504'), payment('SUCCEEDED', 'pay_504')];
    const { orchestrator } = createOrchestrator(api);

    await orchestrator.submit('contact-demo', 3000);
    expect(orchestrator.getState()).toEqual({ phase: 'PROCESSING', paymentId: 'pay_504' });

    await vi.advanceTimersByTimeAsync(testConfig.pollIntervalMs);
    expect(orchestrator.getState().phase).toBe('PROCESSING');

    await vi.advanceTimersByTimeAsync(testConfig.pollIntervalMs);
    expect(orchestrator.getState()).toEqual({ phase: 'SUCCEEDED', paymentId: 'pay_504' });
  });
});

describe('PaymentOrchestrator — PROVIDER_ERROR (503)', () => {
  it('termina en FAILED de inmediato: no se creó operación ni reserva', async () => {
    const api = new FakeApi();
    api.createPaymentResponses = [{ kind: 'httpError', status: 503, body: { error: 'PROVIDER_UNAVAILABLE', processed: false } }];
    const { orchestrator } = createOrchestrator(api);

    await orchestrator.submit('merchant-demo', 2000);

    expect(orchestrator.getState()).toEqual({ phase: 'FAILED', messageKey: 'error.providerUnavailable' });
    expect(api.getPaymentCalls).toBe(0);
  });
});

describe('PaymentOrchestrator — INSUFFICIENT_FUNDS (409)', () => {
  it('termina en FAILED con el mensaje de saldo insuficiente', async () => {
    const api = new FakeApi();
    api.createPaymentResponses = [{ kind: 'httpError', status: 409, body: { error: 'INSUFFICIENT_FUNDS' } }];
    const { orchestrator } = createOrchestrator(api);

    await orchestrator.submit('contact-demo', 99999999);

    expect(orchestrator.getState()).toEqual({ phase: 'FAILED', messageKey: 'error.insufficientFunds' });
  });
});

describe('PaymentOrchestrator — error de red en el envío', () => {
  it('termina en FAILED con el mensaje de red', async () => {
    const api = new FakeApi();
    api.createPaymentResponses = [{ kind: 'networkError' }];
    const { orchestrator } = createOrchestrator(api);

    await orchestrator.submit('contact-demo', 1500);

    expect(orchestrator.getState()).toEqual({ phase: 'FAILED', messageKey: 'error.networkError' });
  });
});

describe('PaymentOrchestrator — error transitorio durante el polling', () => {
  it('tolera hasta 3 errores de red consecutivos y luego expira', async () => {
    const api = new FakeApi();
    api.createPaymentResponses = [payment('PENDING')];
    api.getPaymentResponses = [{ kind: 'networkError' }, { kind: 'networkError' }, { kind: 'networkError' }];
    const { orchestrator } = createOrchestrator(api, { ...testConfig, pollTimeoutMs: 60000 });

    await orchestrator.submit('contact-demo', 1500);
    await vi.advanceTimersByTimeAsync(testConfig.pollIntervalMs * 3);

    expect(orchestrator.getState()).toEqual({ phase: 'EXPIRED', paymentId: 'pay_1' });
  });
});

describe('PaymentOrchestrator — doble toque', () => {
  it('ignora un segundo submit mientras el primero está en curso (T7/T12)', async () => {
    const api = new FakeApi();
    api.createPaymentResponses = [payment('PENDING')];
    const { orchestrator } = createOrchestrator(api);

    const first = orchestrator.submit('contact-demo', 1500);
    const second = orchestrator.submit('contact-demo', 1500);
    await Promise.all([first, second]);
    await flushMicrotasks();

    expect(api.createPaymentCalls).toBe(1);
  });
});

describe('PaymentOrchestrator — resume (ADR-003)', () => {
  it('reanuda el polling de un pago persistido en vez de iniciar uno nuevo', async () => {
    const api = new FakeApi();
    api.getPaymentResponses = [payment('SUCCEEDED', 'pay_resumed')];
    const { orchestrator, storage } = createOrchestrator(api);
    storage.save({ paymentId: 'pay_resumed', recipient: 'contact-demo', amountCents: 1500, startedAt: Date.now() });

    orchestrator.resume();
    expect(orchestrator.getState()).toEqual({ phase: 'PROCESSING', paymentId: 'pay_resumed' });

    await vi.advanceTimersByTimeAsync(testConfig.pollIntervalMs);

    expect(orchestrator.getState()).toEqual({ phase: 'SUCCEEDED', paymentId: 'pay_resumed' });
    expect(api.createPaymentCalls).toBe(0);
  });

  it('no hace nada si no hay un pago persistido', () => {
    const api = new FakeApi();
    const { orchestrator } = createOrchestrator(api);

    orchestrator.resume();

    expect(orchestrator.getState()).toEqual({ phase: 'IDLE' });
  });
});

describe('PaymentOrchestrator — cancel', () => {
  it('detiene el polling sin borrar la persistencia', async () => {
    const api = new FakeApi();
    api.createPaymentResponses = [payment('PENDING')];
    const { orchestrator, storage } = createOrchestrator(api);

    await orchestrator.submit('contact-demo', 1500);
    orchestrator.cancel();
    await vi.advanceTimersByTimeAsync(testConfig.pollIntervalMs * 5);

    expect(api.getPaymentCalls).toBe(0);
    expect(storage.load()).toEqual(expect.objectContaining({ paymentId: 'pay_1' }));
  });
});
