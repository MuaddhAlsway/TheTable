import { useEffect, useState, type FormEvent } from 'react';
import QRCode from 'qrcode';
import { Link } from 'react-router-dom';
import { useApiResource } from '../../hooks/useApiResource';
import { useBackendAuth } from '../../hooks/useBackendAuth';
import { apiRequest } from '../../lib/api';
import StaffNav from '../../components/staff/StaffNav';
import RoutePage from '../RoutePage';
import '../../styles/Tables.css';
type Table = { _id: string; label: string; token: string; enabled: boolean; updatedAt: string };
function TableCard({ table, refresh }: { table: Table; refresh: () => void }) {
  const auth = useBackendAuth();
  const [label, setLabel] = useState(table.label);
  const [qr, setQr] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [rotate, setRotate] = useState(false);
  const [printing, setPrinting] = useState(false);
  function printCode() { setPrinting(true); requestAnimationFrame(() => requestAnimationFrame(() => { window.print(); setPrinting(false); })); }
  const url = `${window.location.origin}/table/${table.token}`;
  useEffect(() => { let active = true; QRCode.toDataURL(url, { width: 640, margin: 4, errorCorrectionLevel: 'M', color: { dark: '#292E24', light: '#FFFFFF' } }).then(image => { if (active) setQr(image); }).catch(() => { if (active) setError('QR generation failed. Refresh this page.'); }); return () => { active = false; }; }, [url]);
  async function save(enabled: boolean, rotateCode = false) {
    if (busy) return;
    setBusy(true); setError('');
    try { await apiRequest(`/admin/tables/${table._id}`, { method: 'PUT', token: await auth.getToken(), body: { label: label.trim(), enabled, rotateCode, expectedUpdatedAt: table.updatedAt } }); refresh(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not update table.'); }
    finally { setBusy(false); setRotate(false); }
  }
  return <article className={`table-admin-card${printing ? " is-printing" : ""}`}><h2>{table.label}</h2><p>{table.enabled ? 'Enabled for table ordering' : 'Disabled · QR cannot start new orders'}</p>{qr && <img className="table-qr" src={qr} width={240} height={240} alt={`Ordering QR code for ${table.label}`}/>}<p className="table-qr-url"><Link to={`/table/${table.token}`}>Open table ordering link</Link></p><div className="table-admin-actions">{qr && <button type="button" onClick={printCode}>Print table QR</button>}{qr && <a download={`thetable-${table.label.replace(/[^a-zA-Z0-9-]/g, '-')}-qr.png`} href={qr}>Download QR image</a>}<button type="button" disabled={busy} onClick={() => void save(!table.enabled)}>{table.enabled ? 'Disable table' : 'Enable table'}</button></div><form onSubmit={event => { event.preventDefault(); void save(table.enabled); }}><label htmlFor={`label-${table._id}`}>Table label<input id={`label-${table._id}`} required maxLength={60} value={label} onChange={event => setLabel(event.target.value)}/></label><button disabled={busy || !label.trim()} type="submit">Save label</button></form>{!rotate ? <button type="button" onClick={() => setRotate(true)}>Replace QR code</button> : <div><p>Replacing the code invalidates the old QR link. Print and replace the physical QR sign afterward.</p><button disabled={busy} onClick={() => void save(table.enabled, true)}>Confirm replace code</button><button disabled={busy} onClick={() => setRotate(false)}>Keep code</button></div>}{error && <p role="alert">{error}</p>}</article>;
}
export default function Tables() {
  const records = useApiResource<Table[]>('/admin/tables');
  const auth = useBackendAuth();
  const [label, setLabel] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function create(event: FormEvent) {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError('');
    try { await apiRequest('/admin/tables', { method: 'POST', token: await auth.getToken(), body: { label: label.trim(), enabled: true } }); setLabel(''); records.reload(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not create table.'); }
    finally { setBusy(false); }
  }
  return <RoutePage workspace title="A QR for every table." description="Create your actual dining tables, download their QR codes, and place each code on its matching table."><div className="table-admin"><StaffNav/><p>QR links use this website’s address: <strong>{window.location.origin}</strong>. For customers’ phones, generate and download codes from your deployed website, not localhost. Customers must sign in and pay through the existing Stripe flow.</p><p>QR codes identify a table; they cannot prove someone is physically seated there. The cashier must review the table before accepting an order.</p><form className="table-create" onSubmit={event => void create(event)}><label htmlFor="new-table-label">Actual table label<input id="new-table-label" required maxLength={60} placeholder="Enter the label on your physical table" value={label} onChange={event => setLabel(event.target.value)}/></label><button type="submit" disabled={busy || !label.trim()}>{busy ? 'Creating…' : 'Create table & QR'}</button></form>{error && <p role="alert">{error}</p>}{records.loading ? <p role="status">Loading tables…</p> : records.error ? <p role="alert">{records.error} <button onClick={records.reload}>Retry</button></p> : !records.result?.data.length ? <p>No dining tables yet. Add your first actual table above.</p> : <div className="table-admin-grid">{records.result.data.map(table => <TableCard key={table._id + table.updatedAt} table={table} refresh={records.reload}/>)}</div>}</div></RoutePage>;
}
