import { useMemo } from 'react';

import { stackAnimation } from '../lib/motion';
import { stackScreenOptions } from '../lib/stackScreenOptions';
import { useMotion } from './useMotion';

/** The options every stack shares: the shared header, and the platform push or a fade under Reduced Motion. */
export function useStackScreenOptions() {
  const { reduced } = useMotion();
  return useMemo(() => ({ ...stackScreenOptions, animation: stackAnimation(reduced) }), [reduced]);
}
