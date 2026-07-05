import CodeBlock from '@/components/CodeBlock';
import { Folder, FileCode2 } from 'lucide-react';

export default function BackendEngineeringPage() {
  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 mb-4">Backend Engineering Design</h1>
        <p className="text-lg text-slate-600">This document details the backend engineering architecture of the Lockstep job scheduler API and services.</p>
      </div>

      <section>
        <h2 id="rest-api-architecture" className="text-2xl font-semibold text-slate-900 mb-4 pb-2 border-b border-[#E7E5E4]">1. REST API Architecture (<code className="font-mono text-[#5B4FE8]">backend/apps/api</code>)</h2>
        <p className="text-slate-600 mb-6">The API layer is built using Fastify for high-throughput, low-overhead HTTP performance.</p>
        
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Project Layout</h3>
        <div className="bg-white border border-[#E7E5E4] rounded-xl p-6 shadow-sm font-mono text-sm">
          <div className="flex items-center gap-2 text-slate-700 mb-2 font-semibold">
            <Folder size={18} className="text-indigo-400" fill="currentColor" /> backend/apps/api/src/
          </div>
          <div className="ml-6 border-l-2 border-[#E7E5E4] pl-4 space-y-3 relative">
            <div className="flex items-center gap-2 group">
              <div className="absolute -left-4 w-4 border-b-2 border-[#E7E5E4] top-1/2"></div>
              <FileCode2 size={16} className="text-slate-400 group-hover:text-[#5B4FE8] transition-colors" />
              <span className="text-slate-900">index.ts</span>
              <span className="text-slate-400 ml-4 font-sans text-xs hidden md:inline">Server bootstrap, middleware, and mock auth routes</span>
            </div>
            <div className="flex items-center gap-2 group">
              <div className="absolute -left-4 w-4 border-b-2 border-[#E7E5E4] top-1/2"></div>
              <FileCode2 size={16} className="text-slate-400 group-hover:text-[#5B4FE8] transition-colors" />
              <span className="text-slate-900">db.ts</span>
              <span className="text-slate-400 ml-4 font-sans text-xs hidden md:inline">Drizzle connection configuration</span>
            </div>
            <div className="flex items-center gap-2 group">
              <div className="absolute -left-4 w-4 border-b-2 border-[#E7E5E4] top-1/2"></div>
              <FileCode2 size={16} className="text-slate-400 group-hover:text-[#5B4FE8] transition-colors" />
              <span className="text-slate-900">authz.ts</span>
              <span className="text-slate-400 ml-4 font-sans text-xs hidden md:inline">Multi-tenant resource access helper rules</span>
            </div>
            <div className="relative">
              <div className="flex items-center gap-2 text-slate-700 mb-2 font-semibold group">
                <div className="absolute -left-4 w-4 border-b-2 border-[#E7E5E4] top-1/2"></div>
                <Folder size={16} className="text-indigo-400" fill="currentColor" /> routes/
                <span className="text-slate-400 ml-4 font-sans text-xs hidden md:inline font-normal">Modular route groups</span>
              </div>
              <div className="ml-6 border-l-2 border-[#E7E5E4] pl-4 space-y-3 relative pb-2">
                <div className="flex items-center gap-2 group">
                  <div className="absolute -left-4 w-4 border-b-2 border-[#E7E5E4] top-1/2"></div>
                  <FileCode2 size={16} className="text-slate-400 group-hover:text-[#5B4FE8] transition-colors" />
                  <span className="text-slate-900">orgs.ts</span>
                  <span className="text-slate-400 ml-4 font-sans text-xs hidden md:inline">Organizations &amp; projects creation</span>
                </div>
                <div className="flex items-center gap-2 group">
                  <div className="absolute -left-4 w-4 border-b-2 border-[#E7E5E4] top-1/2"></div>
                  <FileCode2 size={16} className="text-slate-400 group-hover:text-[#5B4FE8] transition-colors" />
                  <span className="text-slate-900">queues.ts</span>
                  <span className="text-slate-400 ml-4 font-sans text-xs hidden md:inline">Queue configurations &amp; stats</span>
                </div>
                <div className="flex items-center gap-2 group">
                  <div className="absolute -left-4 w-4 border-b-2 border-[#E7E5E4] top-1/2"></div>
                  <FileCode2 size={16} className="text-slate-400 group-hover:text-[#5B4FE8] transition-colors" />
                  <span className="text-slate-900">jobs.ts</span>
                  <span className="text-slate-400 ml-4 font-sans text-xs hidden md:inline">Job dispatch, retry, and cancellation</span>
                </div>
                <div className="flex items-center gap-2 group">
                  <div className="absolute -left-4 w-4 border-b-2 border-[#E7E5E4] top-1/2"></div>
                  <FileCode2 size={16} className="text-slate-400 group-hover:text-[#5B4FE8] transition-colors" />
                  <span className="text-slate-900">metrics.ts</span>
                  <span className="text-slate-400 ml-4 font-sans text-xs hidden md:inline">Operational counters and statistics</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section>
        <h2 id="authentication-and-request-scoping" className="text-2xl font-semibold text-slate-900 mb-4 pb-2 border-b border-[#E7E5E4]">2. Authentication & Request Scoping</h2>
        
        <h3 className="text-lg font-semibold text-slate-900 mb-2 mt-6">JWT Signature Verification</h3>
        <p className="text-slate-600 mb-4">All requests except <code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">/auth/login</code> and <code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">/auth/register</code> undergo JWT extraction and validation.</p>
        <ul className="list-disc pl-6 space-y-2 text-slate-600 mb-6">
          <li><strong>Token Verification</strong>: Uses standard <code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">jsonwebtoken</code> signature checking verified against the environment secret (<code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">SUPABASE_JWT_SECRET</code>).</li>
          <li><strong>Sub Claim Extraction</strong>: On verification success, <code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">decoded.sub</code> (the user UUID) is attached to the decorated request object:
            <CodeBlock language="typescript" code={`app.decorateRequest('user', null);\n// Middleware decorator\nrequest.user = { id: decoded.sub };`} />
          </li>
        </ul>

        <h3 className="text-lg font-semibold text-slate-900 mb-2">Tenant Scoping Helpers (<code className="font-mono text-[#5B4FE8]">authz.ts</code>)</h3>
        <p className="text-slate-600 mb-4">We implement strict query-level validation to prevent Cross-Tenant Data Access (IDOR).</p>
        <ul className="list-disc pl-6 space-y-2 text-slate-600">
          <li><strong>Project Level</strong>: Checks if the calling user belongs to the project&apos;s organization:
            <CodeBlock language="typescript" code={`export async function checkProjectAccess(projectId: string, userId: string, requireRole?: 'admin' | 'owner') {\n  const [project] = await db.select({ orgId: schema.projects.orgId })\n    .from(schema.projects)\n    .where(eq(schema.projects.id, projectId));\n  if (!project) return false;\n\n  const [member] = await db.select({ role: schema.orgMembers.role })\n    .from(schema.orgMembers)\n    .where(and(\n      eq(schema.orgMembers.orgId, project.orgId),\n      eq(schema.orgMembers.userId, userId)\n    ));\n  // Validates matching roles (owner, admin, member)\n  ...\n}`} />
          </li>
          <li><strong>Queue Level</strong>: Resolves queue parent association to verify project/org membership.</li>
          <li><strong>Job Level</strong>: Resolves job parent queue and project associations to verify membership.</li>
        </ul>
      </section>

      <section>
        <h2 id="query-execution-with-drizzle-orm" className="text-2xl font-semibold text-slate-900 mb-4 pb-2 border-b border-[#E7E5E4]">3. Query Execution with Drizzle ORM</h2>
        <p className="text-slate-600 mb-6">The backend utilizes Drizzle ORM to build SQL queries with type safety.</p>
        
        <h3 className="text-lg font-semibold text-slate-900 mb-2">AST Parameterization</h3>
        <p className="text-slate-600 mb-6">All queries are parameterized out-of-the-box by Drizzle, preventing SQL injection vulnerabilities.</p>
        
        <h3 className="text-lg font-semibold text-slate-900 mb-2">Database Connection Management (<code className="font-mono text-[#5B4FE8]">db.ts</code>)</h3>
        <ul className="list-disc pl-6 space-y-2 text-slate-600">
          <li><strong>API Service</strong>: Connects via a PostgreSQL connection pool configured to target the transaction pooler or session-mode pooler based on the configured environment.</li>
          <li><strong>Worker &amp; Scheduler</strong>: Configured with a session-mode connection (<code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">ssl: 'require'</code>) to maintain dedicated process backend affinity.</li>
        </ul>
      </section>

      <section>
        <h2 id="input-validation-and-serialization" className="text-2xl font-semibold text-slate-900 mb-4 pb-2 border-b border-[#E7E5E4]">4. Input Validation & Serialization</h2>
        <p className="text-slate-600 mb-6">The API uses <strong>Zod</strong> to validate request payloads before hitting database executors.</p>
        
        <h3 className="text-lg font-semibold text-slate-900 mb-2">Example Validation Schema (<code className="font-mono text-[#5B4FE8]">CreateJobSchema</code>)</h3>
        <CodeBlock language="typescript" code={`const CreateJobSchema = z.object({\n  type: z.enum(['immediate', 'delayed', 'scheduled', 'batch']),\n  payload: z.any().optional(),\n  delay_ms: z.number().int().optional(),\n  scheduled_at: z.string().datetime().optional(),\n  priority: z.number().int().optional(),\n  idempotency_key: z.string().optional(),\n  items: z.array(z.object({ payload: z.any() })).optional(),\n});`} />
        
        <p className="text-slate-600 mt-4">Input parse failures trigger a <code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">ZodError</code> caught by Fastify handlers, returning standardized Zod error details to clients with HTTP <code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">400 Bad Request</code>.</p>
      </section>
    </div>
  );
}
