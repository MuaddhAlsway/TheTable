import SiteText from "../components/content/SiteText";
import { Link } from "react-router-dom";
import RoutePage from "./RoutePage";
export default function NotFound() {
  return <RoutePage title="This table isn't here." description="404 — We couldn't find the page you're looking for."><div className="route-page__notice"><Link to="/"><SiteText contentKey="NotFound-text-1tj3b6q" fallback={"Back to home"} /></Link><Link to="/menu"><SiteText contentKey="NotFound-text-1l9l37e" fallback={"Explore the menu"} /></Link></div></RoutePage>;
}
