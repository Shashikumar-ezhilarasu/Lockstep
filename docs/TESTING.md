# Testing Strategy & Execution

Lockstep uses Vitest to execute unit and integration test suites. The tests run against the database configuration defined in the active environment files.

---

## 1. Running the Test Suite

To run all tests or specific targets:

```bash
# From the root directory:
cd backend

# Run all backend tests
npx dotenv-cli -e .env -- pnpm --filter worker exec vitest run

# Run a specific test file
npx dotenv-cli -e .env -- pnpm --filter worker exec vitest run tests/claim.test.ts
```

---

## 2. Unit Tests

Unit tests verify business logic without requiring database or network connections.

### Finite State Machine Guard (`fsm.test.ts`)
* **Purpose**: Assures the strict state transition rules of jobs in the system.
* **Coverage**:
  * Allows valid transitions (e.g., `queued` -> `claimed`, `claimed` -> `running`, `running` -> `completed`, `dead_letter` -> `queued`).
  * Blocks invalid transitions (e.g., `queued` -> `completed`, `completed` -> `failed`, `dead_letter` -> `running`) throwing expected transition errors.
  * Rejects unrecognized starting statuses.

### Retry Delay Logic (`retry.test.ts`)
* **Purpose**: Validates backoff arithmetic rules for calculating retry intervals.
* **Coverage**:
  * `fixed`: Asserts fixed intervals.
  * `linear`: Asserts linear delays scale correctly (`baseDelayMs * attempt`).
  * `exponential`: Asserts exponential delays double correctly (`baseDelayMs * (2 ^ attempt)`).
  * `maxDelayMs`: Confirms calculations are securely capped by the policy maximum.

---

## 3. Integration & Concurrency Tests

Integration tests simulate real-world database interactions, execution cycles, and concurrent loads.

### Concurrency & Capacity Limits (`claim.test.ts`)
* **Purpose**: Verifies that workers claim jobs atomically and respect queue concurrency boundaries.
* **Test Cases**:
  * **Atomic Claims**: Proves that 5 workers running `claimJobs` concurrently claim disjoint sets of 20 queued jobs without duplicates.
  * **Queue Concurrency Limits**: Confirms that if a queue has a concurrency limit of 5, and 10 workers try to claim 5 slots each concurrently, the total claimed jobs count equals exactly 5. This evaluates the atomic isolation safety of `SERIALIZABLE` transactions.
  * **Paused Queues**: Asserts that workers claim exactly 0 jobs from queues flagged as `paused`.
  * **Multi-Queue Subscriptions**: Confirms that workers can successfully claim across multiple subscribed queues.

### Graceful Shutdown (`graceful_shutdown.test.ts`)
* **Purpose**: Verifies that active jobs are drained when worker processes receive termination signals.
* **Coverage**:
  * Asserts worker status moves to `draining` upon intercepting `SIGTERM` or `SIGINT` signals.
  * Confirms active jobs are given time to complete before the worker client exits and sets status to `offline`.

### Job Lifecycle & Executions (`lifecycle.test.ts`)
* **Purpose**: Asserts step transitions during database job execution loops.
* **Coverage**:
  * Tracks job status and execution states through queued -> claimed -> running -> completed.
  * Assures corresponding logs are appended to `job_logs` and executions recorded in `job_executions`.

### DLQ & Execution Simulators (`simulate.test.ts`, `simulate_dlq.test.ts`)
* **Purpose**: Simulates background job completion steps and automatic routing to the DLQ.
* **Coverage**:
  * Runs execution attempts and verifies backoff transitions.
  * Confirms that terminal failed jobs exceeding max policy attempts are inserted into the `dead_letter_queue` table with the original payload and exception.
