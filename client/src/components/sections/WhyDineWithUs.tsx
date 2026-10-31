import SiteText from "../content/SiteText";
import { Link } from "react-router-dom";
import { ArrowUpRight, Heart, Leaf, Users, Utensils } from "lucide-react";
import "../../styles/WhyDineWithUs.css";

const reasons = [
  {
    number: "01",
    icon: Leaf,
    detail: "THE INGREDIENTS",
    title: "Good things, from the start.",
    description:
      "Fresh ingredients, honest flavors. We choose thoughtfully, then let every ingredient do what it does best.",
  },
  {
    number: "02",
    icon: Heart,
    detail: "THE CARE",
    title: "A little care in every bite.",
    description:
      "From the first chop to the finishing touch, it's the little details that make a meal worth slowing down for.",
  },
  {
    number: "03",
    icon: Users,
    detail: "THE COMPANY",
    title: "Your people. Your place.",
    description:
      "A catch-up that runs long. A family favorite. A reason to celebrate. Whatever brings you here, make yourself at home.",
  },
];

function WhyDineWithUs() {
  return (
    <section className="why-dine" id="why-dine" aria-labelledby="why-dine-title">
      <div className="why-dine__inner">
        <header className="why-dine__story">
          <p className="why-dine__eyebrow"><span aria-hidden="true" /> <SiteText contentKey="WhyDineWithUs-text-b7y8yb" fallback={"THE REASON WE SET THE TABLE"} /></p>
          <h2 id="why-dine-title" className="why-dine__title">
            <SiteText contentKey="WhyDineWithUs-text-14urymu" fallback={"Come for"} /><br /> <SiteText contentKey="WhyDineWithUs-text-1nwxfbm" fallback={"the food."} /><br /><em><SiteText contentKey="WhyDineWithUs-text-1lhphxr" fallback={"Stay for"} /><br /> <SiteText contentKey="WhyDineWithUs-text-m29aje" fallback={"the feeling."} /></em>
          </h2>
          <p className="why-dine__intro">
            <SiteText contentKey="WhyDineWithUs-text-1nyeeen" fallback={"The best part of a meal isn't always on the plate. It's feeling welcome, sharing something good, and forgetting to check the time."} /></p>
          <div className="why-dine__signature">
            <span className="why-dine__seal" aria-hidden="true"><Utensils size={24} strokeWidth={1.2} /></span>
            <div><span><SiteText contentKey="WhyDineWithUs-text-fmf0mh" fallback={"A SIMPLE PHILOSOPHY"} /></span><p><SiteText contentKey="WhyDineWithUs-text-7hniq3" fallback={"Food with heart. A place to belong."} /></p></div>
          </div>
          <span className="why-dine__story-mark" aria-hidden="true">The Table.</span>
        </header>

        <div className="why-dine__reasons">
          <div className="why-dine__chapter"><span><SiteText contentKey="WhyDineWithUs-text-1nangmt" fallback={"WHY DINE WITH US"} /></span><span><SiteText contentKey="WhyDineWithUs-text-ijzp68" fallback={"THREE LITTLE REASONS"} /></span></div>
          <ol className="why-dine__list">
            {reasons.map(({ number, icon: Icon, detail, title, description }) => (
              <li className="why-dine__reason" key={number}>
                <span className="why-dine__number" aria-hidden="true">{number}</span>
                <div className="why-dine__reason-copy">
                  <p className="why-dine__detail"><SiteText namespace="WhyDineWithUs-reasons-detail" fallback={detail} /></p>
                  <h3><SiteText namespace="WhyDineWithUs-reasons-title" fallback={title} /></h3>
                  <p className="why-dine__description"><SiteText namespace="WhyDineWithUs-reasons-description" fallback={description} /></p>
                </div>
                <Icon className="why-dine__icon" size={24} strokeWidth={1.3} aria-hidden="true" />
              </li>
            ))}
          </ol>
          <div className="why-dine__invitation">
            <div><p><SiteText contentKey="WhyDineWithUs-text-1j6dza5" fallback={"There's a seat for you."} /></p><span><SiteText contentKey="WhyDineWithUs-text-1bv3uhg" fallback={"Bring an appetite. Bring your favorite people."} /></span></div>
            <Link className="why-dine__reserve" to="/reservations"><SiteText contentKey="WhyDineWithUs-text-zoa7ek" fallback={"Reserve a table "} /><ArrowUpRight size={19} aria-hidden="true" /></Link>
          </div>
        </div>
      </div>
      <div className="why-dine__closing" aria-hidden="true"><span>GOOD FOOD</span><span className="why-dine__closing-dot" /><span>LONG CONVERSATIONS</span><span className="why-dine__closing-dot" /><span>ONE MORE BITE</span></div>
    </section>
  );
}

export default WhyDineWithUs;

