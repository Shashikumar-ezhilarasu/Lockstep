import CodeBlock from '@/components/CodeBlock';

const claimSql = `SELECT jobs.id FROM jobs
INNER JOIN queues ON jobs.queue_id = queues.id
WHERE jobs.queue_id = $1 AND queues.status = 'active'
ORDER BY jobs.priority DESC, jobs.scheduled_at ASC
FOR UPDATE OF jobs SKIP LOCKED
LIMIT $2`;

export default function ReliabilityPage() {
  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 mb-4">Reliability & Concurrency Architecture</h1>
        <p className="text-lg text-slate-600">This document describes the high-concurrency design, atomic claiming strategy, and system failure recovery mechanisms implemented in Lockstep.</p>
      </div>

      <section>
        <h2 id="concurrency-control-and-atomic-claiming" className="text-2xl font-semibold text-slate-900 mb-4 pb-2 border-b border-[#E7E5E4]">1. Concurrency Control & Atomic Claiming</h2>
        
        <h3 className="text-lg font-semibold text-slate-900 mb-2 mt-6">Row Locking (<code className="font-mono text-[#5B4FE8]">FOR UPDATE SKIP LOCKED</code>)</h3>
        <p className="text-slate-600 mb-4">Distributed workers query the database for eligible jobs concurrently. To prevent race conditions, the claim selection SQL utilizes PostgreSQL row-level locks:</p>
        <CodeBlock language="sql" code={claimSql} />
        <ul className="list-disc pl-6 space-y-2 text-slate-600 mb-8 mt-4">
          <li><strong><code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">FOR UPDATE</code></strong>: Locks the returned job rows, blocking other transaction writers.</li>
          <li><strong><code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">SKIP LOCKED</code></strong>: Concurrent workers skip these locked rows, selecting subsequent jobs. This ensures zero duplicate executions.</li>
        </ul>

        <h3 className="text-lg font-semibold text-slate-900 mb-2">Queue Capacity Enforcement (<code className="font-mono text-[#5B4FE8]">SERIALIZABLE</code> Isolation)</h3>
        <p className="text-slate-600 mb-4">Under transaction-mode connection poolers, traditional process locks fail due to missing connection affinity. Lockstep resolves this by executing the entire job selection and update logic under a <code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">SERIALIZABLE</code> transaction isolation level:</p>
        <ol className="list-decimal pl-6 space-y-2 text-slate-600">
          <li><strong>Capacity Read</strong>: Counts jobs currently in <code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">claimed</code> or <code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">running</code> state.</li>
          <li><strong>Limit Calculation</strong>: Subtracts count from the queue&apos;s <code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">concurrency_limit</code> to obtain remaining slots.</li>
          <li><strong>Conflict Detection</strong>: PostgreSQL automatically aborts transactions that conflict on the counted rows.</li>
          <li><strong>Retry Loop</strong>: Workers catch serialization failure codes (<code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">40001</code>) and retry up to 5 times using a jittered delay (10–50ms) to reduce lock contention.</li>
        </ol>
      </section>

      <section>
        <h2 id="failure-recovery-and-heartbeats" className="text-2xl font-semibold text-slate-900 mb-4 pb-2 border-b border-[#E7E5E4]">2. Failure Recovery & Heartbeats</h2>
        
        <h3 className="text-lg font-semibold text-slate-900 mb-2 mt-6">Worker Heartbeat Telemetry</h3>
        <p className="text-slate-600 mb-2">Workers execute a background heartbeat interval loop (every 10 seconds):</p>
        <ul className="list-disc pl-6 space-y-2 text-slate-600 mb-8">
          <li>Writes heartbeats containing status (<code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">idle</code>/<code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">busy</code>), active job count, CPU percentage, and memory usage to the <code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">worker_heartbeats</code> table.</li>
          <li>Updates the corresponding record in <code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">workers</code>.</li>
        </ul>

        <h3 className="text-lg font-semibold text-slate-900 mb-2">Scheduler Crash Recovery Sweeper</h3>
        <p className="text-slate-600 mb-2">If a worker crashes or shuts down abruptly:</p>
        <ul className="list-disc pl-6 space-y-2 text-slate-600">
          <li>The scheduler daemon runs <code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">recoverStaleWorkers()</code> every 10 seconds.</li>
          <li>Identifies workers whose last heartbeat is older than 30 seconds.</li>
          <li>Marks the worker&apos;s status as <code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">offline</code>.</li>
          <li>Locates all <code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">claimed</code> or <code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">running</code> jobs owned by that worker.</li>
          <li>Fails their respective active <code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">job_executions</code> (writing a system crash log) and transitions the jobs back to <code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">queued</code>.</li>
        </ul>
      </section>

      <section>
        <h2 id="resilience-and-graceful-shutdowns" className="text-2xl font-semibold text-slate-900 mb-4 pb-2 border-b border-[#E7E5E4]">3. Resilience & Graceful Shutdowns</h2>
        
        <h3 className="text-lg font-semibold text-slate-900 mb-2 mt-6">Worker Promise Queue (<code className="font-mono text-[#5B4FE8]">p-limit</code>)</h3>
        <p className="text-slate-600 mb-8">Workers pull batches of jobs and limit concurrent executions in memory using <code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">p-limit(CONCURRENCY)</code>. This protects worker memory bounds from overload.</p>
        
        <h3 className="text-lg font-semibold text-slate-900 mb-2">Signal Handling (Graceful Drain)</h3>
        <p className="text-slate-600 mb-2">Workers handle <code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">SIGINT</code> and <code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">SIGTERM</code> signals for clean restarts:</p>
        <ol className="list-decimal pl-6 space-y-2 text-slate-600 mb-8">
          <li>Worker status is updated in the database to <code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">draining</code>.</li>
          <li>The polling loop flag <code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">isShuttingDown</code> is set to <code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">true</code>, preventing new job claims.</li>
          <li>Allows currently running jobs up to 30 seconds to finish.</li>
          <li>Updates the worker status to <code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">offline</code> and exits safely.</li>
        </ol>

        <h3 className="text-lg font-semibold text-slate-900 mb-2">Retry Backoff & DLQ Quarantine</h3>
        <p className="text-slate-600 mb-2">Upon handler exceptions:</p>
        <ul className="list-disc pl-6 space-y-2 text-slate-600">
          <li>Delay is calculated according to the queue&apos;s retry strategy:
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li><code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">fixed</code>: <code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">base_delay</code></li>
              <li><code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">linear</code>: <code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">base_delay * attempt</code></li>
              <li><code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">exponential</code>: <code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">base_delay * (multiplier ^ attempt)</code></li>
            </ul>
          </li>
          <li>The job transitions to <code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">scheduled</code> and is parked until the computed <code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">scheduled_at</code> timestamp.</li>
          <li>If attempts reach <code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">max_attempts</code>, the job transitions to <code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">dead_letter</code> and details are moved to the <code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">dead_letter_queue</code> table, freeing scheduler loops from failing tasks.</li>
        </ul>
      </section>
    </div>
  );
}
