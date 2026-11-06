import { AmountLimits } from '../domain/amount-rules';

/** Límites de monto por canal (T8: pregunta abierta de la HU sobre configuración por proveedor/canal). */
export interface PaymentsConfig {
  readonly apiBaseUrl: string;
  readonly walletId: string;
  readonly pollIntervalMs: number;
  readonly pollTimeoutMs: number;
  readonly limitsByChannel: Readonly<Record<string, AmountLimits>>;
  readonly allowMockOverrides: boolean;
}

const DEFAULT_CHANNEL = 'default';

const DEFAULT_LIMITS: AmountLimits = {
  minCaptureCents: 1, // S/ 0.01 — piso técnico de captura (CA2)
  minBusinessCents: 1000, // S/ 10.00 — mínimo de negocio de "bajo monto" (CA2)
  maxBusinessCents: 100000 // S/ 1000.00 — máximo de negocio de "bajo monto" (CA2)
};

/**
 * Configuración por defecto del módulo de pagos. La URL base quedó confirmada en el
 * spike de conectividad (incremento 1 de H-WEB-01): el mock cloud habilita CORS
 * abierto (`Access-Control-Allow-Origin: *`), por lo que no se necesita proxy.
 * Mismo patrón que `login`/`dashboard`: valor hardcodeado, sin `environment.ts` de
 * Angular (ver PROPUESTA_FRONT.md §10, Q5).
 */
export const PAYMENTS_CONFIG: PaymentsConfig = {
  apiBaseUrl: 'https://bcp-wallet-mock.yefri.workers.dev/groups/4',
  walletId: 'wallet-demo',
  pollIntervalMs: 2000,
  pollTimeoutMs: 30000,
  limitsByChannel: { [DEFAULT_CHANNEL]: DEFAULT_LIMITS },
  allowMockOverrides: false
};

/** Límites de monto del canal por defecto (único canal disponible mientras T8 siga abierta). */
export function getDefaultAmountLimits(config: PaymentsConfig = PAYMENTS_CONFIG): AmountLimits {
  return config.limitsByChannel[DEFAULT_CHANNEL];
}
