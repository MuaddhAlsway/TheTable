import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import RoutePage from '../RoutePage';
import LoadingImage from '../../components/common/LoadingImage';
import { useBackendAuth } from '../../hooks/useBackendAuth';
import { useApiResource } from '../../hooks/useApiResource';
import { useSiteContent } from '../../hooks/useSiteContent';
import { apiRequest } from '../../lib/api';
import '../../styles/Dashboard.css';
import '../../styles/ContentEditor.css';
type Field = { key: string; page: string; label: string; type: string; defaultValue: string };
type ContentRecord = { values: Record<string, string>; revision: number; updatedAt: string | null; fields: Field[] };
function Editor({ record, published }: { record: ContentRecord; published: () => void }) {
  const auth = useBackendAuth();
  const pages = [...new Set(record.fields.map(field => field.page))].sort();
  const [page, setPage] = useState(pages.find(value => value === 'Home · Hero') || pages[0]);
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const fields = record.fields.filter(field => field.page === page);
  const value = (field: Field) => draft[field.key] ?? record.values[field.key] ?? field.defaultValue;
  const changed = fields.filter(field => value(field) !== (record.values[field.key] ?? field.defaultValue));
  const visible = fields.filter(field => `${field.label} ${value(field)}`.toLowerCase().includes(search.toLowerCase()));
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!changed.length || busy) return;
    setBusy(true); setError('');
    try { await apiRequest<ContentRecord>('/admin/content', { method: 'PUT', token: await auth.getToken(), body: { revision: record.revision, changes: Object.fromEntries(changed.map(field => [field.key, value(field) === field.defaultValue ? null : value(field)])) } }); published(); }
    catch (error) { setError(error instanceof Error ? error.message : 'Content could not be published.'); } finally { setBusy(false); }
  }
  return <form className="content-editor" onSubmit={event => void save(event)}>
    <div className="content-editor__toolbar"><label>Page or section<select value={page} disabled={busy || changed.length > 0} onChange={event => { setPage(event.target.value); setSearch(''); setDraft({}); setError(''); }}>{pages.map(value => <option key={value} value={value}>{value}</option>)}</select></label><label>Find content<input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search headings, paragraphs, or image fields" /></label></div>
    <p className="content-editor__help">{fields.length} editable fields. Publish or discard your changes before switching sections. Text is displayed as plain text; HTML and scripts are not supported. Image fields accept HTTPS URLs or existing public asset paths.</p>
    <div className="content-editor__actions"><span role="status">{changed.length ? `${changed.length} unpublished changes` : 'Showing published content'}</span><button type="button" disabled={busy || !changed.length} onClick={() => { setDraft({}); setError(''); }}>Discard changes</button><button type="button" disabled={busy} onClick={() => { setDraft(Object.fromEntries(fields.map(field => [field.key, field.defaultValue]))); setError(''); }}>Restore section defaults</button><button className="dashboard-primary" type="submit" disabled={busy || !changed.length}>{busy ? 'Publishing…' : 'Publish changes'}</button></div>
    {error && <p className="content-editor__error" role="alert">{error} Your edits are kept here. If another administrator published changes, copy your edits and reload the editor.</p>}
    <div className="content-editor__fields">{visible.map(field => <section className="content-editor__field" key={field.key}><label htmlFor={`content-${field.key}`}><span>{field.label}</span><small>{field.type === 'image' ? 'IMAGE URL' : 'TEXT'}{record.values[field.key] !== undefined ? ' · CUSTOMIZED' : ''}</small></label>{field.type === 'image' ? <><input id={`content-${field.key}`} value={value(field)} required maxLength={3000} disabled={busy} onChange={event => setDraft(current => ({ ...current, [field.key]: event.target.value }))} /><LoadingImage className="content-editor__image" src={value(field)} alt="Image preview" /></> : <textarea id={`content-${field.key}`} rows={value(field).length > 130 ? 4 : 2} value={value(field)} required maxLength={3000} disabled={busy} onChange={event => setDraft(current => ({ ...current, [field.key]: event.target.value }))} />}<button type="button" disabled={busy || value(field) === field.defaultValue} onClick={() => setDraft(current => ({ ...current, [field.key]: field.defaultValue }))}>Use default</button></section>)}</div>
    {!visible.length && <p>No fields match your search.</p>}
    <p className="content-editor__help">Revision {record.revision}. {record.updatedAt ? `Last published ${new Date(record.updatedAt).toLocaleString('en-GB', { timeZone: 'Asia/Riyadh' })} (Saudi time).` : 'Original site content is active until your first publication.'}</p>
  </form>;
}
export default function WebsiteContent() {
  const resource = useApiResource<ContentRecord>('/admin/content');
  const { refresh } = useSiteContent();
  const [notice, setNotice] = useState('');
  return <RoutePage title="Make it your Table." description="Customize website copy and editorial images. Publishing makes changes visible to visitors."><div className="dashboard-page"><nav className="dashboard-nav" aria-label="Content administration"><Link to="/admin">Admin overview</Link><Link to="/admin/menu">Menu items & prices</Link><Link to="/admin/fulfillment">Address, hours & fulfillment</Link><Link to="/" target="_blank" rel="noopener noreferrer">Open website (new tab)</Link></nav><p className="content-editor__help">Menu dishes and prices, real addresses/hours, customer records, payment statuses, and order rules remain controlled by their existing tools. This editor updates presentation content.</p>{notice && <p className="dashboard-notice" role="status">{notice}</p>}{resource.loading ? <p role="status">Loading website content…</p> : resource.error ? <p role="alert">{resource.error} <button type="button" onClick={resource.reload}>Try again</button></p> : resource.result && <Editor key={resource.result.data.revision} record={resource.result.data} published={() => { setNotice('Website content published. Public pages refresh automatically within a minute or when a visitor returns to the tab.'); refresh(); resource.reload(); }} />}</div></RoutePage>;
}
