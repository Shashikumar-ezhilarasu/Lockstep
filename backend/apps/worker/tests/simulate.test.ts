import { db } from '../src/db';
import { schema } from 'db';
import { eq } from 'drizzle-orm';
import { describe, it } from 'vitest';
import { v4 as uuidv4 } from 'uuid';

describe('Job completion simulator', () => {
  it('updates jobs to completed and failed', async () => {
    const allJobs = await db.select().from(schema.jobs).where(eq(schema.jobs.status, 'queued'));
    let i = 0;
    for (const job of allJobs) {
      const isFailed = i >= 5;
      const status = isFailed ? 'failed' : 'completed';
      await db.update(schema.jobs).set({ status }).where(eq(schema.jobs.id, job.id));
      await db.insert(schema.jobExecutions).values({
        id: uuidv4(),
        jobId: job.id,
        workerId: null,
        status,
        startedAt: new Date(Date.now() - 10000), // 10s ago
        finishedAt: new Date(),
      });
      i++;
    }
    console.log(`Updated ${i} jobs!`);
  });
});
