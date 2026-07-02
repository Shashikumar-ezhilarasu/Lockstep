import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { schema } from 'db';
import { eq, and, lte } from 'drizzle-orm';
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
        // we can link back if we want, but for now just insert
      });

      // Calculate next run
      try {
        const interval = parser.parseExpression(sjob.cronExpression, { tz: sjob.timezone, currentDate: now });
        // The cron parser might return the *current* time if it matches, so we should start from 'now'
        const nextRunAt = interval.next().toDate();
        
        await db.update(schema.scheduledJobs)
          .set({ 
            lastRunAt: now,
            nextRunAt 
          })
          .where(eq(schema.scheduledJobs.id, sjob.id));
      } catch (err) {
        logger.error({ err, sjobId: sjob.id }, 'Failed to parse cron or update nextRunAt');
        // Disable it so we don't spam errors
        await db.update(schema.scheduledJobs).set({ enabled: false }).where(eq(schema.scheduledJobs.id, sjob.id));
      }
    }
  } catch (error) {
    logger.error({ error }, 'Error in scheduler tick');
  }
}

// Run every 60 seconds (or 10 seconds for faster testing)
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
