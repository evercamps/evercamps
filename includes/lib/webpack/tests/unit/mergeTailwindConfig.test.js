import { mergeTailwindConfig } from '../../util/mergeTailwindConfig.js';

describe('mergeTailwindConfig', () => {
  const base = {
    theme: {
      extend: {
        colors: { primary: 'var(--primary)', critical: 'var(--critical)' },
        fontFamily: { sans: ['var(--font-body)'] }
      }
    },
    variants: { extend: { margin: ['first', 'last'] } }
  };

  it('keeps default colours a theme does not mention', () => {
    const merged = mergeTailwindConfig(base, {
      theme: { extend: { colors: { brand: '#02b9df' } } }
    });
    expect(merged.theme.extend.colors).toEqual({
      primary: 'var(--primary)',
      critical: 'var(--critical)',
      brand: '#02b9df'
    });
    expect(merged.theme.extend.fontFamily).toEqual(base.theme.extend.fontFamily);
    expect(merged.variants).toEqual(base.variants);
  });

  it('lets the theme override a single value', () => {
    const merged = mergeTailwindConfig(base, {
      theme: { extend: { colors: { primary: '#222' } } }
    });
    expect(merged.theme.extend.colors.primary).toBe('#222');
    expect(merged.theme.extend.colors.critical).toBe('var(--critical)');
  });

  it('replaces arrays instead of concatenating them', () => {
    const merged = mergeTailwindConfig(base, {
      theme: { extend: { fontFamily: { sans: ['Open Sans', 'Arial'] } } }
    });
    expect(merged.theme.extend.fontFamily.sans).toEqual(['Open Sans', 'Arial']);
  });

  it('does not change its inputs', () => {
    const before = JSON.stringify(base);
    const override = { theme: { extend: { colors: { primary: '#222' } } } };
    mergeTailwindConfig(base, override);
    expect(JSON.stringify(base)).toBe(before);
  });

  it('returns a copy of the default when there is no theme config', () => {
    const merged = mergeTailwindConfig(base, undefined);
    expect(merged).toEqual(base);
    expect(merged).not.toBe(base);
  });
});
