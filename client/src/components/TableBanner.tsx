import { Link, useLocation } from 'react-router-dom';
import { useTableSession } from '../context/table-session';
import '../styles/Tables.css';
export default function TableBanner() {
  const { table, select } = useTableSession();
  const { pathname } = useLocation();
  if (!table || !['/menu', '/cart', '/checkout'].includes(pathname)) return null;
  return <aside className="table-banner" aria-label="Current dining table"><span>Dining at <strong>{table.label}</strong></span><Link to="/checkout">Order for this table</Link><button type="button" onClick={() => select(null)}>Leave table ordering</button></aside>;
}
