import { readSupabaseConfig } from './config';

describe('readSupabaseConfig', () => {
  it('returns the url and key', () => {
    expect(
      readSupabaseConfig({
        EXPO_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321',
        EXPO_PUBLIC_SUPABASE_ANON_KEY: 'anon',
      }),
    ).toEqual({ url: 'http://127.0.0.1:54321', anonKey: 'anon' });
  });

  it('trims spaces', () => {
    const config = readSupabaseConfig({
      EXPO_PUBLIC_SUPABASE_URL: ' http://localhost:54321 ',
      EXPO_PUBLIC_SUPABASE_ANON_KEY: ' key ',
    });
    expect(config).toEqual({ url: 'http://localhost:54321', anonKey: 'key' });
  });

  it('names every missing variable', () => {
    expect(() => readSupabaseConfig({})).toThrow(
      'Missing EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY',
    );
    expect(() => readSupabaseConfig({ EXPO_PUBLIC_SUPABASE_URL: 'http://x.test' })).toThrow(
      'Missing EXPO_PUBLIC_SUPABASE_ANON_KEY.',
    );
  });

  it('rejects a url that is not a url', () => {
    expect(() =>
      readSupabaseConfig({ EXPO_PUBLIC_SUPABASE_URL: 'not a url', EXPO_PUBLIC_SUPABASE_ANON_KEY: 'k' }),
    ).toThrow('not a valid URL');
  });
});
