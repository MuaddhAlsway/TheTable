import SiteText from "../components/content/SiteText";
import LoadingImage from "../components/common/LoadingImage";
import { useMenuCatalog } from "../hooks/useMenuCatalog";
import { useCart } from "../hooks/useCart";
import { useEffect, useRef, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Search, Utensils, X } from "lucide-react";
import { Link } from "react-router-dom";
import MenuItemCard from "../components/menu/MenuItemCard";
import { menuCategories, type MenuCategory, type MenuItem } from "../data/menuItems";
import "../styles/Menu.css";

function Menu() {
  const { items: menuItems, loading: menuLoading, error: menuError, connected, refresh: refreshMenu } = useMenuCatalog();
  const { addToCart } = useCart();
  const [activeCategory, setActiveCategory] = useState<MenuCategory>("All");
  const [query, setQuery] = useState("");
  const [addedItemName, setAddedItemName] = useState("");
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (noticeTimer.current) clearTimeout(noticeTimer.current); }, []);
  const featuredDish = menuItems.find((item) => item.id === "house-pasta") ?? menuItems[0];
  const search = query.trim().toLowerCase();
  const filteredItems = menuItems.filter((item) =>
    (activeCategory === "All" || item.category === activeCategory) &&
    `${item.name} ${item.description} ${item.category}`.toLowerCase().includes(search),
  );

  function handleAddItem(item: MenuItem) {
    addToCart(item);
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    setAddedItemName(item.name);
    noticeTimer.current = setTimeout(() => setAddedItemName(""), 5000);
  }

  return (
    <main className="menu-page">
      <header className="menu-page__hero">
        <div className="menu-page__hero-copy">
          <p className="menu-page__eyebrow"><span /> <SiteText contentKey="Menu-text-1jw59ig" fallback={"FROM OUR KITCHEN, WITH CARE"} /></p>
          <h1 tabIndex={-1}><SiteText contentKey="Menu-text-15ullxs" fallback={"Good food,"} /><br /> <em><SiteText contentKey="Menu-text-1hw5waf" fallback={"made for sharing."} /></em></h1>
          <p className="menu-page__intro"><SiteText contentKey="Menu-text-1masw94" fallback={"Start with a little something. Find your new favorite. Leave a little room for the sweet things."} /></p>
          <a className="menu-page__browse" href="#menu-dishes"><SiteText contentKey="Menu-text-1qp4gz" fallback={"Take a look around "} /><ArrowDownRight size={19} aria-hidden="true" /></a>
          <div className="menu-page__hero-foot"><Utensils size={16} strokeWidth={1.3} aria-hidden="true" /><span><SiteText contentKey="Menu-text-izwfth" fallback={"Good ingredients. Generous moments."} /></span></div>
        </div>
        {featuredDish && <div className="menu-page__feature">
          <LoadingImage src={featuredDish.image} alt={featuredDish.name} loading="lazy" />
          <div className="menu-page__feature-top"><span><SiteText contentKey="Menu-text-1770fx7" fallback={"A LITTLE MENU INSPIRATION"} /></span><span><SiteText contentKey="Menu-text-1vyzp2n" fallback={"THE TABLE / JEDDAH"} /></span></div>
          <div className="menu-page__feature-caption"><span><SiteText contentKey="Menu-text-117buuk" fallback={"FROM THE MAINS"} /></span><p>{featuredDish.name}<span><small>SAR</small> {featuredDish.price}</span></p><span>{featuredDish.description}</span></div>
        </div>}
      </header>

      <section className="menu-page__content" id="menu-dishes" aria-labelledby="menu-dishes-title">
        <aside className="menu-page__index">
          <p className="menu-page__index-label"><SiteText contentKey="Menu-text-1rl29y7" fallback={"SOMETHING FOR EVERY APPETITE"} /></p>
          <h2><SiteText contentKey="Menu-text-12h7nv4" fallback={"Follow"} /><br /> <em><SiteText contentKey="Menu-text-iwsi3a" fallback={"your appetite."} /></em></h2>
          <div className="menu-page__categories" role="group" aria-label="Filter menu by category">
            {menuCategories.map((category) => <button className="menu-page__category" key={category} type="button" aria-pressed={activeCategory === category} aria-controls="menu-results" onClick={() => setActiveCategory(category)}><span>{category === "All" ? "The whole menu" : category}</span><span>{String(category === "All" ? menuItems.length : menuItems.filter((item) => item.category === category).length).padStart(2, "0")}</span></button>)}
          </div>
          <div className="menu-page__index-note"><Utensils size={23} strokeWidth={1} aria-hidden="true" /><p><SiteText contentKey="Menu-text-qx09gn" fallback={"A little of this."} /><br /><SiteText contentKey="Menu-text-jese7w" fallback={"A little of that."} /><br /><em><SiteText contentKey="Menu-text-yoag97" fallback={"Better together."} /></em></p><Link to="/reservations"><SiteText contentKey="Menu-text-aliuc7" fallback={"Make a meal of it "} /><ArrowUpRight size={15} aria-hidden="true" /></Link></div>
        </aside>

        <div className="menu-page__listing">
          <div className="menu-page__toolbar">
            <div><p className="menu-page__section-label"><SiteText contentKey="Menu-text-10l0o63" fallback={"THE GOOD STUFF"} /></p><h2 id="menu-dishes-title">{activeCategory === "All" ? "A seat. A plate. A favorite." : activeCategory}</h2><p className="menu-page__count" role="status">{filteredItems.length} {filteredItems.length === 1 ? "dish" : "dishes"}{search ? ` matching “${query.trim()}”` : " to discover"}</p></div>
            <div className="menu-page__search"><Search size={17} aria-hidden="true" /><label className="menu-page__sr-only" htmlFor="dish-search"><SiteText contentKey="Menu-text-1ciruuv" fallback={"Search dishes"} /></label><input id="dish-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find something delicious" />{query && <button type="button" onClick={() => setQuery("")} aria-label="Clear dish search"><X size={16} /></button>}</div>
          </div>
          <div className="menu-page__notice" role="status" aria-atomic="true">{addedItemName && <><span>{addedItemName} <SiteText contentKey="Menu-text-135tabz" fallback={"added to your bag."} /></span><button type="button" aria-label="Dismiss selection notice" onClick={() => setAddedItemName("")}><X size={16} /></button></>}</div>
          {!connected && <p className="menu-page__api-notice"><SiteText contentKey="Menu-text-hsqwq9" fallback={"Preview menu. Online ordering is not connected."} /></p>}
          <div id="menu-results" aria-busy={menuLoading}>
            {menuLoading && <p role="status"><SiteText contentKey="Menu-text-1qxl7on" fallback={"Loading the kitchen menu…"} /></p>}
            {menuError && <p className="menu-page__api-notice" role="alert">{menuError} <button type="button" onClick={refreshMenu}><SiteText contentKey="Menu-text-982hh6" fallback={"Try again"} /></button></p>}
            {!menuLoading && !menuError && (filteredItems.length ? <div className="menu-page__grid">{filteredItems.map((item) => <MenuItemCard key={item.id} item={item} onAdd={handleAddItem} />)}</div> : <div className="menu-page__empty"><Search size={28} strokeWidth={1} aria-hidden="true" /><h3><SiteText contentKey="Menu-text-1srhprj" fallback={"Nothing on this plate yet."} /></h3><p><SiteText contentKey="Menu-text-kpyvgw" fallback={"Try another search or explore the whole menu."} /></p><button type="button" onClick={() => { setQuery(""); setActiveCategory("All"); }}><SiteText contentKey="Menu-text-r2eq3f" fallback={"Show all dishes "} /><ArrowUpRight size={16} aria-hidden="true" /></button></div>)}
          </div>
          <div className="menu-page__endnote"><p><SiteText contentKey="Menu-text-wxcl1b" fallback={"Found your favorite?"} /><br /><em><SiteText contentKey="Menu-text-1c6gx2y" fallback={"There's a table with your name on it."} /></em></p><Link to="/reservations"><SiteText contentKey="Menu-text-zoa7ek" fallback={"Reserve a table "} /><ArrowUpRight size={18} aria-hidden="true" /></Link></div>
        </div>
      </section>
    </main>
  );
}
export default Menu;
