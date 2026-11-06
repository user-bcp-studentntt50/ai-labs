import { describe, expect, it } from 'vitest';
import { getContactInitials } from './contact-initials';

describe('getContactInitials', () => {
  it('takes the first letter of the first two words', () => {
    expect(getContactInitials('María Sánchez')).toBe('MS');
  });

  it('uppercases lowercase input', () => {
    expect(getContactInitials('bodega el sol')).toBe('BE');
  });

  it('returns a single letter for a one-word name', () => {
    expect(getContactInitials('Maria')).toBe('M');
  });

  it('ignores extra whitespace between words', () => {
    expect(getContactInitials('  José   Díaz  ')).toBe('JD');
  });

  it('returns an empty string for an empty name', () => {
    expect(getContactInitials('')).toBe('');
  });

  it('ignores words beyond the first two', () => {
    expect(getContactInitials('Carmen Rosa López')).toBe('CR');
  });
});
