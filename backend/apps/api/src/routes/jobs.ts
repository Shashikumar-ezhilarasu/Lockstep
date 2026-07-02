import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { schema } from 'db';
import { eq, and, desc } from 'drizzle-orm';
import { db } from '../db';
import { v4 as uuidv4 } from 'uuid';
import parser from 'cron-parser';

const CreateJobSchema = z.object({
  type: z.enum(['immediate', 'delayed', 'scheduled', 'batch']),
  payload: z.any().optional(),
  delay_ms: z.number().int().optional(),
  scheduled_at: z.string().datetime().optional(),
  priority: z.number().int().optional(),
  idempotency_key: z.string().optional(),
  items: z.array(z.object({ payload: z.any() })).optional(),
});

const CreateRecurringJobSchema = z.object({
  cron: z.string(),
  timezone: z.string().default('UTC'),
  job_template: z.object({ payload: z.any() }),
});

export default async function jobRoutes(app: FastifyInstance) {
  app.post('/queues/:queueId/jobs', async (request: any, reply) => {
    const { queueId } = request.params;
    
    try {
      const data = CreateJobSchema.parse(request.body);

      if (data.idempotency_key) {
        // Check uniqueness manually to return 409 nicely
        const existing = await db.select().from(schema.jobs).where(and(eq(schema.jobs.queueId, queueId), eq(schema.jobs.idempotencyKey, data.idempotency_key))).limit(1);
        if (existing.length > 0) {
          return reply.code(409).send({ error: 'Job with this idempotency key already exists' });
        }
      }

      const [queue] = await db.select({ id: schema.queues.id }).from(schema.queues).where(eq(schema.queues.id, queueId)).limit(1);
      if (!queue) return reply.code(404).send({ error: 'Queue not found' });

      if (data.type === 'batch') {
        if (!data.items || data.items.length === 0) return reply.code(400).send({ error: 'Batch jobs require items' });
        const batchId = uuidv4();
        const toInsert = data.items.map(item => ({
          queueId,
          batchId,
          type: 'immediate' as const,
          payload: item.payload,
          priority: data.priority ?? 10,
        }));
        const jobs = await db.insert(schema.jobs).values(toInsert).returning();
        return reply.code(201).send({ batch_id: batchId, data: jobs });
      }

      let scheduledAt = new Date();
      let status: 'queued' | 'scheduled' = 'queued';
      if (data.type === 'delayed' && data.delay_ms) {
        scheduledAt = new Date(Date.now() + data.delay_ms);
        status = 'scheduled';
      }
      if (data.type === 'scheduled') {
        if (!data.scheduled_at) return reply.code(400).send({ error: 'scheduled_at is required for scheduled jobs' });
        scheduledAt = new Date(data.scheduled_at);
        status = scheduledAt > new Date() ? 'scheduled' : 'queued';
      }

      const [job] = await db.insert(schema.jobs).values({
        queueId,
        type: data.type === 'scheduled' ? 'scheduled' : data.type === 'delayed' ? 'delayed' : 'immediate',
        payload: data.payload || {},
        priority: data.priority ?? 10,
        idempotencyKey: data.idempotency_key,
        scheduledAt,
        status,
      }).returning();

      return reply.code(201).send({ data: job });
    } catch (error) {
      if (error instanceof z.ZodError) return reply.code(400).send({ error: error.errors });
      // Catch DB unique constraint error as fallback
      if ((error as any).code === '23505') return reply.code(409).send({ error: 'Conflict: duplicate idempotency key' });
      throw error;
    }
  });

  app.post('/queues/:queueId/jobs/recurring', async (request: any, reply) => {
    const { queueId } = request.params;
    try {
      const data = CreateRecurringJobSchema.parse(request.body);
      
      let nextRunAt: Date;
      try {
        const interval = parser.parseExpression(data.cron, { tz: data.timezone });
        nextRunAt = interval.next().toDate();
      } catch (err) {
        return reply.code(400).send({ error: 'Invalid cron expression' });
      }

      const [sched] = await db.insert(schema.scheduledJobs).values({
        queueId,
        cronExpression: data.cron,
        timezone: data.timezone,
        jobTemplate: data.job_template,
        nextRunAt,
      }).returning();

      return reply.code(201).send({ data: sched });
    } catch (error) {
      if (error instanceof z.ZodError) return reply.code(400).send({ error: error.errors });
      throw error;
    }
  });

  app.get('/jobs/:jobId', async (request: any, reply) => {
    const { jobId } = request.params;
    const [job] = await db.select().from(schema.jobs).where(eq(schema.jobs.id, jobId));
    if (!job) return reply.code(404).send({ error: 'Job not found' });
    
    const executions = await db.select().from(schema.jobExecutions).where(eq(schema.jobExecutions.jobId, jobId));
    return reply.send({ data: { ...job, job_executions: executions } });
  });

  app.get('/jobs', async (request: any, reply) => {
    const query = z.object({
      queue_id: z.string().uuid().optional(),
      status: z.string().optional(),
      limit: z.coerce.number().int().min(1).max(100).default(50),
      offset: z.coerce.number().int().min(0).default(0),
    }).parse(request.query);

    const conditions = [
      query.queue_id ? eq(schema.jobs.queueId, query.queue_id) : undefined,
      query.status ? eq(schema.jobs.status, query.status as any) : undefined,
    ].filter(Boolean) as any[];

    const jobsQuery = db.select().from(schema.jobs);
    const jobs = conditions.length > 0
      ? await jobsQuery.where(and(...conditions)).orderBy(desc(schema.jobs.createdAt)).limit(query.limit).offset(query.offset)
      : await jobsQuery.orderBy(desc(schema.jobs.createdAt)).limit(query.limit).offset(query.offset);

    return reply.send({ data: jobs, meta: { limit: query.limit, offset: query.offset, count: jobs.length } });
  });

  app.post('/jobs/:jobId/cancel', async (request: any, reply) => {
    const { jobId } = request.params;
    const [job] = await db.select().from(schema.jobs).where(eq(schema.jobs.id, jobId)).limit(1);
    if (!job) return reply.code(404).send({ error: 'Job not found' });
    if (!['queued', 'scheduled'].includes(job.status)) {
      return reply.code(409).send({ error: `Cannot cancel job in ${job.status} state` });
    }

    const [updated] = await db.update(schema.jobs)
      .set({ status: 'cancelled' })
      .where(eq(schema.jobs.id, jobId))
      .returning();

    return reply.send({ data: updated });
  });

  app.get('/jobs/:jobId/logs', async (request: any, reply) => {
    const { jobId } = request.params;
    const rows = await db.select({
      id: schema.jobLogs.id,
      ts: schema.jobLogs.ts,
      level: schema.jobLogs.level,
      message: schema.jobLogs.message,
      executionId: schema.jobLogs.executionId,
    })
      .from(schema.jobLogs)
      .innerJoin(schema.jobExecutions, eq(schema.jobLogs.executionId, schema.jobExecutions.id))
      .where(eq(schema.jobExecutions.jobId, jobId))
      .orderBy(schema.jobLogs.ts);

    return reply.send({ data: rows, meta: { count: rows.length } });
  });
}
