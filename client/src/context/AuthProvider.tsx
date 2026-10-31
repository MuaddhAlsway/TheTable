import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { ClerkProvider, useAuth, useClerk } from '@clerk/react';
import { AuthContext } from './auth-context';
import { apiRequest, API_CONFIGURED } from '../lib/api';
import type { Profile } from '../lib/api-types';
const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined;
function ClerkBridge({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn, getToken: clerkGetToken, userId } = useAuth();
  const { signOut: clerkSignOut } = useClerk();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileError, setProfileError] = useState('');
  const getToken = useCallback(() => clerkGetToken(), [clerkGetToken]);
  const signOut = useCallback(async () => { try { await clerkSignOut({ redirectUrl: '/' }); } catch { setProfileError('Unable to sign out. Please try again.'); } }, [clerkSignOut]);
  useEffect(() => {
    let active = true;
    async function load() {
      if (!isLoaded || !isSignedIn || !API_CONFIGURED) { if (active) { setProfile(null); setProfileError(''); } return; }
      try { const result = await apiRequest<Profile>('/users/me', { token: await getToken() }); if (active) { setProfile(result.data); setProfileError(''); } }
      catch (error) { if (active) { setProfile(null); setProfileError(error instanceof Error ? error.message : 'Unable to load profile.'); } }
    }
    void load(); return () => { active = false; };
  }, [isLoaded, isSignedIn, userId, getToken]);
  return <AuthContext.Provider value={{ configured: true, loaded: isLoaded, signedIn: !!isSignedIn, profile: profile?.id === userId ? profile : null, profileError, getToken, signOut }}>{children}</AuthContext.Provider>;
}
export function AuthProvider({ children }: { children: ReactNode }) {
  if (!publishableKey) return <>{children}</>;
  return <ClerkProvider publishableKey={publishableKey} signInUrl="/login" signUpUrl="/signup"><ClerkBridge>{children}</ClerkBridge></ClerkProvider>;
}
