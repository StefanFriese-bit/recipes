import { describe, expect, it } from 'vitest';
import { convert, formatAmount, fraction, parseLine } from '../src/lib/units';

describe('parseLine', () => {
  it('reads amount, unit, id, optional mark and note', () => {
    expect(parseLine('400 g beef-mince | browned')).toEqual({ ing: 'beef-mince', qty: 400, unit: 'g', note: 'browned' });
    expect(parseLine('1/2 tsp cumin?')).toEqual({ ing: 'cumin', qty: 0.5, unit: 'tsp', optional: true });
    expect(parseLine('taste salt')).toEqual({ ing: 'salt', qty: 0, unit: 'taste' });
  });
  it('refuses a bad unit or a missing id', () => {
    expect(() => parseLine('2 cups flour')).toThrow(/unit/);
    expect(() => parseLine('2 g')).toThrow(/ingredient/);
    expect(() => parseLine('x g flour')).toThrow(/amount/);
  });
});

describe('formatting', () => {
  it('rounds fractions to quarters and thirds', () => {
    expect(fraction(1.5)).toBe('1½');
    expect(fraction(0.34)).toBe('⅓');
    expect(fraction(2)).toBe('2');
    expect(fraction(0.1)).toBe('¼');
    expect(fraction(0.74)).toBe('¾');
  });
  it('shows metric amounts rounded to sensible steps and switches to kg / l', () => {
    expect(formatAmount(400, 'g')).toBe('400 g');
    expect(formatAmount(1200, 'g')).toBe('1.2 kg');
    expect(formatAmount(333.3, 'g')).toBe('330 g');
    expect(formatAmount(1500, 'ml')).toBe('1.5 l');
    expect(formatAmount(7.3, 'g')).toBe('7.5 g');
  });
  it('turns 3 tsp into 1 tbsp and big spoon counts into ml', () => {
    expect(formatAmount(3, 'tsp')).toBe('1 tbsp');
    expect(formatAmount(12, 'tbsp')).toBe('180 ml');
    expect(formatAmount(0.25, 'tbsp')).toBe('¾ tsp');
  });
  it('names count units with singular and plural', () => {
    expect(formatAmount(1, 'clove')).toBe('1 clove');
    expect(formatAmount(3, 'clove')).toBe('3 cloves');
    expect(formatAmount(2, 'pc')).toBe('2');
    expect(formatAmount(0, 'taste')).toBe('');
  });
});

describe('convert', () => {
  it('converts inside a family only', () => {
    expect(convert(1, 'tbsp', 'tsp')).toBe(3);
    expect(convert(250, 'ml', 'tbsp')).toBeCloseTo(16.667, 2);
    expect(convert(1, 'kg', 'g')).toBe(1000);
    expect(convert(1, 'g', 'ml')).toBeNull();
    expect(convert(1, 'tin', 'pc')).toBeNull();
  });
});
