import { CheckCircle2 } from 'lucide-react';

export default function FeaturesPage() {
  const features = [
    {
      name: 'Multi-tenant Isolation',
      description: 'Ensures users can only access or mutate resources (projects, queues, jobs, DLQ) belonging to their organization.',
      technical: 'REST API endpoints decode JWTs via Fastify preHandler hooks and verify membership in the org_members table before running DB queries.'
    },
    {
      name: 'Project & Queue Partitioning',
      description: 'Groups resources logically: Organization → Projects → Queues → Jobs.',
      technical: 'Tables projects and queues use cascade constraints. Queue definitions hold priority, concurrency limits, and default retry policy links.'
    },
    {
      name: 'Queue Pausing / Resuming',
      description: 'Allows queue administrators to instantly suspend or resume job executions globally.',
      technical: "API updates the queues.status to paused / active. The worker's claiming query checks queues.status = 'active' directly, causing paused queues to be ignored."
    },
    {
      name: 'Immediate Jobs',
      description: 'Enqueues jobs for immediate processing by the next available worker.',
      technical: "API inserts jobs with status = 'queued' and scheduled_at = now(). The worker polls and claims these immediately."
    },
    {
      name: 'Delayed Jobs',
      description: 'Executes a task after a specified delay duration.',
      technical: "API accepts delay_ms and inserts jobs with status = 'scheduled' and scheduled_at = now() + delay_ms. The scheduler sweeper updates them to queued once the delay expires."
    },
    {
      name: 'Scheduled One-time Jobs',
      description: 'Triggers a job execution at an explicit future datetime.',
      technical: 'API accepts scheduled_at timestamp and writes it directly to the job record. The scheduler daemon wakes the job up when due.'
    },
    {
      name: 'Recurring Cron Jobs',
      description: 'Dispatches new job runs repeatedly according to a cron expression.',
      technical: 'Cron definitions are stored in scheduled_jobs. The scheduler daemon evaluates expressions using cron-parser to schedule execution and update next_run_at.'
    },
    {
      name: 'Batch Jobs',
      description: 'Groups multiple task payloads together under a single batch identifier.',
      technical: 'API enqueues multiple items sharing a single batch_id. The dashboard aggregates batch completion status using a custom SQL aggregation endpoint (/batches/:batchId).'
    },
    {
      name: 'Workflow Dependencies',
      description: 'Enforces execution order (DAGs) so a job only runs after its dependencies succeed.',
      technical: "Claim query in claim.ts uses a NOT EXISTS subquery against job_dependencies to filter out jobs whose parent tasks are not completed."
    },
    {
      name: 'Atomic Job Claiming',
      description: 'Guarantees that distributed workers do not pull or execute the same job twice.',
      technical: 'Worker claims jobs using FOR UPDATE OF jobs SKIP LOCKED, allowing workers to immediately lock available rows and skip already-locked items.'
    },
    {
      name: 'Global Concurrency Limits',
      description: 'Restricts the maximum number of concurrent running tasks per queue across all workers.',
      technical: 'Computed inside a SERIALIZABLE transaction query that calculates concurrency_limit - active_jobs. Aborted transaction conflicts (error 40001) are automatically retried with randomized backoff.'
    },
    {
      name: 'Job Retries & Backoff',
      description: 'Automatically schedules re-attempts for failed tasks with fixed, linear, or exponential delay backoffs.',
      technical: 'FSM transitions failed jobs back to scheduled and computes the next run timestamp based on configured retry_policies.'
    },
    {
      name: 'Dead Letter Queue (DLQ)',
      description: 'Quarantines jobs that have exhausted all retry attempts, preventing execution loops.',
      technical: 'Workers transition terminal jobs to dead_letter and write to the dead_letter_queue table. API supports requeuing (resetting attempts to 0) or deletion.'
    },
    {
      name: 'Execution Logging',
      description: 'Records complete worker output logs and durations for observability.',
      technical: 'Workers write history records to the job_executions table and step-by-step logs to the job_logs table, exposing them via /jobs/:jobId/logs REST APIs.'
    },
    {
      name: 'Worker Heartbeats',
      description: 'Monitors worker health and detects crashes.',
      technical: 'Workers report to the worker_heartbeats table every 10 seconds. The scheduler service sweeps for stale workers (no heartbeat > 30s) to flag them offline.'
    },
    {
      name: 'Stale Job Recovery',
      description: 'Recovers jobs that were left running on workers that crashed.',
      technical: 'The scheduler service identifies jobs marked claimed or running by a stale worker, closes their execution, and resets their status to queued.'
    },
    {
      name: 'Graceful Shutdown',
      description: 'Drains active tasks when worker processes receive termination signals.',
      technical: 'Workers intercept SIGTERM/SIGINT, update their status to draining, stop claiming new tasks, and wait up to 30 seconds for active executions to complete.'
    },
    {
      name: 'WebSocket Live Updates',
      description: 'Re-renders dashboard components instantly when database changes occur without REST API polling.',
      technical: 'Frontend dashboard connects to Supabase Realtime WebSockets to broadcast database WAL (Write-Ahead Log) updates directly to React tables.'
    }
  ];

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 mb-4">Implemented Features Matrix</h1>
        <p className="text-lg text-slate-600">This document provides a tabular overview of all features currently implemented in the Lockstep distributed job scheduler, summarizing what each feature does and how it is technically realized in the codebase.</p>
      </div>

      <section>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse border border-[#E7E5E4] rounded-xl overflow-hidden shadow-sm bg-white">
            <thead>
              <tr className="bg-[#FAFAF9] border-b border-[#E7E5E4]">
                <th className="py-3 px-4 font-semibold text-sm text-slate-900 w-12">Status</th>
                <th className="py-3 px-4 font-semibold text-sm text-slate-900 w-1/4">Feature</th>
                <th className="py-3 px-4 font-semibold text-sm text-slate-900 w-1/3">Description (What it does)</th>
                <th className="py-3 px-4 font-semibold text-sm text-slate-900 w-auto">Technical Realization (How it is implemented)</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {features.map((feature, idx) => (
                <tr key={idx} className="border-b border-[#E7E5E4] last:border-b-0 hover:bg-[#FAFAF9]/50 transition-colors">
                  <td className="py-4 px-4 align-top">
                    <CheckCircle2 size={18} className="text-emerald-500 mt-0.5" />
                  </td>
                  <td className="py-4 px-4 align-top font-medium text-slate-900">{feature.name}</td>
                  <td className="py-4 px-4 align-top text-slate-600">{feature.description}</td>
                  <td className="py-4 px-4 align-top text-slate-600 leading-relaxed">{feature.technical}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
