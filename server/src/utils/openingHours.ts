import type { RestaurantSettings } from '../modules/fulfillment/fulfillment.service.js';
/** Compare restaurant-local wall minutes; Riyadh has no DST transitions. */
export function openingAvailability(config: RestaurantSettings, method: 'pickup' | 'delivery', now = new Date()) {
  const schedule = config.schedule;
  if (!schedule.daysConfirmed) return { available: false, reason: 'Restaurant operating days must be confirmed by an administrator.', code: 'SCHEDULE_SETUP_REQUIRED' };
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: schedule.timeZone, weekday: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(now);
  const value = (type: string) => parts.find(part => part.type === type)?.value || '';
  const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(value('weekday'));
  const minute = Number(value('hour')) * 60 + Number(value('minute')) + Number(value('second')) / 60;
  const parse = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
  const start = parse(schedule.opens), end = parse(schedule.closes);
  let remaining = 0;
  if (end > start && schedule.weekdays.includes(day) && minute >= start && minute < end) remaining = end - minute;
  if (end < start) {
    if (schedule.weekdays.includes(day) && minute >= start) remaining = 1440 - minute + end;
    else if (schedule.weekdays.includes((day + 6) % 7) && minute < end) remaining = end - minute;
  }
  if (!remaining) return { available: false, reason: `Ordering is closed. Restaurant hours are ${config.pickup.openingHours}.`, code: 'OUTSIDE_OPENING_HOURS' };
  const required = config[method].estimatedMinutes.max + schedule.acceptanceBufferMinutes;
  if (remaining < required) return { available: false, reason: `Ordering has closed for ${method} so the approximate ${required}-minute fulfillment window can finish before closing.`, code: 'TOO_CLOSE_TO_CLOSING' };
  return { available: true, reason: '', code: 'OPEN' };
}
