# Installation & Local Setup Guide

Follow this guide to set up the Lockstep environment locally and deploy it to production.

---

## 1. Prerequisites
* **Node.js**: Version 24+ (Render uses version `24.14.1` by default).
* **pnpm**: Fast, disk-space-efficient package manager (version `9.0.0` or later is recommended).
* **PostgreSQL / Supabase Database**: A PostgreSQL database is required.

---

## 2. Environment Variables Configuration

The project is structured as a pnpm monorepo. Create the environment files inside their respective directories:

### Backend Environment Configuration (`backend/.env`)
Create `backend/.env` with the following variables:
```env
# Session-mode pooler connection (port 5432) is required by the worker process
# to support SERIALIZABLE isolation. Using transaction-mode poolers (port 6543)
# will cause transaction abort issues.
DATABASE_URL="postgresql://postgres.xhaatqmfvirajddgzdkp:password@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres"

# Supabase Auth configuration
SUPABASE_URL="https://xhaatqmfvirajddgzdkp.supabase.co"
SUPABASE_JWT_SECRET="your-supabase-jwt-secret-key-at-least-32-chars-long"
SUPABASE_PUBLISHABLE_KEY="your-supabase-publishable-key"
SUPABASE_SECRET_KEY="your-supabase-secret-key"
SUPABASE_JWKS_URL="https://xhaatqmfvirajddgzdkp.supabase.co/auth/v1/.well-known/jwks.json"

# API Port
PORT=3001
```

### Frontend Environment Configuration (`frontend/.env.local`)
Create `frontend/.env.local` containing:
```env
NEXT_PUBLIC_API_URL="http://localhost:3001"
NEXT_PUBLIC_SUPABASE_URL="https://xhaatqmfvirajddgzdkp.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-supabase-publishable-anon-key"
```

---

## 3. Database Schema Setup

Deploy the current schema migrations and custom triggers to your database instance:

```bash
# From the root directory:
cd backend

# Apply schema definition
pnpm --filter db db:push

# Apply custom SQL triggers (Queue counters, RLS)
pnpm --filter db db:custom
```

---

## 4. Running the Project Locally

Run all backend services and the frontend dashboard using the workspace-wide scripts:

```bash
# 1. Install dependencies from the root directory:
pnpm install

# 2. Run backend components:
# Start API (port 3001), Worker, and Scheduler concurrently
cd backend
pnpm run start:all

# 3. Run frontend dashboard (in a separate terminal):
cd frontend
pnpm run dev
```

The frontend dashboard will be available at [http://localhost:3000](http://localhost:3000) and the Fastify backend API at [http://localhost:3001](http://localhost:3001).

---

## 5. Deployment Guide

### Frontend (Vercel)
1. Link your repository to a Vercel project.
2. Set the Root Directory parameter to `frontend`.
3. Add the required Environment Variables in Vercel:
   * `NEXT_PUBLIC_API_URL` (points to your deployed backend URL)
   * `NEXT_PUBLIC_SUPABASE_URL`
   * `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy the project.

### Backend (Render)
Backend is designed as a single deployment hosting all three runtime processes in the same instance via the `concurrently` wrapper.
1. Create a new **Web Service** on Render.
2. Set Root Directory to `backend`.
3. Build Command:
   ```bash
   pnpm install --no-frozen-lockfile
   ```
4. Start Command:
   ```bash
   pnpm run start:all
   ```
5. Set the required environment variables in the Render Dashboard:
   * `DATABASE_URL` (Use port **5432** to ensure connection session affinity for `SERIALIZABLE` transactions)
   * `SUPABASE_URL`
   * `SUPABASE_JWT_SECRET`
   * `SUPABASE_PUBLISHABLE_KEY`
   * `SUPABASE_SECRET_KEY`
   * `SUPABASE_JWKS_URL`
   * `PORT` (defaults to `3001`)
