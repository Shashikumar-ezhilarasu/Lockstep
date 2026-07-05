import { FastifyInstance } from 'fastify';
import { schema } from 'db';
import { sql, eq } from 'drizzle-orm';
import { db } from '../db';

function rows(result: unknown): any[] {
  if (Array.isArray(result)) return result;
  if (result && typeof result === 'object' && 'rows' in result) return (result as { rows: any[] }).rows;
  return [];
}

export default async function metricsRoutes(app: FastifyInstance) {
  app.get('/metrics', async (request: any, reply) => {
    const userOrgs = await db.select({ orgId: schema.orgMembers.orgId })
      .from(schema.orgMembers)
      .where(eq(schema.orgMembers.userId, request.user.id));
    
    const orgIds = userOrgs.map(o => o.orgId);
    const orgIdsRaw = orgIds.length > 0 ? orgIds.map(id => `'${id}'`).join(',') : "''";
    
    if (orgIds.length === 0) {
      return reply.send({
        data: {
          chartData: [{ time: '00:00', jobs: 0, failed: 0 }],
          totalCompleted: 0,
          activeWorkers: 0,
          failureRate: '0.0%',
          dlqCount: 0,
          averageDuration: 0,
          jobStatusDistribution: [],
          queueHealth: [],
          executionDuration: [],
          dlqTrend: [],
          workerUtilization: []
        }
      });
    }

    // 1. Chart Data (Throughput - last 1 hour)
    const chartDataResult = await db.execute(sql`
      SELECT 
        to_char(date_trunc('minute', je.finished_at), 'HH24:MI') as time,
        COUNT(CASE WHEN je.status = 'completed' THEN 1 END) as jobs,
        COUNT(CASE WHEN je.status = 'failed' THEN 1 END) as failed
      FROM job_executions je
      INNER JOIN jobs j ON je.job_id = j.id
      INNER JOIN queues q ON j.queue_id = q.id
      INNER JOIN projects p ON q.project_id = p.id
      WHERE je.finished_at > NOW() - INTERVAL '1 hour'
        AND p.org_id IN (${sql.raw(orgIdsRaw)})
      GROUP BY 1
      ORDER BY 1 ASC
      LIMIT 15
    `);

    // 2. Metrics for the top cards (All time jobs for accurate failure rate)
    const statsResult = await db.execute(sql`
      SELECT 
        COUNT(CASE WHEN j.status = 'completed' THEN 1 END) as total_completed,
        COUNT(CASE WHEN j.status = 'dead_letter' OR j.status = 'failed' THEN 1 END) as total_failed
      FROM jobs j
      INNER JOIN queues q ON j.queue_id = q.id
      INNER JOIN projects p ON q.project_id = p.id
      WHERE p.org_id IN (${sql.raw(orgIdsRaw)})
    `);

    // Average duration (last 1 hour completed executions)
    const avgDurationResult = await db.execute(sql`
      SELECT AVG(EXTRACT(EPOCH FROM (je.finished_at - je.started_at))) as avg_duration
      FROM job_executions je
      INNER JOIN jobs j ON je.job_id = j.id
      INNER JOIN queues q ON j.queue_id = q.id
      INNER JOIN projects p ON q.project_id = p.id
      WHERE je.finished_at > NOW() - INTERVAL '1 hour'
        AND je.status = 'completed'
        AND p.org_id IN (${sql.raw(orgIdsRaw)})
    `);

    // 3. Workers (global)
    const workersResult = await db.execute(sql`
      SELECT COUNT(*) as active_workers 
      FROM workers w
      WHERE w.status != 'offline'
    `);

    // 4. DLQ Count (all time)
    const dlqResult = await db.execute(sql`
      SELECT COUNT(*) as dlq_count 
      FROM dead_letter_queue dlq
      INNER JOIN jobs j ON dlq.job_id = j.id
      INNER JOIN queues q ON j.queue_id = q.id
      INNER JOIN projects p ON q.project_id = p.id
      WHERE p.org_id IN (${sql.raw(orgIdsRaw)})
    `);

    // 5. Job Status Distribution (All time)
    const jobStatusResult = await db.execute(sql`
      SELECT j.status, COUNT(*) as count
      FROM jobs j
      INNER JOIN queues q ON j.queue_id = q.id
      INNER JOIN projects p ON q.project_id = p.id
      WHERE p.org_id IN (${sql.raw(orgIdsRaw)})
      GROUP BY j.status
    `);

    // 6. Queue Health Matrix
    const queueHealthResult = await db.execute(sql`
      SELECT 
        q.id, q.name, q.concurrency_limit,
        COUNT(CASE WHEN j.status = 'running' THEN 1 END) as active_jobs,
        COUNT(CASE WHEN j.status = 'completed' THEN 1 END) as completed_jobs
      FROM queues q
      INNER JOIN projects p ON q.project_id = p.id
      LEFT JOIN jobs j ON q.id = j.queue_id
      WHERE p.org_id IN (${sql.raw(orgIdsRaw)})
      GROUP BY q.id, q.name, q.concurrency_limit
    `);

    // 7. Execution Duration Histogram (Last 24 hours completed)
    const durationResult = await db.execute(sql`
      SELECT 
        CASE 
          WHEN duration < 100 THEN '<100ms'
          WHEN duration < 500 THEN '100-500ms'
          WHEN duration < 1000 THEN '500ms-1s'
          ELSE '1s+' 
        END as bucket,
        COUNT(*) as count
      FROM (
        SELECT EXTRACT(EPOCH FROM (je.finished_at - je.started_at)) * 1000 as duration
        FROM job_executions je
        INNER JOIN jobs j ON je.job_id = j.id
        INNER JOIN queues q ON j.queue_id = q.id
        INNER JOIN projects p ON q.project_id = p.id
        WHERE je.status = 'completed' 
          AND je.finished_at > NOW() - INTERVAL '24 hours'
          AND p.org_id IN (${sql.raw(orgIdsRaw)})
      ) sub
      GROUP BY bucket
    `);

    // 8. DLQ Trend (Last 7 days)
    const dlqTrendResult = await db.execute(sql`
      SELECT to_char(date_trunc('day', dlq.moved_at), 'YYYY-MM-DD') as date, COUNT(*) as count
      FROM dead_letter_queue dlq
      INNER JOIN jobs j ON dlq.job_id = j.id
      INNER JOIN queues q ON j.queue_id = q.id
      INNER JOIN projects p ON q.project_id = p.id
      WHERE dlq.moved_at > NOW() - INTERVAL '7 days'
        AND p.org_id IN (${sql.raw(orgIdsRaw)})
      GROUP BY 1
      ORDER BY 1 ASC
    `);

    // 9. Worker Utilization
    const workerUtilResult = await db.execute(sql`
      SELECT w.id, w.hostname, COUNT(j.id) as active_jobs
      FROM workers w
      LEFT JOIN jobs j ON w.id = j.claimed_by AND j.status = 'running'
      WHERE w.status != 'offline'
      GROUP BY w.id, w.hostname
    `);

    const statsRows = rows(statsResult);
    const completed = Number(statsRows[0]?.total_completed || 0);
    const failed = Number(statsRows[0]?.total_failed || 0);
    const total = completed + failed;
    const failureRate = total > 0 ? ((failed / total) * 100).toFixed(1) : '0.0';
    
    let chartData = rows(chartDataResult).map((r: any) => ({
      time: r.time,
      jobs: Number(r.jobs),
      failed: Number(r.failed)
    }));
    if (chartData.length === 0) chartData = [{ time: '00:00', jobs: 0, failed: 0 }];

    return reply.send({
      data: {
        chartData,
        totalCompleted: completed,
        activeWorkers: Number(rows(workersResult)[0]?.active_workers || 0),
        failureRate: `${failureRate}%`,
        dlqCount: Number(rows(dlqResult)[0]?.dlq_count || 0),
        averageDuration: Number(rows(avgDurationResult)[0]?.avg_duration || 0),
        jobStatusDistribution: rows(jobStatusResult).map(r => ({ status: r.status, count: Number(r.count) })),
        queueHealth: rows(queueHealthResult).map(r => ({ id: r.id, name: r.name, limit: r.concurrency_limit, active: Number(r.active_jobs), completed: Number(r.completed_jobs) })),
        executionDuration: rows(durationResult).map(r => ({ bucket: r.bucket, count: Number(r.count) })),
        dlqTrend: rows(dlqTrendResult).map(r => ({ date: r.date, count: Number(r.count) })),
        workerUtilization: rows(workerUtilResult).map(r => ({ id: r.id, hostname: r.hostname, count: Number(r.active_jobs) }))
      }
    });
  });
}
