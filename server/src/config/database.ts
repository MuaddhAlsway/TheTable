import { setServers } from 'node:dns';
import mongoose from 'mongoose';
import { env } from './env.js';
mongoose.set('sanitizeFilter', true);
mongoose.set('strictQuery', true);
mongoose.set('bufferCommands', false);
// Initialize collections/indexes explicitly only after the connection is ready.
mongoose.set('autoCreate', false);
mongoose.set('autoIndex', false);
export async function connectDatabase() {
  // Optional process-local SRV/TXT resolver override; never changes OS DNS or the URI.
  if (env.MONGODB_DNS_SERVERS?.trim()) {
    const servers = env.MONGODB_DNS_SERVERS.split(',').map(value => value.trim()).filter(Boolean);
    try { setServers(servers); } catch { throw new Error('INVALID_MONGODB_DNS_SERVERS'); }
  }
  await mongoose.connect(env.MONGODB_URI, { serverSelectionTimeoutMS: 10000, ...(env.MONGODB_DB_NAME ? { dbName: env.MONGODB_DB_NAME } : {}) });
}
