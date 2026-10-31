import { useDishDetails } from "../../hooks/useDishDetails";
import SiteText from "../content/SiteText";
import LoadingImage from "../common/LoadingImage";
import { Link } from "react-router-dom";
import { useState } from "react";
import { ArrowUpRight, Utensils } from "lucide-react";
import { menuCategories, type MenuCategory } from "../../data/menuItems";
import type { MenuCatalog } from "../../hooks/useMenuCatalog";
import "../../styles/FeaturedMenu.css";

function FeaturedMenu({ catalog }: { catalog: MenuCatalog }) {
  const { items, loading, error, refresh } = catalog;
  const { openDish } = useDishDetails();
  const [activeCategory, setActiveCategory] = useState<MenuCategory>("All");
  const categories = menuCategories.filter(category => category === "All" || items.some(item => item.category === category));
  const visibleItems = items.filter(item => activeCategory === "All" || item.category === activeCategory).slice(0, 3);

  return (
    <section className="featured-menu" id="menu" aria-labelledby="featured-menu-title">
      <div className="featured-menu__header">
        <div className="featured-menu__intro">
          <p className="featured-menu__eyebrow"><span aria-hidden="true" /> <SiteText contentKey="FeaturedMenu-text-1i2lvu2" fallback={"A taste of our table"} /></p>
          <h2 id="featured-menu-title"><SiteText contentKey="FeaturedMenu-text-16ektbq" fallback={"Good food."} /><br /><em><SiteText contentKey="FeaturedMenu-text-1pypirx" fallback={"Great company."} /></em></h2>
          <p className="featured-menu__description">
            <SiteText contentKey="FeaturedMenu-text-eplw19" fallback={"A few favorites from our kitchen. Thoughtfully prepared, generously served, and always better together."} /></p>
        </div>
        <div className="featured-menu__aside">
          <Utensils size={24} strokeWidth={1.25} aria-hidden="true" />
          <p><SiteText contentKey="FeaturedMenu-text-1hnker0" fallback={"Find your next favorite."} /></p>
          <Link className="featured-menu__all-link" to="/menu">
            <SiteText contentKey="FeaturedMenu-text-8x6f9t" fallback={"Explore the full menu "} /><ArrowUpRight size={18} aria-hidden="true" />
          </Link>
        </div>
      </div>

      <div className="featured-menu__toolbar">
        <div className="featured-menu__filters" role="group" aria-label="Filter featured dishes">
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              className="featured-menu__filter"
              aria-pressed={activeCategory === category}
              aria-controls="featured-menu-dishes"
              onClick={() => setActiveCategory(category)}
            >
              {category === "All" ? "All dishes" : category}
            </button>
          ))}
        </div>
        <p className="featured-menu__count" role="status">
          {String(visibleItems.length).padStart(2, "0")} {visibleItems.length === 1 ? "dish" : "dishes"} <SiteText contentKey="FeaturedMenu-text-1knjh23" fallback={"to discover"} /></p>
      </div>

      <div className="featured-menu__grid" id="featured-menu-dishes" aria-busy={loading}>
        {loading ? <p className="featured-menu__status" role="status"><SiteText contentKey="FeaturedMenu-text-1qxl7on" fallback={"Loading the kitchen menu…"} /></p> : error ? <div className="featured-menu__status" role="alert"><p>{error}</p><button type="button" onClick={refresh}><SiteText contentKey="FeaturedMenu-text-982hh6" fallback={"Try again"} /></button></div> : !visibleItems.length ? <p className="featured-menu__status" role="status"><SiteText contentKey="FeaturedMenu-text-17osjtk" fallback={"No dishes are currently available in this selection."} /></p> : null}
        {!loading && !error && visibleItems.map((item) => (
          <article className="menu-card dish-preview" key={item.id}>
            <button className="dish-open" type="button" onClick={() => openDish(item)} aria-label={`View ${item.name} details`} aria-haspopup="dialog"><span className="dish-open__hint">View dish ↗</span></button>
            <div className="menu-card__image-link">
              <LoadingImage className="menu-card__image" src={item.image} alt={item.name} loading="lazy" decoding="async" />
              <span className="menu-card__badge">{item.category}</span>
              <span className="menu-card__arrow" aria-hidden="true"><ArrowUpRight size={22} /></span>
            </div>
            <div className="menu-card__details">
              <p className="menu-card__category">{item.tag || item.category}</p>
              <div className="menu-card__title-row">
                <h3 className="menu-card__name">{item.name}</h3>
                <span className="menu-card__price"><span>SAR</span> {item.price.toFixed(2)}</span>
              </div>
              <p className="menu-card__description">{item.description}</p>
            </div>
          </article>
        ))}
      </div>
      <p className="featured-menu__footer"><SiteText contentKey="FeaturedMenu-text-41le3" fallback={"From our kitchen to your table."} /><span aria-hidden="true"> Bon appétit.</span></p>
    </section>
  );
}

export default FeaturedMenu;
