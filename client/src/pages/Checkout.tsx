import LoadingImage from "../components/common/LoadingImage";
import { openStripeCheckout } from "../lib/payments";
import PayOrderButton from "../components/checkout/PayOrderButton";
import { usePublicSettings } from "../hooks/usePublicSettings";
import { useBackendAuth } from "../hooks/useBackendAuth";
import { apiRequest, ApiError, API_CONFIGURED } from "../lib/api";
import type { OrderRecord } from "../lib/api-types";
import { normalizeSaudiMobile, SAUDI_MOBILE_ERROR } from "../utils/saudiPhone";
import { useRef, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowUpRight, ShoppingBag, Store, Truck } from "lucide-react";
import { useCart } from "../hooks/useCart";
import { fulfillmentConfig as previewConfig, type FulfillmentMethod } from "../config/fulfillment";
import { getDeliveryAreaError, getFulfillmentSetupIssues, getFulfillmentTotals, isFulfillmentAvailable, requiresDeliveryPostalCode } from "../utils/fulfillment";
import CheckoutField from "../components/checkout/CheckoutField";
import RoutePage from "./RoutePage";
import "../styles/Checkout.css";

const formatPrice = (value: number) => `${previewConfig.currency} ${value.toFixed(2)}`;
const initialValues = { name: "", email: "", phone: "", recipientName: "", recipientPhone: "", city: "", neighborhood: "", postalCode: "", street: "", buildingUnit: "", instructions: "" };
type FieldName = keyof typeof initialValues;
type Errors = Partial<Record<FieldName | "fulfillment" | "timing", string>>;
type CheckoutDraft = { values: typeof initialValues; fulfillment: FulfillmentMethod | null; pickupTiming: string };

const DRAFT_KEY = "thetable.checkout-draft";

// Keep the typed checkout details across the Clerk sign-in round trip.
// Session storage is tab-scoped and is cleared after the order is created.
function readDraft(): CheckoutDraft | null {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CheckoutDraft> | null;
    if (!parsed || typeof parsed !== "object" || !parsed.values || typeof parsed.values !== "object") return null;
    const values = { ...initialValues };
    for (const key of Object.keys(initialValues) as FieldName[]) {
      const value = (parsed.values as Record<string, unknown>)[key];
      if (typeof value === "string") values[key] = value;
    }
    return {
      values,
      fulfillment: parsed.fulfillment === "delivery" || parsed.fulfillment === "pickup" ? parsed.fulfillment : null,
      pickupTiming: typeof parsed.pickupTiming === "string" ? parsed.pickupTiming : "",
    };
  } catch {
    return null;
  }
}
function writeDraft(draft: CheckoutDraft) {
  try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); } catch { /* Storage can be unavailable in private modes. */ }
}
function clearDraft() {
  try { sessionStorage.removeItem(DRAFT_KEY); } catch { /* Storage can be unavailable in private modes. */ }
}

function Checkout() {
  const { cartItems, totalQuantity, subtotal } = useCart();
  const auth = useBackendAuth();
  const remoteSettings = usePublicSettings();
  const navigate = useNavigate();
  const config = remoteSettings.settings?.fulfillment ?? previewConfig;
  const [draft] = useState(readDraft);
  const [submitting, setSubmitting] = useState(false);
  const [orderError, setOrderError] = useState("");
  const [createdOrder, setCreatedOrder] = useState<OrderRecord | null>(null);
  const request = useRef({ fingerprint: "", key: "" });
  const [fulfillmentChoice, setFulfillment] = useState<FulfillmentMethod | null>(draft?.fulfillment ?? null);
  const fulfillment = fulfillmentChoice ?? (isFulfillmentAvailable(config, "delivery") ? "delivery" : isFulfillmentAvailable(config, "pickup") ? "pickup" : null);
  const [values, setValues] = useState(draft?.values ?? initialValues);
  const [pickupTiming, setPickupTiming] = useState(draft?.pickupTiming ?? "");
  const [errors, setErrors] = useState<Errors>({});
  const [paymentNotice, setPaymentNotice] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const totals = getFulfillmentTotals(subtotal, config, fulfillment);
  const taxRate = remoteSettings.settings?.taxBasisPoints ?? null;
  const estimatedTax = totals.total !== null && taxRate !== null ? Math.round(Math.round((subtotal + (remoteSettings.settings?.taxDeliveryFee ? totals.deliveryFee || 0 : 0)) * 100) * taxRate / 10000) / 100 : 0;
  const available = fulfillment !== null && isFulfillmentAvailable(config, fulfillment);
  const serverAvailability = fulfillment ? remoteSettings.settings?.availability?.[fulfillment] : undefined;
  const areaError = fulfillment === "delivery" && values.city.trim() && values.neighborhood.trim() ? getDeliveryAreaError(config, values.city, values.neighborhood, values.postalCode) : null;
  const postalRequired = requiresDeliveryPostalCode(config, values.city, values.neighborhood);
  const cityOptions = [...new Set(config.delivery.supportedAreas.map(area => area.city))];
  const cityAreas = config.delivery.supportedAreas.filter(area => area.city === values.city);
  const neighborhoodOptions = [...new Set(cityAreas.map(area => area.neighborhood).filter(Boolean))];
  const hasPostalOnlyArea = cityAreas.some(area => !area.neighborhood);

  function updateField(name: FieldName, value: string) {
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined, ...(name === "city" || name === "neighborhood" || name === "postalCode" ? { neighborhood: undefined, postalCode: undefined } : {}) }));
    setPaymentNotice(false);
  }
  function validatePhoneField(name: "phone" | "recipientPhone") {
    const normalized = normalizeSaudiMobile(values[name]);
    setErrors((current) => ({ ...current, [name]: normalized ? undefined : SAUDI_MOBILE_ERROR }));
    if (normalized) setValues((current) => ({ ...current, [name]: normalized }));
  }
  function selectFulfillment(method: FulfillmentMethod) {
    setFulfillment(method);
    setErrors({});
    setPaymentNotice(false);
  }
  function persistDraft(nextValues: typeof initialValues = values) {
    writeDraft({ values: nextValues, fulfillment, pickupTiming });
  }
  function goToSignIn(nextValues: typeof initialValues = values) {
    persistDraft(nextValues);
    navigate(`/login?redirect=${encodeURIComponent("/checkout")}`);
  }
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPaymentNotice(false);
    setOrderError("");
    if (submitting || createdOrder) return;
    const next: Errors = {};
    const normalizedPhone = normalizeSaudiMobile(values.phone);
    const normalizedRecipientPhone = normalizeSaudiMobile(values.recipientPhone);
    if (!fulfillment || !available) next.fulfillment = "Select an enabled and fully configured fulfillment option.";
    if (!values.name.trim()) next.name = "Enter your full name.";
    if (!values.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) next.email = "Enter a valid email address.";
    if (!normalizedPhone) next.phone = SAUDI_MOBILE_ERROR;
    if (fulfillment === "pickup" && pickupTiming !== "asap") next.timing = "Choose the available pickup timing.";
    if (fulfillment === "delivery") {
      const required: [FieldName, string][] = [["recipientName", "recipient name"], ["city", "city"], ["neighborhood", "neighborhood"], ["street", "street address"], ["buildingUnit", "building and unit details"]];
      required.forEach(([name, label]) => { if (!values[name].trim()) next[name] = `Enter the ${label}.`; });
      if (!normalizedRecipientPhone) next.recipientPhone = SAUDI_MOBILE_ERROR;
      if (values.city.trim() && values.neighborhood.trim()) {
        const message = getDeliveryAreaError(config, values.city, values.neighborhood, values.postalCode);
        if (message) next[postalRequired ? "postalCode" : "neighborhood"] = message;
      }
      if (totals.minimumShortfall > 0) next.fulfillment = `Add ${formatPrice(totals.minimumShortfall)} more in items to meet the delivery minimum.`;
    }
    setErrors(next);
    if (Object.keys(next).length) {
      requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return;
    }
    // Normalize before the authenticated server submission.
    const normalizedValues = { ...values, phone: normalizedPhone!, ...(fulfillment === "delivery" ? { recipientPhone: normalizedRecipientPhone! } : {}) };
    setValues(normalizedValues);
    if (!API_CONFIGURED) { setPaymentNotice(true); return; }
    if (!auth.configured || !auth.signedIn) { goToSignIn(normalizedValues); return; }
    if (serverAvailability && !serverAvailability.available) { setOrderError(serverAvailability.reasons.join(" ")); return; }
    if (!remoteSettings.settings?.ordersEnabled || !fulfillment) { setOrderError("Online order creation is not enabled. No order has been placed."); return; }
    if (cartItems.some(line => !/^[a-fA-F0-9]{24}$/.test(line.item.id))) { setOrderError("Your bag contains preview menu items. Remove them and add current dishes from the connected menu."); return; }
    const payload = {
      customer: { name: values.name.trim(), email: values.email.trim(), phone: normalizedPhone! }, fulfillment,
      ...(fulfillment === "delivery" ? { deliveryAddress: { recipientName: values.recipientName.trim(), recipientPhone: normalizedRecipientPhone!, city: values.city.trim(), neighborhood: values.neighborhood.trim(), postalCode: values.postalCode.trim(), street: values.street.trim(), buildingUnit: values.buildingUnit.trim(), instructions: values.instructions.trim() } } : { pickupTiming: "asap" }),
      items: cartItems.map(line => ({ menuItemId: line.item.id, quantity: line.quantity, selectedOptions: [] })),
    };
    const fingerprint = JSON.stringify(payload);
    if (request.current.fingerprint !== fingerprint) request.current = { fingerprint, key: crypto.randomUUID() };
    setSubmitting(true);
    try {
      const result = await apiRequest<OrderRecord>("/orders", { method: "POST", token: await auth.getToken(), body: payload, headers: { "Idempotency-Key": request.current.key } });
      setCreatedOrder(result.data);
      clearDraft();
      if (result.data.paymentStatus === "unpaid" && result.data.status === "pending_payment") await openStripeCheckout(result.data._id, await auth.getToken());
      else window.location.assign(`/account/orders/${result.data._id}`);
    } catch (error) {
      setOrderError(error instanceof Error ? error.message : "The order could not be saved. Retry with the same details to avoid duplicates.");
      if (error instanceof ApiError) {
        const mapped: Errors = {};
        for (const entry of error.fields) { const key = entry.path.replace(/^customer\./, "").replace(/^deliveryAddress\./, ""); if (key in initialValues) mapped[key as FieldName] = entry.message; }
        setErrors(current => ({ ...current, ...mapped }));
      }
    } finally { setSubmitting(false); }
  }
  const field = (name: FieldName, label: string, options: { type?: "email" | "tel"; autoComplete?: string; wide?: boolean; required?: boolean; hint?: string } = {}) => <CheckoutField key={name} name={name} label={label} value={values[name]} onChange={(event) => updateField(name, event.target.value)} error={errors[name]} required={options.required ?? true} {...options} fixedPrefix={options.type === "tel" ? "Saudi Arabia · +966" : undefined} inputMode={options.type === "tel" ? "tel" : undefined} onBlur={name === "phone" || name === "recipientPhone" ? () => validatePhoneField(name) : undefined} hint={options.type === "tel" ? "Saudi mobiles only: 05XXXXXXXX, 5XXXXXXXX, or +9665XXXXXXXX. Spaces, dashes, and parentheses are allowed." : options.hint} />;

  return (
    <RoutePage title="A little closer to delicious." description="Review your favorites and choose how you'd like to enjoy them. Review the fulfillment details before continuing.">
      <div className="checkout-page">
        {!auth.loaded ? <p role="status">Restoring your shopping bag…</p> : cartItems.length === 0 ? <div className="checkout-page__empty"><ShoppingBag size={34} strokeWidth={1.2} aria-hidden="true" /><h2>Your bag is waiting for something good.</h2><p>Add a dish from the menu before continuing to checkout.</p><Link className="checkout-page__primary" to="/menu">Explore the menu <ArrowUpRight size={18} aria-hidden="true" /></Link></div> : <>
          <Link className="checkout-page__back" to="/cart"><ArrowLeft size={16} aria-hidden="true" /> Back to your bag</Link>
          {remoteSettings.loading && <p role="status">Loading restaurant settings…</p>}
          {remoteSettings.error && <p className="checkout-page__error" role="alert">{remoteSettings.error} <button type="button" onClick={remoteSettings.refresh}>Try again</button></p>}
          {API_CONFIGURED && !auth.signedIn && <p className="checkout-page__hint"><Link to="/login?redirect=%2Fcheckout" onClick={() => persistDraft()}>Sign in</Link> to save an order. Guest orders are not enabled. Your checkout details will be kept while you sign in.</p>}
          {API_CONFIGURED && <div className="checkout-page__hint"><p>Restaurant time zone: {remoteSettings.settings?.schedule?.timeZone || "Asia/Riyadh"}. Availability is checked again when you submit.</p><button type="button" onClick={remoteSettings.refresh} disabled={remoteSettings.loading}>Refresh availability</button></div>}
          {serverAvailability && !serverAvailability.available && <div className="checkout-page__setup" role="status"><h3>Ordering availability</h3><ul>{serverAvailability.reasons.map(reason => <li key={reason}>{reason}</li>)}</ul></div>}
          <form className="checkout-page__layout" ref={formRef} noValidate onSubmit={event => void handleSubmit(event)}>
            <div className="checkout-page__form-content">
              <fieldset className="checkout-page__section" disabled={submitting || !!createdOrder}>
                <legend><span>01</span> How shall we serve you?</legend>
                <div className="checkout-page__fulfillment">
                  {(["delivery", "pickup"] as const).map((method) => { const enabled = isFulfillmentAvailable(config, method); const Icon = method === "delivery" ? Truck : Store; return <label className="checkout-page__option" key={method}><input type="radio" name="fulfillment" value={method} checked={fulfillment === method} disabled={!enabled} onChange={() => selectFulfillment(method)} /><Icon size={23} strokeWidth={1.3} aria-hidden="true" /><span><strong>{method === "delivery" ? "Delivery" : "Pickup"}</strong><small>{enabled ? API_CONFIGURED ? remoteSettings.settings?.availability?.[method]?.available ? "Available" : "View details · ordering unavailable" : "Available in demo mode" : "Unavailable · setup required"}</small></span></label>; })}
                </div>
                {config.delivery.estimatedMinutes && <p className="checkout-page__hint">{config.delivery.estimateConfirmed === false ? "Proposed delivery estimate (restaurant confirmation required)" : "Approximate delivery estimate"}: {config.delivery.estimatedMinutes.min}–{config.delivery.estimatedMinutes.max} minutes after acceptance. Not an arrival guarantee. Delivery is available only within confirmed coverage and when ordering is enabled.</p>}
                <div className="checkout-page__setup" role="status">
                  {(["delivery", "pickup"] as const).filter((method) => !isFulfillmentAvailable(config, method)).map((method) => <div key={method}><h3>{method === "delivery" ? "Delivery" : "Pickup"} setup</h3>{!config[method].enabled && <p>This fulfillment option is disabled in the restaurant settings.</p>}{getFulfillmentSetupIssues(config, method).length > 0 && <ul>{getFulfillmentSetupIssues(config, method).map((issue) => <li key={issue}>{issue}</li>)}</ul>}</div>)}
                </div>
                {errors.fulfillment && <p className="checkout-page__error" role="alert">{errors.fulfillment}</p>}
              </fieldset>
              <fieldset className="checkout-page__section" disabled={submitting || !!createdOrder}>
                <legend><span>02</span> A little about you.</legend>
                <p className="checkout-page__hint">All fields are required unless marked optional.</p>
                <div className="checkout-page__fields">{field("name", "Full name", { autoComplete: "section-customer name", wide: true })}{field("email", "Email address", { type: "email", autoComplete: "section-customer email" })}{field("phone", "Phone number", { type: "tel", autoComplete: "section-customer tel", hint: "Saudi mobile numbers only." })}</div>
              </fieldset>
              {fulfillment === "pickup" && <fieldset className="checkout-page__section" disabled={submitting || !!createdOrder}>
                <legend><span>03</span> Collect from the restaurant.</legend>
                <dl className="checkout-page__pickup-details"><div><dt>Restaurant address</dt><dd><address>{config.pickup.restaurantAddress || "SETUP REQUIRED: restaurant address"}</address>{config.pickup.mapsUrl && <a href={config.pickup.mapsUrl} target="_blank" rel="noopener noreferrer">View pickup location on Google Maps</a>}{remoteSettings.settings?.location?.exactAddressConfirmed === false && <small>Area display only; exact street address has not been confirmed.</small>}</dd></div><div><dt>Collection hours</dt><dd>{config.pickup.openingHours || "SETUP REQUIRED: opening hours"}</dd></div><div><dt>Collection instructions</dt><dd>{config.pickup.collectionInstructions || "SETUP REQUIRED: collection instructions"}</dd></div></dl>
                <div className="checkout-page__field"><label htmlFor="checkout-timing">Available pickup timing</label><select id="checkout-timing" required value={pickupTiming} onChange={(event) => { setPickupTiming(event.target.value); setErrors((current) => ({ ...current, timing: undefined })); setPaymentNotice(false); }} aria-invalid={errors.timing ? true : undefined} aria-describedby={errors.timing ? "checkout-timing-error" : "checkout-timing-hint"}><option value="">Choose pickup timing</option><option value="asap">Next available collection · approx. {config.pickup.estimatedMinutes ? `${config.pickup.estimatedMinutes.min}–${config.pickup.estimatedMinutes.max}` : config.pickup.preparationTimeMinutes} minutes after acceptance</option></select><small id="checkout-timing-hint">Approximate estimate after staff acceptance, not a guarantee. {config.pickup.estimateConfirmed === false && "Proposed estimate awaiting restaurant confirmation. "}Opening days/hours and near-closing cutoff are checked by the server. Automatic notifications are not connected.</small>{errors.timing && <p id="checkout-timing-error" className="checkout-page__error">{errors.timing}</p>}</div>
              </fieldset>}
              {fulfillment === "delivery" && <fieldset className="checkout-page__section" disabled={submitting || !!createdOrder}>
                <legend><span>03</span> Where are we headed?</legend>
                <p className="checkout-page__hint">Approximate delivery: {config.delivery.estimatedMinutes?.min}–{config.delivery.estimatedMinutes?.max} minutes after restaurant acceptance, not guaranteed. {config.delivery.estimateConfirmed === false && "Proposed estimate awaiting restaurant confirmation. "} Minimum items subtotal: {formatPrice(config.delivery.minimumOrder!)}.</p>
                <div className="checkout-page__fields">
                  {field("recipientName", "Recipient name", { autoComplete: "section-delivery shipping name", wide: true })}
                  {field("recipientPhone", "Recipient phone", { type: "tel", autoComplete: "section-delivery shipping tel", wide: true })}
                  {cityOptions.length ? <div className="checkout-page__field"><label htmlFor="checkout-city">City</label><select id="checkout-city" required value={values.city} onChange={event => { updateField('city', event.target.value); setValues(current => ({ ...current, neighborhood: '', postalCode: '' })); }} aria-invalid={!!errors.city} aria-describedby={errors.city ? 'checkout-city-error' : undefined}><option value="">Choose a supported city</option>{cityOptions.map(city => <option key={city} value={city}>{city}</option>)}</select>{errors.city && <p id="checkout-city-error" className="checkout-page__error">{errors.city}</p>}</div> : field("city", "City", { autoComplete: "section-delivery shipping address-level2" })}
                  {neighborhoodOptions.length && !hasPostalOnlyArea ? <div className="checkout-page__field"><label htmlFor="checkout-neighborhood">Neighborhood</label><select id="checkout-neighborhood" required value={values.neighborhood} onChange={event => updateField('neighborhood', event.target.value)} aria-invalid={!!errors.neighborhood} aria-describedby={errors.neighborhood ? 'checkout-neighborhood-error' : undefined}><option value="">Choose a supported neighborhood</option>{neighborhoodOptions.map(neighborhood => <option key={neighborhood} value={neighborhood}>{neighborhood}</option>)}</select>{errors.neighborhood && <p id="checkout-neighborhood-error" className="checkout-page__error">{errors.neighborhood}</p>}</div> : field("neighborhood", "Neighborhood", { autoComplete: "section-delivery shipping address-level3" })}
                  {field("postalCode", postalRequired ? "Postal code" : "Postal code (optional)", { autoComplete: "section-delivery shipping postal-code", required: postalRequired, wide: true })}
                  {field("street", "Street address", { autoComplete: "section-delivery shipping address-line1", wide: true })}
                  {field("buildingUnit", "Building / unit details", { autoComplete: "section-delivery shipping address-line2", wide: true, hint: "Include the building and unit number, or state that it is a standalone property." })}
                  <div className="checkout-page__field checkout-page__field--wide"><label htmlFor="checkout-instructions">Delivery instructions (optional)</label><textarea id="checkout-instructions" value={values.instructions} onChange={(event) => updateField("instructions", event.target.value)} rows={3} maxLength={500} /></div>
                </div>
                {areaError && <p className="checkout-page__error" role="status">{areaError}</p>}
              </fieldset>}
            </div>
            <aside className="checkout-page__summary" aria-labelledby="checkout-summary-title">
              <div className="checkout-page__summary-heading"><span>GOOD THINGS, TOGETHER</span><h2 id="checkout-summary-title">Your order.</h2><p>{totalQuantity} {totalQuantity === 1 ? "item" : "items"} · {fulfillment ? fulfillment === "delivery" ? "Delivery" : "Pickup" : "Fulfillment not available"}</p><Link to="/cart">Edit your bag <ArrowUpRight size={14} aria-hidden="true" /></Link></div>
              <ul className="checkout-page__items" aria-label="Order items">{cartItems.map(({ item, quantity }) => <li key={item.id} className="checkout-page__item"><LoadingImage src={item.image} alt="" loading="lazy" /><div><h3>{item.name}</h3><p>Qty {quantity} · {formatPrice(item.price)} each</p></div><strong>{formatPrice(item.price * quantity)}</strong></li>)}</ul>
              <dl className="checkout-page__totals"><div><dt>Subtotal</dt><dd>{formatPrice(subtotal)}</dd></div><div><dt>Delivery fee</dt><dd>{totals.deliveryFee === null ? "Not configured" : fulfillment === "pickup" ? "Not applicable (pickup)" : formatPrice(totals.deliveryFee)}</dd></div><div><dt>Tax {taxRate === null ? "(not configured)" : ""}</dt><dd>{formatPrice(estimatedTax)}</dd></div><div className="checkout-page__total"><dt>Estimated total</dt><dd>{totals.total === null ? "Unavailable" : formatPrice(totals.total + estimatedTax)}</dd></div></dl>
              {totals.minimumShortfall > 0 && <p className="checkout-page__error" role="status">Add {formatPrice(totals.minimumShortfall)} more in items to meet the {formatPrice(config.delivery.minimumOrder!)} delivery minimum. <Link to="/menu">Explore the menu</Link></p>}
              {!available && <p className="checkout-page__hint">No fully configured fulfillment option is currently selected. Review the availability details above.</p>}
              <p className="checkout-page__hint">After your order is saved, its TBL order number appears here and in your account. The kitchen receives it after verified payment and restaurant acceptance.</p>
              <button className="checkout-page__primary" type="submit" disabled={!available || remoteSettings.loading || !!remoteSettings.error || (API_CONFIGURED && serverAvailability?.available === false) || totals.minimumShortfall > 0 || submitting || !!createdOrder || (API_CONFIGURED && !remoteSettings.settings?.ordersEnabled)}>{submitting ? "Opening secure payment…" : API_CONFIGURED ? !auth.signedIn ? "Sign in to continue" : remoteSettings.settings?.payment?.ready === false ? "Payment setup required" : !remoteSettings.settings?.ordersEnabled || serverAvailability?.available === false ? "Ordering unavailable" : "Continue to secure payment" : "Continue to payment"} <ArrowUpRight size={18} aria-hidden="true" /></button>
              <p className="checkout-page__payment-note">{API_CONFIGURED ? "Prices and fulfillment rules are checked again by the server. Payment takes place on Stripe. Orders remain unpaid until a signed payment event is verified, and restaurant acceptance is still required." : "Demo only. Backend order creation and payment integration are not connected. No order will be placed and no payment will be taken."}</p>
              {API_CONFIGURED && !remoteSettings.settings?.ordersEnabled && <p className="checkout-page__hint">{remoteSettings.settings?.payment?.ready === false ? remoteSettings.settings.payment.reason : "Online order creation is paused in the server settings."}</p>}
              {orderError && <p className="checkout-page__error" role="alert">{orderError}</p>}
              {createdOrder && <div className="checkout-page__status" role="status">Order {createdOrder.orderNumber} saved. Payment status: {createdOrder.paymentStatus}. Server total: {formatPrice(createdOrder.totalHalalas / 100)}. Restaurant acceptance is separate from payment; check the saved order for the latest verified status. <Link to={`/account/orders/${createdOrder._id}`}>View saved order</Link>{createdOrder.paymentStatus === "unpaid" && createdOrder.status === "pending_payment" && <PayOrderButton orderId={createdOrder._id} />}</div>}
              <div className="checkout-page__status" role="status" aria-live="polite" aria-atomic="true">{paymentNotice && "Demo validation passed. Backend order creation and payment integration are not connected. No order has been placed and no payment has been taken."}</div>
              {Object.values(errors).some(Boolean) && <p className="checkout-page__error" role="alert">Please correct the highlighted fields before continuing.</p>}
            </aside>
          </form>
        </>}
      </div>
    </RoutePage>
  );
}
export default Checkout;
