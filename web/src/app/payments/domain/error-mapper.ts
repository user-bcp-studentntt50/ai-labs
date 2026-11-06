/**
 * Claves del catálogo de mensajes (`messages.es.ts`) usadas para traducir errores del
 * backend a un mensaje visible para el pagador (T7/T11). Los códigos exactos de
 * `error` para 409/503 están verificados contra el mock real (ver incremento 1,
 * issue H-WEB-01); los de 400/413 no tienen un código de texto confirmado en el
 * contrato, así que se mapean solo por código HTTP.
 */
export type ErrorMessageKey =
  | 'error.insufficientFunds'
  | 'error.walletNotActive'
  | 'error.validation'
  | 'error.notFound'
  | 'error.payloadTooLarge'
  | 'error.groupLimit'
  | 'error.providerUnavailable'
  | 'error.networkError'
  | 'error.unknown';

interface ErrorResponseBody {
  readonly error?: string;
}

const KNOWN_ERROR_CODES: Readonly<Record<string, ErrorMessageKey>> = {
  INSUFFICIENT_FUNDS: 'error.insufficientFunds',
  WALLET_NOT_ACTIVE: 'error.walletNotActive',
  NOT_FOUND: 'error.notFound',
  // Confirmado en el spike de conectividad (incremento 1): el mock responde
  // 503 con este código exacto para el escenario PROVIDER_ERROR.
  PROVIDER_UNAVAILABLE: 'error.providerUnavailable',
  GROUP_LIMIT_RESET_REQUIRED: 'error.groupLimit'
};

const STATUS_FALLBACK: Readonly<Record<number, ErrorMessageKey>> = {
  400: 'error.validation',
  404: 'error.notFound',
  409: 'error.unknown',
  413: 'error.payloadTooLarge',
  429: 'error.groupLimit',
  503: 'error.providerUnavailable'
};

/**
 * Traduce un error HTTP de `POST /payments` a la clave de mensaje que debe
 * mostrarse al pagador. No cubre `504`, que se maneja aparte en el orquestador
 * (ver ADR-002: no es un resultado terminal).
 */
export function mapHttpErrorToMessageKey(status: number, errorBody: ErrorResponseBody | null): ErrorMessageKey {
  const code = errorBody?.error;
  if (code && code in KNOWN_ERROR_CODES) {
    return KNOWN_ERROR_CODES[code];
  }
  return STATUS_FALLBACK[status] ?? 'error.unknown';
}
