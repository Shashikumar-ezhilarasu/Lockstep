import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../src/schema';
import { eq } from 'drizzle-orm';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not set. Check that your .env file exists and is being loaded.');
}
let sql: postgres.Sql;
let db: ReturnType<typeof drizzle>;

beforeAll(async () => {
  sql = postgres(connectionString, { max: 1 });
  db = drizzle(sql, { schema });
});

afterAll(async () => {
  await sql.end();
});

describe('Database Schema', () => {
  it('should cascade delete projects, queues, and jobs when an organization is deleted', async () => {
    // Insert Org
    const [org] = await db.insert(schema.organizations).values({ name: 'Test Org' }).returning();
    
    // Insert Project
    const [project] = await db.insert(schema.projects).values({ orgId: org.id, name: 'Test Project' }).returning();
    
    // Insert Queue
    const [queue] = await db.insert(schema.queues).values({ projectId: project.id, name: 'Test Queue' }).returning();
    
    // Insert Job
    const [job] = await db.insert(schema.jobs).values({ queueId: queue.id, type: 'immediate', payload: {} }).returning();

    // Verify insertion
    const jobCheck = await db.select().from(schema.jobs).where(eq(schema.jobs.id, job.id));
    expect(jobCheck.length).toBe(1);

    // Delete Org
    await db.delete(schema.organizations).where(eq(schema.organizations.id, org.id));

    // Verify cascading deletes
    const deletedProject = await db.select().from(schema.projects).where(eq(schema.projects.id, project.id));
    const deletedQueue = await db.select().from(schema.queues).where(eq(schema.queues.id, queue.id));
    const deletedJob = await db.select().from(schema.jobs).where(eq(schema.jobs.id, job.id));

    expect(deletedProject.length).toBe(0);
    expect(deletedQueue.length).toBe(0);
    expect(deletedJob.length).toBe(0);
  });

  it('should reject duplicate jobs with the same idempotency_key in the same queue', async () => {
    // Insert Org, Project, Queue
    const [org] = await db.insert(schema.organizations).values({ name: 'Idempotency Org' }).returning();
    const [project] = await db.insert(schema.projects).values({ orgId: org.id, name: 'Proj' }).returning();
    const [queue] = await db.insert(schema.queues).values({ projectId: project.id, name: 'Queue' }).returning();

    const idempotencyKey = 'unique-key-123';

    // Insert first job
    await db.insert(schema.jobs).values({
      queueId: queue.id,
      type: 'immediate',
      payload: {},
      idempotencyKey,
    });

    // Insert second job with same key and queue should fail
    await expect(
      db.insert(schema.jobs).values({
        queueId: queue.id,
        type: 'immediate',
        payload: {},
        idempotencyKey,
      })
    ).rejects.toThrow(); // Should throw a unique constraint violation error
  });
});
