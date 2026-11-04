import { contrastRatio, relativeLuminance } from './contrast';

describe('contrastRatio', () => {
  it('is 21 for black on white', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
  });

  it('is 1 for a colour on itself', () => {
    expect(contrastRatio('#1F5F5B', '#1F5F5B')).toBe(1);
  });

  it('does not depend on the order', () => {
    expect(contrastRatio('#FFFFFF', '#1F5F5B')).toBe(contrastRatio('#1F5F5B', '#FFFFFF'));
  });

  it('matches a known pair: #767676 on white is about 4.54', () => {
    expect(contrastRatio('#767676', '#FFFFFF')).toBeCloseTo(4.54, 2);
  });
});

describe('relativeLuminance', () => {
  it('treats #FFF and #FFFFFF the same', () => {
    expect(relativeLuminance('#FFF')).toBe(relativeLuminance('#FFFFFF'));
  });

  it('accepts lower case', () => {
    expect(relativeLuminance('#1f5f5b')).toBe(relativeLuminance('#1F5F5B'));
  });

  it.each(['', 'FFFFFF', '#FFFF', '#GGGGGG', 'rgb(0,0,0)', '#FFFFFF80'])('throws on %p', (bad) => {
    expect(() => relativeLuminance(bad)).toThrow();
  });
});
