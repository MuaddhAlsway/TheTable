import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Check, Minus, Plus, X } from 'lucide-react';
import type { MenuItem } from '../../data/menuItems';
import { useCart } from '../../hooks/useCart';
import LoadingImage from '../common/LoadingImage';
import '../../styles/DishDetails.css';
export default function DishDetails({ item, onClose }: { item: MenuItem; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const headingId = useId();
  const descriptionId = useId();
  const { cartItems, addToCart } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [notice, setNotice] = useState('');
  const existing = cartItems.find(line => line.item.id === item.id)?.quantity || 0;
  const remaining = Math.max(0, 99 - existing);
  const bagFull = !existing && cartItems.length >= 50;
  const selectedQuantity = Math.min(quantity, remaining);
  useEffect(() => {
    const element = dialog.current;
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    if (element && !element.open) element.showModal();
    document.body.style.overflow = 'hidden';
    return () => { element?.close(); document.body.style.overflow = previousOverflow; if (trigger?.isConnected) trigger.focus({ preventScroll: true }); };
  }, []);
  function add() {
    if (!selectedQuantity || bagFull) return;
    for (let index = 0; index < selectedQuantity; index++) addToCart(item);
    setNotice(`${selectedQuantity} ${selectedQuantity === 1 ? 'portion' : 'portions'} of ${item.name} added to your bag.`);
    setQuantity(1);
  }
  return createPortal(<dialog className="dish-details" ref={dialog} aria-labelledby={headingId} aria-describedby={descriptionId} onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="dish-details__panel"><button className="dish-details__close" type="button" onClick={onClose} aria-label="Close dish details" autoFocus><X size={21} aria-hidden="true" /></button>
      <div className="dish-details__visual"><LoadingImage src={item.image} alt={item.name} className="dish-details__image" /><span className="dish-details__image-label">THE TABLE / A LITTLE MORE TO LOVE</span>{item.tag && <span className="dish-details__tag">{item.tag}</span>}</div>
      <div className="dish-details__content"><p className="dish-details__eyebrow">{item.category} / FROM OUR KITCHEN</p><h2 id={headingId}>{item.name}</h2><p className="dish-details__price">SAR {item.price.toFixed(2)} <span>per portion</span></p><p className="dish-details__description" id={descriptionId}>{item.description}</p>
        <section className="dish-details__allergens" aria-label="Allergen information"><h3>A little care before you order.</h3>{item.allergens?.length ? <><span>Listed allergens</span><ul>{item.allergens.map(allergen => <li key={allergen}>{allergen}</li>)}</ul></> : <p>Allergen information has not been supplied for this dish. Please check with the restaurant if you have a food allergy.</p>}</section>
        <div className="dish-details__order"><div className="dish-details__quantity-row"><span>Make it yours.</span><div className="dish-details__quantity" role="group" aria-label={`Portions of ${item.name}`}><button type="button" disabled={selectedQuantity <= 1 || bagFull} onClick={() => { setQuantity(Math.max(1, selectedQuantity - 1)); setNotice(''); }} aria-label="Decrease portions"><Minus size={17} aria-hidden="true" /></button><output aria-label="Selected portions">{selectedQuantity}</output><button type="button" disabled={selectedQuantity >= remaining || bagFull} onClick={() => { setQuantity(selectedQuantity + 1); setNotice(''); }} aria-label="Increase portions"><Plus size={17} aria-hidden="true" /></button></div></div>
        <button className="dish-details__add" type="button" onClick={add} disabled={!selectedQuantity || bagFull}><span>Add to order <Plus size={17} aria-hidden="true" /></span><strong>SAR {(item.price * selectedQuantity).toFixed(2)}</strong></button>
        {existing > 0 && <p className="dish-details__bag-count">{existing} {existing === 1 ? 'portion already' : 'portions already'} in your bag.</p>}{!remaining && <p className="dish-details__limit">You have reached the 99-portion limit for this dish.</p>}{bagFull && <p className="dish-details__limit">Your bag has reached its item limit. Remove a dish before adding another.</p>}
        <div className="dish-details__notice" role="status" aria-live="polite" aria-atomic="true">{notice && <><Check size={16} aria-hidden="true" /><span>{notice}</span></>}</div>
        <Link className="dish-details__bag-link" to="/cart" onClick={onClose}>View your bag <ArrowUpRight size={17} aria-hidden="true" /></Link><small className="dish-details__footnote">Final prices and availability are checked at checkout.</small></div>
      </div>
    </div>
  </dialog>, document.body);
}
