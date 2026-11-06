const VISIBLE_PREFIX_LENGTH = 2;
const VISIBLE_SUFFIX_LENGTH = 3;
const MASK_CHAR = '•';

/**
 * Enmascara un alias de contacto dejando visibles los primeros 2 y los últimos 3
 * caracteres, p. ej. `"maria.sanchez" -> "@ma••••••••hez"` (T2).
 * Alias muy cortos (que no permiten dejar un hueco enmascarado) se devuelven sin
 * enmascarar para no inducir a error.
 */
export function maskAlias(alias: string): string {
  const minLengthToMask = VISIBLE_PREFIX_LENGTH + VISIBLE_SUFFIX_LENGTH + 1;
  if (alias.length < minLengthToMask) {
    return `@${alias}`;
  }

  const prefix = alias.slice(0, VISIBLE_PREFIX_LENGTH);
  const suffix = alias.slice(-VISIBLE_SUFFIX_LENGTH);
  const maskedLength = alias.length - VISIBLE_PREFIX_LENGTH - VISIBLE_SUFFIX_LENGTH;

  return `@${prefix}${MASK_CHAR.repeat(maskedLength)}${suffix}`;
}
