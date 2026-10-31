import LoadingImage from "../common/LoadingImage";
import reservationBackground from "../../assets/ReservationDining.png";
import { Link } from "react-router-dom";
import { ArrowUpRight, CalendarDays, MapPin, Sparkles, Utensils } from "lucide-react";
import "../../styles/ReservationCta.css";

function ReservationCta() {
  return (
    <section className="reservation-cta" id="reserve" aria-labelledby="reservation-cta-title">
      <LoadingImage className="reservation-cta__background" src={reservationBackground} alt="" aria-hidden="true" loading="lazy" decoding="async" />
      <div className="reservation-cta__inner">
        <div className="reservation-cta__story">
          <p className="reservation-cta__eyebrow"><span aria-hidden="true" /> GOOD COMPANY STARTS WITH AN INVITATION</p>
          <h2 id="reservation-cta-title">Let's make<br />an evening<br /><em>of it.</em></h2>
          <p className="reservation-cta__description">Put the everyday on pause. Bring your favorite people, order something delicious, and let the conversation run a little longer.</p>
          <div className="reservation-cta__signoff"><span aria-hidden="true" className="reservation-cta__signoff-line" /><p>We'll set the table.<br /><em>You make the memories.</em></p></div>
          <Sparkles className="reservation-cta__spark" size={76} strokeWidth={.65} aria-hidden="true" />
        </div>

        <div className="reservation-cta__invitation">
          <div className="reservation-cta__card-top"><span>AN INVITATION FROM THE TABLE</span><Utensils size={19} strokeWidth={1.2} aria-hidden="true" /></div>
          <div className="reservation-cta__card-body">
            <span className="reservation-cta__prelude">A seat for you. A moment for us.</span>
            <h3>You're<br /><em>invited.</em></h3>
            <p className="reservation-cta__card-copy">For a special occasion.<br />Or just because it's a good day to gather.</p>
            <dl className="reservation-cta__details">
              <div><dt><MapPin size={15} strokeWidth={1.4} aria-hidden="true" /> THE PLACE</dt><dd>The Table, Jeddah</dd></div>
              <div><dt><CalendarDays size={15} strokeWidth={1.4} aria-hidden="true" /> THE OCCASION</dt><dd>Entirely up to you.</dd></div>
            </dl>
          </div>
          <div className="reservation-cta__ticket-end">
            <Link className="reservation-cta__button" to="/reservations"><span>Let's book a table</span><ArrowUpRight size={22} strokeWidth={1.5} aria-hidden="true" /></Link>
            <Link className="reservation-cta__contact" to="/contact">Planning something together? Talk to us <ArrowUpRight size={13} aria-hidden="true" /></Link>
          </div>
        </div>
      </div>
      <div className="reservation-cta__bottom"><span>THE TABLE / JEDDAH</span><p>Less scrolling. <em>More sharing.</em></p><Link to="/menu">One more look at the menu <ArrowUpRight size={15} aria-hidden="true" /></Link></div>
    </section>
  );
}

export default ReservationCta;
