// Whether a business form was just sent. Kept in memory only, on purpose: a refresh or a typed
// URL starts with it unset, so /business/submitted never shows "Sent for review" unless a send
// really happened (#58).
let justSent = false;

/** Call right before going to the "Sent for review" screen after a successful send. */
export function markJustSent(): void {
  justSent = true;
}

/** True when a form was just sent. Reading does not clear it, so a double render is safe. */
export function wasJustSent(): boolean {
  return justSent;
}

/** Use up the flag, so a later visit to the screen does not show the confirmation again. */
export function clearJustSent(): void {
  justSent = false;
}
