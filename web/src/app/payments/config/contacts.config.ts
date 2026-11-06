import { Recipient } from '../domain/payment-status';

/**
 * Contacto de demostración que el front mapea a un `recipient` real del backend (T2).
 * El mock solo acepta `contact-demo` y `merchant-demo`; los nombres son ficticios para
 * la demo (ver PROPUESTA_FRONT.md §15, Q3/Q4) y no existe gestión real de contactos.
 */
export interface DemoContact {
  readonly id: string;
  readonly recipient: Recipient;
  readonly displayName: string;
  readonly alias: string;
}

export const DEMO_CONTACTS: readonly DemoContact[] = [
  { id: 'contact-demo', recipient: 'contact-demo', displayName: 'María Sánchez', alias: 'maria.sanchez' },
  { id: 'merchant-demo', recipient: 'merchant-demo', displayName: 'Bodega El Sol', alias: 'bodega.elsol' }
];

/** Busca contactos cuyo nombre o alias contenga el texto de búsqueda (T2, sin distinguir mayúsculas). */
export function searchContacts(query: string, contacts: readonly DemoContact[] = DEMO_CONTACTS): readonly DemoContact[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (normalizedQuery === '') {
    return contacts;
  }
  return contacts.filter(
    (contact) =>
      contact.displayName.toLowerCase().includes(normalizedQuery) || contact.alias.toLowerCase().includes(normalizedQuery)
  );
}
