import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { db } from '../src/db';
import { schema } from 'db';
import { claimJobs } from '../src/claim';
import { v4 as uuidv4 } from 'uuid';
import { eq, sql } from 'drizzle-orm';
describe('Job Claiming Concurrency (SKIP LOCKED)', () => {
  let orgId: string;
  let projectId: string;
  let queueId: string;

  beforeAll(async () => {
    // Setup org, project, queue
    const [org] = await db.insert(schema.organizations).values({ name: 'Test Org' }).returning();
    orgId = org.id;

    const [proj] = await db.insert(schema.projects).values({ orgId, name: 'Test Proj' }).returning();
    projectId = proj.id;

    const [queue] = await db.insert(schema.queues).values({ projectId, name: 'Test Queue', concurrencyLimit: 100 }).returning();
    queueId = queue.id;
  });

  beforeEach(async () => {
    await db.delete(schema.jobs).where(eq(schema.jobs.queueId, queueId));
  });

  afterAll(async () => {
    await db.delete(schema.organizations).where(eq(schema.organizations.id, orgId));
  });

  it('claims jobs atomically without duplicates under concurrency', async () => {
    // Insert 20 jobs
    const jobsToInsert = Array.from({ length: 20 }).map(() => ({
      queueId,
      type: 'immediate' as const,
      status: 'queued' as const,
      payload: { test: true },
    }));

    await db.insert(schema.jobs).values(jobsToInsert);

    // Simulate 5 workers trying to claim 5 jobs each simultaneously
    const workers = Array.from({ length: 5 }).map(() => uuidv4());
    for (const w of workers) {
      await db.insert(schema.workers).values({ id: w, hostname: 'test', status: 'idle', capacity: 10, subscribedQueues: [queueId] });
    }

    // Run claimJobs concurrently
    const promises = workers.map(workerId => claimJobs(queueId, workerId, 5));
    const results = await Promise.all(promises);

    // Flat map all claimed jobs
    const allClaimedJobs = results.flat();

    // Verify 20 jobs total were claimed
    expect(allClaimedJobs.length).toBe(20);

    // Verify uniqueness of claimed jobs (no two workers got the same job)
    const claimedIds = allClaimedJobs.map(j => j.id);
    const uniqueIds = new Set(claimedIds);
    expect(uniqueIds.size).toBe(20); // All 20 must be unique

    // Verify DB state
    const remainingInDb = await db.select().from(schema.jobs).where(eq(schema.jobs.queueId, queueId));
    expect(remainingInDb.every(j => j.status === 'claimed')).toBe(true);
  });
  it('yields zero claims for a paused queue', async () => {
    // Insert a job
    await db.insert(schema.jobs).values({
      queueId, type: 'immediate', status: 'queued', payload: {}
    });
    // Pause queue
    await db.update(schema.queues).set({ status: 'paused' }).where(eq(schema.queues.id, queueId));
    
    const workerId = uuidv4();
    await db.insert(schema.workers).values({ id: workerId, hostname: 'test', status: 'idle', capacity: 10, subscribedQueues: [queueId] });
    const claimed = await claimJobs(queueId, workerId, 5);
    expect(claimed.length).toBe(0);
    
    // Unpause
    await db.update(schema.queues).set({ status: 'active' }).where(eq(schema.queues.id, queueId));
  });

  it('respects concurrency_limit per-queue via availableSlots argument', async () => {
    // Insert 10 jobs
    const jobs = Array.from({ length: 10 }).map(() => ({
      queueId, type: 'immediate' as const, status: 'queued' as const, payload: {}
    }));
    await db.insert(schema.jobs).values(jobs);
    
    // Simulate fetching concurrency_limit from DB
    const [q] = await db.select().from(schema.queues).where(eq(schema.queues.id, queueId));
    const limit = q.concurrencyLimit || 10;
    
    // Worker claims only up to limit (simulate 3 available slots)
    const workerId = uuidv4();
    await db.insert(schema.workers).values({ id: workerId, hostname: 'test', status: 'idle', capacity: 10, subscribedQueues: [queueId] });
    const claimed = await claimJobs(queueId, workerId, 3);
    expect(claimed.length).toBe(3);
  });

  it('allows worker to claim from multiple subscribed queues', async () => {
    const [q2] = await db.insert(schema.queues).values({ projectId, name: 'Queue 2' }).returning();
    
    await db.insert(schema.jobs).values({ queueId, type: 'immediate', status: 'queued', payload: {} });
    await db.insert(schema.jobs).values({ queueId: q2.id, type: 'immediate', status: 'queued', payload: {} });
    
    const workerId = uuidv4();
    await db.insert(schema.workers).values({ id: workerId, hostname: 'test', status: 'idle', capacity: 10, subscribedQueues: [queueId, q2.id] });
    const queuesToPoll = [queueId, q2.id];
    
    let totalClaimed = 0;
    for (const qId of queuesToPoll) {
      const claimed = await claimJobs(qId, workerId, 5);
      totalClaimed += claimed.length;
    }
    
    // Should have claimed from both queues
    expect(totalClaimed).toBeGreaterThanOrEqual(2);
  });

  it('strictly enforces concurrency_limit under high concurrent load (advisory lock test)', async () => {
    // 1. Create a queue with strict concurrency limit of 5
    const [strictQueue] = await db.insert(schema.queues).values({ 
      projectId, 
      name: 'Strict Concurrency Queue', 
      concurrencyLimit: 5 
    }).returning();

    // 2. Insert 20 queued jobs into this queue
    const jobs = Array.from({ length: 20 }).map(() => ({
      queueId: strictQueue.id, 
      type: 'immediate' as const, 
      status: 'queued' as const, 
      payload: {}
    }));
    await db.insert(schema.jobs).values(jobs);

    // 3. Fire 10 concurrent claimJobs calls, each requesting up to 5 slots
    const testWorkers = Array.from({ length: 10 }).map(() => uuidv4());
    for (const w of testWorkers) {
      await db.insert(schema.workers).values({ 
        id: w, hostname: 'load-test', status: 'idle', capacity: 5, subscribedQueues: [strictQueue.id] 
      });
    }

    const promises = testWorkers.map(workerId => claimJobs(strictQueue.id, workerId, 5));
    const results = await Promise.all(promises);
    console.log("Claim results:", results.map(r => r.length));

    const allClaimedJobs = results.flat();

    // Verification 1: The total number of claimed jobs must be exactly min(20, 5) = 5
    expect(allClaimedJobs.length).toBe(5);

    // Verification 2: Total number of jobs with status IN ('claimed', 'running') is <= 5
    const activeJobsInDb = await db.select().from(schema.jobs).where(
      sql`${schema.jobs.queueId} = ${strictQueue.id} AND ${schema.jobs.status} IN ('claimed', 'running')`
    );
    expect(activeJobsInDb.length).toBeLessThanOrEqual(5);

    // Verification 3: No double claims (every job ID is unique)
    const claimedIds = allClaimedJobs.map(j => j.id);
    const uniqueIds = new Set(claimedIds);
    expect(uniqueIds.size).toBe(allClaimedJobs.length);
  });
});
