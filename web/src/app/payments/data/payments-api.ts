import { PaymentsConfig } from '../config/payments.config';
import {
  CreatePaymentRequestDto,
  ErrorResponseDto,
  Payment,
  PaymentResponseDto,
  toDomainPayment,
  toDomainWallet,
  Wallet,
  WalletResponseDto
} from './payment-dto';

/**
 * Resultado de una llamada al mock. Distingue un error de red real de una cancelación
 * deliberada (`aborted`, p. ej. al salir de la pantalla de "Procesando") para que el
 * orquestador no las trate igual (T7).
 */
export type ApiResult<T> =
  | { readonly kind: 'ok'; readonly value: T }
  | { readonly kind: 'httpError'; readonly status: number; readonly body: ErrorResponseDto | null }
  | { readonly kind: 'networkError' }
  | { readonly kind: 'aborted' };

type HttpMethod = 'GET' | 'POST';

/**
 * Cliente HTTP del módulo de pagos. Usa `fetch` nativo en vez de `axios` (ver ADR-001)
 * para poder cancelar el *polling* con `AbortController` sin tocar `login`/`dashboard`.
 */
export class PaymentsApi {
  constructor(private readonly config: PaymentsConfig) {}

  getWallet(id: string, signal?: AbortSignal): Promise<ApiResult<Wallet>> {
    return this.request<WalletResponseDto, Wallet>('GET', `/wallets/${id}`, {
      normalize: toDomainWallet,
      signal
    });
  }

  createPayment(request: CreatePaymentRequestDto, idempotencyKey: string, signal?: AbortSignal): Promise<ApiResult<Payment>> {
    return this.request<PaymentResponseDto, Payment>('POST', '/payments', {
      body: request,
      extraHeaders: { 'Idempotency-Key': idempotencyKey },
      normalize: toDomainPayment,
      signal
    });
  }

  getPayment(id: string, signal?: AbortSignal): Promise<ApiResult<Payment>> {
    return this.request<PaymentResponseDto, Payment>('GET', `/payments/${id}`, {
      normalize: toDomainPayment,
      signal
    });
  }

  private async request<Dto, Domain>(
    method: HttpMethod,
    path: string,
    options: {
      readonly body?: unknown;
      readonly extraHeaders?: Readonly<Record<string, string>>;
      readonly normalize: (dto: Dto) => Domain;
      readonly signal?: AbortSignal;
    }
  ): Promise<ApiResult<Domain>> {
    try {
      const response = await fetch(`${this.config.apiBaseUrl}${path}`, {
        method,
        headers: { 'Content-Type': 'application/json', ...options.extraHeaders },
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
        signal: options.signal
      });
      const payload = await parseJsonBody(response);

      if (!response.ok) {
        return { kind: 'httpError', status: response.status, body: payload as ErrorResponseDto | null };
      }
      return { kind: 'ok', value: options.normalize(payload as Dto) };
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return { kind: 'aborted' };
      }
      return { kind: 'networkError' };
    }
  }
}

/** Lee el cuerpo como JSON; algunos errores pueden no traer cuerpo (p. ej. preflight). */
async function parseJsonBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (text.trim() === '') {
    return null;
  }
  return JSON.parse(text);
}

/** Subconjunto estructural de `PaymentsApi` que necesita el orquestador; facilita pruebas con dobles. */
export type PaymentsApiPort = Pick<PaymentsApi, 'getWallet' | 'createPayment' | 'getPayment'>;
