/**
 * Conversión entre soles (texto ingresado por el usuario) y céntimos (unidad que usa el backend).
 * Toda la aritmética es entera para evitar errores de redondeo de punto flotante con dinero.
 */

const CENTS_PER_SOL = 100;
const MAX_DECIMAL_DIGITS = 2;

/**
 * Convierte un texto en soles (admite coma o punto decimal) a céntimos enteros.
 * Devuelve `null` si el texto no representa un monto válido (no numérico, negativo,
 * o con más de dos decimales).
 */
export function solesToCents(input: string): number | null {
  const trimmed = input.trim();
  if (trimmed === '') {
    return null;
  }

  const normalized = trimmed.replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    return null;
  }

  const [wholePart, decimalPart = ''] = normalized.split('.');
  const paddedDecimal = decimalPart.padEnd(MAX_DECIMAL_DIGITS, '0');
  const cents = Number(wholePart) * CENTS_PER_SOL + Number(paddedDecimal);

  return Number.isSafeInteger(cents) ? cents : null;
}

/** Formatea céntimos enteros como texto de soles, p. ej. `1500 -> "S/ 15.00"`. */
export function centsToDisplay(cents: number): string {
  const whole = Math.trunc(cents / CENTS_PER_SOL);
  const remainder = Math.abs(cents % CENTS_PER_SOL).toString().padStart(MAX_DECIMAL_DIGITS, '0');
  return `S/ ${whole}.${remainder}`;
}
