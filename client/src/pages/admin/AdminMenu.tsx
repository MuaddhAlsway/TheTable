import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import RoutePage from '../RoutePage';
import { useApiResource } from '../../hooks/useApiResource';
import { useBackendAuth } from '../../hooks/useBackendAuth';
import { apiRequest } from '../../lib/api';
import type { ApiMenuItem } from '../../lib/api-types';
import { money } from '../../lib/api-types';
import { menuCategories } from '../../data/menuItems';
import '../../styles/Dashboard.css';
const blank = { name: '', slug: '', description: '', priceHalalas: '', category: 'Starters', imageUrl: '', available: true, tags: '', allergens: '', customizationOptions: '[]' };
export default function AdminMenu() {
  const auth = useBackendAuth(); const [page, setPage] = useState(1); const [search, setSearch] = useState(''); const [filter, setFilter] = useState('');
  const records = useApiResource<ApiMenuItem[]>(`/admin/menu?page=${page}&limit=20${search ? `&search=${encodeURIComponent(search)}` : ''}${filter ? `&available=${filter}` : ''}`);
  const [draft, setDraft] = useState(blank); const [editing, setEditing] = useState<string | null>(null); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [notice, setNotice] = useState('');
  const beginEdit = (item: ApiMenuItem) => { setEditing(item.id); setDraft({ name: item.name, slug: item.slug, description: item.description, priceHalalas: String(item.priceHalalas), category: item.category, imageUrl: item.imageUrl, available: item.available, tags: item.tags.join(', '), allergens: item.allergens.join(', '), customizationOptions: JSON.stringify(item.customizationOptions, null, 2) }); setError(''); setNotice('Editing ' + item.name); };
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setNotice(''); let options: unknown;
    try { options = JSON.parse(draft.customizationOptions); } catch { setError('Customization options must be valid JSON. Use [] for none.'); return; }
    if (!Number.isSafeInteger(Number(draft.priceHalalas)) || Number(draft.priceHalalas) < 0) { setError('Enter an integer price in halalas.'); return; }
    const split = (value: string) => value.split(',').map(s => s.trim()).filter(Boolean);
    const payload = { name: draft.name, slug: draft.slug, description: draft.description, priceHalalas: Number(draft.priceHalalas), category: draft.category, imageUrl: draft.imageUrl, available: draft.available, tags: split(draft.tags), allergens: split(draft.allergens), customizationOptions: options };
    setBusy(true);
    try { await apiRequest(`/admin/menu${editing ? '/' + editing : ''}`, { method: editing ? 'PUT' : 'POST', token: await auth.getToken(), body: payload }); setDraft(blank); setEditing(null); setNotice('Menu item saved.'); records.reload(); }
    catch (error) { setError(error instanceof Error ? error.message : 'Unable to save menu item.'); } finally { setBusy(false); }
  }
  async function change(item: ApiMenuItem, archive = false) { if (archive && !window.confirm(`Archive ${item.name}?`)) return; setBusy(true); setError(''); try { await apiRequest(`/admin/menu/${item.id}${archive ? '' : '/availability'}`, { method: archive ? 'DELETE' : 'PATCH', token: await auth.getToken(), ...(archive ? {} : { body: { available: !item.available } }) }); records.reload(); } catch (error) { setError(error instanceof Error ? error.message : 'Update failed.'); } finally { setBusy(false); } }
  return <RoutePage title="From the kitchen." description="Manage verified menu content. Prices are stored in integer halalas, never inferred from preview dishes."><div className="dashboard-page"><nav className="dashboard-nav"><Link to="/admin">Overview</Link><Link to="/admin/orders">Orders</Link><Link to="/admin/reservations">Reservations</Link></nav><section className="dashboard-panel"><h2>{editing ? 'Edit menu item' : 'Create menu item'}</h2><form className="dashboard-form" onSubmit={event => void save(event)}>
    <label>Name<input value={draft.name} onChange={e => setDraft(v => ({ ...v, name: e.target.value }))} required maxLength={120} /></label>
    <label>Slug<input value={draft.slug} onChange={e => setDraft(v => ({ ...v, slug: e.target.value }))} required pattern="[a-z0-9]+(-[a-z0-9]+)*" /></label>
    <label>Description<textarea value={draft.description} onChange={e => setDraft(v => ({ ...v, description: e.target.value }))} required maxLength={2000} /></label>
    <label>Price in halalas (SAR × 100)<input value={draft.priceHalalas} onChange={e => setDraft(v => ({ ...v, priceHalalas: e.target.value }))} type="number" min="0" step="1" required /></label>
    <label>Category<select value={draft.category} onChange={e => setDraft(v => ({ ...v, category: e.target.value }))}>{menuCategories.filter(c => c !== 'All').map(c => <option key={c}>{c}</option>)}</select></label>
    <label>Image URL or /menu-images/ path<input value={draft.imageUrl} onChange={e => setDraft(v => ({ ...v, imageUrl: e.target.value }))} type="text" required /></label>
    <label>Tags (comma separated)<input value={draft.tags} onChange={e => setDraft(v => ({ ...v, tags: e.target.value }))} /></label>
    <label>Allergens (comma separated)<input value={draft.allergens} onChange={e => setDraft(v => ({ ...v, allergens: e.target.value }))} /></label>
    <label className="dashboard-check"><input type="checkbox" checked={draft.available} onChange={e => setDraft(v => ({ ...v, available: e.target.checked }))} /> Available</label>
    <label>Customization groups (JSON; [] for none)<textarea value={draft.customizationOptions} onChange={e => setDraft(v => ({ ...v, customizationOptions: e.target.value }))} rows={5} /></label>
    <button className="dashboard-primary" disabled={busy} type="submit">{busy ? 'Saving…' : 'Save menu item'}</button>{editing && <button type="button" onClick={() => { setEditing(null); setDraft(blank); }}>Cancel edit</button>}
  </form><p role="alert">{error}</p><p role="status">{notice}</p></section>
  <div className="dashboard-filters"><label>Search menu<input type="search" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} /></label><label>Availability<select value={filter} onChange={e => { setFilter(e.target.value); setPage(1); }}><option value="">All</option><option value="true">Available</option><option value="false">Unavailable</option></select></label></div>
  {records.loading ? <p role="status">Loading menu…</p> : records.error ? <p role="alert">{records.error} <button onClick={records.reload}>Try again</button></p> : records.result?.data.length ? records.result.data.map(item => <section className="dashboard-panel" key={item.id}><h2>{item.name}</h2><p>{item.category} · {money(item.priceHalalas)} · {item.available ? 'Available' : 'Unavailable'}</p><div className="dashboard-nav"><button disabled={busy} onClick={() => beginEdit(item)}>Edit</button><button disabled={busy} onClick={() => void change(item)}>{item.available ? 'Mark unavailable' : 'Mark available'}</button><button disabled={busy} onClick={() => void change(item, true)}>Archive</button></div></section>) : <p>No menu items found. Add verified items above; preview prices are not automatically imported.</p>}
  <div className="dashboard-pagination"><button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</button><span>Page {page}</span><button disabled={!records.result?.pagination || page >= records.result.pagination.pages} onClick={() => setPage(p => p + 1)}>Next</button></div></div></RoutePage>;
}
