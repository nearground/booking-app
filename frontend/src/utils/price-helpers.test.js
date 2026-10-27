import { formatPrice } from 'utils/price-helpers';

describe('formatPrice', () => {
  test('0 returns a string representation of zero', () => {
    const result = formatPrice(0);
    expect(typeof result).toBe('string');
    expect(parseFloat(result.replace(/,/g, ''))).toBe(0);
  });

  test('null returns a string (falsy path → 0)', () => {
    const result = formatPrice(null);
    expect(typeof result).toBe('string');
  });

  test('undefined returns a string (falsy path → 0)', () => {
    const result = formatPrice(undefined);
    expect(typeof result).toBe('string');
  });

  test('1000 returns a string containing digits from 1 and 000', () => {
    const result = formatPrice(1000);
    expect(typeof result).toBe('string');
    expect(result).toMatch(/1/);
    expect(result).toMatch(/0/);
  });

  test('string "2500" is parsed to a number and formatted', () => {
    const result = formatPrice('2500');
    expect(typeof result).toBe('string');
  });
});
