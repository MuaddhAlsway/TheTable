import { useDishDetails } from "../../hooks/useDishDetails";
import LoadingImage from "../common/LoadingImage";
import { Plus } from "lucide-react";
import type { MenuItem } from "../../data/menuItems";
import "../../styles/MenuItemCard.css";

type MenuItemCardProps = { item: MenuItem; onAdd: (item: MenuItem) => void };
function MenuItemCard({ item, onAdd }: MenuItemCardProps) {
  const { openDish } = useDishDetails();
  return (
    <article className="menu-item-card dish-preview">
      <button className="dish-open" type="button" onClick={() => openDish(item)} aria-label={`View ${item.name} details`} aria-haspopup="dialog"><span className="dish-open__hint">View dish ↗</span></button>
      <div className="menu-item-card__image-wrap">
        <LoadingImage className="menu-item-card__image" src={item.image} alt={item.name} loading="lazy" decoding="async" />
        {item.tag && <span className="menu-item-card__tag">{item.tag}</span>}
        <span className="menu-item-card__image-index" aria-hidden="true">THE TABLE / {item.category.toUpperCase()}</span>
      </div>
      <div className="menu-item-card__body">
        <p className="menu-item-card__category">{item.category}</p>
        <div className="menu-item-card__heading"><h3>{item.name}</h3><p className="menu-item-card__price"><small>SAR</small> {item.price}</p></div>
        <p className="menu-item-card__description">{item.description}</p>
        <div className="menu-item-card__bottom"><span>Made to be enjoyed.</span><button className="menu-item-card__add" type="button" onClick={() => onAdd(item)} aria-label={`Add ${item.name} to your order`}><span>Add to order</span><Plus size={17} aria-hidden="true" /></button></div>
      </div>
    </article>
  );
}
export default MenuItemCard;
