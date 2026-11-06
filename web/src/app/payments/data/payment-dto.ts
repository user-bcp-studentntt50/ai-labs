import { BackendPaymentStatus, Recipient } from '../domain/payment-status';

/** Cuerpo de `POST /payments` tal como lo espera el backend (camelCase, ver nota de T7). */
export interface CreatePaymentRequestDto {
  readonly walletId: string;
  readonly recipient: Recipient;
  readonly amountCents: number;
  readonly currency: 'PEN';
  readonly scenario?: string;
}

/**
 * Forma cruda de la respuesta de `POST /payments`, `GET /payments` y `GET /payments/{id}`
 * (snake_case, confirmado en el spike de conectividad del incremento 1).
 */
export interface PaymentResponseDto {
  readonly id: string;
  readonly wallet_id: string;
  readonly recipient: string;
  readonly amount: number;
  readonly status: BackendPaymentStatus;
  readonly scenario: string;
  readonly idem: string;
  readonly fingerprint: unknown;
}

/** Forma cruda de la respuesta de `GET /wallets/{id}`. */
export interface WalletResponseDto {
  readonly id: string;
  readonly status: 'ACTIVE' | 'PENDING' | 'REJECTED';
  readonly balance: number;
  readonly reserved: number;
  readonly available: number;
  readonly currency: 'PEN';
}

/** Forma cruda del cuerpo de error del mock (ver `error-mapper.ts`). */
export interface ErrorResponseDto {
  readonly error: string;
  readonly processed?: boolean;
  readonly paymentId?: string;
  readonly status?: BackendPaymentStatus;
}

/** Modelo de dominio ya normalizado: sin snake_case, sin `fingerprint`/`idem` (T7). */
export interface Payment {
  readonly id: string;
  readonly walletId: string;
  readonly recipient: string;
  readonly amountCents: number;
  readonly status: BackendPaymentStatus;
}

/** Modelo de dominio ya normalizado para la wallet (solo lo que usa la UI, T1). */
export interface Wallet {
  readonly id: string;
  readonly status: string;
  readonly availableCents: number;
  readonly currency: 'PEN';
}

export function toDomainPayment(dto: PaymentResponseDto): Payment {
  return {
    id: dto.id,
    walletId: dto.wallet_id,
    recipient: dto.recipient,
    amountCents: dto.amount,
    status: dto.status
  };
}

export function toDomainWallet(dto: WalletResponseDto): Wallet {
  return {
    id: dto.id,
    status: dto.status,
    availableCents: dto.available,
    currency: dto.currency
  };
}
