import { FastifyInstance } from 'fastify';
import { schema } from 'db';
import { sql } from 'drizzle-orm';
import { db } from '../db';

function rows(result: unknown): any[] {
  if (Array.isArray(result)) return result;
  if (result && typeof result === 'object' && 'rows' in result) return (result as { rows: any[] }).rows;
  return [];
}

export default async function metricsRoutes(app: FastifyInstance) {
  app.get('/metrics', async (request: any, reply) => {
    // 1. Chart Data
    const chartDataResult = await db.execute(sql`
      SELECT 
        to_char(date_trunc('minute', finished_at), 'HH24:MI') as time,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as jobs,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed
      FROM job_executions
      WHERE finished_at > NOW() - INTERVAL '1 hour'
      GROUP BY 1
      ORDER BY 1 ASC
      LIMIT 15
    `);

    // 2. Metrics for the top cards
    const statsResult = await db.execute(sql`
      SELECT 
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as total_completed,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as total_failed,
        AVG(EXTRACT(EPOCH FROM (finished_at - started_at))) as avg_duration
      FROM job_executions
      WHERE finished_at > NOW() - INTERVAL '1 hour'
    `);

    // 3. Workers
    const workersResult = await db.execute(sql`
      SELECT COUNT(*) as active_workers FROM workers WHERE status != 'offline'
    `);

    // 4. DLQ Count
    const dlqResult = await db.execute(sql`
      SELECT COUNT(*) as dlq_count FROM dead_letter_queue
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
    
    // Map time to shape expected by frontend, ensuring chartData has items
    let chartData = chartRows.map((r: any) => ({
      time: r.time,
      jobs: Number(r.jobs),
      failed: Number(r.failed)
    }));

    // If we don't have enough data to render a nice chart, pad it
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
