import AsyncStorage from '@react-native-async-storage/async-storage';

import type { KeyValueStorage } from './preferences';

/**
 * The device's key-value store. Kept in its own file so the tested modules never import
 * AsyncStorage, whose native module throws at import under jest.
 */
export const deviceStorage: KeyValueStorage = AsyncStorage;
