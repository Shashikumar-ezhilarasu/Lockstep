import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  jsonb,
  primaryKey,
  pgEnum,
  bigserial,
  boolean,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const queueStatusEnum = pgEnum('queue_status', ['active', 'paused']);
export const retryStrategyEnum = pgEnum('retry_strategy', ['fixed', 'linear', 'exponential']);
export const jobTypeEnum = pgEnum('job_type', ['immediate', 'delayed', 'scheduled', 'recurring', 'batch']);
export const jobStatusEnum = pgEnum('job_status', [
  'queued',
  'scheduled',
  'claimed',
  'running',
  'completed',
  'failed',
  'dead_letter',
  'cancelled',
]);
export const workerStatusEnum = pgEnum('worker_status', ['idle', 'busy', 'draining', 'offline']);
export const executionStatusEnum = pgEnum('execution_status', ['started', 'completed', 'failed']);
export const logLevelEnum = pgEnum('log_level', ['info', 'warn', 'error']);

// Tables
export const organizations = pgTable('organizations', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const orgMembers = pgTable(
  'org_members',
  {
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    // userId is validated at the application layer against Supabase auth on every 
    // insert (via JWT verification), not via a Postgres FK. Cross-schema FKs to 
    // auth.users are discouraged by Supabase docs.
    userId: uuid('user_id').notNull(), 
    role: text('role').notNull().default('member'), // owner, admin, member
  },
  (table) => ({
    pk: primaryKey({ columns: [table.orgId, table.userId] }),
  })
);

export const projects = pgTable('projects', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const queues: any = pgTable('queues', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  priority: integer('priority').default(10).notNull(),
  concurrencyLimit: integer('concurrency_limit').default(10).notNull(),
  status: queueStatusEnum('status').default('active').notNull(),
  defaultRetryPolicyId: uuid('default_retry_policy_id').references(() => (retryPolicies as any).id, { onDelete: 'set null' }) as any, // Self-reference
  totalJobs: integer('total_jobs').default(0).notNull(),
  failedJobs: integer('failed_jobs').default(0).notNull(),
  completedJobs: integer('completed_jobs').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const retryPolicies: any = pgTable('retry_policies', {
  id: uuid('id').defaultRandom().primaryKey(),
  queueId: uuid('queue_id').references(() => (queues as any).id, { onDelete: 'cascade' }) as any,
  strategy: retryStrategyEnum('strategy').notNull(),
  baseDelayMs: integer('base_delay_ms').notNull(),
  maxDelayMs: integer('max_delay_ms'),
  multiplier: integer('multiplier'), // For exponential
  maxAttempts: integer('max_attempts').notNull(),
});

export const workers = pgTable('workers', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }), // nullable if global
  hostname: text('hostname').notNull(),
  status: workerStatusEnum('status').default('idle').notNull(),
  capacity: integer('capacity').notNull(),
  subscribedQueues: uuid('subscribed_queues').array(),
  version: text('version'),
  startedAt: timestamp('started_at', { withTimezone: true }).defaultNow().notNull(),
},
(table) => ({
  hostnameIdx: uniqueIndex('idx_workers_hostname').on(table.hostname),
}));

export const jobs: any = pgTable(
  'jobs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    queueId: uuid('queue_id')
      .notNull()
      .references(() => queues.id, { onDelete: 'cascade' }),
    retryPolicyId: uuid('retry_policy_id').references(() => retryPolicies.id, { onDelete: 'set null' }),
    parentJobId: uuid('parent_job_id').references(() => (jobs as any).id, { onDelete: 'set null' }) as any, // Self-referential for DAGs
    type: jobTypeEnum('type').notNull(),
    status: jobStatusEnum('status').default('queued').notNull(),
    priority: integer('priority').default(10).notNull(),
    payload: jsonb('payload').default({}).notNull(),
    idempotencyKey: text('idempotency_key'),
    scheduledAt: timestamp('scheduled_at', { withTimezone: true }).defaultNow().notNull(),
    claimedBy: uuid('claimed_by').references(() => workers.id, { onDelete: 'set null' }),
    claimedAt: timestamp('claimed_at', { withTimezone: true }),
    attempt: integer('attempt').default(0).notNull(),
    batchId: uuid('batch_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    claimIdx: index('idx_jobs_claim').on(table.queueId, table.status, table.priority, table.scheduledAt),
    idempotencyIdx: uniqueIndex('idx_jobs_idempotency').on(table.queueId, table.idempotencyKey),
    statusIdx: index('idx_jobs_queue_status').on(table.queueId, table.status, table.createdAt),
  })
);

export const jobExecutions = pgTable(
  'job_executions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    jobId: uuid('job_id')
      .notNull()
      .references(() => jobs.id, { onDelete: 'cascade' }),
    workerId: uuid('worker_id').references(() => workers.id, { onDelete: 'set null' }),
    startedAt: timestamp('started_at', { withTimezone: true }).defaultNow().notNull(),
    finishedAt: timestamp('finished_at', { withTimezone: true }),
    status: executionStatusEnum('status').notNull(),
    result: jsonb('result'),
    error: jsonb('error'),
    durationMs: integer('duration_ms'),
  },
  (table) => ({
    jobIdx: index('idx_executions_job').on(table.jobId, table.startedAt),
  })
);

export const jobLogs = pgTable('job_logs', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  executionId: uuid('execution_id')
    .notNull()
    .references(() => jobExecutions.id, { onDelete: 'cascade' }),
  ts: timestamp('ts', { withTimezone: true }).defaultNow().notNull(),
  level: logLevelEnum('level').notNull(),
  message: text('message').notNull(),
});

export const scheduledJobs = pgTable(
  'scheduled_jobs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    queueId: uuid('queue_id')
      .notNull()
      .references(() => queues.id, { onDelete: 'cascade' }),
    cronExpression: text('cron_expression').notNull(),
    timezone: text('timezone').default('UTC').notNull(),
    jobTemplate: jsonb('job_template').notNull(), // Contains payload, type, priority etc.
    nextRunAt: timestamp('next_run_at', { withTimezone: true }).notNull(),
    lastRunAt: timestamp('last_run_at', { withTimezone: true }),
    enabled: boolean('enabled').default(true).notNull(),
  },
  (table) => ({
    nextRunIdx: index('idx_scheduled_next_run').on(table.nextRunAt),
  })
);

export const deadLetterQueue = pgTable('dead_letter_queue', {
  id: uuid('id').defaultRandom().primaryKey(),
  jobId: uuid('job_id')
    .notNull()
    .unique()
    .references(() => jobs.id, { onDelete: 'cascade' }),
  failureReason: text('failure_reason').notNull(),
  attemptsMade: integer('attempts_made').notNull(),
  originalPayload: jsonb('original_payload').notNull(),
  aiSummary: text('ai_summary'),
  aiSummaryStatus: text('ai_summary_status'),
  movedAt: timestamp('moved_at', { withTimezone: true }).defaultNow().notNull(),
  resolved: boolean('resolved').default(false).notNull(),
  resolvedBy: uuid('resolved_by'), // Could reference user
});

export const workerHeartbeats = pgTable(
  'worker_heartbeats',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    workerId: uuid('worker_id')
      .notNull()
      .references(() => workers.id, { onDelete: 'cascade' }),
    ts: timestamp('ts', { withTimezone: true }).defaultNow().notNull(),
    activeJobCount: integer('active_job_count').notNull(),
    cpuPct: integer('cpu_pct'),
    memMb: integer('mem_mb'),
  },
  (table) => ({
    workerTsIdx: index('idx_heartbeats_worker_ts').on(table.workerId, table.ts),
  })
);

export const jobDependencies = pgTable(
  'job_dependencies',
  {
    jobId: uuid('job_id')
      .notNull()
      .references(() => jobs.id, { onDelete: 'cascade' }),
    dependsOnJobId: uuid('depends_on_job_id')
      .notNull()
      .references(() => jobs.id, { onDelete: 'cascade' }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.jobId, table.dependsOnJobId] }),
  })
);
