import SiteText from "../components/content/SiteText";
import { useBackendAuth } from "../hooks/useBackendAuth";
import LoadingImage from "../components/common/LoadingImage";
import { Link } from "react-router-dom";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import RoutePage from "./RoutePage";
import { useCart } from "../hooks/useCart";
import "../styles/Cart.css";

const formatPrice = (value: number) => `SAR ${value.toFixed(2)}`;
function Cart() {
  const auth = useBackendAuth();
  const { cartItems, totalQuantity, subtotal, increaseQuantity, decreaseQuantity, removeItem } = useCart();
  return (
    <RoutePage title="Your shopping bag." description="A little of this. A little of that. Your favorites, together.">
      <div className="cart-page">
        {!auth.loaded ? <p role="status"><SiteText contentKey="Cart-text-1irqhw9" fallback={"Restoring your shopping bag…"} /></p> : cartItems.length === 0 ? <div className="cart-page__empty"><ShoppingBag size={32} strokeWidth={1.2} aria-hidden="true" /><h2><SiteText contentKey="Cart-text-ggizsd" fallback={"Your bag is empty."} /></h2><p><SiteText contentKey="Cart-text-1bqk829" fallback={"Find something delicious to get started."} /></p><Link to="/menu"><SiteText contentKey="Cart-text-1l9l37e" fallback={"Explore the menu"} /></Link></div> : <>
          <ul className="cart-page__items" aria-label="Items in your bag">
            {cartItems.map(({ item, quantity }) => <li className="cart-page__line" key={item.id}>
              <LoadingImage src={item.image} alt={item.name} />
              <div className="cart-page__dish"><h2>{item.name}</h2><p>{formatPrice(item.price)} <SiteText contentKey="Cart-text-5ok4rs" fallback={"each"} /></p><button className="cart-page__remove" type="button" onClick={() => removeItem(item.id)} aria-label={`Remove ${item.name}`}><Trash2 size={14} aria-hidden="true" /> <SiteText contentKey="Cart-text-9c35st" fallback={"Remove"} /></button></div>
              <div className="cart-page__quantity" role="group" aria-label={`Quantity of ${item.name}`}><button type="button" onClick={() => decreaseQuantity(item.id)} aria-label={`Decrease ${item.name} quantity`}><Minus size={16} aria-hidden="true" /></button><output aria-label={`${item.name} quantity`}>{quantity}</output><button type="button" onClick={() => increaseQuantity(item.id)} aria-label={`Increase ${item.name} quantity`}><Plus size={16} aria-hidden="true" /></button></div>
              <p className="cart-page__line-total" aria-label={`${item.name} line total`}>{formatPrice(item.price * quantity)}</p>
            </li>)}
          </ul>
          <div className="cart-page__summary" aria-live="polite" aria-atomic="true"><p>{totalQuantity} {totalQuantity === 1 ? "item" : "items"}</p><p><SiteText contentKey="Cart-text-uu7h3r" fallback={"Subtotal "} /><strong>{formatPrice(subtotal)}</strong></p></div>
          <p className="cart-page__note"><SiteText contentKey="Cart-text-1j2s5i3" fallback={"Your bag is saved in this browser and restored after refresh. Signed-in accounts keep separate bags. Secure payment is handled by Stripe when checkout is available."} /></p>
          <Link className="cart-page__checkout" to="/checkout"><SiteText contentKey="Cart-text-2qksl6" fallback={"Proceed to checkout"} /></Link>
          <Link className="cart-page__continue" to="/menu"><SiteText contentKey="Cart-text-xia7cy" fallback={"Continue exploring the menu"} /></Link>
        </>}
      </div>
    </RoutePage>
  );
}
export default Cart;
