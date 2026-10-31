import { useSiteContent } from "../../hooks/useSiteContent";
import SiteText from "../content/SiteText";
import { heroSlideCopy } from "../../data/heroSlides";
import hero01 from "../../assets/Hero01.png";
import hero02 from "../../assets/Hero02.png";
import hero03 from "../../assets/Hero03.png";
import hero04 from "../../assets/Hero04.png";
import LoadingImage from "../common/LoadingImage";
import { Link } from "react-router-dom";
import { useState } from "react";
import { ArrowDown, ArrowUpRight, ChevronLeft, ChevronRight, MapPin, MoveUpRight } from "lucide-react";
import type { MenuCatalog } from "../../hooks/useMenuCatalog";
import "../../styles/Hero.css";

function Hero({ catalog }: { catalog: MenuCatalog }) {
  const { loading, error, refresh } = catalog;
  const { text } = useSiteContent();
  const configuredSlides = catalog.items.filter(item => item.heroSlide && item.heroSlide >= 1 && item.heroSlide <= 4).sort((a, b) => a.heroSlide! - b.heroSlide!);
  const dishes = (configuredSlides.length ? configuredSlides : catalog.items.slice(0, 4)).map((item, index) => { const copy = heroSlideCopy[(item.heroSlide || index + 1) - 1] || heroSlideCopy[0]; const prefix = 'hero-' + (item.heroSlide || index + 1) + '-'; return { ...item, slideCopy: { title: text(prefix + 'title', copy.title), emphasis: text(prefix + 'emphasis', copy.emphasis), label: text(prefix + 'label', copy.label), category: text(prefix + 'category', copy.category), caption: text(prefix + 'caption', copy.caption), description: text(prefix + 'description', copy.description), alt: text(prefix + 'alt', copy.alt) } }; });
  const heroImages = [hero01, hero02, hero03, hero04];
  const [activeDish, setActiveDish] = useState(0);
  const selectedIndex = Math.min(activeDish, Math.max(0, dishes.length - 1));
  const dish = dishes[selectedIndex];
  const currentCopy = dish?.slideCopy || heroSlideCopy[0];
  const selectRelative = (direction: number) => { if (dishes.length > 1) setActiveDish((selectedIndex + direction + dishes.length) % dishes.length); };

  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero-editorial">
        <div className="hero-copy">
          <p className="hero-eyebrow"><span /> <SiteText contentKey="Hero-text-1xfukkm" fallback={"GOOD FOOD. YOUR PEOPLE."} /></p>
          <h1 id="hero-title" tabIndex={-1}>{currentCopy.title}<br /><em>{currentCopy.emphasis}</em></h1>
          <p className="hero-intro">{currentCopy.description}</p>
          <div className="hero-actions">
            <Link className="hero-primary" to="#menu"><SiteText contentKey="Hero-text-tt04tl" fallback={"Find your favorite "} /><ArrowUpRight size={19} aria-hidden="true" /></Link>
            <Link className="hero-secondary" to="/reservations"><SiteText contentKey="Hero-text-1px5cro" fallback={"A table for you "} /><ArrowUpRight size={16} aria-hidden="true" /></Link>
          </div>
          <div className="hero-location"><MapPin size={14} aria-hidden="true" /><span><SiteText contentKey="Hero-text-1khhgjn" fallback={"A little gathering place in Jeddah"} /></span></div>
        </div>

        <div className="hero-visual" id="hero-dish" role="group" aria-label="Food inspiration" aria-busy={loading}>
          {!loading && !error && dishes.map((item, index) => (
            <LoadingImage key={item.id} className={`hero-photo${index === selectedIndex ? " is-active" : ""}`} src={text('hero-' + (item.heroSlide || index + 1) + '-image', item.heroImage || heroImages[(item.heroSlide || index + 1) - 1])} alt={index === selectedIndex ? item.slideCopy.alt : ""} aria-hidden={index !== selectedIndex} defer={index !== selectedIndex} loading="lazy" />
          ))}
          <div className="hero-photo-shade" />
          <div className="hero-visual-top"><span><SiteText contentKey="Hero-text-1kag434" fallback={"THE TABLE / A TASTE OF THE GOOD LIFE"} /></span><MoveUpRight size={25} strokeWidth={1} aria-hidden="true" /></div>
          <div className="hero-stamp" aria-hidden="true"><span>Made for</span><strong>one more<br />bite.</strong><span>Enjoy every moment</span></div>
          {loading ? <div className="hero-menu-status" role="status"><SiteText contentKey="Hero-text-1qxl7on" fallback={"Loading the kitchen menu…"} /></div> : error ? <div className="hero-menu-status" role="alert"><p>{error}</p><button type="button" onClick={refresh}><SiteText contentKey="Hero-text-982hh6" fallback={"Try again"} /></button></div> : !dish ? <div className="hero-menu-status" role="status"><SiteText contentKey="Hero-text-k52l50" fallback={"Our menu is being updated. Please check back soon."} /></div> : null}
          {!loading && !error && dish && <><div className="hero-dish-caption" aria-live="polite" aria-atomic="true">
            <span className="hero-dish-category">{dish.slideCopy.category}</span>
            <div className="hero-dish-title"><h2>{dish.slideCopy.label}</h2></div>
            <p>{dish.slideCopy.caption}</p>
          </div>
          <div className="hero-photo-controls">
            <span className="hero-counter">{String(selectedIndex + 1).padStart(2, "0")}<span> / {String(dishes.length).padStart(2, "0")}</span></span>
            <div><button type="button" disabled={dishes.length < 2} onClick={() => selectRelative(-1)} aria-label="Previous slide"><ChevronLeft size={18} /></button><button type="button" disabled={dishes.length < 2} onClick={() => selectRelative(1)} aria-label="Next slide"><ChevronRight size={18} /></button></div>
          </div></>}
        </div>
      </div>

      <div className="hero-tasting">
        <div className="hero-tasting-label"><span><SiteText contentKey="Hero-text-1f240g4" fallback={"A LITTLE INSPIRATION"} /></span><p><SiteText contentKey="Hero-text-k2v5gl" fallback={"What are you craving?"} /></p></div>
        <div className="hero-dish-picker" role="group" aria-label="Choose a food inspiration slide">
          {!loading && !error && dishes.map((item, index) => (
            <button key={item.id} type="button" aria-pressed={selectedIndex === index} aria-controls="hero-dish" onClick={() => setActiveDish(index)}>
              <span className="hero-picker-number">0{index + 1}</span><span>{item.slideCopy.label}</span><ArrowUpRight size={16} aria-hidden="true" />
            </button>
          ))}
        </div>
        <Link className="hero-discover" to="#menu" aria-label="Discover the featured menu"><ArrowDown size={20} aria-hidden="true" /></Link>
      </div>
      <p className="hero-flavor-note">{!loading && !error ? dish?.slideCopy.caption : ""}</p>
    </section>
  );
}

export default Hero;
