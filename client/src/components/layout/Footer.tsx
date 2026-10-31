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
  return (
    <footer className="site-footer" aria-label="The Table footer">
      <div className="site-footer__inner">
        <div className="site-footer__top">
          <div className="site-footer__farewell">
            <p className="site-footer__eyebrow"><span aria-hidden="true" /> THERE'S ALWAYS A NEXT TIME</p>
            <h2>Good meals end.<br /><em>Good company stays.</em></h2>
            <p className="site-footer__intro">Thanks for stopping by.<br />We'll keep a little room at the table for you.</p>
            <Link className="site-footer__hello" to="/contact">Keep in touch <ArrowUpRight size={17} aria-hidden="true" /></Link>
          </div>

          <div className="site-footer__directory">
            <nav className="site-footer__explore" aria-labelledby="footer-explore-title">
              <h2 className="site-footer__heading" id="footer-explore-title">TAKE A LOOK AROUND</h2>
              <ul>{exploreLinks.map((link, index) => <li key={link.href}><Link to={link.href}><span className="site-footer__link-number" aria-hidden="true">0{index + 1}</span><span>{link.label}</span><ArrowUpRight size={15} strokeWidth={1.3} aria-hidden="true" /></Link></li>)}</ul>
            </nav>
            <div className="site-footer__visit">
              <h2 className="site-footer__heading">COME ON OVER</h2>
              <address><MapPin size={16} strokeWidth={1.3} aria-hidden="true" /><span>Jeddah,<br />Saudi Arabia</span></address>
              <div className="site-footer__hours"><span>A LITTLE TIME TOGETHER</span><p>Every day<br /><time dateTime="12:00">12:00 PM</time> — <time dateTime="23:00">11:00 PM</time></p></div>
              <Link className="site-footer__visit-link" to="/locations">Plan your visit <ArrowUpRight size={14} aria-hidden="true" /></Link>
            </div>
          </div>
        </div>

        <div className="site-footer__signature">
          <div className="site-footer__signature-caption"><span>GOOD FOOD. YOUR PEOPLE.</span><span>JEDDAH, SAUDI ARABIA</span></div>
          <Link className="site-footer__wordmark" to="/" aria-label="The Table homepage">The Table<span>.</span></Link>
          <div className="site-footer__signature-rule" aria-hidden="true"><span /> A PLACE TO COME TOGETHER <span /></div>
        </div>

        <div className="site-footer__bottom">
          <p>© {new Date().getFullYear()} The Table. All rights reserved.</p>
          <Link className="site-footer__privacy" to="/privacy">Privacy policy</Link>
          <Link className="site-footer__back" to="#root">Back to the top <span><ArrowUp size={16} strokeWidth={1.5} aria-hidden="true" /></span></Link>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
