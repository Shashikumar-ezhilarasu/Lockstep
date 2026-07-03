import { db } from './db';
import { sql } from 'drizzle-orm';
import { schema } from 'db';

const MAX_CLAIM_RETRIES = 5;

export async function claimJobs(queueId: string, workerId: string, availableSlots: number): Promise<any[]> {
  if (availableSlots <= 0) return [];

  // We use SERIALIZABLE isolation so the capacity check (COUNT of active jobs)
  // and the UPDATE are atomic with respect to concurrent claimJobs calls.
  // Under SERIALIZABLE, PostgreSQL detects read/write conflicts and aborts one
  // of the conflicting transactions with error code 40001 (serialization_failure).
  // We retry on 40001 up to MAX_CLAIM_RETRIES times with a short random backoff.
  for (let attempt = 0; attempt < MAX_CLAIM_RETRIES; attempt++) {
    try {
      const rows = await db.transaction(async (tx) => {
        // Set SERIALIZABLE isolation for this transaction
        await tx.execute(sql`SET TRANSACTION ISOLATION LEVEL SERIALIZABLE`);

        const result = await tx.execute(sql`
          WITH queue_capacity AS (
            SELECT GREATEST(
              queues.concurrency_limit - (
                SELECT COUNT(*)
                FROM jobs active_jobs
                WHERE active_jobs.queue_id = queues.id
                  AND active_jobs.status IN ('claimed', 'running')
              ),
              0
            ) AS remaining
            FROM queues
            WHERE queues.id = ${queueId}
              AND queues.status = 'active'
          ),
          claimable AS (
            SELECT jobs.id FROM jobs
            INNER JOIN queues ON jobs.queue_id = queues.id
            WHERE jobs.queue_id = ${queueId}
              AND queues.status = 'active'
              AND (jobs.status = 'queued' OR jobs.status = 'scheduled')
              AND jobs.scheduled_at <= now()
              AND NOT EXISTS (
                SELECT 1 FROM job_dependencies jd
                JOIN jobs dep ON dep.id = jd.depends_on_job_id
                WHERE jd.job_id = jobs.id AND dep.status != 'completed'
              )
            ORDER BY jobs.priority DESC, jobs.scheduled_at ASC
            FOR UPDATE OF jobs SKIP LOCKED
            LIMIT LEAST(${availableSlots}, COALESCE((SELECT remaining FROM queue_capacity), 0))
          )
          UPDATE jobs
          SET status = 'claimed', claimed_by = ${workerId}, claimed_at = now(), attempt = attempt + 1
          FROM claimable
          WHERE jobs.id = claimable.id
          RETURNING jobs.*;
        `);

        return Array.isArray(result) ? result : (result as any).rows ?? [];
      });

      return rows.map((row: any) => ({
        id: row.id,
        queueId: row.queue_id,
        retryPolicyId: row.retry_policy_id,
        parentJobId: row.parent_job_id,
        type: row.type,
        status: row.status,
        priority: row.priority,
        payload: row.payload,
        idempotencyKey: row.idempotency_key,
        scheduledAt: row.scheduled_at,
        claimedBy: row.claimed_by,
        claimedAt: row.claimed_at,
        attempt: row.attempt,
        batchId: row.batch_id,
        createdAt: row.created_at
      }));
    } catch (err: any) {
      // 40001 = serialization_failure — safe to retry
      if (err?.code === '40001' && attempt < MAX_CLAIM_RETRIES - 1) {
        // Random backoff: 10–50ms to reduce contention
        await new Promise(r => setTimeout(r, 10 + Math.random() * 40));
        continue;
      }
      throw err;
    }
  }

  // Exhausted retries without success — return empty rather than crashing the worker
  return [];
}
