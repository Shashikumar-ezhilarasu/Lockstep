import { v4 as uuidv4 } from 'uuid';
import { db } from './db';
import { schema, assertValidTransition } from 'db';
import { claimJobs } from './claim';
import pLimit from 'p-limit';
import pino from 'pino';
import { calculateRetryDelay } from './retry';
import { eq } from 'drizzle-orm';

const logger = pino({ name: 'worker' });

const WORKER_ID = uuidv4();
const HOSTNAME = process.env.HOSTNAME || 'localhost';
const QUEUES_TO_POLL = (process.env.QUEUES || '').split(',').filter(Boolean);
const CONCURRENCY = parseInt(process.env.CONCURRENCY || '10', 10);
const POLL_INTERVAL_MS = 1000;
const HEARTBEAT_INTERVAL_MS = 10000;

let isShuttingDown = false;
let activeJobs = 0;
const activeJobsPerQueue: Record<string, number> = {};
let workerDbId: string | null = null;

// Built-in demo handlers used by the local dashboard and tests.
const handlers: Record<string, (payload: any) => Promise<any>> = {
  sleep_simulate: async (payload: { ms: number }) => {
    return new Promise(resolve => setTimeout(() => resolve({ success: true }), payload.ms || 100));
  },
  fail_simulate: async () => {
    throw new Error('Simulated failure');
  }
};

async function executeJob(job: any) {
  activeJobs++;
  activeJobsPerQueue[job.queueId] = (activeJobsPerQueue[job.queueId] || 0) + 1;
  const executionId = uuidv4();
  const startedAt = Date.now();
  
  // Log start
  await db.insert(schema.jobExecutions).values({
    id: executionId,
    jobId: job.id,
    workerId: workerDbId,
    status: 'started' as const,
  });
  await db.insert(schema.jobLogs).values({
    executionId,
    level: 'info',
    message: `Job ${job.id} claimed by worker ${workerDbId}`,
  });

  try {
    assertValidTransition(job.status, 'running');
    await db.update(schema.jobs).set({ status: 'running' as const }).where(eq(schema.jobs.id, job.id));
    job.status = 'running'; // local update
    await db.insert(schema.jobLogs).values({
      executionId,
      level: 'info',
      message: 'Job execution started',
    });

    const handler = handlers[job.payload?.handler];
    if (!handler) throw new Error(`Unknown handler: ${job.payload?.handler}`);

    const result = await handler(job.payload);

    // Success
    assertValidTransition(job.status, 'completed');
    await db.update(schema.jobs).set({ status: 'completed' as const }).where(eq(schema.jobs.id, job.id));
    await db.update(schema.jobExecutions).set({ 
      status: 'completed' as const, 
      finishedAt: new Date(), 
      result,
      durationMs: Date.now() - startedAt,
    }).where(eq(schema.jobExecutions.id, executionId));
    await db.insert(schema.jobLogs).values({
      executionId,
      level: 'info',
      message: 'Job execution completed',
    });
    
  } catch (error: any) {
    logger.error({ jobId: job.id, error: error.message }, 'Job failed');
    
    // Handle retries
    const [queue] = await db.select().from(schema.queues).where(eq(schema.queues.id, job.queueId));
    let retryPolicy;
    if (job.retryPolicyId) {
      [retryPolicy] = await db.select().from(schema.retryPolicies).where(eq(schema.retryPolicies.id, job.retryPolicyId));
    } else if (queue && queue.defaultRetryPolicyId) {
      [retryPolicy] = await db.select().from(schema.retryPolicies).where(eq(schema.retryPolicies.id, queue.defaultRetryPolicyId));
    }

    if (retryPolicy && job.attempt < retryPolicy.maxAttempts) {
      assertValidTransition(job.status, 'failed');
      job.status = 'failed';
      assertValidTransition(job.status, 'scheduled');
      const delay = calculateRetryDelay(
        retryPolicy.strategy, 
        retryPolicy.baseDelayMs, 
        job.attempt, 
        retryPolicy.multiplier ?? undefined, 
        retryPolicy.maxDelayMs ?? undefined
      );
      await db.update(schema.jobs).set({
        status: 'scheduled' as const,
        scheduledAt: new Date(Date.now() + delay),
      }).where(eq(schema.jobs.id, job.id));
      await db.insert(schema.jobLogs).values({
        executionId,
        level: 'warn',
        message: `Job failed; retry scheduled in ${delay}ms`,
      });
    } else {
      assertValidTransition(job.status, 'failed');
      job.status = 'failed';
      assertValidTransition(job.status, 'dead_letter');
      await db.update(schema.jobs).set({ status: 'dead_letter' as const }).where(eq(schema.jobs.id, job.id));
      await db.insert(schema.deadLetterQueue).values({
        jobId: job.id,
        failureReason: error.message || 'Unknown error',
        attemptsMade: job.attempt,
        originalPayload: job.payload,
      }).onConflictDoNothing(); // just in case
      await db.insert(schema.jobLogs).values({
        executionId,
        level: 'error',
        message: `Job moved to DLQ: ${error.message || 'Unknown error'}`,
      });
    }

    await db.update(schema.jobExecutions).set({ 
      status: 'failed' as const, 
      finishedAt: new Date(), 
      error: { message: error.message },
      durationMs: Date.now() - startedAt,
    }).where(eq(schema.jobExecutions.id, executionId));
  } finally {
    activeJobs--;
    activeJobsPerQueue[job.queueId]--;
  }
}

async function pollLoop() {
  const limit = pLimit(CONCURRENCY);

  while (!isShuttingDown) {
    try {
      if (activeJobs < CONCURRENCY) {
        let queuesToPoll = QUEUES_TO_POLL;
        if (queuesToPoll.length === 0) {
          const allQueues = await db.select({ id: schema.queues.id }).from(schema.queues).where(eq(schema.queues.status, 'active'));
          queuesToPoll = allQueues.map(q => q.id);
        }

        for (const queueIdToPoll of queuesToPoll) {
          if (activeJobs >= CONCURRENCY) break;
          
          const [queueConfig] = await db.select({ concurrencyLimit: schema.queues.concurrencyLimit }).from(schema.queues).where(eq(schema.queues.id, queueIdToPoll));
          if (!queueConfig) continue;

          const queueActive = activeJobsPerQueue[queueIdToPoll] || 0;
          const queueAvailableSlots = queueConfig.concurrencyLimit - queueActive;
          const globalAvailableSlots = CONCURRENCY - activeJobs;
          const slotsToClaim = Math.min(queueAvailableSlots, globalAvailableSlots);

          if (slotsToClaim > 0) {
            const claimed = await claimJobs(queueIdToPoll, workerDbId!, slotsToClaim);
            if (claimed.length > 0) {
              logger.info({ queueId: queueIdToPoll, count: claimed.length }, 'Claimed jobs');
              claimed.forEach((job: any) => {
                limit(() => executeJob(job));
              });
            }
          }
        }
      }
    } catch (err) {
      logger.error({ err }, 'Polling error');
    }
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
  }
}

async function start() {
  logger.info({ workerId: WORKER_ID }, 'Worker starting');
  
  // Register worker
  const [worker] = await db.insert(schema.workers).values({
    id: WORKER_ID,
    hostname: HOSTNAME,
    status: 'idle' as const,
    capacity: CONCURRENCY,
    subscribedQueues: QUEUES_TO_POLL,
  })
  .onConflictDoUpdate({
    target: schema.workers.hostname,
    set: { 
      status: 'idle',
      startedAt: new Date(),
      capacity: CONCURRENCY,
      subscribedQueues: QUEUES_TO_POLL,
    }
  })
  .returning();
  
  workerDbId = worker.id;

  // Heartbeat loop
  setInterval(async () => {
    if (!isShuttingDown && workerDbId) {
      try {
        await db.insert(schema.workerHeartbeats).values({
          workerId: workerDbId,
          activeJobCount: activeJobs,
        });
        await db.update(schema.workers).set({ status: activeJobs > 0 ? 'busy' as const : 'idle' as const }).where(eq(schema.workers.id, workerDbId));
      } catch (e) {
        logger.error({ err: e }, 'Heartbeat failed');
      }
    }
  }, HEARTBEAT_INTERVAL_MS);

  pollLoop();
}

async function shutdown(signal: string) {
  logger.info(`${signal} received. Draining...`);
  isShuttingDown = true;
  if (workerDbId) {
     await db.update(schema.workers).set({ status: 'draining' as const }).where(eq(schema.workers.id, workerDbId));
  }
  
  // Wait for jobs to finish
  let attempts = 0;
  while (activeJobs > 0 && attempts < 30) { // 30s timeout
    await new Promise(r => setTimeout(r, 1000));
    attempts++;
  }
  
  if (workerDbId) {
    await db.update(schema.workers).set({ status: 'offline' as const }).where(eq(schema.workers.id, workerDbId));
  }
  logger.info('Exiting');
  process.exit(0);
}

// Graceful shutdown
process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

start();
