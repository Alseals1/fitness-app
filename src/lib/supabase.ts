import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

import { readSupabaseConfig } from './config';

const { url, anonKey } = readSupabaseConfig();

/** The one Supabase client for the app. The anon key is public by design: Row Level Security protects the data. */
export const supabase = createClient(url, anonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
