/**
 * Genera una `Idempotency-Key` nueva para un único intento de pago (T7). No se
 * reutiliza entre intentos: la reutilización para reintentos de red queda en
 * backlog (ver HU_Pagos.md, "Fuera de alcance").
 */
export function newIdempotencyKey(): string {
  return crypto.randomUUID();
}
