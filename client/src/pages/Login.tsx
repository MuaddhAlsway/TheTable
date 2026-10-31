import { SignIn, SignUp } from '@clerk/react';
import { useSearchParams, Link } from 'react-router-dom';
import { useBackendAuth } from '../hooks/useBackendAuth';
import RoutePage from './RoutePage';
import '../styles/Dashboard.css';
export default function Login({ signup = false }: { signup?: boolean }) {
  const auth = useBackendAuth(); const [params] = useSearchParams();
  const desired = params.get('redirect');
  const redirect = desired?.startsWith('/') && !desired.startsWith('//') && !desired.includes('\\') ? desired : '/account';
  const retryUrl = `${signup ? '/signup' : '/login'}?redirect=${encodeURIComponent(redirect)}`;
  return <RoutePage title={signup ? 'A seat for you.' : 'Welcome back.'} description="Your orders, reservations, and a little more of The Table."><div className="dashboard-page">{!auth.configured ? <p>Sign-in setup is required. Add your Clerk publishable key as VITE_CLERK_PUBLISHABLE_KEY in the frontend environment. Never add a secret key here.</p> : auth.signedIn ? <p>You're signed in. <Link to={redirect}>Open your account</Link></p> : <>
    {signup ? <SignUp path="/signup" routing="path" oauthFlow="redirect" signInUrl="/login" forceRedirectUrl={redirect} fallback={<p role="status">Loading secure sign-up…</p>} /> : <SignIn path="/login" routing="path" oauthFlow="redirect" signUpUrl="/signup" forceRedirectUrl={redirect} signUpForceRedirectUrl={redirect} fallback={<p role="status">Loading secure sign-in…</p>} />}
    <details className="auth-help"><summary>Having trouble with Google sign-in?</summary>
      <p>If verification times out, start a fresh sign-in and finish the Google steps in the same browser. If you use an in-app browser, open this page in Chrome, Edge, Firefox or Safari and try again. Make sure your network can reach Google and Clerk.</p>
      <p>You can also use the email sign-in method shown above. Complete every verification step requested by your account.</p>
      <button type="button" onClick={() => window.location.assign(retryUrl)}>Start a fresh sign-in</button>
    </details>
  </>}</div></RoutePage>;
}
