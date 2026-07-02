import { db } from './db';
import { sql } from 'drizzle-orm';
import { schema } from 'db';

export async function claimJobs(queueId: string, workerId: string, availableSlots: number) {
  if (availableSlots <= 0) return [];

  const result = await db.execute(sql`
    WITH lock_acquired AS (
      SELECT pg_advisory_xact_lock(('x' || substr(md5(${queueId}::text), 1, 8))::bit(32)::int)
    ),
    queue_capacity AS (
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
      CROSS JOIN lock_acquired
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

  const rows = Array.isArray(result) ? result : (result as any).rows ?? [];
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
}
