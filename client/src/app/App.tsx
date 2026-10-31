import { CartProvider } from "../context/CartContext";
import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Footer from "../components/layout/Footer";
import Navbar from "../components/navigation/Navbar";

function App() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      if (hash) {
        let id = hash.slice(1);
        try { id = decodeURIComponent(id); } catch { /* Keep malformed fragments harmless. */ }
        document.getElementById(id)?.scrollIntoView({ behavior: "instant" });
      } else {
        window.scrollTo({ top: 0, behavior: "instant" });
        document.querySelector<HTMLElement>("main h1")?.focus({ preventScroll: true });
      }
    });
    const page = pathname.split("/").filter(Boolean).join(" / ");
    document.title = page ? `${page.charAt(0).toUpperCase() + page.slice(1)} | The Table` : "The Table | Jeddah";
    return () => cancelAnimationFrame(frame);
  }, [pathname, hash]);

  return <CartProvider><Navbar key={pathname} /><Outlet /><Footer /></CartProvider>;
}
export default App;
