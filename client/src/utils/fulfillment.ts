import type { FulfillmentConfig, FulfillmentMethod } from "../config/fulfillment";

const normalize = (value: string) => value.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("en");
const isMoney = (value: number | null) => value !== null && Number.isFinite(value) && value >= 0 && Math.abs(value * 100 - Math.round(value * 100)) < 0.000001;

export function getFulfillmentSetupIssues(config: FulfillmentConfig, method: FulfillmentMethod): string[] {
  if (method === "pickup") {
    const pickup = config.pickup;
    const issues: string[] = [];
    if (!pickup.restaurantAddress.trim()) issues.push("Pickup address has not been configured.");
    if (!pickup.openingHours.trim()) issues.push("Pickup opening hours have not been configured.");
    if (!pickup.collectionInstructions.trim()) issues.push("Collection instructions have not been configured.");
    if (pickup.preparationTimeMinutes === null || !Number.isInteger(pickup.preparationTimeMinutes) || pickup.preparationTimeMinutes <= 0) issues.push("Pickup preparation time has not been configured correctly.");
    return issues;
  }
  const delivery = config.delivery;
  const issues: string[] = [];
  if (!delivery.supportedAreas.length) issues.push("Delivery service areas have not been configured. No address can be confirmed as supported.");
  else if (delivery.supportedAreas.some((area) => !area.city.trim() || (!area.neighborhood.trim() && !area.postalCodes.length) || area.postalCodes.some((code) => !code.trim()))) issues.push("Each delivery area needs a city, neighborhood, and valid postal-code entries.");
  if (!isMoney(delivery.fee)) issues.push("Delivery fee has not been configured correctly.");
  if (!isMoney(delivery.minimumOrder)) issues.push("Delivery minimum order has not been configured correctly.");
  const range = delivery.estimatedMinutes;
  if (!range || !Number.isInteger(range.min) || !Number.isInteger(range.max) || range.min <= 0 || range.max < range.min) issues.push("Delivery time range has not been configured correctly.");
  return issues;
}

export function isFulfillmentAvailable(config: FulfillmentConfig, method: FulfillmentMethod) {
  return config[method].enabled && getFulfillmentSetupIssues(config, method).length === 0;
}

export function requiresDeliveryPostalCode(config: FulfillmentConfig, city: string, neighborhood: string) {
  const matches = config.delivery.supportedAreas.filter((area) => normalize(area.city) === normalize(city) && (!area.neighborhood || normalize(area.neighborhood) === normalize(neighborhood)));
  return matches.length > 0 && matches.every((area) => area.postalCodes.length > 0);
}

export function getDeliveryAreaError(config: FulfillmentConfig, city: string, neighborhood: string, postalCode: string): string | null {
  if (!config.delivery.supportedAreas.length) return "Delivery service areas have not been configured. No address can be confirmed as supported.";
  const matches = config.delivery.supportedAreas.filter((area) => normalize(area.city) === normalize(city) && (!area.neighborhood || normalize(area.neighborhood) === normalize(neighborhood)));
  if (!matches.length) return "This city and neighborhood are outside the configured delivery area.";
  if (!matches.some((area) => area.postalCodes.length === 0 || area.postalCodes.some((code) => normalize(code) === normalize(postalCode)))) return "Enter a postal code supported for this neighborhood.";
  return null;
}

/** Monetary calculations use integer halalas before returning SAR amounts. */
export function getFulfillmentTotals(subtotal: number, config: FulfillmentConfig, method: FulfillmentMethod | null) {
  const subtotalHalalas = Math.round(subtotal * 100);
  if (!method || !isFulfillmentAvailable(config, method)) return { deliveryFee: null, total: null, minimumShortfall: 0 };
  const feeHalalas = method === "delivery" ? Math.round(config.delivery.fee! * 100) : 0;
  const minimumHalalas = method === "delivery" ? Math.round(config.delivery.minimumOrder! * 100) : 0;
  return {
    deliveryFee: feeHalalas / 100,
    total: (subtotalHalalas + feeHalalas) / 100,
    minimumShortfall: Math.max(0, minimumHalalas - subtotalHalalas) / 100,
  };
}
