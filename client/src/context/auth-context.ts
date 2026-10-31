import { createContext } from 'react';
import type { Profile } from '../lib/api-types';
export type AuthState = { configured: boolean; loaded: boolean; signedIn: boolean; userId: string | null; profile: Profile | null; profileError: string; getToken: () => Promise<string | null>; signOut: () => Promise<void> };
export const AuthContext = createContext<AuthState>({ configured: false, loaded: true, signedIn: false, userId: null, profile: null, profileError: '', getToken: async () => null, signOut: async () => {} });
