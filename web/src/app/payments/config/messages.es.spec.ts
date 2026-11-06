import { describe, expect, it } from 'vitest';
import { getMessage, MESSAGES } from './messages.es';

describe('MESSAGES catalog', () => {
  it('has a non-empty string for every key (T11: no orphan or blank labels)', () => {
    for (const [key, value] of Object.entries(MESSAGES)) {
      expect(value.trim().length, `message "${key}" should not be empty`).toBeGreaterThan(0);
    }
  });
});

describe('getMessage', () => {
  it('returns the template as-is when there are no placeholders', () => {
    expect(getMessage('home.newPaymentCta')).toBe('Nuevo pago');
  });

  it('substitutes a single placeholder', () => {
    expect(getMessage('home.greeting', { name: 'Juan' })).toBe('Bienvenido, Juan');
  });

  it('substitutes multiple placeholders in the same template', () => {
    expect(getMessage('confirmation.summary', { amount: 'S/ 15.00', name: 'María Sánchez' })).toBe(
      'Vas a pagar S/ 15.00 a María Sánchez'
    );
  });
});
