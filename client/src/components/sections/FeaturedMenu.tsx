import { Link } from "react-router-dom";
import { useState } from "react";
import { ArrowUpRight, Utensils } from "lucide-react";
import { menuCategories, type MenuCategory } from "../../data/menuItems";
import type { MenuCatalog } from "../../hooks/useMenuCatalog";
import "../../styles/FeaturedMenu.css";

function FeaturedMenu({ catalog }: { catalog: MenuCatalog }) {
  const { items, loading, error, refresh } = catalog;
  const [activeCategory, setActiveCategory] = useState<MenuCategory>("All");
  const categories = menuCategories.filter(category => category === "All" || items.some(item => item.category === category));
  const visibleItems = items.filter(item => activeCategory === "All" || item.category === activeCategory).slice(0, 3);

  return (
    <section className="featured-menu" id="menu" aria-labelledby="featured-menu-title">
      <div className="featured-menu__header">
        <div className="featured-menu__intro">
          <p className="featured-menu__eyebrow"><span aria-hidden="true" /> A taste of our table</p>
          <h2 id="featured-menu-title">Good food.<br /><em>Great company.</em></h2>
          <p className="featured-menu__description">
            A few favorites from our kitchen. Thoughtfully prepared,
            generously served, and always better together.
          </p>
        </div>
        <div className="featured-menu__aside">
          <Utensils size={24} strokeWidth={1.25} aria-hidden="true" />
          <p>Find your next favorite.</p>
          <Link className="featured-menu__all-link" to="/menu">
            Explore the full menu <ArrowUpRight size={18} aria-hidden="true" />
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
          {String(visibleItems.length).padStart(2, "0")} {visibleItems.length === 1 ? "dish" : "dishes"} to discover
        </p>
      </div>

      <div className="featured-menu__grid" id="featured-menu-dishes" aria-busy={loading}>
        {loading ? <p className="featured-menu__status" role="status">Loading the kitchen menu…</p> : error ? <div className="featured-menu__status" role="alert"><p>{error}</p><button type="button" onClick={refresh}>Try again</button></div> : !visibleItems.length ? <p className="featured-menu__status" role="status">No dishes are currently available in this selection.</p> : null}
        {!loading && !error && visibleItems.map((item) => (
          <article className="menu-card" key={item.id}>
            <Link className="menu-card__image-link" to="/menu" aria-label={`Explore ${item.name} on the menu`}>
              <img className="menu-card__image" src={item.image} alt={item.name} loading="lazy" decoding="async" />
              <span className="menu-card__badge">{item.category}</span>
              <span className="menu-card__arrow" aria-hidden="true"><ArrowUpRight size={22} /></span>
            </Link>
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
      <p className="featured-menu__footer">From our kitchen to your table.<span aria-hidden="true"> Bon appétit.</span></p>
    </section>
  );
}

export default FeaturedMenu;
