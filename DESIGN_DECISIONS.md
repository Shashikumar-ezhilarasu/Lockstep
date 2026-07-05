# Architecture & Design Decisions

This document details the major architectural trade-offs, design decisions, and system constraints evaluated during the design and implementation of Lockstep.

---

## 1. Database-Centric Queue vs. Dedicated Message Brokers (Redis/RabbitMQ)

Lockstep uses PostgreSQL as its job queue ledger rather than a dedicated system like Redis (BullMQ) or RabbitMQ.

### Trade-offs:
* **Simplicity & ACID Consistency (Pros)**: Placing the queue in the relational database allows us to run job creation and state transitions inside the same transactions as primary business data. This guarantees transactional atomicity (e.g., a user account is created and a welcome email job is dispatched atomically, or both fail). It also eliminates the operational overhead of managing secondary cache or broker infrastructure.
* **MVCC Bloat & Scalability (Cons)**: PostgreSQL uses MVCC (Multi-Version Concurrency Control), meaning an `UPDATE` operation writes a new version of the row (dead tuple). At massive scale ($>10,000$ jobs/sec), this creates heavy disk write amplification and requires aggressive autovacuum tuning to prevent database bloat.

---

## 2. Polling vs. Pub/Sub (Event-Driven Execution)

We reverted the `LISTEN/NOTIFY` pub/sub implementation back to a pure polling loop (default `1s` interval).

### Trade-offs:
* **Stateless Scaling (Pros)**: Polling makes workers entirely stateless and decoupled from the database connection state. If a connection drops, the worker simply sleeps and retries on the next poll. It also works seamlessly across standard connection poolers without requiring persistent background listeners.
* **Database Query Overhead (Cons)**: 100 workers polling every second generates 100 queries/sec even when the queue is completely empty. Although indexed `SKIP LOCKED` queries are extremely fast, this introduces constant CPU overhead on the database compared to push-based pub/sub.

---

## 3. Concurrency Limits: SERIALIZABLE Isolation vs. Advisory Locks

We replaced `pg_advisory_xact_lock` with `SERIALIZABLE` transaction isolation inside `claimJobs`.

### Trade-offs:
* **Pooler Compatibility (Pros)**: Advisory locks require session-to-backend binding. Supabase's transaction-mode connection pooler (Supavisor) multiplexes statements across different backends, breaking advisory lock semantics and causing concurrency violations. `SERIALIZABLE` isolation relies on Postgres's native MVCC dependency tracking, which functions correctly regardless of connection pooling mode.
* **Rollback & Retry Overhead (Cons)**: Under extremely high concurrent contention, the serialization conflict rate (error `40001`) can increase non-linearly. Aborted transactions must be retried by the application client, which increases queue latency and database query metrics under heavy loads.

---

## 4. Scheduler Singleton vs. Distributed Leader Election

The scheduler service (`apps/scheduler`) is run as a single instance (singleton).

### Trade-offs:
* **Simple Scheduling (Pros)**: A singleton scheduler prevents double-dispatching races on cron intervals and delayed sweeper tasks without requiring distributed lock managers.
* **Single Point of Failure (Cons)**: If the scheduler container crashes, recurring cron jobs and delayed tasks will stop triggering, and crashed workers will not be recovered until the scheduler process is restarted. For production reliability, a leader election protocol (e.g. using database-level advisory leases) should be implemented to support active-passive scheduler groups.

---

## 5. Future Implementation: Queue Sharding

To support massive scale, queue sharding should be implemented using a hash-based partitioning strategy on the `queue_id` or `project_id`.

1. **Database Sharding**: The `jobs` and `job_executions` tables would be partitioned in Postgres (using native declarative partitioning) across multiple physical database instances. A coordinator node or connection router (like PgBouncer or Citus) would route queries based on the shard key.
2. **Worker Assignment**: Workers would be assigned to specific shards or hash ranges rather than globally polling all queues. When a worker starts, it claims a lease on a subset of the hash space.
3. **Listen/Notify**: The event-driven pub/sub mechanism would be isolated per shard, meaning a worker only listens to the Postgres instance hosting its assigned shard.
4. **Advisory Locks**: Advisory locks (used in `claim.ts` originally) are local to a single Postgres instance, so as long as all jobs for a queue live on the same physical shard, the concurrency limits and locking mechanism remain fully functional without distributed lock managers.

By sharding on `project_id`, we ensure all queues, jobs, and limits for a single tenant stay co-located on the same shard, avoiding cross-shard transactions while easily distributing load across many tenants.

## AI-Generated Dead Letter Queue Summaries
- **Status:** Re-implemented (previously reverted)
- **Context:** The system generates 1-2 sentence prose summaries using the Gemini API to explain why a job failed and what to do next.
- **Decision:** The API call is implemented as a strict fire-and-forget, non-blocking promise immediately after the DLQ database insert. It includes a hard 8-second timeout and robust error catching.
- **Why:** During an earlier iteration, the AI summary generation was inadvertently blocking the worker's main event loop and transaction path, leading to lock contention and queue stalls. By enforcing a fire-and-forget architecture with an initial `pending` database state, we guarantee that the core DLQ insert and job claiming logic are never impacted by AI generation failures, network timeouts, or missing API keys.
