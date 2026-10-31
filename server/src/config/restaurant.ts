export type DeliveryArea = { city: string; neighborhood: string; postalCodes: string[] };
export type CollectionWindow = { weekday: number; opens: string; closes: string };
// SETUP REQUIRED. Never infer fees, hours, zones, taxes, or capacities.
export const restaurant = {
  currency: 'SAR' as const,
  pickup: { enabled: false, restaurantAddress: '', openingHours: '', collectionInstructions: '', preparationTimeMinutes: null as number | null },
  delivery: { enabled: false, supportedAreas: [] as DeliveryArea[], feeHalalas: null as number | null, minimumOrderHalalas: null as number | null, estimatedMinutes: null as { min: number; max: number } | null },
  taxDeliveryFee: null as boolean | null, // SETUP: verified tax policy for delivery fees
  taxBasisPoints: null as number | null, // null = not configured/applied; set only a verified rate in basis points
  reservations: { enabled: false, timeZone: 'Asia/Riyadh', maxPartySize: null as number | null, collectionWindows: [] as CollectionWindow[] },
};
