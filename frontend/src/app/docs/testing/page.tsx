import CodeBlock from '@/components/CodeBlock';

export default function TestingStrategyPage() {
  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 mb-4">Testing Strategy & Execution</h1>
        <p className="text-lg text-slate-600">Lockstep uses Vitest to execute unit and integration test suites. The tests run against the database configuration defined in the active environment files.</p>
      </div>

      <section>
        <h2 id="running-the-test-suite" className="text-2xl font-semibold text-slate-900 mb-4 pb-2 border-b border-[#E7E5E4]">1. Running the Test Suite</h2>
        <p className="text-slate-600 mb-4">To run all tests or specific targets:</p>
        <CodeBlock language="bash" code={`# From the root directory:\ncd backend\n\n# Run all backend tests\nnpx dotenv-cli -e .env -- pnpm --filter worker exec vitest run\n\n# Run a specific test file\nnpx dotenv-cli -e .env -- pnpm --filter worker exec vitest run tests/claim.test.ts`} />
      </section>

      <section>
        <h2 id="unit-tests" className="text-2xl font-semibold text-slate-900 mb-4 pb-2 border-b border-[#E7E5E4]">2. Unit Tests</h2>
        <p className="text-slate-600 mb-6">Unit tests verify business logic without requiring database or network connections.</p>
        
        <h3 className="text-lg font-semibold text-slate-900 mb-2">Finite State Machine Guard (<code className="font-mono text-[#5B4FE8]">fsm.test.ts</code>)</h3>
        <ul className="list-disc pl-6 space-y-2 text-slate-600 mb-6">
          <li><strong>Purpose</strong>: Assures the strict state transition rules of jobs in the system.</li>
          <li><strong>Coverage</strong>:
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Allows valid transitions (e.g., <code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">queued</code> &rarr; <code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">claimed</code>, <code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">claimed</code> &rarr; <code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">running</code>, <code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">running</code> &rarr; <code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">completed</code>, <code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">dead_letter</code> &rarr; <code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">queued</code>).</li>
              <li>Blocks invalid transitions (e.g., <code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">queued</code> &rarr; <code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">completed</code>, <code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">completed</code> &rarr; <code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">failed</code>, <code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">dead_letter</code> &rarr; <code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">running</code>) throwing expected transition errors.</li>
              <li>Rejects unrecognized starting statuses.</li>
            </ul>
          </li>
        </ul>

        <h3 className="text-lg font-semibold text-slate-900 mb-2">Retry Delay Logic (<code className="font-mono text-[#5B4FE8]">retry.test.ts</code>)</h3>
        <ul className="list-disc pl-6 space-y-2 text-slate-600">
          <li><strong>Purpose</strong>: Validates backoff arithmetic rules for calculating retry intervals.</li>
          <li><strong>Coverage</strong>:
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li><code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">fixed</code>: Asserts fixed intervals.</li>
              <li><code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">linear</code>: Asserts linear delays scale correctly (<code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">baseDelayMs * attempt</code>).</li>
              <li><code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">exponential</code>: Asserts exponential delays double correctly (<code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">baseDelayMs * (2 ^ attempt)</code>).</li>
              <li><code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">maxDelayMs</code>: Confirms calculations are securely capped by the policy maximum.</li>
            </ul>
          </li>
        </ul>
      </section>

      <section>
        <h2 id="integration-and-concurrency-tests" className="text-2xl font-semibold text-slate-900 mb-4 pb-2 border-b border-[#E7E5E4]">3. Integration & Concurrency Tests</h2>
        <p className="text-slate-600 mb-6">Integration tests simulate real-world database interactions, execution cycles, and concurrent loads.</p>
        
        <h3 className="text-lg font-semibold text-slate-900 mb-2">Concurrency & Capacity Limits (<code className="font-mono text-[#5B4FE8]">claim.test.ts</code>)</h3>
        <ul className="list-disc pl-6 space-y-2 text-slate-600 mb-6">
          <li><strong>Purpose</strong>: Verifies that workers claim jobs atomically and respect queue concurrency boundaries.</li>
          <li><strong>Test Cases</strong>:
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li><strong>Atomic Claims</strong>: Proves that 5 workers running <code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">claimJobs</code> concurrently claim disjoint sets of 20 queued jobs without duplicates.</li>
              <li><strong>Queue Concurrency Limits</strong>: Confirms that if a queue has a concurrency limit of 5, and 10 workers try to claim 5 slots each concurrently, the total claimed jobs count equals exactly 5. This evaluates the atomic isolation safety of <code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">SERIALIZABLE</code> transactions.</li>
              <li><strong>Paused Queues</strong>: Asserts that workers claim exactly 0 jobs from queues flagged as <code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">paused</code>.</li>
              <li><strong>Multi-Queue Subscriptions</strong>: Confirms that workers can successfully claim across multiple subscribed queues.</li>
            </ul>
          </li>
        </ul>

        <h3 className="text-lg font-semibold text-slate-900 mb-2">Graceful Shutdown (<code className="font-mono text-[#5B4FE8]">graceful_shutdown.test.ts</code>)</h3>
        <ul className="list-disc pl-6 space-y-2 text-slate-600 mb-6">
          <li><strong>Purpose</strong>: Verifies that active jobs are drained when worker processes receive termination signals.</li>
          <li><strong>Coverage</strong>:
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Asserts worker status moves to <code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">draining</code> upon intercepting <code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">SIGTERM</code> or <code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">SIGINT</code> signals.</li>
              <li>Confirms active jobs are given time to complete before the worker client exits and sets status to <code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">offline</code>.</li>
            </ul>
          </li>
        </ul>

        <h3 className="text-lg font-semibold text-slate-900 mb-2">Job Lifecycle & Executions (<code className="font-mono text-[#5B4FE8]">lifecycle.test.ts</code>)</h3>
        <ul className="list-disc pl-6 space-y-2 text-slate-600 mb-6">
          <li><strong>Purpose</strong>: Asserts step transitions during database job execution loops.</li>
          <li><strong>Coverage</strong>:
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Tracks job status and execution states through queued &rarr; claimed &rarr; running &rarr; completed.</li>
              <li>Assures corresponding logs are appended to <code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">job_logs</code> and executions recorded in <code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">job_executions</code>.</li>
            </ul>
          </li>
        </ul>

        <h3 className="text-lg font-semibold text-slate-900 mb-2">DLQ & Execution Simulators (<code className="font-mono text-[#5B4FE8]">simulate.test.ts</code>, <code className="font-mono text-[#5B4FE8]">simulate_dlq.test.ts</code>)</h3>
        <ul className="list-disc pl-6 space-y-2 text-slate-600">
          <li><strong>Purpose</strong>: Simulates background job completion steps and automatic routing to the DLQ.</li>
          <li><strong>Coverage</strong>:
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Runs execution attempts and verifies backoff transitions.</li>
              <li>Confirms that terminal failed jobs exceeding max policy attempts are inserted into the <code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">dead_letter_queue</code> table with the original payload and exception.</li>
            </ul>
          </li>
        </ul>
      </section>
    </div>
  );
}
