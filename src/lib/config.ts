export type SupabaseConfig = { url: string; anonKey: string };

/**
 * Reads the Supabase settings from the environment (EXPO_PUBLIC_* variables, which Expo
 * inlines at build time). Throws a clear error when one is missing, so the app does not
 * start with a half-working client.
 */
export function readSupabaseConfig(
  env: Record<string, string | undefined> = process.env,
): SupabaseConfig {
  const url = (env.EXPO_PUBLIC_SUPABASE_URL ?? '').trim();
  const anonKey = (env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '').trim();
  const missing: string[] = [];
  if (!url) missing.push('EXPO_PUBLIC_SUPABASE_URL');
  if (!anonKey) missing.push('EXPO_PUBLIC_SUPABASE_ANON_KEY');
  if (missing.length > 0) {
    throw new Error(`Missing ${missing.join(' and ')}. Copy .env.example to .env and fill it in.`);
  }
  try {
    new URL(url);
  } catch {
    throw new Error(`EXPO_PUBLIC_SUPABASE_URL is not a valid URL: ${url}`);
  }
  return { url, anonKey };
}
