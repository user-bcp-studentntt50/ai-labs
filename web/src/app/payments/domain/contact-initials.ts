const MAX_INITIALS = 2;

/**
 * Calcula las iniciales de un nombre para mostrar en un avatar circular (T2), p. ej.
 * `"María Sánchez" -> "MS"`. Toma la primera letra de hasta las dos primeras palabras;
 * un nombre de una sola palabra devuelve solo su primera letra.
 */
export function getContactInitials(displayName: string): string {
  const words = displayName.trim().split(/\s+/).filter(Boolean);
  return words
    .slice(0, MAX_INITIALS)
    .map((word) => word.charAt(0).toUpperCase())
    .join('');
}
