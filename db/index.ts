import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as authSchema from './schema/auth';
import * as torrentSchema from './schema/torrents';

export const db = drizzle(process.env.DATABASE_URL!, {
  schema: { ...authSchema, ...torrentSchema },
});

export * from './schema/auth';
export * from './schema/torrents';