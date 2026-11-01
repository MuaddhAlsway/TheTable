import { Link, useParams } from 'react-router-dom';
import { useApiResource } from '../hooks/useApiResource';
import { useTableSession } from '../context/table-session';
import RoutePage from './RoutePage';
import '../styles/Tables.css';
export type TableInfo = { label: string; availability: { available: boolean; reasons: string[] } };
export default function TableLanding() {
  const { token = '' } = useParams();
  const info = useApiResource<TableInfo>(`/tables/${encodeURIComponent(token)}`);
  const { select } = useTableSession();
  return <RoutePage title="Your table is ready." description="Scan, choose your dishes, and order for the table where you are seated."><section className="table-welcome">
    {info.loading ? <p role="status">Checking your table…</p> : info.error ? <p role="alert">{info.error} <button onClick={info.reload}>Try again</button></p> : info.result && <><p className="table-eyebrow">WELCOME TO THE TABLE</p><h2>{info.result.data.label}</h2><p>Check that this matches the table where you are sitting. Your order will carry this table label to the cashier and kitchen.</p>{!info.result.data.availability.available && <p role="status">{info.result.data.availability.reasons.join(' ')}</p>}<Link className="table-primary" to="/menu" onClick={() => select({ token, label: info.result!.data.label })}>Browse menu & order here</Link><p>Sign-in and secure Stripe payment are required at checkout. Staff acceptance is separate from payment.</p></>}
  </section></RoutePage>;
}
