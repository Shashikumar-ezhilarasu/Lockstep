import { db } from './apps/api/src/db';
import { sql } from 'drizzle-orm';
async function test() {
  const result = await db.execute(sql`SELECT 1 as num`);
  console.log(Array.isArray(result) ? 'ARRAY' : 'OBJECT', result);
  process.exit(0);
}
test();
