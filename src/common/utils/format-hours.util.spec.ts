import { formatHours } from './format-hours.util';

describe('formatHours', () => {
  it('formats whole hours without minutes', () => {
    expect(formatHours(7)).toBe('7h');
  });

  it('formats decimal hours with minutes', () => {
    expect(formatHours(6.25)).toBe('6h 15min');
    expect(formatHours(8.5)).toBe('8h 30min');
    expect(formatHours(6.75)).toBe('6h 45min');
  });

  it('handles zero', () => {
    expect(formatHours(0)).toBe('0h');
  });

  it('rounds minutes correctly', () => {
    expect(formatHours(1.99)).toBe('1h 59min');
  });
});
