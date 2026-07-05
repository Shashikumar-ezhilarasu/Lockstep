import MermaidDiagram from '@/components/MermaidDiagram';
import CodeBlock from '@/components/CodeBlock';

const erDiagramChart = `
erDiagram
    ORGANIZATIONS ||--o{ ORG_MEMBERS : has
    ORGANIZATIONS ||--o{ PROJECTS : owns
    PROJECTS ||--o{ QUEUES : contains
    PROJECTS ||--o{ WORKERS : runs
    QUEUES ||--o{ RETRY_POLICIES : configures
    QUEUES ||--o{ JOBS : holds
    JOBS ||--o{ JOB_EXECUTIONS : records
    JOB_EXECUTIONS ||--o{ JOB_LOGS : emits
    JOBS ||--o| DEAD_LETTER_QUEUE : fails_into
    QUEUES ||--o{ SCHEDULED_JOBS : schedules
    WORKERS ||--o{ WORKER_HEARTBEATS : sends
    JOBS ||--o{ JOB_DEPENDENCIES : requires
`;

const triggerSql = `CREATE OR REPLACE FUNCTION update_queue_counters()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE queues SET total_jobs = total_jobs + 1 WHERE id = NEW.queue_id;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      IF NEW.status = 'completed' THEN
        UPDATE queues SET completed_jobs = completed_jobs + 1 WHERE id = NEW.queue_id;
      ELSIF NEW.status = 'failed' OR NEW.status = 'dead_letter' THEN
        IF OLD.status != 'failed' AND OLD.status != 'dead_letter' THEN
          UPDATE queues SET failed_jobs = failed_jobs + 1 WHERE id = NEW.queue_id;
        END IF;
      END IF;
      
      IF OLD.status = 'completed' AND NEW.status != 'completed' THEN
         UPDATE queues SET completed_jobs = completed_jobs - 1 WHERE id = NEW.queue_id;
      END IF;
      
      IF (OLD.status = 'failed' OR OLD.status = 'dead_letter') AND (NEW.status != 'failed' AND NEW.status != 'dead_letter') THEN
         UPDATE queues SET failed_jobs = failed_jobs - 1 WHERE id = NEW.queue_id;
      END IF;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE queues SET total_jobs = total_jobs - 1 WHERE id = OLD.queue_id;
    IF OLD.status = 'completed' THEN
      UPDATE queues SET completed_jobs = completed_jobs - 1 WHERE id = OLD.queue_id;
    ELSIF OLD.status = 'failed' OR OLD.status = 'dead_letter' THEN
      UPDATE queues SET failed_jobs = failed_jobs - 1 WHERE id = OLD.queue_id;
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_queue_counters
AFTER INSERT OR UPDATE OR DELETE ON jobs
FOR EACH ROW
EXECUTE FUNCTION update_queue_counters();`;

export default function DatabaseSchemaPage() {
  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 mb-4">Database Schema & Triggers</h1>
        <p className="text-lg text-slate-600">The database is built on PostgreSQL and mapped using Drizzle ORM.</p>
      </div>

      <section>
        <h2 id="entity-relationship-diagram" className="text-2xl font-semibold text-slate-900 mb-4 pb-2 border-b border-[#E7E5E4]">Entity-Relationship (ER) Diagram</h2>
        <MermaidDiagram chart={erDiagramChart} />
      </section>

      <section>
        <h2 id="postgres-enums" className="text-2xl font-semibold text-slate-900 mb-4 pb-2 border-b border-[#E7E5E4]">Postgres Enums</h2>
        <ol className="list-decimal pl-6 space-y-2 text-slate-600">
          <li><strong><code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">queue_status</code></strong>: <code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">active</code>, <code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">paused</code></li>
          <li><strong><code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">retry_strategy</code></strong>: <code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">fixed</code>, <code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">linear</code>, <code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">exponential</code></li>
          <li><strong><code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">job_type</code></strong>: <code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">immediate</code>, <code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">delayed</code>, <code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">scheduled</code>, <code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">recurring</code>, <code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">batch</code></li>
          <li><strong><code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">job_status</code></strong>: <code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">queued</code>, <code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">scheduled</code>, <code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">claimed</code>, <code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">running</code>, <code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">completed</code>, <code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">failed</code>, <code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">dead_letter</code>, <code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">cancelled</code></li>
          <li><strong><code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">worker_status</code></strong>: <code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">idle</code>, <code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">busy</code>, <code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">draining</code>, <code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">offline</code></li>
          <li><strong><code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">execution_status</code></strong>: <code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">started</code>, <code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">completed</code>, <code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">failed</code></li>
          <li><strong><code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">log_level</code></strong>: <code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">info</code>, <code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">warn</code>, <code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">error</code></li>
        </ol>
      </section>

      <section>
        <h2 id="tables" className="text-2xl font-semibold text-slate-900 mb-4 pb-2 border-b border-[#E7E5E4]">Tables</h2>
        <div className="space-y-8">
          
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">1. <code className="font-mono text-[#5B4FE8]">organizations</code></h3>
            <p className="text-slate-600 mb-2">Central tenant scope.</p>
            <ul className="list-disc pl-6 space-y-1 text-slate-600">
              <li><code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">id</code> (<code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">uuid</code>, Primary Key)</li>
              <li><code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">name</code> (<code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">text</code>, Not Null)</li>
              <li><code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">created_at</code> (<code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">timestamp with time zone</code>)</li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">2. <code className="font-mono text-[#5B4FE8]">org_members</code></h3>
            <p className="text-slate-600 mb-2">Maps users to organizations.</p>
            <ul className="list-disc pl-6 space-y-1 text-slate-600">
              <li><code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">org_id</code> (<code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">uuid</code>, Foreign Key)</li>
              <li><code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">user_id</code> (<code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">uuid</code>)</li>
              <li><code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">role</code> (<code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">text</code>)</li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">3. <code className="font-mono text-[#5B4FE8]">projects</code></h3>
            <p className="text-slate-600 mb-2">Organizational grouping for queues.</p>
            <ul className="list-disc pl-6 space-y-1 text-slate-600">
              <li><code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">id</code> (<code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">uuid</code>, Primary Key)</li>
              <li><code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">org_id</code> (<code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">uuid</code>, Foreign Key)</li>
              <li><code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">name</code> (<code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">text</code>, Not Null)</li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">4. <code className="font-mono text-[#5B4FE8]">queues</code></h3>
            <p className="text-slate-600 mb-2">Execution boundaries containing scheduling preferences.</p>
            <ul className="list-disc pl-6 space-y-1 text-slate-600">
              <li><code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">id</code> (<code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">uuid</code>, Primary Key)</li>
              <li><code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">concurrency_limit</code> (<code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">integer</code>)</li>
              <li><code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">status</code> (<code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">queue_status</code>)</li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">5. <code className="font-mono text-[#5B4FE8]">jobs</code></h3>
            <p className="text-slate-600 mb-2">Operational state machine tasks.</p>
            <ul className="list-disc pl-6 space-y-1 text-slate-600">
              <li><code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">id</code> (<code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">uuid</code>, Primary Key)</li>
              <li><code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">status</code> (<code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">job_status</code>)</li>
              <li><code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">payload</code> (<code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">jsonb</code>)</li>
            </ul>
          </div>
        </div>
      </section>

      <section>
        <h2 id="custom-database-triggers-and-functions" className="text-2xl font-semibold text-slate-900 mb-4 pb-2 border-b border-[#E7E5E4]">Custom Database Triggers & Functions</h2>
        <p className="text-slate-600 mb-4">A set of database triggers are installed to maintain queue counter aggregates:</p>
        <CodeBlock language="sql" code={triggerSql} />
      </section>

      <section>
        <h2 id="row-level-security-rls" className="text-2xl font-semibold text-slate-900 mb-4 pb-2 border-b border-[#E7E5E4]">Row Level Security (RLS)</h2>
        <p className="text-slate-600 mb-3">RLS policies are enforced on the core tables to maintain tenant scoping:</p>
        <ol className="list-decimal pl-6 space-y-2 text-slate-600">
          <li><strong><code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">organizations</code></strong>: Select allowed if a matching user record exists in <code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">org_members</code> matching <code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">auth.uid()</code>.</li>
          <li><strong><code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">projects</code></strong>: Select allowed if org ownership correlates with the member&apos;s profile matching <code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">auth.uid()</code>.</li>
          <li><strong><code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">queues</code></strong>: Select allowed if the project&apos;s org matches member organizations containing <code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">auth.uid()</code>.</li>
          <li><strong><code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">jobs</code></strong>: Select allowed if the queue&apos;s project&apos;s org matches member organizations containing <code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">auth.uid()</code>.</li>
        </ol>
      </section>
    </div>
  );
}
