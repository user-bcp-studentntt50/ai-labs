import { InjectionToken } from '@angular/core';
import { PaymentsConfig, PAYMENTS_CONFIG } from '../config/payments.config';
import { PaymentsApi } from '../data/payments-api';
import { PaymentOrchestrator } from './payment-orchestrator';
import { PendingPaymentStorage } from './pending-payment-storage';

/**
 * Token de inyección para compartir una única instancia de `PaymentOrchestrator`
 * entre las pantallas de confirmación, "Procesando" y resultado (T4/T5), ya que
 * `PaymentOrchestrator` no es una clase decorada con `@Injectable` (se construye con
 * dependencias explícitas para que sea fácil de probar sin Angular, ver
 * `payment-orchestrator.spec.ts`).
 */
export const PAYMENT_ORCHESTRATOR = new InjectionToken<PaymentOrchestrator>('PAYMENT_ORCHESTRATOR', {
  providedIn: 'root',
  factory: () => createPaymentOrchestrator(PAYMENTS_CONFIG)
});

export function createPaymentOrchestrator(config: PaymentsConfig): PaymentOrchestrator {
  return new PaymentOrchestrator({
    api: new PaymentsApi(config),
    storage: new PendingPaymentStorage(),
    config
  });
}
