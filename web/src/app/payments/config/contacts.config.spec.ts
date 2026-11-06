import { describe, expect, it } from 'vitest';
import { DEMO_CONTACTS, searchContacts } from './contacts.config';

describe('DEMO_CONTACTS', () => {
  it('exposes exactly the two recipients supported by the mock (Q4)', () => {
    expect(DEMO_CONTACTS.map((contact) => contact.recipient).sort()).toEqual(['contact-demo', 'merchant-demo']);
  });
});

describe('searchContacts', () => {
  it('returns all contacts when the query is empty', () => {
    expect(searchContacts('')).toEqual(DEMO_CONTACTS);
  });

  it('matches by display name, case-insensitively', () => {
    expect(searchContacts('maría').map((c) => c.id)).toEqual(['contact-demo']);
  });

  it('matches by alias', () => {
    expect(searchContacts('bodega').map((c) => c.id)).toEqual(['merchant-demo']);
  });

  it('returns an empty list when nothing matches', () => {
    expect(searchContacts('zzz')).toEqual([]);
  });
});
