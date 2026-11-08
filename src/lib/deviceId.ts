import type { KeyValueStorage } from './preferences';

/**
 * An anonymous random id for this device, used only as the key for the report limits
 * (submit_place_report counts reports per device id). It is not a hardware id, is never tied
 * to an account and is never shown in the UI. Clearing the app's storage gives a new one.
 */

export const DEVICE_ID_STORAGE_KEY = 'fitness-app.device-id';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** True for a UUID string, the shape the database's `uuid` column accepts. */
export function isDeviceId(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

type CryptoLike = { randomUUID?: () => string };

/**
 * A new random v4 UUID. Uses `crypto.randomUUID` when the platform has it and no `random` is
 * passed; otherwise builds one from `random` (Math.random by default). The id is a rate-limit
 * key, not a secret, so Math.random is good enough and no new dependency is needed.
 */
export function createDeviceId(random?: () => number): string {
  if (!random) {
    const native = (globalThis as { crypto?: CryptoLike }).crypto?.randomUUID?.();
    if (isDeviceId(native)) return native.toLowerCase();
  }
  const next = random ?? Math.random;
  const bytes = Array.from({ length: 16 }, () => Math.floor(next() * 256) & 0xff);
  // RFC 4122: version 4 in the high nibble of byte 6, variant 10xx in byte 8.
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.map((byte) => byte.toString(16).padStart(2, '0')).join('');
  return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)].join('-');
}

/**
 * This device's id: the stored one when it is valid, otherwise a new one that is stored for
 * next time. If storage fails, returns a fresh id for this call only, so reporting still works.
 */
export async function getDeviceId(
  storage: KeyValueStorage,
  make: () => string = createDeviceId,
): Promise<string> {
  try {
    const stored = await storage.getItem(DEVICE_ID_STORAGE_KEY);
    if (isDeviceId(stored)) return stored;
    const id = make();
    await storage.setItem(DEVICE_ID_STORAGE_KEY, id);
    return id;
  } catch {
    return make();
  }
}
