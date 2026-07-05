import MermaidDiagram from '@/components/MermaidDiagram';

const architectureChart = `
flowchart TD
    Client[Web Browser / Next.js Dashboard] -->|HTTP REST| API[Fastify API]
    Client -->|WebSockets CDC| DB[(Supabase PostgreSQL)]
    
    API -->|SQL Session Pool| DB
    Worker[Worker Processes] -->|Polls & Claims via SQL| DB
    Scheduler[Scheduler Service] -->|Delayed/Cron triggers & crash sweeps| DB
`;

export default function ArchitecturePage() {
  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 mb-4">System Architecture & Design</h1>
        <p className="text-lg text-slate-600">
          Lockstep is a Postgres-backed distributed job scheduler and task queue system designed for multi-tenant SaaS environments. 
          It relies on PostgreSQL for persistence, state tracking, and concurrency management, avoiding the need for external caching/queueing infrastructure like Redis or RabbitMQ.
        </p>
      </div>

      <section>
        <h2 id="core-component-split" className="text-2xl font-semibold text-slate-900 mb-4 pb-2 border-b border-[#E7E5E4]">Core Component Split</h2>
        <p className="text-slate-600 mb-6">The system is separated into three stateless application services and a centralized relational database:</p>
        
        <MermaidDiagram chart={architectureChart} />

        <div className="space-y-8 mt-8">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">1. Fastify REST API (<code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">backend/apps/api</code>)</h3>
            <ul className="list-disc pl-6 space-y-2 text-slate-600">
              <li><strong>Role</strong>: Serves REST endpoints for system administration, job queue configuration, job creation, cancelling/retrying jobs, and operational metrics.</li>
              <li><strong>Authentication</strong>: Decodes and verifies JWTs signed by Supabase Auth (GoTrue).</li>
              <li><strong>Multi-tenant Isolation</strong>: Enforces tenant authorization at the query level by matching the decoded <code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">user_id</code> from the JWT with organization and project ownership configurations before returning or mutating resource data.</li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">2. Worker Daemon (<code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">backend/apps/worker</code>)</h3>
            <ul className="list-disc pl-6 space-y-2 text-slate-600">
              <li><strong>Role</strong>: Runs polling loops that claim and execute jobs concurrently using a promise queue (<code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">p-limit</code>).</li>
              <li><strong>State Machine</strong>: Transitions jobs from <code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">queued</code>/<code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">scheduled</code> to <code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">claimed</code> &rarr; <code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">running</code> &rarr; <code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">completed</code> / <code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">failed</code> / <code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">dead_letter</code>.</li>
              <li><strong>Heartbeats</strong>: Regularly writes liveness probes to the <code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">worker_heartbeats</code> table and updates worker metadata status.</li>
              <li><strong>Graceful Shutdown</strong>: Intercepts <code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">SIGINT</code> and <code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">SIGTERM</code> signals to flag the worker status as <code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">draining</code>, stops accepting new claims, and allows active job executions to drain safely for up to 30 seconds before termination.</li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">3. Scheduler Daemon (<code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">backend/apps/scheduler</code>)</h3>
            <ul className="list-disc pl-6 space-y-2 text-slate-600">
              <li><strong>Role</strong>: A background singleton service that handles cron scheduling, delayed job dispatching, and stale worker recovery.</li>
              <li><strong>Cron & Delayed Execution</strong>: Periodically checks the <code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">scheduled_jobs</code> table to evaluate cron schedules using <code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">cron-parser</code>, inserting new job runs and updating <code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">next_run_at</code> timestamps. Also moves due delayed/scheduled jobs (<code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">scheduled_at &lt;= now()</code>) into the <code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">queued</code> state.</li>
              <li><strong>Worker Crash Recovery</strong>: Sweeps the active workers table for instances whose last heartbeat is older than 30 seconds. It flags them as <code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">offline</code> and automatically aborts their open <code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">job_executions</code> (marking them <code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">failed</code>) and resets their orphaned jobs back to <code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">queued</code> for other workers to pick up.</li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">4. PostgreSQL Database (Supabase)</h3>
            <ul className="list-disc pl-6 space-y-2 text-slate-600">
              <li><strong>Role</strong>: Serves as the single source of truth, operational ledger, and synchronization layer.</li>
              <li><strong>Concurrency Locking</strong>: Employs row-level pessimistic locking (<code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">FOR UPDATE SKIP LOCKED</code>) for concurrent job claims.</li>
              <li><strong>Isolation Levels</strong>: Implements <code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">SERIALIZABLE</code> transaction isolation in the <code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">claimJobs</code> step to guarantee queue concurrency limits are strictly enforced without race conditions across concurrent workers.</li>
            </ul>
          </div>
        </div>
      </section>

      <section>
        <h2 id="concurrency-and-execution-flow" className="text-2xl font-semibold text-slate-900 mb-4 pb-2 border-b border-[#E7E5E4]">Concurrency & Execution Flow</h2>
        
        <h3 className="text-lg font-semibold text-slate-900 mb-2 mt-6">Polling Mechanics</h3>
        <p className="text-slate-600 mb-3">Workers execute a continuous polling loop (defaulting to a <code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">1000ms</code> sleep interval between iterations). To claim jobs, a worker:</p>
        <ol className="list-decimal pl-6 space-y-2 text-slate-600 mb-8">
          <li>Calculates remaining capacity space in its queue subscription based on its local worker capacity and the queue&apos;s global concurrency limit.</li>
          <li>If slots are available, executes <code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">claimJobs</code> in a transaction.</li>
        </ol>

        <h3 className="text-lg font-semibold text-slate-900 mb-2">Serializable Queue Capacity Enforcing</h3>
        <p className="text-slate-600 mb-3">To prevent multiple workers from over-claiming jobs past a queue&apos;s <code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">concurrency_limit</code> under high load:</p>
        <ul className="list-disc pl-6 space-y-2 text-slate-600 mb-8">
          <li>The transaction setting is explicitly set to <code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">SERIALIZABLE</code> isolation before the query.</li>
          <li>A capacity subquery computes the active running job count (<code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">claimed</code> or <code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">running</code> status) and subtracts it from <code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">concurrency_limit</code> to obtain the remaining available slot budget.</li>
          <li>Candidate jobs are locked using <code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">FOR UPDATE OF jobs SKIP LOCKED</code> up to the calculated limit.</li>
          <li>In case of concurrent transaction conflicts on the capacity count, PostgreSQL raises a serialization conflict error (<code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">40001</code>). The worker catches this exception, performs a randomized backoff (10–50ms) to avoid lock contention, and retries the transaction (up to 5 attempts).</li>
        </ul>

        <h3 className="text-lg font-semibold text-slate-900 mb-2">Workflow Dependency Resolution</h3>
        <p className="text-slate-600">Workflow dependencies are enforced atomically at claim time. When a worker selects jobs for execution, a <code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">NOT EXISTS</code> condition ensures that no jobs are claimed if they depend on predecessor jobs that have not reached the <code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">completed</code> state.</p>
      </section>
    </div>
  );
}
