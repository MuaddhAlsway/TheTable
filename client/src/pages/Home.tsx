import { useMenuCatalog } from "../hooks/useMenuCatalog";
import FeaturedMenu from "../components/sections/FeaturedMenu";
import Hero from "../components/sections/Hero";
import LocationsSection from "../components/sections/LocationsSection";
import ReservationCta from "../components/sections/ReservationCta";
import WhyDineWithUs from "../components/sections/WhyDineWithUs";


function Home() {
  const catalog = useMenuCatalog();
  return (
    <main>
      <Hero catalog={catalog} />
      <FeaturedMenu catalog={catalog} />
      <WhyDineWithUs/>
      <LocationsSection />
      <ReservationCta/>
    </main>
  );
}

export default Home;
