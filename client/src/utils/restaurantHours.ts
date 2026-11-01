import type { PublicSettings } from '../lib/api-types';
export function restaurantHours(schedule: PublicSettings['schedule']) {
  if (!schedule?.daysConfirmed || !schedule.weekdays.length || !/^([01]\d|2[0-3]):[0-5]\d$/.test(schedule.opens) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(schedule.closes)) return null;
  const format = (value: string) => { if (value === '00:00') return 'Midnight'; const [hour, minute] = value.split(':').map(Number); return `${hour % 12 || 12}${minute ? ':' + String(minute).padStart(2, '0') : ''} ${hour >= 12 ? 'PM' : 'AM'}`; };
  const names = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return { days: schedule.weekdays.length === 7 ? 'Every day' : schedule.weekdays.map(day => names[day]).join(', '), opens: format(schedule.opens), closes: format(schedule.closes) };
}
