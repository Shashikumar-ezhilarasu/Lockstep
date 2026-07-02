# Lockstep - Distributed Job Scheduling Platform

Lockstep is a scalable, distributed job scheduling and queue management platform. Built to support robust concurrency with a fleet of distributed workers, it uses PostgreSQL as the core source of truth and handles complex job lifecycles including immediate, delayed, recurring (cron-based), and batch processing.

---

## 🏗 System Architecture

Lockstep adopts a service-oriented architecture using a monorepo setup, separated into distinct specialized services:

1. **Frontend Dashboard (Next.js 14, React, Tailwind CSS)**
   - Provides a comprehensive UI to manage Organizations, Projects, Queues, and Jobs.
   - Monitors worker health, queue depths, and visualizes live job lifecycles.
   - Integrates with Supabase Auth for JWT-based secure access.

2. **Backend API (Fastify, Node.js, TypeScript)**
   - RESTful API server handling all HTTP traffic from the dashboard and external clients.
   - Bypasses RLS internally for direct database interactions using Drizzle ORM.
   - Implements strict input validation using Zod schemas.

3. **Job Worker (Node.js, TypeScript)**
   - Headless fleet workers that continuously poll for pending jobs.
   - Uses PostgreSQL `SELECT FOR UPDATE SKIP LOCKED` for atomic, race-condition-free job claiming.
   - Manages graceful shutdowns, pausing to allow in-flight jobs to complete.
   - Implements advanced retry strategies (fixed, linear, exponential backoff) with jitter.

4. **Scheduler Process (Node.js, TypeScript)**
   - A distinct background service responsible for evaluating cron expressions (`cron-parser`).
   - Polls the `scheduled_jobs` table, inserting actionable jobs into the `jobs` table precisely when they are due.

5. **Database Stack (Supabase Local Development)**
   - **PostgreSQL**: Source of truth, heavily utilizing JSONB for flexible job payloads and Postgres constraints.
   - **Supabase Auth**: Issues JWTs and manages user sessions.
   - **Realtime**: Pushes Postgres CDC (Change Data Capture) updates to the frontend for live UI updates.

---

## 🗄️ Database Schema & Features

The database schema is managed via **Drizzle ORM** combined with **Custom SQL Triggers**.

### Core Tables
- `organizations` & `projects`: Multi-tenant hierarchy for data isolation.
- `org_members`: Defines RBAC roles (owner, member) across organizations.
- `queues`: Contains queue-level configuration (priority, concurrency limits, status).
- `jobs`: The central transactional table representing individual tasks. Includes state transitions (`queued -> claimed -> running -> completed/failed`).
- `job_executions`: Append-only audit logs tracking every attempt a worker makes on a job.
- `retry_policies`: Configurable retry logic (fixed, linear, exponential) mapped to specific queues or jobs.
- `dead_letter_queue` (DLQ): Captures permanently failed jobs after all retry attempts are exhausted, allowing for manual inspection and requeuing.
- `scheduled_jobs`: Stores cron expressions and templates for recurring job execution.
- `workers` & `worker_heartbeats`: Tracks the active worker fleet, their capacity, and current health/load.

### Postgres Optimizations
- **Advanced Indexing**: Custom indexes like `idx_jobs_claim` heavily optimize the `SKIP LOCKED` polling queries, preventing seq-scans during high throughput.
- **Idempotency**: Unique constraints on `(queue_id, idempotency_key)` prevent accidental duplicate job creation.
- **Row Level Security (RLS)**: Enforced via `apply_custom_sql.js` to ensure the Next.js frontend can query data directly and securely via PostgREST without compromising multi-tenant boundaries.

---

## 🛠️ Work Completed So Far

### 1. Infrastructure & Environment
- Migrated to a robust Monorepo structure using `pnpm` workspaces (`apps/api`, `apps/worker`, `apps/scheduler`, `packages/db`).
- Successfully initialized and deployed the local Supabase Docker stack.
- Generated and pushed the full relational schema via Drizzle ORM.
- Applied complex custom SQL migrations containing Triggers and RLS policies natively to the Postgres database.

### 2. Backend API Implementation
- **Queue Management**: Created REST endpoints to create queues, update statuses, pause/resume queues, and query metrics.
- **Job Management**: Endpoints to push immediate, delayed, and batch jobs.
- **Recurring Jobs**: Implemented cron validation parsing and timezone awareness.
- **Dead Letter Queue (DLQ)**: Built specific endpoints to view DLQ entries and seamlessly requeue them back into the active pipeline.
- **Metrics**: Aggregation endpoints providing real-time snapshot data of queue depths, worker statuses, and 24h failure rates.
- **Authentication**: Integrated mock and Supabase-backed JWT verification seamlessly into Fastify lifecycle hooks.

### 3. Worker & Scheduler Services
- **Atomic Claiming**: Fully implemented Postgres `SKIP LOCKED` job claiming.
- **Retry Math**: Built and thoroughly tested retry interval calculators supporting Exponential Backoff with randomized jitter.
- **Execution Logging**: Integrated `job_executions` to track precise timestamps, durations, and outputs of individual worker runs.
- **Cron Poller**: Built a lightweight polling engine (`apps/scheduler`) that evaluates cron intervals and converts scheduled definitions into actionable jobs dynamically.
- **Graceful Shutdowns**: Implemented SIGTERM/SIGINT handlers on workers to ensure in-flight executions safely conclude.

### 4. Automated Testing
- Configured **Vitest** for the worker application.
- Authored test suites for:
  - `claim.test.ts`: Verifies atomic concurrency and ensures no two workers claim the exact same job under high load.
  - `lifecycle.test.ts`: Validates state transitions (`queued -> claimed -> running -> completed`).
  - `retry.test.ts`: Confirms fixed, linear, and exponential math (including jitter handling and max caps).
  - `graceful_shutdown.test.ts`: Architecture validations for lifecycle tear-downs.

---

## 🚀 Running the Project

1. **Clone the repo and install dependencies**
   ```bash
   git clone <repo-url>
   cd Lockstep
   pnpm install
   ```
2. **Configure Environment Variables**
   Populate `.env` (in the `backend` folder) and `.env.local` (in the `frontend` folder) with your hosted Supabase keys and database connection strings.

3. **Apply Schema and Policies to Hosted Database**
   ```bash
   cd backend/packages/db
   pnpm run db:push
   node apply_custom_sql.js
   ```
3. **Start the Fleet**
   From the root or `backend` folder, you can run the services concurrently:
   ```bash
   # Terminal 1: Fastify API
   cd backend && PORT=3001 pnpm --filter api run dev
   
   # Terminal 2: Job Worker
   cd backend && API_URL=http://localhost:3001 pnpm --filter worker run dev
   
   # Terminal 3: Cron Scheduler
   cd backend && pnpm --filter scheduler run dev
   
   # Terminal 4: Next.js Frontend
   cd frontend && pnpm run dev
   ```

---

## 🔜 Recommended Next Steps
- **Integration Test Environment**: Provide a reliable local Supabase/Postgres test database so the full worker integration suite can run without depending on hosted DNS availability.
- **Authorization Hardening**: Add resource-level org/project membership checks to every queue, job, metrics, and DLQ endpoint.
- **Operational Recovery**: Add a stale-worker sweeper that requeues jobs claimed by workers whose heartbeat has expired.
- **Dashboard Polish**: Add job log viewing, queue retry-policy editing, project switching, and richer loading/error states.
