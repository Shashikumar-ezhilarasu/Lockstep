import CodeBlock from '@/components/CodeBlock';

export default function GettingStartedPage() {
  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 mb-4">Installation & Local Setup Guide</h1>
        <p className="text-lg text-slate-600">Follow this guide to set up the Lockstep environment locally and deploy it to production.</p>
      </div>

      <section>
        <h2 id="prerequisites" className="text-2xl font-semibold text-slate-900 mb-4 pb-2 border-b border-[#E7E5E4]">Prerequisites</h2>
        <ul className="list-disc pl-6 space-y-2 text-slate-600">
          <li><strong>Node.js</strong>: Version 24+ (Render uses version <code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">24.14.1</code> by default).</li>
          <li><strong>pnpm</strong>: Fast, disk-space-efficient package manager (version <code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">9.0.0</code> or later is recommended).</li>
          <li><strong>PostgreSQL / Supabase Database</strong>: A PostgreSQL database is required.</li>
        </ul>
      </section>

      <section>
        <h2 id="environment-variables" className="text-2xl font-semibold text-slate-900 mb-4 pb-2 border-b border-[#E7E5E4]">Environment Variables Configuration</h2>
        <p className="text-slate-600 mb-6">The project is structured as a pnpm monorepo. Create the environment files inside their respective directories:</p>
        
        <h3 className="text-lg font-semibold text-slate-900 mb-3">Backend Environment Configuration (<code className="font-mono text-[#5B4FE8]">backend/.env</code>)</h3>
        <p className="text-slate-600 mb-2">Create <code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">backend/.env</code> with the following variables:</p>
        <CodeBlock language="env" code={`# Session-mode pooler connection (port 5432) is required by the worker process
# to support SERIALIZABLE isolation. Using transaction-mode poolers (port 6543)
# will cause transaction abort issues.
DATABASE_URL="postgresql://postgres.<project-ref>:password@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres"

# Supabase Auth configuration
SUPABASE_URL="https://<project-ref>.supabase.co"
SUPABASE_JWT_SECRET="your-supabase-jwt-secret-key-at-least-32-chars-long"
SUPABASE_PUBLISHABLE_KEY="your-supabase-publishable-key"
SUPABASE_SECRET_KEY="your-supabase-secret-key"
SUPABASE_JWKS_URL="https://<project-ref>.supabase.co/auth/v1/.well-known/jwks.json"

# API Port
PORT=3001`} />

        <h3 className="text-lg font-semibold text-slate-900 mb-3 mt-8">Frontend Environment Configuration (<code className="font-mono text-[#5B4FE8]">frontend/.env.local</code>)</h3>
        <p className="text-slate-600 mb-2">Create <code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">frontend/.env.local</code> containing:</p>
        <CodeBlock language="env" code={`NEXT_PUBLIC_API_URL="http://localhost:3001"
NEXT_PUBLIC_SUPABASE_URL="https://<project-ref>.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-supabase-publishable-anon-key"`} />
      </section>

      <section>
        <h2 id="database-schema-setup" className="text-2xl font-semibold text-slate-900 mb-4 pb-2 border-b border-[#E7E5E4]">Database Schema Setup</h2>
        <p className="text-slate-600 mb-4">Deploy the current schema migrations and custom triggers to your database instance:</p>
        <CodeBlock language="bash" code={`# From the root directory:
cd backend

# Apply schema definition
pnpm --filter db db:push

# Apply custom SQL triggers (Queue counters, RLS)
pnpm --filter db db:custom`} />
      </section>

      <section>
        <h2 id="running-locally" className="text-2xl font-semibold text-slate-900 mb-4 pb-2 border-b border-[#E7E5E4]">Running the Project Locally</h2>
        <p className="text-slate-600 mb-4">Run all backend services and the frontend dashboard using the workspace-wide scripts:</p>
        <CodeBlock language="bash" code={`# 1. Install dependencies from the root directory:
pnpm install

# 2. Run backend components:
# Start API (port 3001), Worker, and Scheduler concurrently
cd backend
pnpm run start:all

# 3. Run frontend dashboard (in a separate terminal):
cd frontend
pnpm run dev`} />
        <p className="text-slate-600 mt-4">The frontend dashboard will be available at <a href="http://localhost:3000" className="text-[#5B4FE8] hover:underline">http://localhost:3000</a> and the Fastify backend API at <a href="http://localhost:3001" className="text-[#5B4FE8] hover:underline">http://localhost:3001</a>.</p>
      </section>

      <section>
        <h2 id="deployment-guide" className="text-2xl font-semibold text-slate-900 mb-4 pb-2 border-b border-[#E7E5E4]">Deployment Guide</h2>
        
        <h3 className="text-lg font-semibold text-slate-900 mb-3">Frontend (Vercel)</h3>
        <ol className="list-decimal pl-6 space-y-2 text-slate-600 mb-8">
          <li>Link your repository to a Vercel project.</li>
          <li>Set the Root Directory parameter to <code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">frontend</code>.</li>
          <li>Add the required Environment Variables in Vercel:
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li><code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">NEXT_PUBLIC_API_URL</code> (points to your deployed backend URL)</li>
              <li><code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">NEXT_PUBLIC_SUPABASE_URL</code></li>
              <li><code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">NEXT_PUBLIC_SUPABASE_ANON_KEY</code></li>
            </ul>
          </li>
          <li>Deploy the project.</li>
        </ol>

        <h3 className="text-lg font-semibold text-slate-900 mb-3">Backend (Render)</h3>
        <p className="text-slate-600 mb-4">Backend is designed as a single deployment hosting all three runtime processes in the same instance via the <code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">concurrently</code> wrapper.</p>
        <ol className="list-decimal pl-6 space-y-4 text-slate-600">
          <li>Create a new <strong>Web Service</strong> on Render.</li>
          <li>Set Root Directory to <code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">backend</code>.</li>
          <li>Build Command:
            <CodeBlock language="bash" code={`pnpm install --no-frozen-lockfile`} />
          </li>
          <li>Start Command:
            <CodeBlock language="bash" code={`pnpm run start:all`} />
          </li>
          <li>Set the required environment variables in the Render Dashboard:
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li><code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">DATABASE_URL</code> (Use port <strong>5432</strong> to ensure connection session affinity for <code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">SERIALIZABLE</code> transactions)</li>
              <li><code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">SUPABASE_URL</code></li>
              <li><code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">SUPABASE_JWT_SECRET</code></li>
              <li><code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">SUPABASE_PUBLISHABLE_KEY</code></li>
              <li><code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">SUPABASE_SECRET_KEY</code></li>
              <li><code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">SUPABASE_JWKS_URL</code></li>
              <li><code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">PORT</code> (defaults to <code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">3001</code>)</li>
            </ul>
          </li>
        </ol>
      </section>
    </div>
  );
}
