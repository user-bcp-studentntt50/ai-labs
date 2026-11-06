/** Límites de monto aplicables a un canal (T8: configurables por proveedor/canal). */
export interface AmountLimits {
  readonly minCaptureCents: number;
  readonly minBusinessCents: number;
  readonly maxBusinessCents: number;
}

export type AmountValidationReason =
  | 'NOT_A_NUMBER'
  | 'BELOW_CAPTURE_FLOOR'
  | 'BELOW_BUSINESS_MIN'
  | 'ABOVE_BUSINESS_MAX';

export type AmountValidation = { readonly ok: true } | { readonly ok: false; readonly reason: AmountValidationReason };

/**
 * Valida un monto en céntimos contra el piso técnico de captura y el rango de negocio
 * de "bajo monto" (CA2). `cents` es `null` cuando el texto ingresado no pudo convertirse
 * (ver `solesToCents`).
 */
export function validateAmount(cents: number | null, limits: AmountLimits): AmountValidation {
  if (cents === null) {
    return { ok: false, reason: 'NOT_A_NUMBER' };
  }
  if (cents < limits.minCaptureCents) {
    return { ok: false, reason: 'BELOW_CAPTURE_FLOOR' };
  }
  if (cents < limits.minBusinessCents) {
    return { ok: false, reason: 'BELOW_BUSINESS_MIN' };
  }
  if (cents > limits.maxBusinessCents) {
    return { ok: false, reason: 'ABOVE_BUSINESS_MAX' };
  }
  return { ok: true };
}
