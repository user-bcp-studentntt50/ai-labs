const STORAGE_KEY = 'ayni.pendingPayment';

/** Intento de pago en curso que sobrevive a cerrar la pestaña/app (T11, ADR-003). */
export interface PendingPayment {
  readonly paymentId: string;
  readonly recipient: string;
  readonly amountCents: number;
  readonly startedAt: number;
}

/**
 * Persiste el único intento de pago pendiente en `localStorage` para poder reanudar
 * el *polling* si se cierra la app (ver ADR-003). No guarda nada antes de tener un
 * `paymentId` real del backend, y se borra en cuanto el intento llega a un estado
 * terminal.
 */
export class PendingPaymentStorage {
  constructor(private readonly storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> = globalThis.localStorage) {}

  save(pending: PendingPayment): void {
    try {
      this.storage.setItem(STORAGE_KEY, JSON.stringify(pending));
    } catch {
      // Falla silenciosa: la persistencia es una mejora de experiencia (T11), no un
      // requisito funcional; si localStorage no está disponible, el pago sigue su
      // curso, solo se pierde la posibilidad de reanudar el polling tras cerrar la app.
    }
  }

  load(): PendingPayment | null {
    try {
      const raw = this.storage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as PendingPayment) : null;
    } catch {
      return null;
    }
  }

  clear(): void {
    try {
      this.storage.removeItem(STORAGE_KEY);
    } catch {
      // Ver nota en save().
    }
  }
}
