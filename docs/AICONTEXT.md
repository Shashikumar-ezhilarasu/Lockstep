# AI Context & Trade-offs

This document is designed to help other AI agents quickly understand the architecture, constraints, and specific design decisions (trade-offs) of the **Lockstep** codebase. 

## Project Overview
Lockstep is a distributed job scheduler. It features an API for submitting jobs, a stateless Worker for processing jobs, and a Scheduler for retries/DLQ management. The frontend is a Next.js dashboard.

## 1. Concurrency & Locking Strategy
**Decision:** `FOR UPDATE SKIP LOCKED` instead of Advisory Locks.
- **Why?** We use Supabase (which uses Supavisor for connection pooling in transaction mode). Transaction-level connection poolers do not preserve session state across statements, making PostgreSQL Advisory Locks (which are session-bound) dangerous and unpredictable.
- **Trade-off:** Row-level locking requires the database to scan rows. `SKIP LOCKED` makes this highly efficient for queue tables, but requires a very specific query structure to avoid deadlocks.

**Decision:** `SERIALIZABLE` isolation for Global Concurrency Limits.
- **Why?** When enforcing a global limit (e.g., maximum 5 concurrent jobs of type X), we must prevent race conditions where multiple workers check the limit simultaneously.
- **Trade-off:** `SERIALIZABLE` can throw serialization anomalies (error `40001`). Workers must catch this error and gracefully back off or retry, rather than crashing.

## 2. Worker Architecture
**Decision:** Stateless Workers with Local Concurrency.
- **Why?** Workers are designed to be horizontally scalable. Each worker uses `p-limit` to handle internal concurrency.
- **Trade-off:** Workers do not coordinate with each other directly; they rely entirely on the database for coordination.

## 3. Scheduler Architecture
**Decision:** Singleton Scheduler.
- **Why?** Tasks like re-queueing stalled jobs or moving failed jobs to the Dead Letter Queue (DLQ) should only be done by one process to avoid duplicate work.
- **Trade-off:** In a multi-node environment, leader election is required. For the current deployment, it is multiplexed onto a single Render instance.

## 4. Deployment Constraints
**Decision:** Monolithic Deployment on Render.
- **Why?** For cost and simplicity, the API, Worker, and Scheduler are run together using `concurrently` on a single Render web service.
- **Trade-off:** They share the same CPU and memory pool. If the worker consumes too much memory, it can bring down the API.

## File References
- **Schema:** `backend/packages/db/src/schema.ts`
- **Claim Logic:** `backend/apps/worker/src/claim.ts`
- **Other Docs:** See `docs/ARCHITECTURE.md` and `DESIGN_DECISIONS.md`.
