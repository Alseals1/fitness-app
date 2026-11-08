import { clearJustSent, markJustSent, wasJustSent } from './submitted';

describe('just sent flag', () => {
  beforeEach(() => {
    clearJustSent();
  });

  it('is not set at the start', () => {
    expect(wasJustSent()).toBe(false);
  });

  it('is set after markJustSent, and reading it does not use it up', () => {
    markJustSent();
    expect(wasJustSent()).toBe(true);
    expect(wasJustSent()).toBe(true);
  });

  it('is unset again after clearJustSent', () => {
    markJustSent();
    clearJustSent();
    expect(wasJustSent()).toBe(false);
  });

  it('is unset by a single clear even after two marks', () => {
    markJustSent();
    markJustSent();
    clearJustSent();
    expect(wasJustSent()).toBe(false);
  });
});
