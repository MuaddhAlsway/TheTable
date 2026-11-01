import type { MenuItem } from '../data/menuItems';
import type { FulfillmentConfig, FulfillmentMethod } from '../config/fulfillment';
export type ApiMenuItem = { id: string; name: string; slug: string; description: string; priceHalalas: number; category: MenuItem['category']; imageUrl: string; heroSlide?: number; heroImageUrl?: string; available: boolean; tags: string[]; allergens: string[]; customizationOptions: { id: string; name: string; required: boolean; maxSelections: number; options: { id: string; name: string; priceHalalas: number; available: boolean }[] }[] };
export type Customer = { name: string; email: string; phone: string };
export type UserRole = 'admin' | 'cashier' | 'kitchen' | 'driver' | 'customer';
export type StaffRole = Exclude<UserRole, 'customer'>;
export type OrderStatus = 'pending_payment' | 'pending_confirmation' | 'confirmed' | 'preparing' | 'ready_for_pickup' | 'ready_for_delivery' | 'out_for_delivery' | 'completed' | 'rejected' | 'cancelled';
export type ReservationStatus = 'requested' | 'confirmed' | 'cancelled' | 'completed';
export type OrderRecord = { _id: string; orderNumber: string; customer: Customer; fulfillment: FulfillmentMethod; items: { menuItemId: string; name: string; unitPriceHalalas: number; quantity: number; selectedOptions: { name: string; options: { name: string; priceHalalas: number }[] }[] }[]; deliveryAddress?: { recipientName: string; recipientPhone: string; city: string; neighborhood: string; street: string; buildingUnit: string; postalCode?: string; instructions?: string }; subtotalHalalas: number; deliveryFeeHalalas: number; taxHalalas: number; taxBasisPoints: number | null; totalHalalas: number; paymentStatus: string; status: OrderStatus; createdAt: string; updatedAt: string; acceptedAt?: string | null; readyEstimateMinAt?: string; readyEstimateMaxAt?: string; deliveryAssignment?: { driverId?: string; name: string; phone: string; dispatchedAt: string; completedAt?: string }; deliveryHandoffCode?: string; preparationNotes?: string; rejectedReason?: string; pickupDetails?: { restaurantAddress?: string; openingHours?: string; collectionInstructions?: string; preparationTimeMinutes?: number | null }; statusHistory: { status: OrderStatus; changedAt: string; previousStatus?: OrderStatus | null; newStatus?: OrderStatus; changedBy?: string; actorRole?: UserRole | 'system'; reason?: string; action?: string; actionId?: string }[] };
export type ReservationRecord = { _id: string; customer: Customer; dateTime: string; partySize: number; notes: string; status: ReservationStatus };
export type Profile = { id: string; name: string; email: string; role: UserRole; preferences: { language: 'en' | 'ar' } };
export type PublicSettings = { reservations?: { maxPartySize: number | null; timeZone: string; openingHours: string; weekdays: number[]; reasons: string[] }; location?: FulfillmentSettingsRecord['settings']['location']; schedule?: FulfillmentSettingsRecord['settings']['schedule']; serverTime?: string; payment?: { ready: boolean; integrationImplemented: boolean; secretKeyConfigured: boolean; webhookSecretConfigured: boolean; reason: string }; availability?: Record<'pickup' | 'delivery', { available: boolean; reasons: string[]; hours: { available: boolean; reason: string; code: string } }>; currency: 'SAR'; ordersEnabled: boolean; reservationsEnabled: boolean; fulfillment: FulfillmentConfig; taxBasisPoints: number | null; taxDeliveryFee: boolean | null };
export type Overview = { orders: number; reservations: number; menuItems: number; recentOrders: Pick<OrderRecord, '_id' | 'orderNumber' | 'status' | 'totalHalalas' | 'createdAt'>[] };
export type ApiResult<T> = { data: T; pagination?: { page: number; limit: number; total: number; pages: number }; message?: string };
export const money = (halalas: number) => `SAR ${(halalas / 100).toFixed(2)}`;
export const statusLabel = (status: string) => status.replaceAll('_', ' ');

export type OrderAction = 'accept' | 'reject' | 'start_preparation' | 'mark_ready' | 'complete_pickup' | 'dispatch_delivery' | 'complete_delivery' | 'cancel';
export type StaffOrder = OrderRecord & { allowedActions: OrderAction[]; canAdjustReadyEstimate?: boolean; pickupDetailsSource?: string };
export type KitchenOrder = Pick<OrderRecord, '_id' | 'orderNumber' | 'status' | 'fulfillment' | 'updatedAt' | 'acceptedAt' | 'readyEstimateMinAt' | 'readyEstimateMaxAt' | 'preparationNotes'> & { items: { name: string; quantity: number; selectedOptions: { name: string; options: { name: string }[] }[] }[]; allowedActions: OrderAction[] };
export type OperationsSettings = { revision: number; updatedAt: string | null; cashierEnabled: boolean; kitchenEnabled: boolean; pickupHandoffEnabled: boolean; pickupHandoffInstructions: string; deliveryDispatchEnabled: boolean; deliveryCompletionEnabled: boolean; deliveryProcessNotes: string; pollIntervalSeconds: number; staleAfterSeconds: number; urgencyWarningMinutes: number | null; urgencyCriticalMinutes: number | null };
export type QueueOperations = Pick<OperationsSettings, 'kitchenEnabled' | 'pollIntervalSeconds' | 'staleAfterSeconds' | 'urgencyWarningMinutes' | 'urgencyCriticalMinutes'> & Partial<OperationsSettings>;
export type QueueResponse<T> = ApiResult<T> & { operations: QueueOperations; serverTime: string };
export type FulfillmentSettingsRecord = {
  revision: number; updatedAt: string | null;
  settings: {
    reservations: { enabled: boolean; maxPartySize: number | null };
    location: { city: string; area: string; displayAddress: string; mapsUrl: string; exactAddressConfirmed: boolean };
    schedule: { timeZone: 'Asia/Riyadh'; opens: string; closes: string; weekdays: number[]; daysConfirmed: boolean; acceptanceBufferMinutes: number };
    pickup: { enabled: boolean; collectionInstructions: string; estimatedMinutes: { min: number; max: number }; estimateConfirmed: boolean };
    delivery: { enabled: boolean; supportedAreas: { city: string; neighborhood: string; postalCodes: string[] }[]; coverageConfirmed: boolean; feeHalalas: number | null; minimumOrderHalalas: number | null; pricingConfirmed: boolean; estimatedMinutes: { min: number; max: number }; estimateConfirmed: boolean; processConfirmed: boolean; processNotes: string };
  };
};
