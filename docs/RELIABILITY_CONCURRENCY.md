# Reliability & Concurrency Architecture

This document describes the high-concurrency design, atomic claiming strategy, and system failure recovery mechanisms implemented in Lockstep.

---

## 1. Concurrency Control & Atomic Claiming

### Row Locking (`FOR UPDATE SKIP LOCKED`)
Distributed workers query the database for eligible jobs concurrently. To prevent race conditions, the claim selection SQL utilizes PostgreSQL row-level locks:
```sql
SELECT jobs.id FROM jobs
INNER JOIN queues ON jobs.queue_id = queues.id
WHERE jobs.queue_id = $1 AND queues.status = 'active'
ORDER BY jobs.priority DESC, jobs.scheduled_at ASC
FOR UPDATE OF jobs SKIP LOCKED
LIMIT $2
```
* **`FOR UPDATE`**: Locks the returned job rows, blocking other transaction writers.
* **`SKIP LOCKED`**: Concurrent workers skip these locked rows, selecting subsequent jobs. This ensures zero duplicate executions.

### Queue Capacity Enforcement (`SERIALIZABLE` Isolation)
Under transaction-mode connection poolers, traditional process locks fail due to missing connection affinity. Lockstep resolves this by executing the entire job selection and update logic under a `SERIALIZABLE` transaction isolation level:
1. **Capacity Read**: Counts jobs currently in `claimed` or `running` state.
2. **Limit Calculation**: Subtracts count from the queue's `concurrency_limit` to obtain remaining slots.
3. **Conflict Detection**: PostgreSQL automatically aborts transactions that conflict on the counted rows.
4. **Retry Loop**: Workers catch serialization failure codes (`40001`) and retry up to 5 times using a jittered delay (10–50ms) to reduce lock contention.

---

## 2. Failure Recovery & Heartbeats

### Worker Heartbeat Telemetry
Workers execute a background heartbeat interval loop (every 10 seconds):
* Writes heartbeats containing status (`idle`/`busy`), active job count, CPU percentage, and memory usage to the `worker_heartbeats` table.
* Updates the corresponding record in `workers`.

### Scheduler Crash Recovery Sweeper
If a worker crashes or shuts down abruptly:
* The scheduler daemon runs `recoverStaleWorkers()` every 10 seconds.
* Identifies workers whose last heartbeat is older than 30 seconds.
* Marks the worker's status as `offline`.
* Locates all `claimed` or `running` jobs owned by that worker.
* Fails their respective active `job_executions` (writing a system crash log) and transitions the jobs back to `queued`.

---

## 3. Resilience & Graceful Shutdowns

### Worker Promise Queue (`p-limit`)
Workers pull batches of jobs and limit concurrent executions in memory using `p-limit(CONCURRENCY)`. This protects worker memory bounds from overload.

### Signal Handling (Graceful Drain)
Workers handle `SIGINT` and `SIGTERM` signals for clean restarts:
1. Worker status is updated in the database to `draining`.
2. The polling loop flag `isShuttingDown` is set to `true`, preventing new job claims.
3. Allows currently running jobs up to 30 seconds to finish.
4. Updates the worker status to `offline` and exits safely.

### Retry Backoff & DLQ Quarantine
Upon handler exceptions:
* Delay is calculated according to the queue's retry strategy:
  * `fixed`: `base_delay`
  * `linear`: `base_delay * attempt`
  * `exponential`: `base_delay * (multiplier ^ attempt)`
* The job transitions to `scheduled` and is parked until the computed `scheduled_at` timestamp.
* If attempts reach `max_attempts`, the job transitions to `dead_letter` and details are moved to the `dead_letter_queue` table, freeing scheduler loops from failing tasks.
