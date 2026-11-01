import { NavLink as Link } from 'react-router-dom';
import { useBackendAuth } from '../../hooks/useBackendAuth';
export default function StaffNav() {
  const { profile } = useBackendAuth();
  return <nav className="staff-nav" aria-label="Staff workspaces">{(profile?.role === 'admin' || profile?.role === 'cashier') && <Link to="/cashier">Cashier desk</Link>}{(profile?.role === 'admin' || profile?.role === 'kitchen') && <Link to="/kitchen">Kitchen display</Link>}{profile?.role === 'driver' && <Link to="/driver">My deliveries</Link>}{profile?.role === 'admin' && <><Link to="/admin" end>Admin overview</Link><Link to="/admin/team">Staff & drivers</Link><Link to="/admin/operations">Operations settings</Link><Link to="/admin/fulfillment">Location & fulfillment</Link></>}<Link to="/account">My account</Link></nav>;
}
