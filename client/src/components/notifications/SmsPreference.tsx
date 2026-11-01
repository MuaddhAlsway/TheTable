import { useState } from 'react';
import { useApiResource } from '../../hooks/useApiResource';
import { useBackendAuth } from '../../hooks/useBackendAuth';
import { apiRequest } from '../../lib/api';
import '../../styles/Sms.css';
export default function SmsPreference() {
  const record = useApiResource<{ blocked: boolean }>('/notifications/sms/preference');
  const auth = useBackendAuth(); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  async function toggle() { if (!record.result || busy) return; setBusy(true); setError(''); try { await apiRequest('/notifications/sms/preference', { method: 'PUT', token: await auth.getToken(), body: { blocked: !record.result.data.blocked } }); record.reload(); } catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not save SMS preference.'); } finally { setBusy(false); } }
  return <section className="dashboard-panel sms-preference"><h2>SMS updates</h2><p>SMS is optional for each order or reservation. Pausing here blocks future submissions to the gateway for this account, including pending notifications. Messages already submitted to your SIM gateway may still arrive.</p>{record.loading ? <p role="status">Loading SMS preference…</p> : record.error ? <p role="alert">{record.error} <button onClick={record.reload}>Retry SMS preference</button></p> : record.result && <><p>{record.result.data.blocked ? 'All SMS updates are paused.' : 'SMS updates are allowed for requests where you opted in.'}</p><button type="button" onClick={() => void toggle()} disabled={busy}>{record.result.data.blocked ? 'Allow opted-in SMS updates' : 'Pause all SMS updates'}</button></>}{error && <p role="alert">{error}</p>}</section>;
}
