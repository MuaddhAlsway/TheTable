import { trusted } from 'mongoose';
import { Menu } from './menu.model.js';
import type { MenuInput, MenuQuery } from './menu.validation.js';
import { AppError } from '../../utils/errors.js';
import { escapeRegex } from '../../utils/validation.js';
export function menuDTO(item: { _id: { toString(): string }; name: string; slug: string; description: string; priceHalalas: number; category: string; imageUrl: string; available: boolean; tags: string[]; allergens: string[]; customizationOptions: unknown }) { return { id: item._id.toString(), name: item.name, slug: item.slug, description: item.description, priceHalalas: item.priceHalalas, category: item.category, imageUrl: item.imageUrl, available: item.available, tags: item.tags, allergens: item.allergens, customizationOptions: item.customizationOptions }; }
export async function listMenu(query: MenuQuery, admin = false) {
  const filter = { archived: false, ...(!admin ? { available: true } : query.available ? { available: query.available === 'true' } : {}), ...(query.category ? { category: query.category } : {}), ...(query.search ? { name: trusted({ $regex: escapeRegex(query.search), $options: 'i' }) } : {}) };
  const [records, total] = await Promise.all([Menu.find(filter).sort({ category: 1, name: 1 }).skip((query.page - 1) * query.limit).limit(query.limit), Menu.countDocuments(filter)]);
  return { data: records.map(menuDTO), pagination: { page: query.page, limit: query.limit, total, pages: Math.ceil(total / query.limit) } };
}
export async function menuDetail(id: string, admin = false) { const item = await Menu.findOne({ _id: id, archived: false, ...(!admin ? { available: true } : {}) }); if (!item) throw new AppError(404, 'NOT_FOUND', 'Menu item not found.'); return menuDTO(item); }
export async function createMenu(data: MenuInput) { return menuDTO(await Menu.create(data)); }
export async function updateMenu(id: string, data: MenuInput | { available: boolean }) { const item = await Menu.findOneAndUpdate({ _id: id, archived: false }, { $set: data }, { new: true, runValidators: true }); if (!item) throw new AppError(404, 'NOT_FOUND', 'Menu item not found.'); return menuDTO(item); }
export async function archiveMenu(id: string) { const item = await Menu.findOneAndUpdate({ _id: id, archived: false }, { $set: { archived: true, available: false } }); if (!item) throw new AppError(404, 'NOT_FOUND', 'Menu item not found.'); }
