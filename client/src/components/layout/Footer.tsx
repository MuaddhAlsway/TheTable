import { usePublicSettings } from "../../hooks/usePublicSettings";
import { restaurantHours } from "../../utils/restaurantHours";
import SiteText from "../content/SiteText";
import { Link } from "react-router-dom";
import { ArrowUp, ArrowUpRight, MapPin } from "lucide-react";
import "../../styles/Footer.css";

const exploreLinks = [
  { label: "On the menu", href: "/menu" },
  { label: "Our philosophy", href: "/about" },
  { label: "Find your table", href: "/locations" },
  { label: "Reservations", href: "/reservations" },
];

function Footer() {
  const { settings } = usePublicSettings();
  const hours = restaurantHours(settings?.schedule);
  return (
    <footer className="site-footer" aria-label="The Table footer">
      <div className="site-footer__inner">
        <div className="site-footer__top">
          <div className="site-footer__farewell">
            <p className="site-footer__eyebrow"><span aria-hidden="true" /> <SiteText contentKey="Footer-text-1f4j6bl" fallback={"THERE'S ALWAYS A NEXT TIME"} /></p>
            <h2><SiteText contentKey="Footer-text-91asu9" fallback={"Good meals end."} /><br /><em><SiteText contentKey="Footer-text-5tu7al" fallback={"Good company stays."} /></em></h2>
            <p className="site-footer__intro"><SiteText contentKey="Footer-text-10fx3ds" fallback={"Thanks for stopping by."} /><br /><SiteText contentKey="Footer-text-bdijuj" fallback={"We'll keep a little room at the table for you."} /></p>
            <Link className="site-footer__hello" to="/contact"><SiteText contentKey="Footer-text-1v2qo0o" fallback={"Keep in touch "} /><ArrowUpRight size={17} aria-hidden="true" /></Link>
          </div>

          <div className="site-footer__directory">
            <nav className="site-footer__explore" aria-labelledby="footer-explore-title">
              <h2 className="site-footer__heading" id="footer-explore-title"><SiteText contentKey="Footer-text-1srq6tt" fallback={"TAKE A LOOK AROUND"} /></h2>
              <ul>{exploreLinks.map((link, index) => <li key={link.href}><Link to={link.href}><span className="site-footer__link-number" aria-hidden="true">0{index + 1}</span><span><SiteText namespace="Footer-exploreLinks-label" fallback={link.label} /></span><ArrowUpRight size={15} strokeWidth={1.3} aria-hidden="true" /></Link></li>)}</ul>
            </nav>
            <div className="site-footer__visit">
              <h2 className="site-footer__heading"><SiteText contentKey="Footer-text-mhrrmw" fallback={"COME ON OVER"} /></h2>
              <address><MapPin size={16} strokeWidth={1.3} aria-hidden="true" /><span><SiteText contentKey="Footer-text-bypzbr" fallback={"Jeddah,"} /><br /><SiteText contentKey="Footer-text-pccj5r" fallback={"Saudi Arabia"} /></span></address>
              <div className="site-footer__hours"><span><SiteText contentKey="Footer-text-uotgz5" fallback="A LITTLE TIME TOGETHER" /></span>{hours && settings?.schedule ? <p>{hours.days}<br /><time dateTime={settings.schedule.opens}>{hours.opens}</time> — <time dateTime={settings.schedule.closes}>{hours.closes}</time></p> : <p>See Find Us for confirmed hours.</p>}</div>
              <Link className="site-footer__visit-link" to="/locations"><SiteText contentKey="Footer-text-a2qhwq" fallback={"Plan your visit "} /><ArrowUpRight size={14} aria-hidden="true" /></Link>
            </div>
          </div>
        </div>

        <div className="site-footer__signature">
          <div className="site-footer__signature-caption"><span><SiteText contentKey="Footer-text-1xfukkm" fallback={"GOOD FOOD. YOUR PEOPLE."} /></span><span><SiteText contentKey="Footer-text-1kjxe0f" fallback={"JEDDAH, SAUDI ARABIA"} /></span></div>
          <Link className="site-footer__wordmark" to="/" aria-label="The Table homepage"><SiteText contentKey="Footer-text-1q3fzns" fallback={"The Table"} /><span>.</span></Link>
          <div className="site-footer__signature-rule" aria-hidden="true"><span /> A PLACE TO COME TOGETHER <span /></div>
        </div>

        <div className="site-footer__bottom">
          <p>© {new Date().getFullYear()} <SiteText contentKey="Footer-text-x57ra" fallback={"The Table. All rights reserved."} /></p>
          <Link className="site-footer__privacy" to="/privacy"><SiteText contentKey="Footer-text-fhaxvj" fallback={"Privacy policy"} /></Link>
          <Link className="site-footer__back" to="#root" onClick={event => {
            event.preventDefault();
            const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            window.scrollTo({ top: 0, left: 0, behavior: reducedMotion ? 'instant' : 'smooth' });
            document.querySelector<HTMLElement>('main h1')?.focus({ preventScroll: true });
          }}><SiteText contentKey="Footer-text-xsjgbl" fallback={"Back to the top "} /><span><ArrowUp size={16} strokeWidth={1.5} aria-hidden="true" /></span></Link>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
