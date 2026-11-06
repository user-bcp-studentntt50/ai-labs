import { Injectable, signal } from '@angular/core';
import { DemoContact } from '../config/contacts.config';

/** Borrador del pago en memoria: contacto elegido (T2) y monto capturado (T3). */
export interface PaymentDraft {
  readonly contact: DemoContact | null;
  readonly amountCents: number | null;
}

const EMPTY_DRAFT: PaymentDraft = { contact: null, amountCents: null };

/**
 * Estado de navegación compartido entre las pantallas del flujo de pago (T2–T4).
 * Vive en memoria (no en `localStorage`: eso es solo para el intento ya enviado,
 * ver `PendingPaymentStorage`/ADR-003) y se reinicia al volver a Home o al llegar a
 * un resultado terminal.
 */
@Injectable({ providedIn: 'root' })
export class PaymentFlowStore {
  private readonly draftSignal = signal<PaymentDraft>(EMPTY_DRAFT);
  readonly draft = this.draftSignal.asReadonly();

  setContact(contact: DemoContact): void {
    this.draftSignal.update((draft) => ({ ...draft, contact }));
  }

  setAmount(amountCents: number): void {
    this.draftSignal.update((draft) => ({ ...draft, amountCents }));
  }

  reset(): void {
    this.draftSignal.set(EMPTY_DRAFT);
  }

  hasContact(): boolean {
    return this.draftSignal().contact !== null;
  }

  hasCompleteDraft(): boolean {
    const draft = this.draftSignal();
    return draft.contact !== null && draft.amountCents !== null;
  }
}
