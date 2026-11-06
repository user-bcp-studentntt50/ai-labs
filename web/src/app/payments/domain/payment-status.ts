/** Estado tal como lo informa el backend del mock (`GET/POST /payments`). */
export type BackendPaymentStatus = 'PENDING' | 'SUCCEEDED' | 'REJECTED' | 'REVERSED';

/** Destinatarios válidos del mock (T2): el backend solo acepta estos dos `recipient`. */
export type Recipient = 'contact-demo' | 'merchant-demo';

/** Resultado terminal único que la UI puede mostrar por intento (T5/CA3). */
export type PaymentOutcome = 'SUCCEEDED' | 'FAILED' | 'EXPIRED';

/** Estado de la máquina de orquestación del intento de pago (T7). */
export type PaymentAttemptState =
  | { readonly phase: 'IDLE' }
  | { readonly phase: 'SUBMITTING' }
  | { readonly phase: 'PROCESSING'; readonly paymentId: string }
  | { readonly phase: 'SUCCEEDED'; readonly paymentId: string }
  | { readonly phase: 'FAILED'; readonly messageKey: string; readonly paymentId?: string }
  | { readonly phase: 'EXPIRED'; readonly paymentId: string };

/** Mapea el estado terminal del backend al resultado único de la UI (CA3). */
export function mapBackendStatusToOutcome(status: BackendPaymentStatus): PaymentOutcome | null {
  switch (status) {
    case 'SUCCEEDED':
      return 'SUCCEEDED';
    case 'REJECTED':
    case 'REVERSED':
      return 'FAILED';
    case 'PENDING':
      return null;
  }
}
