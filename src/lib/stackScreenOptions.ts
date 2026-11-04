import { colors, fontFamily } from './theme';

/** The header and screen background every stack shares, so each screen sits on the calm background. */
export const stackScreenOptions = {
  headerStyle: { backgroundColor: colors.background },
  headerTintColor: colors.primary,
  headerTitleStyle: { color: colors.text, fontFamily },
  headerShadowVisible: false,
  contentStyle: { backgroundColor: colors.background },
};
