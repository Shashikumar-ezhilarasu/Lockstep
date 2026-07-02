import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { schema } from 'db';
import { eq, and, lte, desc, not, sql, isNull } from 'drizzle-orm';
import parser from 'cron-parser';
import pino from 'pino';

const logger = pino({ name: 'scheduler' });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not set. Check that your .env file exists and is being loaded.');
}

const pool = new Pool({
  connectionString,
  max: 2, // low concurrency for scheduler
});

const db = drizzle(pool, { schema });

async function recoverStaleWorkers() {
  logger.info('Checking for stale workers...');
  try {
    const now = new Date();
    const staleThreshold = new Date(now.getTime() - 30000); // 30 seconds ago

    // Get all workers that are NOT offline
    const activeWorkers = await db.select()
      .from(schema.workers)
      .where(not(eq(schema.workers.status, 'offline')));

    for (const worker of activeWorkers) {
      // Find the last heartbeat for this worker
      const [lastHeartbeat] = await db.select()
        .from(schema.workerHeartbeats)
        .where(eq(schema.workerHeartbeats.workerId, worker.id))
        .orderBy(desc(schema.workerHeartbeats.ts))
        .limit(1);

      const lastActiveTime = lastHeartbeat ? lastHeartbeat.ts : worker.startedAt;

      if (lastActiveTime < staleThreshold) {
        logger.warn({ workerId: worker.id, hostname: worker.hostname }, 'Worker is stale. Recovering jobs...');

        // 1. Mark worker as offline
        await db.update(schema.workers)
          .set({ status: 'offline' })
          .where(eq(schema.workers.id, worker.id));

        // 2. Find jobs claimed/running by this worker
        const staleJobs = await db.select()
          .from(schema.jobs)
          .where(and(
            eq(schema.jobs.claimedBy, worker.id),
            sql`${schema.jobs.status} IN ('claimed', 'running')`
          ));

        for (const job of staleJobs) {
          logger.info({ jobId: job.id, workerId: worker.id }, 'Recovering job');

          // Find active execution for this job
          const [activeExec] = await db.select()
            .from(schema.jobExecutions)
            .where(and(
              eq(schema.jobExecutions.jobId, job.id),
              eq(schema.jobExecutions.workerId, worker.id),
              isNull(schema.jobExecutions.finishedAt)
            ))
            .orderBy(desc(schema.jobExecutions.startedAt))
            .limit(1);

          if (activeExec) {
            // Close the execution with failed state
            await db.update(schema.jobExecutions)
              .set({
                status: 'failed',
                finishedAt: now,
                error: { message: 'Worker crashed or stopped emitting heartbeats.' }
              })
              .where(eq(schema.jobExecutions.id, activeExec.id));

            // Log recovery action
            await db.insert(schema.jobLogs).values({
              executionId: activeExec.id,
              level: 'error',
              message: 'Worker went offline. Job recovered and reset to queued.'
            });
          }

          // Reset job status to queued
          await db.update(schema.jobs)
            .set({
              status: 'queued',
              claimedBy: null,
              claimedAt: null
            })
            .where(eq(schema.jobs.id, job.id));
        }
      }
    }
  } catch (error) {
    logger.error({ error }, 'Error in recoverStaleWorkers');
  }
}

async function tick() {
  logger.info('Scheduler tick');
  try {
    const now = new Date();
    
    // Find all scheduled jobs due to run
    const dueJobs = await db.select()
      .from(schema.scheduledJobs)
      .where(and(
        eq(schema.scheduledJobs.enabled, true),
        lte(schema.scheduledJobs.nextRunAt, now)
      ));

    for (const sjob of dueJobs) {
      logger.info({ scheduledJobId: sjob.id }, 'Triggering scheduled job');
      
      // Insert new job instance
      await db.insert(schema.jobs).values({
        queueId: sjob.queueId,
        type: 'immediate',
        payload: (sjob.jobTemplate as any).payload || {},
        status: 'queued',
        priority: (sjob.jobTemplate as any).priority || 10,
      });

      // Calculate next run
      try {
        const interval = parser.parseExpression(sjob.cronExpression, { tz: sjob.timezone, currentDate: now });
        const nextRunAt = interval.next().toDate();
        
        await db.update(schema.scheduledJobs)
          .set({ 
            lastRunAt: now,
            nextRunAt 
          })
          .where(eq(schema.scheduledJobs.id, sjob.id));
      } catch (err) {
        logger.error({ err, sjobId: sjob.id }, 'Failed to parse cron or update nextRunAt');
        await db.update(schema.scheduledJobs).set({ enabled: false }).where(eq(schema.scheduledJobs.id, sjob.id));
      }
    }

    // Run the stale worker recovery check as part of the tick
    await recoverStaleWorkers();
  } catch (error) {
    logger.error({ error }, 'Error in scheduler tick');
  }
}

// Run every 10 seconds (or 10 seconds for faster testing)
const INTERVAL_MS = parseInt(process.env.POLL_INTERVAL || '10000', 10);

logger.info(`Scheduler started, polling every ${INTERVAL_MS}ms`);
setInterval(tick, INTERVAL_MS);

// Initial tick
tick();

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received. Shutting down scheduler...');
  await pool.end();
  process.exit(0);
});
process.on('SIGINT', async () => {
  logger.info('SIGINT received. Shutting down scheduler...');
  await pool.end();
  process.exit(0);
});
