import { usePublicSettings } from "../../hooks/usePublicSettings";
import { restaurantHours } from "../../utils/restaurantHours";
import SiteText from "../content/SiteText";
import { Link } from "react-router-dom";
import { ArrowDownRight, ArrowUpRight, Clock3, MapPin } from "lucide-react";
import "../../styles/LocationsSection.css";

function DiningRoomIllustration() {
  return (
    <svg className="locations__room" viewBox="0 0 800 700" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="location-wall" x1="400" y1="0" x2="400" y2="700" gradientUnits="userSpaceOnUse"><stop stopColor="#363d30" /><stop offset="1" stopColor="#20271f" /></linearGradient>
        <linearGradient id="location-window" x1="400" y1="140" x2="400" y2="500" gradientUnits="userSpaceOnUse"><stop stopColor="#d6aa78" /><stop offset="1" stopColor="#a66b48" /></linearGradient>
        <radialGradient id="location-glow"><stop stopColor="#f6d69e" stopOpacity=".18" /><stop offset="1" stopColor="#f6d69e" stopOpacity="0" /></radialGradient>
      </defs>
      <path fill="url(#location-wall)" d="M0 0h800v700H0z" />
      <circle cx="400" cy="280" r="270" fill="url(#location-glow)" />
      <path d="M0 560h800M0 620h800M125 560 35 700m235-140-45 140m350-140 45 140m145-140 90 140M400 560v140" stroke="#b4a38a" strokeOpacity=".12" />
      <path d="M190 510V285a210 210 0 0 1 420 0v225" stroke="#d0bb96" strokeOpacity=".17" strokeWidth="2" />
      <path d="M213 510V285a187 187 0 0 1 374 0v225" stroke="#d0bb96" strokeOpacity=".3" />
      <path d="M237 510V285a163 163 0 0 1 326 0v225H237Z" fill="url(#location-window)" />
      <path d="M247 510V285a153 153 0 0 1 306 0v225H247Z" stroke="#eed5ad" strokeOpacity=".45" />
      <path d="M400 132v378M247 320h306M247 415h306" stroke="#4b4936" strokeWidth="8" />
      <path d="M250 467c75-55 122-38 150-5 57-49 112-35 153-6v54H247v-43Z" fill="#6f7251" />
      <path d="M247 487c83-29 110-17 153 2 58-30 112-13 153 1v20H247v-23Z" fill="#535d43" />
      <path d="M110 0v188m580-188v188" stroke="#bca27c" strokeOpacity=".6" />
      <path d="m69 224 21-38h40l21 38H69Zm580 0 21-38h40l21 38h-82Z" fill="#c3a57b" />
      <path d="M78 226h64m516 0h64" stroke="#f2d6a7" strokeWidth="3" />
      <ellipse cx="110" cy="236" rx="18" ry="5" fill="#f4dcb2" /><ellipse cx="690" cy="236" rx="18" ry="5" fill="#f4dcb2" />
      <path d="M300 542h-81v-80c0-20 81-20 81 0v80Zm281 0h-81v-80c0-20 81-20 81 0v80Z" fill="#916f4b" />
      <path d="M230 472h59m-59 14h59m-59 14h59m222-28h59m-59 14h59m-59 14h59" stroke="#c1a27b" strokeOpacity=".5" />
      <path d="m227 541-12 85m78-85 12 85m203-85-12 85m78-85 12 85" stroke="#916f4b" strokeWidth="8" />
      <path d="m365 537-15 122m85-122 15 122" stroke="#c4b18e" strokeWidth="10" />
      <ellipse cx="400" cy="525" rx="155" ry="32" fill="#a89878" />
      <ellipse cx="400" cy="518" rx="155" ry="32" fill="#e4d8bb" />
      <path d="M370 491h60l16 55-47 6-45-6 16-55Z" fill="#c1b394" />
      <ellipse cx="309" cy="518" rx="32" ry="10" stroke="#a18f70" /><ellipse cx="490" cy="518" rx="32" ry="10" stroke="#a18f70" />
      <path d="M307 503v-27m-10 0h20l-3 14h-14l-3-14Zm181 26v-27m-10 0h20l-3 14h-14l-3-14Z" stroke="#f2e4c6" strokeWidth="2" />
      <path d="M390 475h20l-3 23h-14l-3-23Z" fill="#92684b" />
      <path d="M400 477v-35m0 15c-17 0-20-12-20-12 16-2 20 12 20 12Zm0 10c16 0 21-14 21-14-17-2-21 14-21 14Z" stroke="#566448" strokeWidth="3" fill="#566448" />
      <path d="M95 551h52l-8 64h-35l-9-64Z" fill="#aa7956" /><path d="M121 555V409m0 55c-37-6-47-45-47-45 41-2 47 45 47 45Zm0 42c40-8 48-45 48-45-39-2-48 45-48 45Zm0 27c-41-2-55-34-55-34 38-10 55 34 55 34Zm0-95c31-10 36-42 36-42-31 0-36 42-36 42Z" fill="#657354" stroke="#7c8a68" strokeWidth="2" />
      <path d="M0 0h800v700H0z" stroke="#f5f0e7" strokeOpacity=".06" strokeWidth="2" />
    </svg>
  );
}

function LocationsSection() {
  const { settings } = usePublicSettings();
  const hours = restaurantHours(settings?.schedule);
  return (
    <section className="locations" id="locations" aria-labelledby="locations-title">
      <header className="locations__header">
        <p className="locations__eyebrow"><span /> <SiteText contentKey="LocationsSection-text-1kpv5sd" fallback={"FIND YOUR TABLE"} /></p>
        <div className="locations__headline-row">
          <h2 id="locations-title"><SiteText contentKey="LocationsSection-text-c46fl8" fallback={"A little closer."} /><br /><em><SiteText contentKey="LocationsSection-text-rltmtx" fallback={"A little more together."} /></em></h2>
          <div className="locations__header-note"><ArrowDownRight size={30} strokeWidth={1} aria-hidden="true" /><p><SiteText contentKey="LocationsSection-text-8k9dr3" fallback={"Make time for a meal."} /><br /><SiteText contentKey="LocationsSection-text-1mdxy0o" fallback={"We'll take care of the rest."} /></p></div>
        </div>
      </header>

      <div className="locations__destination">
        <div className="locations__scene">
          <DiningRoomIllustration />
          <div className="locations__scene-top"><span><SiteText contentKey="LocationsSection-text-1vyzp2n" fallback={"THE TABLE / JEDDAH"} /></span><span><SiteText contentKey="LocationsSection-text-1yxa7su" fallback={"COME AS YOU ARE"} /></span></div>
          <div className="locations__scene-bottom"><span><SiteText contentKey="LocationsSection-text-jjjl6t" fallback={"Pull up a chair."} /></span><p><SiteText contentKey="LocationsSection-text-idxtnf" fallback={"Good company is always on the menu."} /></p></div>
        </div>
        <article className="locations__visit" aria-labelledby="locations-city">
          <div className="locations__index"><span><SiteText contentKey="LocationsSection-text-10e35lf" fallback={"OUR GATHERING PLACE"} /></span><span>01</span></div>
          <p className="locations__country"><SiteText contentKey="LocationsSection-text-14e04gv" fallback={"SAUDI ARABIA"} /></p>
          <h3 id="locations-city"><SiteText contentKey="LocationsSection-text-13vjwzl" fallback={"Jeddah"} /><span>.</span></h3>
          <p className="locations__welcome"><SiteText contentKey="LocationsSection-text-1uqnibp" fallback={"For the catch-ups, the celebrations,"} /><br /><SiteText contentKey="LocationsSection-text-mehl0u" fallback={"and the “let's just go out” evenings."} /></p>
          <dl className="locations__facts">
            <div><dt><MapPin size={17} strokeWidth={1.5} aria-hidden="true" /> <SiteText contentKey="LocationsSection-text-16t62ja" fallback={"FIND US"} /></dt><dd><address>{settings?.location?.displayAddress || "Location details are being updated."}</address><Link to="/contact"><SiteText contentKey="LocationsSection-text-xbvqcw" fallback={"Contact us for the street address "} /><ArrowUpRight size={13} aria-hidden="true" /></Link></dd></div>
            <div><dt><Clock3 size={17} strokeWidth={1.5} aria-hidden="true" /> <SiteText contentKey="LocationsSection-text-3sbejf" fallback={"JOIN US"} /></dt><dd>{hours && settings?.schedule ? <><span>{hours.days}</span><strong><time dateTime={settings.schedule.opens}>{hours.opens}</time> — <time dateTime={settings.schedule.closes}>{hours.closes}</time></strong></> : <Link to="/locations">See confirmed visiting hours</Link>}</dd></div>
          </dl>
          <Link className="locations__booking" to="/reservations"><span><SiteText contentKey="LocationsSection-text-gfn71y" fallback={"Reserve your table"} /><small><SiteText contentKey="LocationsSection-text-1qk5l9a" fallback={"A good evening starts here."} /></small></span><ArrowUpRight size={24} strokeWidth={1.3} aria-hidden="true" /></Link>
          <a className="locations__map" href="https://www.google.com/maps/search/?api=1&query=Jeddah%2C%20Saudi%20Arabia" target="_blank" rel="noopener noreferrer"><SiteText contentKey="LocationsSection-text-cq25vh" fallback={"Explore Jeddah on Google Maps "} /><ArrowUpRight size={15} aria-hidden="true" /><span className="locations__sr-only"> <SiteText contentKey="LocationsSection-text-1lc8zzo" fallback={"(opens in a new tab)"} /></span></a>
        </article>
      </div>
      <div className="locations__afterword"><span><SiteText contentKey="LocationsSection-text-40244g" fallback={"A SEAT. A STORY. SOMETHING DELICIOUS."} /></span><p><SiteText contentKey="LocationsSection-text-y9464x" fallback={"See you "} /><em><SiteText contentKey="LocationsSection-text-1wqb40n" fallback={"at the table."} /></em></p><Link to="/contact"><SiteText contentKey="LocationsSection-text-1f58pen" fallback={"Need a hand planning your visit? "} /><ArrowUpRight size={15} aria-hidden="true" /></Link></div>
    </section>
  );
}

export default LocationsSection;
