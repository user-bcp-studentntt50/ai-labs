import { describe, expect, it } from 'vitest';
import { maskAlias } from './alias-mask';

describe('maskAlias', () => {
  it('masks a typical alias with a dot', () => {
    expect(maskAlias('maria.sanchez')).toBe('@ma••••••••hez');
  });

  it('masks a second alias, keeping prefix and suffix visible', () => {
    expect(maskAlias('jose.diaz')).toBe('@jo••••iaz');
  });

  it('does not mask a very short alias', () => {
    expect(maskAlias('ab')).toBe('@ab');
    expect(maskAlias('abcd')).toBe('@abcd');
  });

  it('masks an alias right at the minimum maskable length', () => {
    // 2 visible + 3 visible + 1 masked character = 6 chars total
    expect(maskAlias('abcdef')).toBe('@ab•def');
  });
});
