/**
 * Nombre a mostrar en el saludo de Home (T1). Sin autenticación real en alcance
 * (ver HU_Pagos.md, "Fuera de alcance"): se usa un nombre de demostración fijo, sin
 * leer `workshop_user` del login (ver PROPUESTA_FRONT.md §15, Q2). Centralizado aquí
 * para poder cambiarlo sin tocar componentes.
 */
const DEMO_DISPLAY_NAME = 'Usuario';

export function getSessionDisplayName(): string {
  return DEMO_DISPLAY_NAME;
}
