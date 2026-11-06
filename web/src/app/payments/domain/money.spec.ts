import { describe, expect, it } from 'vitest';
import { centsToDisplay, solesToCents } from './money';

describe('solesToCents', () => {
  it('converts a whole number of soles', () => {
    expect(solesToCents('15')).toBe(1500);
  });

  it('converts soles with two decimals', () => {
    expect(solesToCents('15.50')).toBe(1550);
  });

  it('accepts a comma as decimal separator', () => {
    expect(solesToCents('1,5')).toBe(150);
  });

  it('pads a single decimal digit', () => {
    expect(solesToCents('9.9')).toBe(990);
  });

  it('converts the technical capture floor', () => {
    expect(solesToCents('0.01')).toBe(1);
  });

  it('converts the business range boundaries', () => {
    expect(solesToCents('10.00')).toBe(1000);
    expect(solesToCents('1000.00')).toBe(100000);
    expect(solesToCents('1000.01')).toBe(100001);
  });

  it('rejects more than two decimal digits', () => {
    expect(solesToCents('0.001')).toBeNull();
  });

  it('rejects empty input', () => {
    expect(solesToCents('')).toBeNull();
    expect(solesToCents('   ')).toBeNull();
  });

  it('rejects non-numeric input', () => {
    expect(solesToCents('abc')).toBeNull();
    expect(solesToCents('-5')).toBeNull();
  });
});

describe('centsToDisplay', () => {
  it('formats whole soles', () => {
    expect(centsToDisplay(1500)).toBe('S/ 15.00');
  });

  it('formats cents under one sol', () => {
    expect(centsToDisplay(1)).toBe('S/ 0.01');
  });

  it('formats zero', () => {
    expect(centsToDisplay(0)).toBe('S/ 0.00');
  });
});
