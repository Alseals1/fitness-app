/**
 * The admin check's decisions. Pure module: `useAuth` runs the check and owns the state, this
 * decides what an answer means and what the home screen shows. The database (`is_admin()` and
 * RLS) stays the real gate; this only drives the message and the Admin link.
 */

export type AdminCheckResult = 'admin' | 'notAdmin' | 'failed';
export type AdminStatus = 'signedOut' | 'checking' | AdminCheckResult;
/** The last answer, tagged with the user it was for. */
export type AdminCheck = { userId: string; result: AdminCheckResult };

/** is_admin() answers true or false. An error or any other answer means the check failed, not "not an admin". */
export function adminCheckResult(data: unknown, error: unknown): AdminCheckResult {
  if (error != null) return 'failed';
  if (data === true) return 'admin';
  if (data === false) return 'notAdmin';
  return 'failed';
}

/** The status for the signed-in user. An answer tagged with another user counts as no answer. */
export function adminStatus(userId: string | null, check: AdminCheck | null): AdminStatus {
  if (userId === null) return 'signedOut';
  if (check?.userId !== userId) return 'checking';
  return check.result;
}

/**
 * Run the check again when the app returns to the foreground after a failed check. `appState` is
 * React Native's `AppStateStatus`, typed as a string so this module needs no React Native import.
 */
export function shouldRecheckAdmin(appState: string, status: AdminStatus): boolean {
  return appState === 'active' && status === 'failed';
}

export type HomeAccountView = 'none' | 'signIn' | 'admin' | 'checkFailed' | 'signOut';

/** The account area at the bottom of the home screen. */
export function homeAccountView(input: { loading: boolean; signedIn: boolean; status: AdminStatus }): HomeAccountView {
  if (input.loading) return 'none';
  if (!input.signedIn) return 'signIn';
  if (input.status === 'admin') return 'admin';
  if (input.status === 'failed') return 'checkFailed';
  return 'signOut';
}
