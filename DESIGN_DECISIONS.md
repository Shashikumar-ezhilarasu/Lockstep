# Architecture & Design Decisions

## Queue Sharding (Future Implementation)

To support massive scale, queue sharding should be implemented using a hash-based partitioning strategy on the `queue_id` or `project_id`.

1. **Database Sharding**: The `jobs` and `job_executions` tables would be partitioned in Postgres (using native declarative partitioning) across multiple physical database instances. A coordinator node or connection router (like PgBouncer or Citus) would route queries based on the shard key.
2. **Worker Assignment**: Workers would be assigned to specific shards or hash ranges rather than globally polling all queues. When a worker starts, it claims a lease on a subset of the hash space.
3. **Listen/Notify**: The event-driven pub/sub mechanism would be isolated per shard, meaning a worker only listens to the Postgres instance hosting its assigned shard.
4. **Advisory Locks**: Advisory locks (used in `claim.ts`) are local to a single Postgres instance, so as long as all jobs for a queue live on the same physical shard, the concurrency limits and locking mechanism remain fully functional without distributed lock managers.

   Update: The original pg_advisory_xact_lock approach was found to be incompatible with Supabase's transaction-mode connection pooler (Supavisor, port 6543) — advisory locks require backend connection affinity that transaction pooling doesn't guarantee, causing intermittent concurrency-limit violations under load. Replaced with SERIALIZABLE transaction isolation, which detects the same class of conflict via PostgreSQL's native MVCC conflict detection (error 40001) rather than relying on session state, making it compatible with transaction-mode pooling. Retries on conflict up to 5 attempts with randomized backoff; verified correct across 10 consecutive runs at 10-concurrent-worker load. Not stress-tested at higher concurrency — SERIALIZABLE conflict rates can increase non-linearly under heavier contention than advisory locks, which is a known trade-off versus the original approach and a candidate for load testing before scaling worker count significantly beyond what's tested here.
