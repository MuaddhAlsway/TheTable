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
          <p className="why-dine__eyebrow"><span aria-hidden="true" /> THE REASON WE SET THE TABLE</p>
          <h2 id="why-dine-title" className="why-dine__title">
            Come for<br /> the food.<br /><em>Stay for<br /> the feeling.</em>
          </h2>
          <p className="why-dine__intro">
            The best part of a meal isn't always on the plate.
            It's feeling welcome, sharing something good, and forgetting to check the time.
          </p>
          <div className="why-dine__signature">
            <span className="why-dine__seal" aria-hidden="true"><Utensils size={24} strokeWidth={1.2} /></span>
            <div><span>A SIMPLE PHILOSOPHY</span><p>Food with heart. A place to belong.</p></div>
          </div>
          <span className="why-dine__story-mark" aria-hidden="true">The Table.</span>
        </header>

        <div className="why-dine__reasons">
          <div className="why-dine__chapter"><span>WHY DINE WITH US</span><span>THREE LITTLE REASONS</span></div>
          <ol className="why-dine__list">
            {reasons.map(({ number, icon: Icon, detail, title, description }) => (
              <li className="why-dine__reason" key={number}>
                <span className="why-dine__number" aria-hidden="true">{number}</span>
                <div className="why-dine__reason-copy">
                  <p className="why-dine__detail">{detail}</p>
                  <h3>{title}</h3>
                  <p className="why-dine__description">{description}</p>
                </div>
                <Icon className="why-dine__icon" size={24} strokeWidth={1.3} aria-hidden="true" />
              </li>
            ))}
          </ol>
          <div className="why-dine__invitation">
            <div><p>There's a seat for you.</p><span>Bring an appetite. Bring your favorite people.</span></div>
            <Link className="why-dine__reserve" to="/reservations">Reserve a table <ArrowUpRight size={19} aria-hidden="true" /></Link>
          </div>
        </div>
      </div>
      <div className="why-dine__closing" aria-hidden="true"><span>GOOD FOOD</span><span className="why-dine__closing-dot" /><span>LONG CONVERSATIONS</span><span className="why-dine__closing-dot" /><span>ONE MORE BITE</span></div>
    </section>
  );
}

export default WhyDineWithUs;

