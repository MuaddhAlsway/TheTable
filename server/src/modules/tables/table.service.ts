import { DiningTable } from './table.model.js';
import { AppError } from '../../utils/errors.js';
export async function resolveTable(token: string) {
  const table = await DiningTable.findOne({ token, enabled: true });
  if (!table) throw new AppError(404, 'TABLE_UNAVAILABLE', 'This table QR code is invalid or disabled. Ask restaurant staff for the current code.');
  return table;
}
