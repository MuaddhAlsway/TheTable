import { useBackendAuth } from "../../hooks/useBackendAuth";
import { useCart } from "../../hooks/useCart";
import { Link, NavLink } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, MapPin, Menu, ShoppingBag, UserRound, LogOut, X } from "lucide-react";
import "../../styles/Navbar.css";

const navigation = [
  { label: "Home", href: "/" },
  { label: "The menu", href: "/menu" },
  { label: "Our philosophy", href: "/about" },
  { label: "Find us", href: "/locations" },
  { label: "Reservations", href: "/reservations" },
  { label: "Get in touch", href: "/contact" },
];

function Navbar() {
  const auth = useBackendAuth();
  const { totalQuantity } = useCart();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [hasScrolled, setHasScrolled] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const updateScroll = () => setHasScrolled(window.scrollY > 16);
    const frame = requestAnimationFrame(updateScroll);
    window.addEventListener("scroll", updateScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", updateScroll);
    };
  }, []);

  useEffect(() => {
    if (!isMenuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
        toggleRef.current?.focus();
      }
    };
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !headerRef.current?.contains(event.target)) setIsMenuOpen(false);
    };
    const desktop = window.matchMedia("(min-width: 1101px)");
    const onDesktop = () => { if (desktop.matches) setIsMenuOpen(false); };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    desktop.addEventListener("change", onDesktop);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
      desktop.removeEventListener("change", onDesktop);
    };
  }, [isMenuOpen]);

  const closeMenu = () => setIsMenuOpen(false);

  return (
    <header className={`site-header${hasScrolled ? " is-scrolled" : ""}`} ref={headerRef}>
      <div className="navbar-shell">
        <div className="navbar-masthead">
          <span className="navbar-location"><MapPin size={12} aria-hidden="true" /> JEDDAH, SAUDI ARABIA</span>
          <p>Good food. Long conversations.</p>
          <Link to="/contact">Say hello <ArrowUpRight size={12} aria-hidden="true" /></Link>
        </div>

        <div className="navbar-main">
          <nav className="navbar-desktop" aria-label="Main navigation">
            {navigation.slice(0, 4).map((item) => <NavLink key={item.href} to={item.href} end>{item.label}</NavLink>)}
          </nav>
          <button className="navbar-toggle" type="button" ref={toggleRef} aria-expanded={isMenuOpen} aria-controls="navbar-mobile-menu" aria-label={isMenuOpen ? "Close navigation menu" : "Open navigation menu"} onClick={() => setIsMenuOpen((open) => !open)}>
            {isMenuOpen ? <X size={21} aria-hidden="true" /> : <Menu size={21} aria-hidden="true" />}<span>{isMenuOpen ? "Close" : "Menu"}</span>
          </button>

          <Link className="navbar-brand" to="/" aria-label="The Table homepage" onClick={closeMenu}>
            <span className="navbar-brand__name">The Table<span>.</span></span>
            <span className="navbar-brand__tagline">A PLACE TO COME TOGETHER</span>
          </Link>

          <div className="navbar-actions">
            <Link className="navbar-icon" to={auth.signedIn ? "/account" : "/login"} aria-label={auth.signedIn ? "Your account" : "Log in"} onClick={closeMenu}><UserRound size={18} strokeWidth={1.5} aria-hidden="true" /></Link>
            <Link className="navbar-icon navbar-bag" to="/cart" aria-label={`Shopping bag, ${totalQuantity} ${totalQuantity === 1 ? "item" : "items"}`} onClick={closeMenu}><ShoppingBag size={18} strokeWidth={1.5} aria-hidden="true" /><span className="navbar-bag__count" aria-hidden="true">{totalQuantity}</span></Link>
            {auth.signedIn && <button className="navbar-icon navbar-signout" type="button" aria-label="Sign out" onClick={() => { closeMenu(); void auth.signOut(); }}><LogOut size={18} strokeWidth={1.5} aria-hidden="true" /></button>}
            <span className="navbar-divider" aria-hidden="true" />
            <Link className="navbar-reserve" to="/reservations" onClick={closeMenu}>A table for you <ArrowUpRight size={17} aria-hidden="true" /></Link>
          </div>
        </div>

        <div className="navbar-mobile" id="navbar-mobile-menu" hidden={!isMenuOpen} onBlur={(event) => {
          if (event.relatedTarget instanceof Node && !headerRef.current?.contains(event.relatedTarget)) closeMenu();
        }}>
          <div className="navbar-mobile__intro"><span>MAKE YOURSELF AT HOME</span><p>Something good<br /><em>starts here.</em></p></div>
          <nav aria-label="Mobile navigation" className="navbar-mobile__links">
            {navigation.map((item, index) => (
              <NavLink key={item.href} to={item.href} onClick={closeMenu} end><span className="navbar-mobile__number">0{index + 1}</span><span>{item.label}</span><ArrowUpRight size={19} strokeWidth={1.2} aria-hidden="true" /></NavLink>
            ))}
          </nav>
          <div className="navbar-mobile__footer"><span>Come hungry. Stay a little longer.</span><Link to={auth.signedIn ? "/account" : "/login"} onClick={closeMenu}>Your account <ArrowUpRight size={14} aria-hidden="true" /></Link>{auth.signedIn && <button type="button" className="navbar-mobile__signout" onClick={() => { closeMenu(); void auth.signOut(); }}>Sign out <LogOut size={14} aria-hidden="true" /></button>}</div>
        </div>
      </div>
    </header>
  );
}

export default Navbar;

