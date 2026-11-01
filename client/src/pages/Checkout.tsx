import SmsConsent from '../components/notifications/SmsConsent';
import '../styles/Delivery.css';
import { checkoutRequestKey, bindCheckoutOrder, finishCheckoutRequest } from "../lib/checkoutRequest";
import ActionDialog from "../components/common/ActionDialog";
import SiteText from "../components/content/SiteText";
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

const formatPrice = (value: number | null) => value === null || !Number.isFinite(value) ? "Not configured" : `${previewConfig.currency} ${value.toFixed(2)}`;
const initialValues = { name: "", email: "", phone: "", recipientName: "", recipientPhone: "", city: "", neighborhood: "", postalCode: "", street: "", buildingUnit: "", latitude: "", longitude: "", instructions: "", preparationNotes: "" };
type FieldName = keyof typeof initialValues;
type Errors = Partial<Record<FieldName | "fulfillment" | "timing", string>>;
type CheckoutDraft = { values: typeof initialValues; fulfillment: FulfillmentMethod | null; pickupTiming: string; smsConsent: boolean };

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
      smsConsent: parsed.smsConsent === true,
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
  const [smsConsent, setSmsConsent] = useState(draft?.smsConsent ?? false);
  const [submitting, setSubmitting] = useState(false);
  const [paymentReview, setPaymentReview] = useState(false);
  const paymentReviewConfirmed = useRef(false);
  const [orderError, setOrderError] = useState("");
  const [createdOrder, setCreatedOrder] = useState<OrderRecord | null>(null);
  const request = useRef({ fingerprint: "", key: "" });
  const [fulfillmentChoice, setFulfillment] = useState<FulfillmentMethod | null>(draft?.fulfillment ?? null);
  const fulfillment = fulfillmentChoice ?? (isFulfillmentAvailable(config, "delivery") ? "delivery" : isFulfillmentAvailable(config, "pickup") ? "pickup" : null);
  const [values, setValues] = useState({ ...initialValues, ...draft?.values });
  const [pickupTiming, setPickupTiming] = useState(draft?.pickupTiming ?? "");
  const [errors, setErrors] = useState<Errors>({});
  const [paymentNotice, setPaymentNotice] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const totals = getFulfillmentTotals(subtotal, config, fulfillment);
  const taxRate = remoteSettings.settings?.taxBasisPoints ?? null;
  const estimatedTax = totals.total !== null && taxRate !== null ? Math.round(Math.round((subtotal + (remoteSettings.settings?.taxDeliveryFee ? totals.deliveryFee || 0 : 0)) * 100) * taxRate / 10000) / 100 : 0;
  const available = fulfillment !== null && isFulfillmentAvailable(config, fulfillment);
  const serverAvailability = fulfillment ? remoteSettings.settings?.availability?.[fulfillment] : undefined;
  const openingTime = remoteSettings.settings?.schedule?.opens;
  const openingLabel = openingTime ? (() => {
    const [hour, minute] = openingTime.split(":").map(Number);
    return (hour % 12 || 12) + (minute ? ":" + String(minute).padStart(2, "0") : "") + (hour >= 12 ? " PM" : " AM");
  })() : "";
  function availabilityLabel(method: FulfillmentMethod) {
    const state = remoteSettings.settings?.availability?.[method];
    if (!state) return "Checking availability…";
    if (state.available) return "Available";
    if (state.hours.code === "OUTSIDE_OPENING_HOURS") return openingLabel && remoteSettings.settings?.schedule?.weekdays.length === 7 ? "Closed · opens at " + openingLabel : "Closed · view collection hours";
    if (state.hours.code === "TOO_CLOSE_TO_CLOSING") return "Today's ordering cutoff reached";
    return "Temporarily unavailable · view details";
  }
  const checkoutLabel = submitting ? "Opening secure payment…"
    : !API_CONFIGURED ? "Continue to payment"
    : remoteSettings.loading ? "Checking availability…"
    : remoteSettings.error ? "Service unavailable · retry above"
    : remoteSettings.settings?.payment?.ready === false ? "Payment setup required"
    : !remoteSettings.settings?.ordersEnabled ? "Online ordering paused"
    : serverAvailability?.available === false && fulfillment ? availabilityLabel(fulfillment)
    : !auth.signedIn ? "Sign in to continue" : "Continue to secure payment";
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
  const [locationMessage, setLocationMessage] = useState('');
  function useCurrentLocation() {
    if (!navigator.geolocation) { setLocationMessage('Location is unavailable. Enter coordinates manually or provide clear street and entrance details.'); return; }
    setLocationMessage('Finding your location…');
    navigator.geolocation.getCurrentPosition(position => {
      setValues(current => ({ ...current, latitude: position.coords.latitude.toFixed(6), longitude: position.coords.longitude.toFixed(6) }));
      setErrors(current => ({ ...current, latitude: undefined, longitude: undefined }));
      setLocationMessage('Location saved. Check the map: use this only if you are at the delivery entrance. Approximate accuracy: ' + Math.round(position.coords.accuracy) + ' metres.');
    }, () => setLocationMessage('Could not obtain location. Allow browser location access or enter coordinates manually.'), { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
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
    writeDraft({ values: nextValues, fulfillment, pickupTiming, smsConsent });
  }
  function goToSignIn(nextValues: typeof initialValues = values) {
    persistDraft(nextValues);
    navigate(`/login?redirect=${encodeURIComponent("/checkout")}`);
  }
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const reviewed = paymentReviewConfirmed.current;
    paymentReviewConfirmed.current = false;
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
      if (values.latitude.trim() || values.longitude.trim()) {
        if (!values.latitude.trim() || !Number.isFinite(Number(values.latitude)) || Math.abs(Number(values.latitude)) > 90) next.latitude = 'Enter a latitude between -90 and 90.';
        if (!values.longitude.trim() || !Number.isFinite(Number(values.longitude)) || Math.abs(Number(values.longitude)) > 180) next.longitude = 'Enter a longitude between -180 and 180.';
      }
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
      smsConsent, customer: { name: values.name.trim(), email: values.email.trim(), phone: normalizedPhone! }, fulfillment,
      ...(fulfillment === "delivery" ? { deliveryAddress: { recipientName: values.recipientName.trim(), recipientPhone: normalizedRecipientPhone!, city: values.city.trim(), neighborhood: values.neighborhood.trim(), postalCode: values.postalCode.trim(), street: values.street.trim(), buildingUnit: values.buildingUnit.trim(), instructions: values.instructions.trim(), ...(values.latitude.trim() && values.longitude.trim() ? { coordinates: { latitude: Number(values.latitude), longitude: Number(values.longitude) } } : {}) } } : { pickupTiming: "asap" }),
      preparationNotes: values.preparationNotes.trim(),
      items: cartItems.map(line => ({ menuItemId: line.item.id, quantity: line.quantity, selectedOptions: [] })),
    };
    if (!reviewed) { setPaymentReview(true); return; }
    persistDraft(normalizedValues);
    const fingerprint = JSON.stringify(payload);
    setSubmitting(true);
    let savedOrderId: string | null = null;
    try {
      if (!auth.userId) throw new Error("Your session is not ready. Sign in again before continuing.");
      if (request.current.fingerprint !== fingerprint) request.current = { fingerprint, key: await checkoutRequestKey(auth.userId, fingerprint) };
      const result = await apiRequest<OrderRecord>("/orders", { method: "POST", token: await auth.getToken(), body: payload, headers: { "Idempotency-Key": request.current.key } });
      savedOrderId = result.data._id;
      bindCheckoutOrder(auth.userId, request.current.key, result.data._id);
      setCreatedOrder(result.data);
      clearDraft();
      if (result.data.paymentStatus === "unpaid" && result.data.status === "pending_payment") await openStripeCheckout(result.data._id, await auth.getToken());
      else window.location.assign(`/account/orders/${result.data._id}`);
    } catch (error) {
      setOrderError(error instanceof Error ? error.message : "The order could not be saved. Retry with the same details to avoid duplicates.");
      if (error instanceof ApiError) {
        if (auth.userId && savedOrderId && ["ORDER_EXPIRED", "PAYMENT_SESSION_CLOSED"].includes(error.code)) finishCheckoutRequest(auth.userId, savedOrderId);
        const mapped: Errors = {};
        for (const entry of error.fields) { const key = entry.path.replace(/^customer\./, "").replace(/^deliveryAddress\./, ""); if (key in initialValues) mapped[key as FieldName] = entry.message; }
        setErrors(current => ({ ...current, ...mapped }));
      }
    } finally { setSubmitting(false); }
  }
  const field = (name: FieldName, label: string, options: { type?: "email" | "tel" | "number"; step?: string; min?: number; max?: number; autoComplete?: string; wide?: boolean; required?: boolean; hint?: string } = {}) => <CheckoutField key={name} name={name} label={label} value={values[name]} onChange={(event) => updateField(name, event.target.value)} error={errors[name]} required={options.required ?? true} {...options} fixedPrefix={options.type === "tel" ? "Saudi Arabia · +966" : undefined} inputMode={options.type === "tel" ? "tel" : undefined} onBlur={name === "phone" || name === "recipientPhone" ? () => validatePhoneField(name) : undefined} hint={options.type === "tel" ? "Saudi mobiles only: 05XXXXXXXX, 5XXXXXXXX, or +9665XXXXXXXX. Spaces, dashes, and parentheses are allowed." : options.hint} />;

  return (
    <RoutePage title="A little closer to delicious." description="Review your favorites and choose how you'd like to enjoy them. Review the fulfillment details before continuing.">
      <div className="checkout-page">
        {!auth.loaded ? <p role="status"><SiteText contentKey="Checkout-text-1irqhw9" fallback={"Restoring your shopping bag…"} /></p> : cartItems.length === 0 ? <div className="checkout-page__empty"><ShoppingBag size={34} strokeWidth={1.2} aria-hidden="true" /><h2><SiteText contentKey="Checkout-text-10zemhh" fallback={"Your bag is waiting for something good."} /></h2><p><SiteText contentKey="Checkout-text-e29c73" fallback={"Add a dish from the menu before continuing to checkout."} /></p><Link className="checkout-page__primary" to="/menu"><SiteText contentKey="Checkout-text-i8g88e" fallback={"Explore the menu "} /><ArrowUpRight size={18} aria-hidden="true" /></Link></div> : <>
          <Link className="checkout-page__back" to="/cart"><ArrowLeft size={16} aria-hidden="true" /> <SiteText contentKey="Checkout-text-104tt0s" fallback={"Back to your bag"} /></Link>
          {remoteSettings.loading && <p role="status"><SiteText contentKey="Checkout-text-133rpxf" fallback={"Loading restaurant settings…"} /></p>}
          {remoteSettings.error && <p className="checkout-page__error" role="alert">{remoteSettings.error} <button type="button" onClick={remoteSettings.refresh}><SiteText contentKey="Checkout-text-982hh6" fallback={"Try again"} /></button></p>}
          {API_CONFIGURED && !auth.signedIn && <p className="checkout-page__hint"><Link to="/login?redirect=%2Fcheckout" onClick={() => persistDraft()}><SiteText contentKey="Checkout-text-w9nig3" fallback={"Sign in"} /></Link> <SiteText contentKey="Checkout-text-1co3fvn" fallback={"to save an order. Guest orders are not enabled. Your checkout details will be kept while you sign in."} /></p>}
          {API_CONFIGURED && <div className="checkout-page__hint"><p><SiteText contentKey="Checkout-text-1cow7g1" fallback={"Restaurant time zone: "} />{remoteSettings.settings?.schedule?.timeZone || "Asia/Riyadh"}<SiteText contentKey="Checkout-text-1cpvbki" fallback={". Availability is checked again when you submit."} /></p><button type="button" onClick={remoteSettings.refresh} disabled={remoteSettings.loading}><SiteText contentKey="Checkout-text-1gsfl33" fallback={"Refresh availability"} /></button></div>}
          {serverAvailability && !serverAvailability.available && <div className="checkout-page__setup" role="status"><h3><SiteText contentKey="Checkout-text-30b44" fallback={"Ordering availability"} /></h3><ul>{serverAvailability.reasons.map(reason => <li key={reason}>{reason}</li>)}</ul></div>}
          <form className="checkout-page__layout" ref={formRef} noValidate onSubmit={event => void handleSubmit(event)}>
            <div className="checkout-page__form-content">
              <fieldset className="checkout-page__section" disabled={submitting || !!createdOrder}>
                <legend><span>01</span> <SiteText contentKey="Checkout-text-9m3l4q" fallback={"How shall we serve you?"} /></legend>
                <div className="checkout-page__fulfillment">
                  {(["delivery", "pickup"] as const).map((method) => { const enabled = isFulfillmentAvailable(config, method); const Icon = method === "delivery" ? Truck : Store; return <label className="checkout-page__option" key={method}><input type="radio" name="fulfillment" value={method} checked={fulfillment === method} disabled={!enabled} onChange={() => selectFulfillment(method)} /><Icon size={23} strokeWidth={1.3} aria-hidden="true" /><span><strong>{method === "delivery" ? "Delivery" : "Pickup"}</strong><small>{enabled ? API_CONFIGURED ? availabilityLabel(method) : "Available in demo mode" : "Unavailable · setup required"}</small></span></label>; })}
                </div>
                {config.delivery.estimatedMinutes && <p className="checkout-page__hint">{config.delivery.estimateConfirmed === false ? "Proposed delivery estimate (restaurant confirmation required)" : "Approximate delivery estimate"}: {config.delivery.estimatedMinutes.min}–{config.delivery.estimatedMinutes.max} <SiteText contentKey="Checkout-text-vyfw37" fallback={"minutes after acceptance. Not an arrival guarantee. Delivery is available only within confirmed coverage and when ordering is enabled."} /></p>}
                <div className="checkout-page__setup" role="status">
                  {(["delivery", "pickup"] as const).filter((method) => !isFulfillmentAvailable(config, method)).map((method) => <div key={method}><h3>{method === "delivery" ? "Delivery" : "Pickup"} <SiteText contentKey="Checkout-text-rbqnue" fallback={"setup"} /></h3>{!config[method].enabled && <p><SiteText contentKey="Checkout-text-1bo0beq" fallback={"This fulfillment option is disabled in the restaurant settings."} /></p>}{getFulfillmentSetupIssues(config, method).length > 0 && <ul>{getFulfillmentSetupIssues(config, method).map((issue) => <li key={issue}>{issue}</li>)}</ul>}</div>)}
                </div>
                {errors.fulfillment && <p className="checkout-page__error" role="alert">{errors.fulfillment}</p>}
              </fieldset>
              <fieldset className="checkout-page__section" disabled={submitting || !!createdOrder}>
                <legend><span>02</span> <SiteText contentKey="Checkout-text-1lnn6sg" fallback={"A little about you."} /></legend>
                <p className="checkout-page__hint"><SiteText contentKey="Checkout-text-1pk7u5o" fallback={"All fields are required unless marked optional."} /></p>
                <div className="checkout-page__fields">{field("name", "Full name", { autoComplete: "section-customer name", wide: true })}{field("email", "Email address", { type: "email", autoComplete: "section-customer email" })}{field("phone", "Phone number", { type: "tel", autoComplete: "section-customer tel", hint: "Saudi mobile numbers only." })}<div className="checkout-page__field checkout-page__field--wide"><label htmlFor="checkout-preparation-notes">Kitchen notes (optional)</label><textarea id="checkout-preparation-notes" maxLength={1000} value={values.preparationNotes} onChange={event => updateField("preparationNotes", event.target.value)} placeholder="Any preparation requests for the kitchen?" aria-describedby="checkout-preparation-notes-hint" /><small id="checkout-preparation-notes-hint">Requests are reviewed by the restaurant. Contact the team directly about food allergies.</small></div></div>
              </fieldset>
              {fulfillment === "pickup" && <fieldset className="checkout-page__section" disabled={submitting || !!createdOrder}>
                <legend><span>03</span> <SiteText contentKey="Checkout-text-j2nopr" fallback={"Collect from the restaurant."} /></legend>
                <dl className="checkout-page__pickup-details"><div><dt><SiteText contentKey="Checkout-text-kovy5m" fallback={"Restaurant address"} /></dt><dd><address>{config.pickup.restaurantAddress || "SETUP REQUIRED: restaurant address"}</address>{config.pickup.mapsUrl && <a href={config.pickup.mapsUrl} target="_blank" rel="noopener noreferrer"><SiteText contentKey="Checkout-text-1t7lrc2" fallback={"View pickup location on Google Maps"} /></a>}{remoteSettings.settings?.location?.exactAddressConfirmed === false && <small><SiteText contentKey="Checkout-text-jw33j3" fallback={"Area display only; exact street address has not been confirmed."} /></small>}</dd></div><div><dt><SiteText contentKey="Checkout-text-y6wczu" fallback={"Collection hours"} /></dt><dd>{config.pickup.openingHours || "SETUP REQUIRED: opening hours"}</dd></div><div><dt><SiteText contentKey="Checkout-text-5n7d0u" fallback={"Collection instructions"} /></dt><dd>{config.pickup.collectionInstructions || "SETUP REQUIRED: collection instructions"}</dd></div></dl>
                <div className="checkout-page__field"><label htmlFor="checkout-timing"><SiteText contentKey="Checkout-text-g3jecm" fallback={"Available pickup timing"} /></label><select id="checkout-timing" required value={pickupTiming} onChange={(event) => { setPickupTiming(event.target.value); setErrors((current) => ({ ...current, timing: undefined })); setPaymentNotice(false); }} aria-invalid={errors.timing ? true : undefined} aria-describedby={errors.timing ? "checkout-timing-error" : "checkout-timing-hint"}><option value="">Choose pickup timing</option><option value="asap">Next available collection · approx. {config.pickup.estimatedMinutes ? `${config.pickup.estimatedMinutes.min}–${config.pickup.estimatedMinutes.max}` : config.pickup.preparationTimeMinutes} minutes after acceptance</option></select><small id="checkout-timing-hint"><SiteText contentKey="Checkout-text-1laxzd6" fallback={"Approximate estimate after staff acceptance, not a guarantee. "} />{config.pickup.estimateConfirmed === false && "Proposed estimate awaiting restaurant confirmation. "}<SiteText contentKey="Checkout-text-1f8fful" fallback={"Opening days/hours and near-closing cutoff are checked by the server. Automatic notifications are not connected."} /></small>{errors.timing && <p id="checkout-timing-error" className="checkout-page__error">{errors.timing}</p>}</div>
              </fieldset>}
              {fulfillment === "delivery" && <fieldset className="checkout-page__section" disabled={submitting || !!createdOrder}>
                <legend><span>03</span> <SiteText contentKey="Checkout-text-1bx7hcy" fallback={"Where are we headed?"} /></legend>
                <p className="checkout-page__hint"><SiteText contentKey="Checkout-text-1w4pvp5" fallback={"Approximate delivery: "} />{config.delivery.estimatedMinutes?.min}–{config.delivery.estimatedMinutes?.max} <SiteText contentKey="Checkout-text-ggxdi5" fallback={"minutes after restaurant acceptance, not guaranteed. "} />{config.delivery.estimateConfirmed === false && "Proposed estimate awaiting restaurant confirmation. "} <SiteText contentKey="Checkout-text-1v3gs07" fallback={"Minimum items subtotal: "} />{formatPrice(config.delivery.minimumOrder)}.</p>
                <div className="checkout-page__fields">
                  {field("recipientName", "Recipient name", { autoComplete: "section-delivery shipping name", wide: true })}
                  {field("recipientPhone", "Recipient phone", { type: "tel", autoComplete: "section-delivery shipping tel", wide: true })}
                  {cityOptions.length ? <div className="checkout-page__field"><label htmlFor="checkout-city"><SiteText contentKey="Checkout-text-142k4ma" fallback={"City"} /></label><select id="checkout-city" required value={values.city} onChange={event => { updateField('city', event.target.value); setValues(current => ({ ...current, neighborhood: '', postalCode: '' })); }} aria-invalid={!!errors.city} aria-describedby={errors.city ? 'checkout-city-error' : undefined}><option value="">Choose a supported city</option>{cityOptions.map(city => <option key={city} value={city}>{city}</option>)}</select>{errors.city && <p id="checkout-city-error" className="checkout-page__error">{errors.city}</p>}</div> : field("city", "City", { autoComplete: "section-delivery shipping address-level2" })}
                  {neighborhoodOptions.length && !hasPostalOnlyArea ? <div className="checkout-page__field"><label htmlFor="checkout-neighborhood"><SiteText contentKey="Checkout-text-30w21" fallback={"Neighborhood"} /></label><select id="checkout-neighborhood" required value={values.neighborhood} onChange={event => updateField('neighborhood', event.target.value)} aria-invalid={!!errors.neighborhood} aria-describedby={errors.neighborhood ? 'checkout-neighborhood-error' : undefined}><option value="">Choose a supported neighborhood</option>{neighborhoodOptions.map(neighborhood => <option key={neighborhood} value={neighborhood}>{neighborhood}</option>)}</select>{errors.neighborhood && <p id="checkout-neighborhood-error" className="checkout-page__error">{errors.neighborhood}</p>}</div> : field("neighborhood", "Neighborhood", { autoComplete: "section-delivery shipping address-level3" })}
                  {field("postalCode", postalRequired ? "Postal code" : "Postal code (optional)", { autoComplete: "section-delivery shipping postal-code", required: postalRequired, wide: true })}
                  {field("street", "Street address", { autoComplete: "section-delivery shipping address-line1", wide: true })}
                  {field("buildingUnit", "Building / unit details", { autoComplete: "section-delivery shipping address-line2", wide: true, hint: "Include the building and unit number, or state that it is a standalone property." })}
                  <div className="checkout-page__field checkout-page__field--wide delivery-location"><h3>Exact delivery entrance</h3><p>Add a map location to help your driver find you. This does not replace the address or confirm delivery coverage.</p><button type="button" onClick={useCurrentLocation}>Use my current location</button>{locationMessage && <p role="status">{locationMessage}</p>}</div>
                  {field("latitude", "Latitude (optional)", { type: "number", step: "any", min: -90, max: 90, required: false, hint: "Copy coordinates from your map or use current location." })}
                  {field("longitude", "Longitude (optional)", { type: "number", step: "any", min: -180, max: 180, required: false })}
                  {values.latitude.trim() && values.longitude.trim() && Number.isFinite(Number(values.latitude)) && Number.isFinite(Number(values.longitude)) && Math.abs(Number(values.latitude)) <= 90 && Math.abs(Number(values.longitude)) <= 180 && <a className="checkout-page__field--wide" href={'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(values.latitude+','+values.longitude)} target="_blank" rel="noopener noreferrer">Check this delivery location on the map (new tab)</a>}

                  <div className="checkout-page__field checkout-page__field--wide"><label htmlFor="checkout-instructions"><SiteText contentKey="Checkout-text-4l1lu1" fallback={"Delivery instructions (optional)"} /></label><textarea id="checkout-instructions" value={values.instructions} onChange={(event) => updateField("instructions", event.target.value)} rows={3} maxLength={500} /></div>
                </div>
                {areaError && <p className="checkout-page__error" role="status">{areaError}</p>}
              </fieldset>}
            </div>
            <aside className="checkout-page__summary" aria-labelledby="checkout-summary-title">
              <div className="checkout-page__summary-heading"><span><SiteText contentKey="Checkout-text-1ozvb9n" fallback={"GOOD THINGS, TOGETHER"} /></span><h2 id="checkout-summary-title"><SiteText contentKey="Checkout-text-ahhg7c" fallback={"Your order."} /></h2><p>{totalQuantity} {totalQuantity === 1 ? "item" : "items"} · {fulfillment ? fulfillment === "delivery" ? "Delivery" : "Pickup" : "Fulfillment not available"}</p><Link to="/cart"><SiteText contentKey="Checkout-text-125pf0y" fallback={"Edit your bag "} /><ArrowUpRight size={14} aria-hidden="true" /></Link></div>
              <ul className="checkout-page__items" aria-label="Order items">{cartItems.map(({ item, quantity }) => <li key={item.id} className="checkout-page__item"><LoadingImage src={item.image} alt="" loading="lazy" /><div><h3>{item.name}</h3><p><SiteText contentKey="Checkout-text-bgee09" fallback={"Qty "} />{quantity} · {formatPrice(item.price)} <SiteText contentKey="Checkout-text-5ok4rs" fallback={"each"} /></p></div><strong>{formatPrice(item.price * quantity)}</strong></li>)}</ul>
              <dl className="checkout-page__totals"><div><dt><SiteText contentKey="Checkout-text-1mnez65" fallback={"Subtotal"} /></dt><dd>{formatPrice(subtotal)}</dd></div><div><dt><SiteText contentKey="Checkout-text-a2dh0d" fallback={"Delivery fee"} /></dt><dd>{totals.deliveryFee === null ? "Not configured" : fulfillment === "pickup" ? "Not applicable (pickup)" : formatPrice(totals.deliveryFee)}</dd></div><div><dt><SiteText contentKey="Checkout-text-1nxs6fi" fallback={"Tax "} />{taxRate === null ? "(not configured)" : ""}</dt><dd>{formatPrice(estimatedTax)}</dd></div><div className="checkout-page__total"><dt><SiteText contentKey="Checkout-text-cf4vwb" fallback={"Estimated total"} /></dt><dd>{totals.total === null ? "Unavailable" : formatPrice(totals.total + estimatedTax)}</dd></div></dl>
              {totals.minimumShortfall > 0 && <p className="checkout-page__error" role="status"><SiteText contentKey="Checkout-text-13okvdo" fallback={"Add "} />{formatPrice(totals.minimumShortfall)} <SiteText contentKey="Checkout-text-1ikb2aw" fallback={"more in items to meet the "} />{formatPrice(config.delivery.minimumOrder)} <SiteText contentKey="Checkout-text-qipbuf" fallback={"delivery minimum. "} /><Link to="/menu"><SiteText contentKey="Checkout-text-1l9l37e" fallback={"Explore the menu"} /></Link></p>}
              {!available && <p className="checkout-page__hint"><SiteText contentKey="Checkout-text-h4d2bx" fallback={"No fully configured fulfillment option is currently selected. Review the availability details above."} /></p>}
              <p className="checkout-page__hint"><SiteText contentKey="Checkout-text-1qacba7" fallback={"After your order is saved, its TBL order number appears here and in your account. The kitchen receives it after verified payment and restaurant acceptance."} /></p>
              {serverAvailability && !serverAvailability.available && <div id="checkout-availability-reason" className="checkout-page__availability" role="status"><strong>{fulfillment ? availabilityLabel(fulfillment) : "Ordering paused"}</strong>{serverAvailability.reasons.map(reason => <p key={reason}>{reason}</p>)}<p><SiteText contentKey="Checkout-text-10kbeto" fallback={"Your bag stays saved. Availability refreshes automatically; you can return during opening hours."} /></p></div>}
              <SmsConsent checked={smsConsent} onChange={setSmsConsent}/><button aria-describedby={serverAvailability?.available === false ? "checkout-availability-reason" : undefined} className="checkout-page__primary" type="submit" disabled={!available || remoteSettings.loading || !!remoteSettings.error || (API_CONFIGURED && serverAvailability?.available === false) || totals.minimumShortfall > 0 || submitting || !!createdOrder || (API_CONFIGURED && !remoteSettings.settings?.ordersEnabled)}>{checkoutLabel} <ArrowUpRight size={18} aria-hidden="true" /></button>
              <p className="checkout-page__payment-note">{API_CONFIGURED ? "Prices and fulfillment rules are checked again by the server. Payment takes place on Stripe. Orders remain unpaid until a signed payment event is verified, and restaurant acceptance is still required." : "Demo only. Backend order creation and payment integration are not connected. No order will be placed and no payment will be taken."}</p>
              {API_CONFIGURED && !remoteSettings.settings?.ordersEnabled && <p className="checkout-page__hint">{remoteSettings.settings?.payment?.ready === false ? remoteSettings.settings.payment.reason : "Online order creation is paused in the server settings."}</p>}
              {orderError && <p className="checkout-page__error" role="alert">{orderError}</p>}
              {createdOrder && <div className="checkout-page__status" role="status"><SiteText contentKey="Checkout-text-kxldth" fallback={"Order "} />{createdOrder.orderNumber} <SiteText contentKey="Checkout-text-ks2i7s" fallback={"saved. Payment status: "} />{createdOrder.paymentStatus}<SiteText contentKey="Checkout-text-1dtvl9c" fallback={". Server total: "} />{formatPrice(createdOrder.totalHalalas / 100)}<SiteText contentKey="Checkout-text-zu1nzw" fallback={". Restaurant acceptance is separate from payment; check the saved order for the latest verified status. "} /><Link to={`/account/orders/${createdOrder._id}`}><SiteText contentKey="Checkout-text-t579p7" fallback={"View saved order"} /></Link>{createdOrder.paymentStatus === "unpaid" && createdOrder.status === "pending_payment" && <PayOrderButton orderId={createdOrder._id} />}</div>}
              <div className="checkout-page__status" role="status" aria-live="polite" aria-atomic="true">{paymentNotice && "Demo validation passed. Backend order creation and payment integration are not connected. No order has been placed and no payment has been taken."}</div>
              {Object.values(errors).some(Boolean) && <p className="checkout-page__error" role="alert"><SiteText contentKey="Checkout-text-1h1zwpb" fallback={"Please correct the highlighted fields before continuing."} /></p>}
            </aside>
          </form>
          {paymentReview && <ActionDialog title="Ready to continue?" description="Review your bag before saving the order and opening Stripe. Final prices and availability are checked by the server. Opening this review does not place an order or take payment." onClose={() => setPaymentReview(false)}><dl className="action-dialog__summary"><div><dt>Fulfillment</dt><dd>{fulfillment === "delivery" ? "Delivery" : "Pickup"}</dd></div><div><dt>Items</dt><dd>{totalQuantity}</dd></div><div><dt>Customer</dt><dd>{values.name}</dd></div><div><dt>Estimated total</dt><dd><strong>{totals.total !== null ? formatPrice(totals.total + estimatedTax) : "Unavailable"}</strong></dd></div></dl><div className="action-dialog__actions"><button type="button" onClick={() => setPaymentReview(false)}>Keep reviewing</button><button className="action-dialog__primary" type="button" onClick={() => { paymentReviewConfirmed.current = true; setPaymentReview(false); requestAnimationFrame(() => formRef.current?.requestSubmit()); }}>Save order & continue to Stripe</button></div></ActionDialog>}
        </>}
      </div>
    </RoutePage>
  );
}
export default Checkout;
