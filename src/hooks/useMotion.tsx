import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AccessibilityInfo } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

export type Motion = {
  /** True while the system Reduced Motion setting is on. */
  reduced: boolean;
};

const MotionContext = createContext<Motion>({ reduced: false });

/**
 * Reads the system Reduced Motion setting once for the whole app and keeps it current.
 * Reanimated's `useReducedMotion()` gives the value at launch only, so it is just the start:
 * `AccessibilityInfo` then reports every change while the app runs.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  const atLaunch = useReducedMotion();
  const [reduced, setReduced] = useState(atLaunch);

  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (active) setReduced(enabled);
      })
      // Keep the launch value if the platform cannot say.
      .catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  const value = useMemo(() => ({ reduced }), [reduced]);
  return <MotionContext.Provider value={value}>{children}</MotionContext.Provider>;
}

/** The current motion setting. Every animation checks `reduced` before it moves anything. */
export function useMotion(): Motion {
  return useContext(MotionContext);
}
