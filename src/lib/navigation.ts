/**
 * Root stack settings, exported by `src/app/_layout.tsx` as Expo Router's `unstable_settings`.
 * A deep link or a refresh keeps `index` (home) under the opened screen, so the header shows a
 * back arrow to home. It applies only to deep links, not to in-app navigation.
 */
export const rootStackSettings = { anchor: 'index' } as const;
