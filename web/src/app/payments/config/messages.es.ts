import { ErrorMessageKey } from '../domain/error-mapper';

/** Claves propias de las pantallas del flujo (T1–T5, T11), fuera de los errores de `error-mapper`. */
export type UiMessageKey =
  | 'home.greeting'
  | 'home.balanceLabel'
  | 'home.newPaymentCta'
  | 'home.balanceError'
  | 'home.retryCta'
  | 'contact.title'
  | 'contact.searchLabel'
  | 'contact.searchPlaceholder'
  | 'contact.emptyResults'
  | 'contact.continueCta'
  | 'amount.title'
  | 'amount.originLabel'
  | 'amount.destinationLabel'
  | 'amount.inputLabel'
  | 'amount.continueCta'
  | 'amount.error.notANumber'
  | 'amount.error.belowCaptureFloor'
  | 'amount.error.belowBusinessMin'
  | 'amount.error.aboveBusinessMax'
  | 'confirmation.title'
  | 'confirmation.summary'
  | 'confirmation.confirmCta'
  | 'confirmation.correctCta'
  | 'processing.title'
  | 'processing.message'
  | 'result.succeeded.title'
  | 'result.succeeded.message'
  | 'result.failed.title'
  | 'result.failed.message'
  | 'result.expired.title'
  | 'result.expired.message'
  | 'result.referenceLabel'
  | 'result.dateLabel'
  | 'result.destinationLabel'
  | 'result.amountLabel'
  | 'result.backToHomeCta'
  | 'help.label'
  | 'help.message'
  | 'error.networkError'
  | 'error.reversed';

/** Todas las claves de texto visibles del módulo de pagos (T11: catálogo único, sin literales sueltos). */
export type MessageKey = UiMessageKey | ErrorMessageKey;

/**
 * Catálogo de textos en español. Las etiquetas finales de los estados terminales y de
 * los errores están pendientes de cierre con producto (ver HU_Pagos.md, "Preguntas
 * abiertas"); estos valores son placeholders aprobados para el plan (ver
 * PROPUESTA_FRONT.md §15, Q8) y se pueden editar aquí sin tocar componentes.
 */
export const MESSAGES: Readonly<Record<MessageKey, string>> = {
  'home.greeting': 'Bienvenido, {name}',
  'home.balanceLabel': 'Saldo disponible',
  'home.newPaymentCta': 'Nuevo pago',
  'home.balanceError': 'No pudimos cargar tu saldo. Inténtalo de nuevo.',
  'home.retryCta': 'Reintentar',

  'contact.title': '¿A quién quieres enviar dinero?',
  'contact.searchLabel': 'Buscar por alias',
  'contact.searchPlaceholder': 'Escribe un nombre o alias',
  'contact.emptyResults': 'No encontramos contactos con ese alias.',
  'contact.continueCta': 'Continuar',

  'amount.title': '¿Cuánto quieres enviar?',
  'amount.originLabel': 'Desde',
  'amount.destinationLabel': 'Para',
  'amount.inputLabel': 'Monto en soles',
  'amount.continueCta': 'Continuar',
  'amount.error.notANumber': 'Ingresa un monto válido.',
  'amount.error.belowCaptureFloor': 'El monto mínimo es S/ 0.01.',
  'amount.error.belowBusinessMin': 'El monto mínimo para este pago es S/ 10.00.',
  'amount.error.aboveBusinessMax': 'El monto máximo para este pago es S/ 1000.00.',

  'confirmation.title': 'Confirma tu pago',
  'confirmation.summary': 'Vas a pagar {amount} a {name}',
  'confirmation.confirmCta': 'Confirmar',
  'confirmation.correctCta': 'Corregir',

  'processing.title': 'Procesando',
  'processing.message': 'Estamos confirmando tu pago. Espera un momento, tu dinero está protegido.',

  'result.succeeded.title': 'Tu pago se hizo',
  'result.succeeded.message': 'Tu dinero fue enviado correctamente.',
  'result.failed.title': 'No se hizo el pago',
  'result.failed.message': 'No se hizo el pago, tu dinero está a salvo.',
  'result.expired.title': 'Aún no tenemos respuesta',
  'result.expired.message': 'No pudimos confirmar tu pago a tiempo. Tu dinero está protegido.',
  'result.referenceLabel': 'Referencia',
  'result.dateLabel': 'Fecha',
  'result.destinationLabel': 'Destino',
  'result.amountLabel': 'Monto',
  'result.backToHomeCta': 'Volver al inicio',

  'help.label': '¿Necesitas ayuda?',
  'help.message': 'Si tienes dudas sobre este pago, comunícate con atención al cliente.',

  'error.networkError': 'No pudimos confirmar tu pago. Tu dinero está protegido; inténtalo de nuevo.',
  'error.reversed': 'Este pago fue revertido. Tu dinero está a salvo.',
  'error.insufficientFunds': 'No tienes saldo suficiente para este pago.',
  'error.walletNotActive': 'Tu cuenta no está activa para pagar en este momento.',
  'error.validation': 'Revisa los datos del pago e inténtalo de nuevo.',
  'error.notFound': 'No encontramos la información de este pago.',
  'error.payloadTooLarge': 'Hubo un problema al enviar tu pago. Inténtalo de nuevo.',
  'error.groupLimit': 'El servicio alcanzó su límite de pruebas. Inténtalo más tarde.',
  'error.providerUnavailable': 'No se hizo el pago, tu dinero está a salvo.',
  'error.unknown': 'No se hizo el pago, tu dinero está a salvo.'
};

/** Resuelve una clave del catálogo, reemplazando `{placeholder}` por los valores dados. */
export function getMessage(key: MessageKey, params: Readonly<Record<string, string>> = {}): string {
  const template = MESSAGES[key];
  return Object.entries(params).reduce(
    (text, [paramName, paramValue]) => text.replaceAll(`{${paramName}}`, paramValue),
    template
  );
}
