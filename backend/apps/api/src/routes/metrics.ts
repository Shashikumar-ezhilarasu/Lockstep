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
    if (orgIds.length === 0) {
      return reply.send({
        data: {
          chartData: [{ time: '00:00', jobs: 0, failed: 0 }],
          totalCompleted: 0,
          activeWorkers: 0,
          failureRate: '0.0%',
          dlqCount: 0,
          averageDuration: 0
        }
      });
    }

    // 1. Chart Data (filtered by orgIds)
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
        AND p.org_id = ANY(${orgIds})
      GROUP BY 1
      ORDER BY 1 ASC
      LIMIT 15
    `);

    // 2. Metrics for the top cards (filtered by orgIds)
    const statsResult = await db.execute(sql`
      SELECT 
        COUNT(CASE WHEN je.status = 'completed' THEN 1 END) as total_completed,
        COUNT(CASE WHEN je.status = 'failed' THEN 1 END) as total_failed,
        AVG(EXTRACT(EPOCH FROM (je.finished_at - je.started_at))) as avg_duration
      FROM job_executions je
      INNER JOIN jobs j ON je.job_id = j.id
      INNER JOIN queues q ON j.queue_id = q.id
      INNER JOIN projects p ON q.project_id = p.id
      WHERE je.finished_at > NOW() - INTERVAL '1 hour'
        AND p.org_id = ANY(${orgIds})
    `);

    // 3. Workers (filtered by orgIds)
    const workersResult = await db.execute(sql`
      SELECT COUNT(*) as active_workers 
      FROM workers w
      INNER JOIN projects p ON w.project_id = p.id
      WHERE w.status != 'offline'
        AND p.org_id = ANY(${orgIds})
    `);

    // 4. DLQ Count (filtered by orgIds)
    const dlqResult = await db.execute(sql`
      SELECT COUNT(*) as dlq_count 
      FROM dead_letter_queue dlq
      INNER JOIN jobs j ON dlq.job_id = j.id
      INNER JOIN queues q ON j.queue_id = q.id
      INNER JOIN projects p ON q.project_id = p.id
      WHERE p.org_id = ANY(${orgIds})
    `);

    const chartRows = rows(chartDataResult);
    const statsRows = rows(statsResult);
    const workerRows = rows(workersResult);
    const dlqRows = rows(dlqResult);
    const stats = statsRows[0];
    const completed = Number(stats?.total_completed || 0);
    const failed = Number(stats?.total_failed || 0);
    const total = completed + failed;
    const failureRate = total > 0 ? ((failed / total) * 100).toFixed(1) : '0.0';
    
    let chartData = chartRows.map((r: any) => ({
      time: r.time,
      jobs: Number(r.jobs),
      failed: Number(r.failed)
    }));

    if (chartData.length === 0) {
      chartData = [{ time: '00:00', jobs: 0, failed: 0 }];
    }

    return reply.send({
      data: {
        chartData,
        totalCompleted: completed,
        activeWorkers: Number(workerRows[0]?.active_workers || 0),
        failureRate: `${failureRate}%`,
        dlqCount: Number(dlqRows[0]?.dlq_count || 0),
        averageDuration: Number(stats?.avg_duration || 0)
      }
    });
  });
}
