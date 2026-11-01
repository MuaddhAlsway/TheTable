import { Link, useParams } from 'react-router-dom';
import { useApiResource } from '../hooks/useApiResource';
import type { ReservationRecord } from '../lib/api-types';
import { reservationDate, reservationReference } from '../lib/reservations';
import ReservationActions from '../components/reservations/ReservationActions';
import RoutePage from './RoutePage';
import '../styles/Reservations.css';
export default function CustomerReservation() {
  const { id = '' } = useParams();
  const record = useApiResource<ReservationRecord>(`/reservations/${encodeURIComponent(id)}`, { pollIntervalMs: 15000 });
  const reservation = record.result?.data;
  return <RoutePage title="Your next gathering." description="Your saved reservation and the restaurant’s latest response."><div className="reservation-page"><Link to="/account#account-reservations">Back to your reservations</Link><button className="reservation-refresh" type="button" onClick={record.reload} disabled={record.loading}>Refresh reservation</button>{record.loading && !reservation ? <p role="status">Loading reservation…</p> : record.error ? <p role="alert">{record.error} <button onClick={record.reload}>Try again</button></p> : reservation && <article className="reservation-card"><p className="reservation-eyebrow">{reservationReference(reservation)}</p><h2>{reservation.status === 'requested' ? 'Waiting for the restaurant.' : reservation.status === 'confirmed' ? 'Your reservation is confirmed.' : reservation.status === 'cancelled' ? 'This reservation is cancelled.' : 'Visit recorded as completed.'}</h2><p>{reservationDate(reservation.dateTime)} · Saudi time</p><p>{reservation.partySize} {reservation.partySize === 1 ? 'guest' : 'guests'}</p><p>{reservation.customer.name} · {reservation.customer.phone}</p>{reservation.notes && <p>Request notes: {reservation.notes}</p>}{reservation.status === 'requested' && <p>A saved request does not guarantee a table. Staff must review seating and confirm it. Check here for their response.</p>}<ReservationActions reservation={reservation} customer onSaved={record.reload} disabled={record.loading}/><h3>Reservation history</h3><ol className="reservation-history">{reservation.statusHistory?.map((entry, index) => <li key={index}><strong>{entry.status}</strong><time dateTime={entry.changedAt}>{reservationDate(entry.changedAt)}</time>{entry.reason && <p>{entry.reason}</p>}</li>)}</ol><Link to="/reservations">Plan another visit</Link></article>}</div></RoutePage>;
}
