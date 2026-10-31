export type FulfillmentMethod = "delivery" | "pickup";
export type TimeRange = { min: number; max: number };
export type DeliveryArea = {
  city: string;
  neighborhood: string;
  /** Empty means no postal-code restriction for this specific neighborhood. */
  postalCodes: readonly string[];
};
export type FulfillmentConfig = {
  currency: "SAR";
  pickup: {
    enabled: boolean;
    restaurantAddress: string;
    openingHours: string;
    collectionInstructions: string;
    preparationTimeMinutes: number | null;
    mapsUrl?: string;
    estimatedMinutes?: TimeRange;
    estimateConfirmed?: boolean;
  };
  delivery: {
    enabled: boolean;
    supportedAreas: readonly DeliveryArea[];
    fee: number | null;
    minimumOrder: number | null;
    estimatedMinutes: TimeRange | null;
    estimateConfirmed?: boolean;
  };
};

/**
 * SETUP REQUIRED: enter verified restaurant values before setting enabled: true.
 * Blank strings, empty arrays, and null are intentionally unconfigured.
 * Zero is an explicit free-delivery fee / no-minimum policy, not a placeholder.
 * supportedAreas must name each city + neighborhood pair; add postal codes only
 * when that neighborhood is restricted to those exact codes.
 * enabled only controls this demo UI; it does not connect ordering or payment.
 */
export const fulfillmentConfig: FulfillmentConfig = {
  currency: "SAR",
  pickup: {
    enabled: false,
    restaurantAddress: "", // SETUP: actual collection address
    openingHours: "", // SETUP: verified collection days and hours
    collectionInstructions: "", // SETUP: where/how guests collect their order
    preparationTimeMinutes: null, // SETUP: verified preparation estimate
  },
  delivery: {
    enabled: false,
    supportedAreas: [], // SETUP: verified city, neighborhood, postal-code rules
    fee: null, // SETUP: delivery charge in SAR; use 0 only if explicitly free
    minimumOrder: null, // SETUP: minimum items subtotal in SAR; 0 means none
    estimatedMinutes: null, // SETUP: { min, max } delivery-time estimate
  },
};
