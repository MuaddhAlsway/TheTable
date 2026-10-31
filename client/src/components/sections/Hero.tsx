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
  const configuredSlides = catalog.items.filter(item => item.heroSlide && item.heroSlide >= 1 && item.heroSlide <= 4).sort((a, b) => a.heroSlide! - b.heroSlide!);
  const dishes = configuredSlides.length ? configuredSlides : catalog.items.slice(0, 4);
  const heroImages = [hero01, hero02, hero03, hero04];
  const [activeDish, setActiveDish] = useState(0);
  const selectedIndex = Math.min(activeDish, Math.max(0, dishes.length - 1));
  const dish = dishes[selectedIndex];
  const selectRelative = (direction: number) => { if (dishes.length > 1) setActiveDish((selectedIndex + direction + dishes.length) % dishes.length); };

  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero-editorial">
        <div className="hero-copy">
          <p className="hero-eyebrow"><span /> GOOD FOOD. YOUR PEOPLE.</p>
          <h1 id="hero-title" tabIndex={-1}>Life tastes<br />better <em>at<br /> the table.</em></h1>
          <p className="hero-intro">Come hungry. Settle in. Make a little time for the things that taste better together.</p>
          <div className="hero-actions">
            <Link className="hero-primary" to="#menu">Find your favorite <ArrowUpRight size={19} aria-hidden="true" /></Link>
            <Link className="hero-secondary" to="/reservations">A table for you <ArrowUpRight size={16} aria-hidden="true" /></Link>
          </div>
          <div className="hero-location"><MapPin size={14} aria-hidden="true" /><span>A little gathering place in Jeddah</span></div>
        </div>

        <div className="hero-visual" id="hero-dish" role="group" aria-label="Featured dish" aria-busy={loading}>
          {!loading && !error && dishes.map((item, index) => (
            <LoadingImage key={item.id} className={`hero-photo${index === selectedIndex ? " is-active" : ""}`} src={item.heroImage || heroImages[index]} alt={index === selectedIndex ? item.name : ""} aria-hidden={index !== selectedIndex} defer={index !== selectedIndex} loading="lazy" />
          ))}
          <div className="hero-photo-shade" />
          <div className="hero-visual-top"><span>THE TABLE / A TASTE OF THE GOOD LIFE</span><MoveUpRight size={25} strokeWidth={1} aria-hidden="true" /></div>
          <div className="hero-stamp" aria-hidden="true"><span>Made for</span><strong>one more<br />bite.</strong><span>Enjoy every moment</span></div>
          {loading ? <div className="hero-menu-status" role="status">Loading the kitchen menu…</div> : error ? <div className="hero-menu-status" role="alert"><p>{error}</p><button type="button" onClick={refresh}>Try again</button></div> : !dish ? <div className="hero-menu-status" role="status">Our menu is being updated. Please check back soon.</div> : null}
          {!loading && !error && dish && <><div className="hero-dish-caption" aria-live="polite" aria-atomic="true">
            <span className="hero-dish-category">{dish.category}</span>
            <div className="hero-dish-title"><h2>{dish.name}</h2><span className="hero-dish-price"><small>SAR</small> {dish.price.toFixed(2)}</span></div>
            <p>{dish.tag || dish.category}</p>
          </div>
          <div className="hero-photo-controls">
            <span className="hero-counter">{String(selectedIndex + 1).padStart(2, "0")}<span> / {String(dishes.length).padStart(2, "0")}</span></span>
            <div><button type="button" disabled={dishes.length < 2} onClick={() => selectRelative(-1)} aria-label="Previous dish"><ChevronLeft size={18} /></button><button type="button" disabled={dishes.length < 2} onClick={() => selectRelative(1)} aria-label="Next dish"><ChevronRight size={18} /></button></div>
          </div></>}
        </div>
      </div>

      <div className="hero-tasting">
        <div className="hero-tasting-label"><span>A LITTLE INSPIRATION</span><p>What are you craving?</p></div>
        <div className="hero-dish-picker" role="group" aria-label="Choose a featured dish">
          {!loading && !error && dishes.map((item, index) => (
            <button key={item.id} type="button" aria-pressed={selectedIndex === index} aria-controls="hero-dish" onClick={() => setActiveDish(index)}>
              <span className="hero-picker-number">0{index + 1}</span><span>{item.name}</span><ArrowUpRight size={16} aria-hidden="true" />
            </button>
          ))}
        </div>
        <Link className="hero-discover" to="#menu" aria-label="Discover the featured menu"><ArrowDown size={20} aria-hidden="true" /></Link>
      </div>
      <p className="hero-flavor-note">{!loading && !error ? dish?.description : ""}</p>
    </section>
  );
}

export default Hero;
