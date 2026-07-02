import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { schema } from 'db';
import { desc, eq, sql } from 'drizzle-orm';
import { db } from '../db';
import { assertValidTransition } from 'db';
import { checkProjectAccess, checkQueueAccess } from '../authz';

const CreateQueueSchema = z.object({
  name: z.string().min(1),
  priority: z.number().int().optional(),
  concurrency_limit: z.number().int().optional(),
  retry_policy: z.object({
    strategy: z.enum(['fixed', 'linear', 'exponential']),
    base_delay_ms: z.number().int(),
    multiplier: z.number().int().optional(),
    max_attempts: z.number().int(),
    max_delay_ms: z.number().int().optional(),
  }).optional(),
});

export default async function queueRoutes(app: FastifyInstance) {
  app.post('/projects/:projectId/queues', async (request: any, reply) => {
    const { projectId } = request.params;
    try {
      if (!(await checkProjectAccess(projectId, request.user.id))) {
        return reply.code(403).send({ error: 'Forbidden: You do not have access to this project.' });
      }

      const data = CreateQueueSchema.parse(request.body);

      const [queue] = await db.insert(schema.queues).values({
        projectId,
        name: data.name,
        priority: data.priority ?? 10,
        concurrencyLimit: data.concurrency_limit ?? 10,
      }).returning();

      if (data.retry_policy) {
        const [policy] = await db.insert(schema.retryPolicies).values({
          queueId: queue.id,
          strategy: data.retry_policy.strategy,
          baseDelayMs: data.retry_policy.base_delay_ms,
          multiplier: data.retry_policy.multiplier,
          maxAttempts: data.retry_policy.max_attempts,
          maxDelayMs: data.retry_policy.max_delay_ms,
        }).returning();
        
        await db.update(schema.queues).set({ defaultRetryPolicyId: policy.id }).where(eq(schema.queues.id, queue.id));
      }

      return reply.code(201).send({ data: queue });
    } catch (error) {
      if (error instanceof z.ZodError) return reply.code(400).send({ error: error.errors });
      throw error;
    }
  });

  app.get('/projects/:projectId/queues', async (request: any, reply) => {
    const { projectId } = request.params;
    if (!(await checkProjectAccess(projectId, request.user.id))) {
      return reply.code(403).send({ error: 'Forbidden: You do not have access to this project.' });
    }

    const queues = await db.select()
      .from(schema.queues)
      .where(eq(schema.queues.projectId, projectId))
      .orderBy(desc(schema.queues.createdAt));

    return reply.send({ data: queues, meta: { count: queues.length } });
  });

  app.get('/queues/:queueId/stats', async (request: any, reply) => {
    const { queueId } = request.params;
    if (!(await checkQueueAccess(queueId, request.user.id))) {
      return reply.code(403).send({ error: 'Forbidden: You do not have access to this queue.' });
    }
    
    const [queueExists] = await db.select({ id: schema.queues.id }).from(schema.queues).where(eq(schema.queues.id, queueId));
    if (!queueExists) return reply.code(404).send({ error: 'Queue not found' });
    
    const stats = await db.execute(sql`
      SELECT 
        COUNT(*) as "totalJobs",
        COUNT(*) FILTER (WHERE status = 'completed') as "completedJobs",
        COUNT(*) FILTER (WHERE status = 'failed' OR status = 'dead_letter') as "failedJobs"
      FROM jobs
      WHERE queue_id = ${queueId}
    `);
    
    const row = stats[0] as any;
    return reply.send({ data: { 
      total_jobs: Number(row.totalJobs || 0), 
      completed_jobs: Number(row.completedJobs || 0), 
      failed_jobs: Number(row.failedJobs || 0) 
    } });
  });

  app.post('/queues/:queueId/pause', async (request: any, reply) => {
    const { queueId } = request.params;
    if (!(await checkQueueAccess(queueId, request.user.id, 'admin'))) {
      return reply.code(403).send({ error: 'Forbidden: You do not have admin access to this queue.' });
    }

    const [queue] = await db.update(schema.queues).set({ status: 'paused' }).where(eq(schema.queues.id, queueId)).returning();
    if (!queue) return reply.code(404).send({ error: 'Queue not found' });
    return reply.send({ data: queue });
  });

  app.post('/queues/:queueId/resume', async (request: any, reply) => {
    const { queueId } = request.params;
    if (!(await checkQueueAccess(queueId, request.user.id, 'admin'))) {
      return reply.code(403).send({ error: 'Forbidden: You do not have admin access to this queue.' });
    }

    const [queue] = await db.update(schema.queues).set({ status: 'active' }).where(eq(schema.queues.id, queueId)).returning();
    if (!queue) return reply.code(404).send({ error: 'Queue not found' });
    return reply.send({ data: queue });
  });

  app.get('/queues/:queueId', async (request: any, reply) => {
    const { queueId } = request.params;
    if (!(await checkQueueAccess(queueId, request.user.id))) {
      return reply.code(403).send({ error: 'Forbidden: You do not have access to this queue.' });
    }

    const [queue] = await db.select().from(schema.queues).where(eq(schema.queues.id, queueId));
    if (!queue) return reply.code(404).send({ error: 'Queue not found' });
    return reply.send({ data: queue });
  });

  app.get('/queues/:queueId/dlq', async (request: any, reply) => {
    const { queueId } = request.params;
    if (!(await checkQueueAccess(queueId, request.user.id))) {
      return reply.code(403).send({ error: 'Forbidden: You do not have access to this queue.' });
    }
    
    // Find all DLQ rows for this queue (by joining with jobs)
    const dlqJobs = await db.select({
      id: schema.deadLetterQueue.id,
      jobId: schema.deadLetterQueue.jobId,
      failureReason: schema.deadLetterQueue.failureReason,
      attemptsMade: schema.deadLetterQueue.attemptsMade,
      originalPayload: schema.deadLetterQueue.originalPayload,
      movedAt: schema.deadLetterQueue.movedAt,
    }).from(schema.deadLetterQueue)
      .innerJoin(schema.jobs, eq(schema.deadLetterQueue.jobId, schema.jobs.id))
      .where(eq(schema.jobs.queueId, queueId));

    return reply.send({ data: dlqJobs, meta: { count: dlqJobs.length } });
  });

  app.post('/dlq/:dlqId/requeue', async (request: any, reply) => {
    const { dlqId } = request.params;
    
    // 1. Find the DLQ entry and check access
    const [dlqEntry] = await db.select().from(schema.deadLetterQueue).where(eq(schema.deadLetterQueue.id, dlqId));
    if (!dlqEntry) return reply.code(404).send({ error: 'DLQ entry not found' });

    const [job] = await db.select({ queueId: schema.jobs.queueId }).from(schema.jobs).where(eq(schema.jobs.id, dlqEntry.jobId));
    if (!job) return reply.code(404).send({ error: 'Job not found' });

    if (!(await checkQueueAccess(job.queueId, request.user.id))) {
      return reply.code(403).send({ error: 'Forbidden: You do not have access to this queue.' });
    }

    // 2 & 3. Requeue and delete in a transaction
    await db.transaction(async (tx) => {
      await tx.update(schema.jobs).set({
        status: 'queued',
        attempt: 0,
        scheduledAt: new Date(),
      }).where(eq(schema.jobs.id, dlqEntry.jobId));
      
      await tx.delete(schema.deadLetterQueue).where(eq(schema.deadLetterQueue.id, dlqId));
    });

    return reply.send({ data: { requeued: true } });
  });

  app.delete('/dlq/:dlqId', async (request: any, reply) => {
    const { dlqId } = request.params;
    
    const [dlqEntry] = await db.select().from(schema.deadLetterQueue).where(eq(schema.deadLetterQueue.id, dlqId));
    if (!dlqEntry) return reply.code(404).send({ error: 'DLQ entry not found' });

    const [job] = await db.select({ queueId: schema.jobs.queueId }).from(schema.jobs).where(eq(schema.jobs.id, dlqEntry.jobId));
    if (!job) return reply.code(404).send({ error: 'Job not found' });

    if (!(await checkQueueAccess(job.queueId, request.user.id))) {
      return reply.code(403).send({ error: 'Forbidden: You do not have access to this queue.' });
    }

    await db.delete(schema.deadLetterQueue).where(eq(schema.deadLetterQueue.id, dlqId));
    return reply.send({ data: { deleted: true } });
  });

  app.get('/dlq', async (request: any, reply) => {
    const userOrgs = await db.select({ orgId: schema.orgMembers.orgId })
      .from(schema.orgMembers)
      .where(eq(schema.orgMembers.userId, request.user.id));
    
    const orgIds = userOrgs.map(o => o.orgId);
    if (orgIds.length === 0) {
      return reply.send({ data: [] });
    }

    const dlqJobs = await db.select({
      id: schema.deadLetterQueue.id,
      jobId: schema.deadLetterQueue.jobId,
      failureReason: schema.deadLetterQueue.failureReason,
      attemptsMade: schema.deadLetterQueue.attemptsMade,
      originalPayload: schema.deadLetterQueue.originalPayload,
      movedAt: schema.deadLetterQueue.movedAt,
    }).from(schema.deadLetterQueue)
      .innerJoin(schema.jobs, eq(schema.deadLetterQueue.jobId, schema.jobs.id))
      .innerJoin(schema.queues, eq(schema.jobs.queueId, schema.queues.id))
      .innerJoin(schema.projects, eq(schema.queues.projectId, schema.projects.id))
      .where(sql`${schema.projects.orgId} = ANY(${orgIds})`)
      .orderBy(sql`${schema.deadLetterQueue.movedAt} DESC`);

    return reply.send({ data: dlqJobs });
  });
}
