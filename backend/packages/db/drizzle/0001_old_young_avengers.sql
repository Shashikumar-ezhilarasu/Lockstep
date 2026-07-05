ALTER TABLE "dead_letter_queue" ADD COLUMN "ai_summary" text;--> statement-breakpoint
ALTER TABLE "dead_letter_queue" ADD COLUMN "ai_summary_status" text;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_workers_hostname" ON "workers" ("hostname");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "jobs" ADD CONSTRAINT "jobs_parent_job_id_jobs_id_fk" FOREIGN KEY ("parent_job_id") REFERENCES "jobs"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "queues" ADD CONSTRAINT "queues_default_retry_policy_id_retry_policies_id_fk" FOREIGN KEY ("default_retry_policy_id") REFERENCES "retry_policies"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
