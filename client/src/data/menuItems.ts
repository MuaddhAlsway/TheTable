
import image01 from '../assets/RoastedTomatoSoup.png'
import image02 from '../assets/Burrata&GardenGreens.png'
import image3 from '../assets/HouseTomatoPasta.png'
import image4 from '../assets/TheTableBurger.png'
import image5 from '../assets/FriedGolden.png'
import image6 from '../assets/SeasonalCake.png'
export type MenuCategory = "All" | "Starters" | "Mains" | "Sides" | "Desserts";

export type MenuItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  category: Exclude<MenuCategory, "All">;
  image: string;
  tag?: string;
  heroSlide?: number;
  heroImage?: string;
};

export const menuCategories: MenuCategory[] = [
  "All",
  "Starters",
  "Mains",
  "Sides",
  "Desserts",
];

export const menuItems: MenuItem[] = [
  {
    id: "roasted-tomato-soup",
    name: "Roasted Tomato Soup",
    description: "Slow-roasted tomatoes, fresh basil, and toasted sourdough.",
    price: 28,
    category: "Starters",
    image: image01,
  },
  {
    id: "burrata-salad",
    name: "Burrata & Garden Greens",
    description: "Creamy burrata, seasonal greens, and a bright herb dressing.",
    price: 42,
    category: "Starters",
    image: image02,
    tag: "A guest favorite",
  },
  {
    id: "house-pasta",
    name: "House Tomato Pasta",
    description: "Hand-finished pasta with ripe tomatoes, basil, and parmesan.",
    price: 54,
    category: "Mains",
    image: image3,
    tag: "Popular",
  },
  {
    id: "table-burger",
    name: "The Table Burger",
    description: "Grilled beef, aged cheese, house sauce, and crisp lettuce.",
    price: 59,
    category: "Mains",
    image: image4 ,
  },
  {
    id: "golden-fries",
    name: "Golden Fries",
    description: "Crisp fries, lightly seasoned and served with house dip.",
    price: 18,
    category: "Sides",
    image: image5,
  },
  {
    id: "seasonal-cake",
    name: "Seasonal Cake",
    description: "A daily slice from our kitchen, made with seasonal ingredients.",
    price: 32,
    category: "Desserts",
    image: image6,
  },
];