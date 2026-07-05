# Lockstep: Distributed Job Scheduler

Lockstep is a Postgres-backed distributed job scheduler and task queue system built for multi-tenant SaaS environments. It is designed to demonstrate how a highly robust, scalable, and observable queueing system can be built purely on a relational database using `SKIP LOCKED` mechanics, eliminating the need for complex secondary infrastructure like Redis or RabbitMQ.

The objective of this project is to provide a fully transparent, highly observable control plane for background jobs, complete with strict tenant isolation, finite state machines, scheduled cron jobs, and a real-time reactive dashboard.

---

## Features

### Authentication & Organizations
- **Supabase Auth**: JWT-based session management.
- **Default Login**: Environment-gated quick login for development/demo purposes (`NEXT_PUBLIC_ENABLE_DEFAULT_LOGIN`).
- **Multi-tenant RBAC**: Strict logical isolation of resources by Organization and Project.
- **Tenant Validation**: Pre-handler middleware validates JWT ownership over requested resources.

### Queues
- **Logical Partitioning**: Infinite queues per project.
- **Concurrency Control**: Per-queue worker concurrency limits.
- **Pausable Execution**: Manually pause and resume queue dispatching instantly.

### Job Types
- **Immediate Jobs**: Fire-and-forget background execution.
- **Delayed Jobs**: Execute after `delay_ms`.
- **Scheduled Jobs**: Execute at an explicit future `timestamp`.
- *(Partially Implemented)* **Recurring/Cron**: Handled by the Scheduler, but lacks advanced overlap prevention if the previous run is still active.

### Worker System
- **Distributed Polling**: Stateless Node.js workers that scale horizontally.
- **Atomic Claims**: Pessimistic row locking ensures jobs are never executed twice.
- **Graceful Shutdown**: Intercepts `SIGINT/SIGTERM` to drain active jobs safely.
- **Heartbeats**: Emits liveness probes to detect silent crashes.

### Scheduler
- **Background Sweeper**: Wakes up delayed jobs and pushes them to the queue.
- **Crash Recovery**: Sweeps stale workers lacking heartbeats and requeues their orphaned jobs.
- *(Limitation)* **Singleton Design**: Assumes only one scheduler instance is running to avoid duplicate scheduling race conditions.

### Retry Engine
- **Configurable Strategies**: Fixed, Linear, and Exponential backoff.
- **History Retention**: Every attempt is recorded immutably in `job_executions`.

### Dead Letter Queue (DLQ)
- **Automatic routing**: Jobs exceeding max attempts transition to DLQ.
- **AI Failure Summaries**: Automatically generates actionable insights for job failures using the Gemini API without blocking the worker thread.
- **Manual Intervention**: Requeue or delete capabilities from the dashboard.

### Dashboard & Observability
- **Supabase Realtime**: Dashboard UI updates instantly without polling using Postgres CDC.
- **Job Lifecycle Visualizer**: See a job's exact state machine transitions.
- **Execution Logs**: Real-time chronological worker logs exposed in the UI.

### Metrics
- *(Partially Implemented)* **Basic Counters**: Aggregates total jobs, failed jobs, and active workers. Lacks advanced sliding-window throughput metrics (e.g., jobs/sec).

---

## Tech Stack

| Domain | Technology |
|---|---|
| **Backend API** | Fastify, Node.js, TypeScript |
| **Workers/Scheduler** | Node.js, TypeScript |
| **Frontend** | Next.js 14 (App Router), Tailwind CSS, Framer Motion |
| **Database** | PostgreSQL |
| **Authentication** | Supabase Auth (GoTrue) |
| **Real-time** | Supabase Realtime (WebSockets + pg_net) |
| **ORM** | Drizzle ORM |
| **Testing** | Vitest |

---

## Architecture

```mermaid
graph TD
    Client[Web Browser / Dashboard] -->|HTTP / REST| API[Fastify API]
    Client -->|WebSockets CDC| DB[(Supabase PostgreSQL)]
    
    API -->|TCP SQL| DB
    
    subgraph Lockstep Data Plane
        W1[Worker 1] -->|Polls & Claims| DB
        W2[Worker N] -->|Polls & Claims| DB
        Sch[Singleton Scheduler] -->|Sweeps & Wakes| DB
    end
    
    style DB fill:#336791,stroke:#fff,stroke-width:2px,color:#fff
```

### Components
- **Frontend**: A Next.js 14 SSR app that consumes the Fastify API for control actions and listens directly to Supabase WebSockets for real-time reactivity.
- **API**: A Fastify REST server enforcing JWT authentication and RBAC before mutating Postgres.
- **Workers**: Decentralized, stateless Node.js processes pulling work from Postgres.
- **Scheduler**: A background singleton that calculates cron intervals and recovers crashed workers.
- **Database**: The source of truth and distributed synchronization mechanism.

---

## Project Structure

```text
Lockstep/
├── backend/
│   ├── apps/
│   │   ├── api/          # Fastify REST endpoints and Auth middleware
│   │   ├── scheduler/    # Singleton cron trigger and crash recovery sweeper
│   │   └── worker/       # Execution engine, SKIP LOCKED polling loop
│   ├── packages/
│   │   └── db/           # Drizzle ORM schemas and shared database client
│   └── .env              # Backend secrets and DATABASE_URL
├── frontend/             # Next.js 14 Dashboard
│   ├── src/
│   │   ├── app/          # App Router pages (Jobs, Queues, DLQ)
│   │   ├── components/   # React components (Lifecycle Diagrams, etc)
│   │   └── lib/          # API client and Supabase realtime client
└── package.json          # Root PNPM Workspace config
```

---

## System Design

- **Organizations & Projects**: Tenants are logically grouped. An Organization contains Projects. Projects contain Queues. Workers optionally bind to specific Projects.
- **Queues**: A queue is a physical isolation boundary. It holds settings like `concurrency_limit` and `default_retry_policy`.
- **Jobs**: Represents a unit of work. Transitions through a strict finite state machine.
- **Executions & Logs**: Separated from the `jobs` table to allow a 1:N relationship. A job runs multiple times (Executions), and each execution emits multiple Logs.

---

## Job Lifecycle

```mermaid
stateDiagram-v2
    [*] --> Queued : Immediate
    [*] --> Scheduled : Delayed/Cron
    
    Scheduled --> Queued : Scheduler Sweeps
    
    Queued --> Claimed : Worker Locks Row
    Claimed --> Running : Execution Starts
    
    Running --> Completed : Handler Succeeds
    Running --> Scheduled : Handler Fails (Retry Allowed)
    Running --> Dead_Letter : Handler Fails (Max Retries)
    Running --> Queued : Worker Crashes (Recovered)
    
    Queued --> Cancelled : API Action
    Scheduled --> Cancelled : API Action
    
    Completed --> [*]
    Dead_Letter --> [*]
    Cancelled --> [*]
```

---

## Worker Lifecycle

```mermaid
sequenceDiagram
    participant OS as OS / Docker
    participant W as Worker Process
    participant DB as Postgres

    OS->>W: Start Process
    W->>DB: Insert into `workers` (idle)
    
    loop Heartbeat (Every 10s)
        W->>DB: Update `worker_heartbeats`
    end
    
    loop Polling (Every 1s)
        W->>DB: SELECT FOR UPDATE SKIP LOCKED
        alt Jobs Found
            DB-->>W: Returns Row Locks (Claimed)
            W->>DB: Update Job `status=running`, Insert Execution
            W->>W: Execute Payload
            alt Success
                W->>DB: Update `status=completed`
            else Failure
                W->>DB: Update `status=scheduled` or `dead_letter`
            end
        else No Jobs
            DB-->>W: Returns empty
            W->>W: Sleep
        end
    end
    
    OS->>W: SIGTERM
    W->>W: isShuttingDown = true (Stops polling)
    W->>W: Await active promises (Max 30s)
    W->>DB: Update `workers` (offline)
    W->>OS: process.exit(0)
```

---

## Queue Design

Queues are physical tables representing work boundaries. 
- **Concurrency**: A queue restricts the absolute number of actively `running` jobs globally across all distributed workers.
- **Priority**: Handled at the queue level by `ORDER BY priority DESC` during worker polling.
- **Pausing**: Flipping `status = 'paused'` instantly causes workers to ignore the queue because the `WHERE` clause filters it out natively at the DB level.

---

## Job Claiming Algorithm

The worker polling loop operates by attempting to claim $N$ jobs, where $N$ is the min available slots based on the worker's internal capacity and the queue's global concurrency limit.

### The Implementation
```sql
WITH queue_capacity AS (
  SELECT GREATEST(
    queues.concurrency_limit - (
      SELECT COUNT(*) FROM jobs WHERE queue_id = $1 AND status IN ('claimed', 'running')
    ), 0
  ) AS remaining FROM queues WHERE id = $1
),
claimable AS (
  SELECT jobs.id FROM jobs
  INNER JOIN queues ON jobs.queue_id = queues.id
  WHERE jobs.queue_id = $1 AND queues.status = 'active'
    AND (jobs.status = 'queued' OR jobs.status = 'scheduled')
    AND jobs.scheduled_at <= now()
  ORDER BY jobs.priority DESC, jobs.scheduled_at ASC
  FOR UPDATE OF jobs SKIP LOCKED
  LIMIT LEAST($2, COALESCE((SELECT remaining FROM queue_capacity), 0))
)
UPDATE jobs SET status = 'claimed', claimed_by = $3, attempt = attempt + 1
FROM claimable WHERE jobs.id = claimable.id RETURNING jobs.*;
```

### Explanation & Known Limitations
- **SKIP LOCKED**: Postgres evaluates the index, places a write lock on matching rows, and if another worker already holds a lock on Row 1, the engine silently bypasses it and locks Row 2. This guarantees zero duplicate execution.
- **Concurrency Race Fix**: The `queue_capacity` CTE is protected by a Postgres transaction-level advisory lock (`pg_advisory_xact_lock`), ensuring capacity counts are serialized per-queue without locking the actual `queues` table (which would block all other operations). *Note: Advisory lock keys are hashed queue IDs; collision probability is negligible at expected scale, alternative is `pg_advisory_xact_lock(key1, key2)` two-int form for full 64-bit space.*

---

## Retry Engine

When a worker catches a handler error, it calculates the next backoff:
- **Fixed**: `delay = baseDelay`
- **Linear**: `delay = baseDelay * attempt`
- **Exponential**: `delay = baseDelay * (2 ^ attempt)`

The job `status` is transitioned to `scheduled`, allowing the worker to immediately free memory. The Scheduler will wake it up when the delay passes.

---

## Scheduler

A singleton background Node.js process with two responsibilities:
1. **Cron Ticks**: Scans `scheduled_jobs` parsing cron strings, inserts concrete jobs into the `jobs` table when due, and updates `next_run_at`.
2. **Delayed Execution**: Checks if `jobs.scheduled_at <= now()` and transitions them to `queued`.

**Limitation**: The scheduler lacks a distributed lock. Running 2 instances of the Scheduler simultaneously will cause race conditions resulting in duplicate job dispatching.

---

## Worker Recovery

Workers emit heartbeats every 10 seconds. If a worker is `SIGKILL`'d (OOM, hard crash), its active jobs remain stuck as `running`.
- The Scheduler periodically runs `recoverStaleWorkers()`.
- It finds workers whose last heartbeat is >30s ago.
- It finds all `running` jobs owned by that worker.
- It fails the `job_executions` record with a system log, and transitions the job back to `queued`.

---

## Dead Letter Queue

Jobs transition to `dead_letter` locally in the worker memory if `attempt >= retryPolicy.maxAttempts`. The worker inserts the raw payload and failure exception into the `dead_letter_queue` table. These jobs sit idle until manual dashboard intervention (Requeue or Delete).

---

## Database Design

### ER Diagram
```mermaid
erDiagram
    ORGANIZATIONS ||--o{ PROJECTS : owns
    PROJECTS ||--o{ QUEUES : contains
    PROJECTS ||--o{ WORKERS : authorized_for
    QUEUES ||--o{ RETRY_POLICIES : configures
    QUEUES ||--o{ JOBS : holds
    JOBS ||--o{ JOB_EXECUTIONS : attempts
    JOB_EXECUTIONS ||--o{ JOB_LOGS : emits
    JOBS ||--o| DEAD_LETTER_QUEUE : transitions_to
```

- **jobs**: Central state machine. Denormalized `queue_id` ensures index-only scans for high-speed worker polling.
- **Constraints**: Circular dependencies (e.g., jobs having a parent job, queues having a default retry policy) are managed via `ON DELETE SET NULL` to prevent cascade deadlocks.

---

## API Documentation

The REST API is built with Fastify. All endpoints expect `Authorization: Bearer <JWT>`.

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/metrics` | Returns total jobs, failed jobs, active workers for the tenant. |
| `GET` | `/orgs` | Lists organizations the JWT belongs to. |
| `POST` | `/queues/:id/jobs` | Enqueues a job. `{ "payload": {}, "delay_ms": 5000 }` |
| `POST` | `/queues/:id/pause` | Instantly pauses a queue. |
| `POST` | `/jobs/:id/cancel` | Terminates a `queued` or `scheduled` job. |
| `POST` | `/jobs/:id/retry` | Resets a `failed` job back to `queued` with attempt 0. |

---

## Authentication & Authorization

- **Supabase GoTrue**: Issues standard JWTs.
- **Middleware**: Fastify `preHandler` decodes the JWT, extracts `user.id`, and queries `org_members`.
- **Tenant Isolation**: Every API endpoint (e.g., Cancel Job) explicitly joins the `jobs` table up to `projects` and `org_members` to verify the authenticated user has access to the requested resource ID.

---

## Frontend

Built with Next.js 14 and Tailwind CSS.
- **Queue Explorer**: Create queues, configure concurrency, toggle active/paused states.
- **Job Explorer**: Deep dive into job telemetry. Features chronological log viewer, interactive retry/cancel actions, and status filters.
- **DLQ Dashboard**: Inspect dead letter failures and bulk requeue.

---

## Real-time Updates

Supabase Realtime provides WebSockets broadcasting Postgres CDC (Change Data Capture) WAL events.

```mermaid
sequenceDiagram
    Worker->>Postgres: UPDATE jobs SET status = 'completed'
    Postgres-->>Supabase Realtime: Logical Replication (WAL)
    Supabase Realtime-->>Frontend (Browser): WebSocket Message (payload)
    Frontend (Browser)->>Frontend (Browser): React re-renders Job Table
```
Because of this, the frontend never needs to aggressively poll the API. The UI is perfectly synchronized with backend reality automatically.

---

## Metrics

Currently implemented metrics are extremely basic `COUNT(*)` aggregates over the tenant's namespace.
**Limitation**: Real-time throughput (Jobs/Sec) and p99 latency are missing. At scale, `COUNT(*)` over a massive `jobs` table triggers sequential scans. Advanced metrics would require integrating Prometheus/Grafana or utilizing specialized materialized views.

---

## Security

- **JWT Validation**: Enforced globally.
- **SQL Injection**: Prevented securely by Drizzle ORM's parameterized AST queries.
- **RBAC**: Multi-tenant visibility enforced at the query level.
- **Rate Limiting**: Missing. API is vulnerable to volumetric DDoS if exposed publicly without an API Gateway.

---

## Testing

Uses Vitest for robust verification.
- **Unit**: FSM transitions, Retry backoff math.
- **Integration**: Simulates actual queue insertion and worker execution against a local Postgres container.
- **Worker Crash Tests**: `sigterm_test.ts` proves that `process.kill('SIGKILL')` triggers the Scheduler's stale worker recovery successfully.

---

## Scalability & Known Limitations

**We explicitly acknowledge the following production limitations:**

1. **Scheduler High Availability**: The scheduler is a Singleton. Running >1 instance will duplicate cron jobs.
3. **At-Least-Once Execution**: If a worker crashes *after* execution but *before* committing the DB transaction, the job will be recovered and executed again. Handlers *must* be idempotent.
4. **Postgres MVCC Bloat**: The `jobs` table undergoes heavy `UPDATE` mutations (`queued -> claimed -> running -> completed`). At >1M jobs/day, this will generate massive dead tuples. **Aggressive `autovacuum` tuning and Table Partitioning by `status` is required for enterprise scale.**
5. **Heartbeat Table Growth**: Worker heartbeats write continuously. Needs an archival or TTL cron strategy to prevent unbounded growth.

---

## Deployment

1. **Environment Variables**:
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/postgres"
GEMINI_API_KEY="your-gemini-api-key"
NEXT_PUBLIC_API_URL="http://localhost:3001"
NEXT_PUBLIC_SUPABASE_URL="..."
NEXT_PUBLIC_SUPABASE_ANON_KEY="..."
NEXT_PUBLIC_ENABLE_DEFAULT_LOGIN="true"
```

2. **Run Services**:
```bash
# Database Setup
pnpm --filter db db:push

# Backend
pnpm --filter api dev
pnpm --filter worker dev
pnpm --filter scheduler dev

# Frontend
pnpm --filter dashboard dev
```

---

## License
MIT License.
