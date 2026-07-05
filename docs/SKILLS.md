# Technical Skills & Stack

This document outlines the core technologies and skills required to work on the **Lockstep** project.

## 1. Backend Engineering
- **TypeScript / Node.js**: The entire backend is written in TypeScript.
- **Fastify**: Used as the high-performance web framework for the API tier.
- **Drizzle ORM**: Used for type-safe database interactions and schema migrations.
- **PostgreSQL**: The core relational database used for job storage and locking.
- **Supabase**: Provides the managed Postgres instance and connection pooling (Supavisor).

## 2. Distributed Systems & Concurrency
- **Concurrency Control**: Implementing queue operations using PostgreSQL's `FOR UPDATE SKIP LOCKED` for reliable, high-throughput job claiming without deadlocks.
- **Isolation Levels**: Understanding `SERIALIZABLE` isolation for managing global limits safely.
- **Leader Election**: Recognizing the need for singleton schedulers and managing node failure scenarios.

## 3. Frontend Development
- **Next.js (App Router)**: React framework for the dashboard application.
- **Tailwind CSS**: Utility-first CSS framework for styling.
- **React Query**: Used for data fetching, caching, and state management.
- **Framer Motion**: Used for fluid animations and page transitions.
- **Recharts**: For rendering metrics and system throughput charts.

## 4. DevOps & Deployment
- **Render**: The platform used to deploy the backend services using multiplexing (`concurrently`) for the API, Worker, and Scheduler.
- **Vercel**: The platform used to host the frontend dashboard.
- **Monorepo Management**: Structuring workspaces for shared code (`packages/db`) across apps.
