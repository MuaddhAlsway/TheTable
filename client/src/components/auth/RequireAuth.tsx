import type { StaffRole } from "../../lib/api-types";
import { Navigate, useLocation } from 'react-router-dom';
import { useBackendAuth } from '../../hooks/useBackendAuth';
import { API_CONFIGURED } from '../../lib/api';
import RoutePage from '../../pages/RoutePage';
import { Fragment, type ReactNode } from 'react';
export default function RequireAuth({ children, admin = false, roles }: { children: ReactNode; admin?: boolean; roles?: StaffRole[] }) {
  const auth = useBackendAuth(); const location = useLocation();
  const allowed = admin ? ["admin"] : roles;
  if (!auth.configured || !API_CONFIGURED) return <RoutePage title="Account setup required." description="Authentication and the restaurant API need to be configured before this page is available." />;
  if (!auth.loaded) return <RoutePage title="Just a moment." description="Loading your account…" />;
  if (!auth.signedIn) return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  if (allowed && auth.profileError) return <RoutePage title="Unable to verify access." description={auth.profileError} />;
  if (allowed && !auth.profile) return <RoutePage title="Checking access." description="Verifying your server-side role…" />;
  if (allowed && !allowed.includes(auth.profile!.role as StaffRole)) return <RoutePage title="Staff access required." description="This account has not been assigned a permitted Clerk role for this workflow." />;
  return <Fragment key={auth.userId}>{children}</Fragment>;
}
