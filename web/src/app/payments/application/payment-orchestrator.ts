import { PaymentsConfig } from '../config/payments.config';
import { ErrorMessageKey, mapHttpErrorToMessageKey } from '../domain/error-mapper';
import { mapBackendStatusToOutcome, PaymentAttemptState, Recipient } from '../domain/payment-status';
import { newIdempotencyKey } from '../data/idempotency-key';
import { ApiResult, PaymentsApiPort } from '../data/payments-api';
import { Payment } from '../data/payment-dto';
import { PendingPaymentStorage } from './pending-payment-storage';

const TRANSIENT_ERROR_TOLERANCE = 3;
const SERVER_ERROR_STATUS_THRESHOLD = 500;

export interface PaymentOrchestratorDeps {
  readonly api: PaymentsApiPort;
  readonly storage: PendingPaymentStorage;
  readonly config: PaymentsConfig;
  /** Inyectable para pruebas; por defecto genera un UUID real (ver `idempotency-key.ts`). */
  readonly createIdempotencyKey?: () => string;
  /** Inyectable para pruebas con reloj simulado; por defecto `Date.now`. */
  readonly now?: () => number;
}

type StateListener = (state: PaymentAttemptState) => void;

/**
 * Máquina de estados del intento de pago (T7, CA2/CA3/CA4). Un único resultado
 * terminal por intento: `SUCCEEDED`, `FAILED` o `EXPIRED`. El manejo de `504
 * TIMEOUT_AFTER_PROCESSING` sigue ADR-002 (continúa el *polling*, nunca es terminal
 * inmediato); la persistencia del intento sigue ADR-003.
 */
export class PaymentOrchestrator {
  private state: PaymentAttemptState = { phase: 'IDLE' };
  private readonly listeners = new Set<StateListener>();
  private pollTimer: ReturnType<typeof setTimeout> | null = null;
  private pollAbortController: AbortController | null = null;
  private pollStartedAt = 0;
  private consecutiveTransientErrors = 0;

  constructor(private readonly deps: PaymentOrchestratorDeps) {}

  getState(): PaymentAttemptState {
    return this.state;
  }

  subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Inicia el único intento en alcance de esta HU. Ignora toques repetidos (doble toque, T12). */
  async submit(recipient: Recipient, amountCents: number): Promise<void> {
    if (this.state.phase !== 'IDLE') {
      return;
    }
    this.setState({ phase: 'SUBMITTING' });

    const idempotencyKey = (this.deps.createIdempotencyKey ?? newIdempotencyKey)();
    const result = await this.deps.api.createPayment(
      { walletId: this.deps.config.walletId, recipient, amountCents, currency: 'PEN' },
      idempotencyKey
    );
    this.handleCreateResult(recipient, amountCents, result);
  }

  /** Reanuda el *polling* de un intento persistido (ADR-003) al volver a entrar a `/pagos`. */
  resume(): void {
    if (this.state.phase !== 'IDLE') {
      return;
    }
    const pending = this.deps.storage.load();
    if (pending) {
      this.beginProcessing(pending.paymentId);
    }
  }

  /** Detiene el *polling* en curso sin alterar la persistencia (p. ej. al desmontar la pantalla). */
  cancel(): void {
    this.stopPolling();
  }

  private handleCreateResult(recipient: string, amountCents: number, result: ApiResult<Payment>): void {
    if (result.kind === 'ok') {
      this.deps.storage.save({ paymentId: result.value.id, recipient, amountCents, startedAt: this.now() });
      this.beginProcessing(result.value.id);
      return;
    }

    if (result.kind === 'httpError' && result.status === 504 && result.body?.paymentId) {
      // ADR-002: un 504 TIMEOUT_AFTER_PROCESSING ya creó el pago; no es Fallido ni Expirado.
      const paymentId = result.body.paymentId;
      this.deps.storage.save({ paymentId, recipient, amountCents, startedAt: this.now() });
      this.beginProcessing(paymentId);
      return;
    }

    if (result.kind === 'httpError') {
      this.setState({ phase: 'FAILED', messageKey: mapHttpErrorToMessageKey(result.status, result.body) });
      return;
    }

    if (result.kind === 'networkError') {
      this.setState({ phase: 'FAILED', messageKey: 'error.networkError' satisfies ErrorMessageKey });
      return;
    }

    // 'aborted': no debería ocurrir en el envío inicial (no se pasa signal); defensivo.
    this.setState({ phase: 'FAILED', messageKey: 'error.unknown' satisfies ErrorMessageKey });
  }

  private beginProcessing(paymentId: string): void {
    this.pollStartedAt = this.now();
    this.consecutiveTransientErrors = 0;
    this.setState({ phase: 'PROCESSING', paymentId });
    this.schedulePoll(paymentId);
  }

  private schedulePoll(paymentId: string): void {
    this.pollTimer = setTimeout(() => void this.poll(paymentId), this.deps.config.pollIntervalMs);
  }

  private async poll(paymentId: string): Promise<void> {
    this.pollAbortController = new AbortController();
    const result = await this.deps.api.getPayment(paymentId, this.pollAbortController.signal);

    // La pantalla pudo cancelar o el intento pudo moverse a otro estado mientras se esperaba la respuesta.
    if (this.state.phase !== 'PROCESSING') {
      return;
    }
    if (result.kind === 'aborted') {
      return;
    }

    if (result.kind === 'ok') {
      const outcome = mapBackendStatusToOutcome(result.value.status);
      if (outcome === 'SUCCEEDED') {
        this.deps.storage.clear();
        this.setState({ phase: 'SUCCEEDED', paymentId });
        return;
      }
      if (outcome === 'FAILED') {
        this.deps.storage.clear();
        const messageKey = result.value.status === 'REVERSED' ? 'error.reversed' : 'error.unknown';
        this.setState({ phase: 'FAILED', messageKey, paymentId });
        return;
      }
      // Sigue PENDING: continúa el polling, sin contar como error transitorio.
      this.consecutiveTransientErrors = 0;
    } else if (result.kind === 'httpError' && result.status < SERVER_ERROR_STATUS_THRESHOLD) {
      // Un error de cliente inesperado durante el polling (p. ej. 404) no es un error
      // transitorio: se declara Fallido en vez de seguir esperando indefinidamente.
      this.deps.storage.clear();
      this.setState({ phase: 'FAILED', messageKey: mapHttpErrorToMessageKey(result.status, result.body), paymentId });
      return;
    } else {
      // networkError o httpError 5xx: transitorio, se tolera (T7).
      this.consecutiveTransientErrors += 1;
    }

    const elapsedMs = this.now() - this.pollStartedAt;
    const exhaustedTolerance = this.consecutiveTransientErrors >= TRANSIENT_ERROR_TOLERANCE;
    if (elapsedMs >= this.deps.config.pollTimeoutMs || exhaustedTolerance) {
      this.deps.storage.clear();
      this.setState({ phase: 'EXPIRED', paymentId });
      return;
    }

    this.schedulePoll(paymentId);
  }

  private stopPolling(): void {
    if (this.pollTimer !== null) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
    this.pollAbortController?.abort();
    this.pollAbortController = null;
  }

  private now(): number {
    return this.deps.now?.() ?? Date.now();
  }

  private setState(state: PaymentAttemptState): void {
    this.state = state;
    this.listeners.forEach((listener) => listener(state));
  }
}
