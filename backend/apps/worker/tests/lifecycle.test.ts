import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '../src/db';
import { schema } from 'db';
import { claimJobs } from '../src/claim';
import { v4 as uuidv4 } from 'uuid';
import { eq } from 'drizzle-orm';

describe('Job Lifecycle', () => {
  let orgId: string;
  let projectId: string;
  let queueId: string;
  let workerId: string;

  beforeAll(async () => {
    // Setup org, project, queue, worker
    const [org] = await db.insert(schema.organizations).values({ name: 'Lifecycle Org' }).returning();
    orgId = org.id;

    const [proj] = await db.insert(schema.projects).values({ orgId, name: 'Lifecycle Proj' }).returning();
    projectId = proj.id;

    const [queue] = await db.insert(schema.queues).values({ projectId, name: 'Lifecycle Queue' }).returning();
    queueId = queue.id;

    const [worker] = await db.insert(schema.workers).values({ 
      id: uuidv4(), 
      hostname: 'test', 
      capacity: 10 
    }).returning();
    workerId = worker.id;
  });

  afterAll(async () => {
    await db.delete(schema.organizations).where(eq(schema.organizations.id, orgId));
    await db.delete(schema.workers).where(eq(schema.workers.id, workerId));
  });

  it('moves job through queued -> claimed -> running -> completed', async () => {
    // 1. Queued
    const [job] = await db.insert(schema.jobs).values({
      queueId,
      type: 'immediate',
      status: 'queued',
      payload: { action: 'test' },
    }).returning();
    expect(job.status).toBe('queued');

    // 2. Claimed
    const claimed = await claimJobs(queueId, workerId, 1);
    expect(claimed.length).toBe(1);
    expect(claimed[0].id).toBe(job.id);
    expect(claimed[0].status).toBe('claimed');
    expect(claimed[0].claimedBy).toBe(workerId);
    expect(claimed[0].attempt).toBe(1);

    // 3. Running (simulated worker behavior)
    const execId = uuidv4();
    await db.insert(schema.jobExecutions).values({
      id: execId,
      jobId: job.id,
      workerId,
      status: 'started',
    });
    
    const [runningJob] = await db.update(schema.jobs)
      .set({ status: 'running' })
      .where(eq(schema.jobs.id, job.id))
      .returning();
    expect(runningJob.status).toBe('running');

    // 4. Completed
    const [completedJob] = await db.update(schema.jobs)
      .set({ status: 'completed' })
      .where(eq(schema.jobs.id, job.id))
      .returning();
    
    await db.update(schema.jobExecutions)
      .set({ status: 'completed', finishedAt: new Date(), result: { ok: true } })
      .where(eq(schema.jobExecutions.id, execId));

    expect(completedJob.status).toBe('completed');
    
    // Verify execution record
    const [exec] = await db.select().from(schema.jobExecutions).where(eq(schema.jobExecutions.id, execId));
    expect(exec.status).toBe('completed');
    expect(exec.result).toEqual({ ok: true });
  });
});
