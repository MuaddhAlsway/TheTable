import SiteText from "../content/SiteText";
import LoadingImage from "../common/LoadingImage";
import reservationBackground from "../../assets/ReservationDining.png";
import { Link } from "react-router-dom";
import { ArrowUpRight, CalendarDays, MapPin, Sparkles, Utensils } from "lucide-react";
import "../../styles/ReservationCta.css";

function ReservationCta() {
  return (
    <section className="reservation-cta" id="reserve" aria-labelledby="reservation-cta-title">
      <LoadingImage className="reservation-cta__background" src={reservationBackground} alt="" aria-hidden="true" loading="lazy" decoding="async" contentKey="ReservationCta-image-reservationBackground" />
      <div className="reservation-cta__inner">
        <div className="reservation-cta__story">
          <p className="reservation-cta__eyebrow"><span aria-hidden="true" /> <SiteText contentKey="ReservationCta-text-18zo0gi" fallback={"GOOD COMPANY STARTS WITH AN INVITATION"} /></p>
          <h2 id="reservation-cta-title"><SiteText contentKey="ReservationCta-text-10ed41a" fallback={"Let's make"} /><br /><SiteText contentKey="ReservationCta-text-1cwxfk2" fallback={"an evening"} /><br /><em><SiteText contentKey="ReservationCta-text-1gg824h" fallback={"of it."} /></em></h2>
          <p className="reservation-cta__description"><SiteText contentKey="ReservationCta-text-6qfl67" fallback={"Put the everyday on pause. Bring your favorite people, order something delicious, and let the conversation run a little longer."} /></p>
          <div className="reservation-cta__signoff"><span aria-hidden="true" className="reservation-cta__signoff-line" /><p><SiteText contentKey="ReservationCta-text-1jtcfk1" fallback={"We'll set the table."} /><br /><em><SiteText contentKey="ReservationCta-text-2guje" fallback={"You make the memories."} /></em></p></div>
          <Sparkles className="reservation-cta__spark" size={76} strokeWidth={.65} aria-hidden="true" />
        </div>

        <div className="reservation-cta__invitation">
          <div className="reservation-cta__card-top"><span><SiteText contentKey="ReservationCta-text-isovow" fallback={"AN INVITATION FROM THE TABLE"} /></span><Utensils size={19} strokeWidth={1.2} aria-hidden="true" /></div>
          <div className="reservation-cta__card-body">
            <span className="reservation-cta__prelude"><SiteText contentKey="ReservationCta-text-fekgpn" fallback={"A seat for you. A moment for us."} /></span>
            <h3><SiteText contentKey="ReservationCta-text-1cvux6s" fallback={"You're"} /><br /><em><SiteText contentKey="ReservationCta-text-d737ee" fallback={"invited."} /></em></h3>
            <p className="reservation-cta__card-copy"><SiteText contentKey="ReservationCta-text-9x7clf" fallback={"For a special occasion."} /><br /><SiteText contentKey="ReservationCta-text-tvgojl" fallback={"Or just because it's a good day to gather."} /></p>
            <dl className="reservation-cta__details">
              <div><dt><MapPin size={15} strokeWidth={1.4} aria-hidden="true" /> <SiteText contentKey="ReservationCta-text-1ytmisv" fallback={"THE PLACE"} /></dt><dd><SiteText contentKey="ReservationCta-text-159hthg" fallback={"The Table, Jeddah"} /></dd></div>
              <div><dt><CalendarDays size={15} strokeWidth={1.4} aria-hidden="true" /> <SiteText contentKey="ReservationCta-text-mzs2nz" fallback={"THE OCCASION"} /></dt><dd><SiteText contentKey="ReservationCta-text-oi2klk" fallback={"Entirely up to you."} /></dd></div>
            </dl>
          </div>
          <div className="reservation-cta__ticket-end">
            <Link className="reservation-cta__button" to="/reservations"><span><SiteText contentKey="ReservationCta-text-q4rgwu" fallback={"Let's book a table"} /></span><ArrowUpRight size={22} strokeWidth={1.5} aria-hidden="true" /></Link>
            <Link className="reservation-cta__contact" to="/contact"><SiteText contentKey="ReservationCta-text-w8ep14" fallback={"Planning something together? Talk to us "} /><ArrowUpRight size={13} aria-hidden="true" /></Link>
          </div>
        </div>
      </div>
      <div className="reservation-cta__bottom"><span><SiteText contentKey="ReservationCta-text-1vyzp2n" fallback={"THE TABLE / JEDDAH"} /></span><p><SiteText contentKey="ReservationCta-text-6rxf4x" fallback={"Less scrolling. "} /><em><SiteText contentKey="ReservationCta-text-khvgiu" fallback={"More sharing."} /></em></p><Link to="/menu"><SiteText contentKey="ReservationCta-text-1is1f8e" fallback={"One more look at the menu "} /><ArrowUpRight size={15} aria-hidden="true" /></Link></div>
    </section>
  );
}

export default ReservationCta;
