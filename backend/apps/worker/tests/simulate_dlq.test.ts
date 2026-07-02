import { db } from '../src/db';
import { schema } from 'db';
import { eq } from 'drizzle-orm';
import { describe, it } from 'vitest';
import { v4 as uuidv4 } from 'uuid';

describe('DLQ Simulator', () => {
  it('creates a failed job in the DLQ', async () => {
    // Create org, project, queue
    const [org] = await db.insert(schema.organizations).values({ name: 'DLQ Org' }).returning();
    try {
      const [proj] = await db.insert(schema.projects).values({ orgId: org.id, name: 'DLQ Proj' }).returning();
      const [queue] = await db.insert(schema.queues).values({ projectId: proj.id, name: 'DLQ Queue' }).returning();
      
      // 2. Create a job
      const [job] = await db.insert(schema.jobs).values({
        id: uuidv4(),
        queueId: queue.id,
        type: 'immediate',
        status: 'failed', // Permanent failure
        payload: { handler: 'fail_simulate' },
        attempt: 3,
      }).returning();

      // 3. Move to DLQ
      await db.insert(schema.deadLetterQueue).values({
        id: uuidv4(),
        jobId: job.id,
        failureReason: 'Simulated 3 consecutive failures',
        attemptsMade: 3,
        originalPayload: { handler: 'fail_simulate' },
        movedAt: new Date()
      });
      
      console.log(`Created DLQ job: ${job.id}`);
    } finally {
      await db.delete(schema.organizations).where(eq(schema.organizations.id, org.id));
    }
  });
});
