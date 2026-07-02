import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { schema } from 'db';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not set. Check that your .env file exists and is being loaded.');
}
const sql = postgres(connectionString);
export const db = drizzle(sql, { schema });
