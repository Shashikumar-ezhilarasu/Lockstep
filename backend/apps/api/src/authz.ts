import { db } from './db';
import { schema } from 'db';
import { eq, and } from 'drizzle-orm';

/**
 * Checks if user is a member of the organization that owns the project.
 */
export async function checkProjectAccess(projectId: string, userId: string, requireRole?: 'admin' | 'owner'): Promise<boolean> {
  const [project] = await db.select({ orgId: (schema.projects as any).orgId })
    .from(schema.projects as any)
    .where(eq((schema.projects as any).id, projectId))
    .limit(1);
  if (!project) return false;

  const [member] = await db.select({ role: (schema.orgMembers as any).role })
    .from(schema.orgMembers as any)
    .where(and(
      eq((schema.orgMembers as any).orgId, project.orgId),
      eq((schema.orgMembers as any).userId, userId)
    ))
    .limit(1);

  if (!member) return false;
  if (requireRole) {
    if (requireRole === 'owner' && member.role !== 'owner') return false;
    if (requireRole === 'admin' && !['owner', 'admin'].includes(member.role)) return false;
  }
  return true;
}

/**
 * Checks if user is a member of the organization that owns the queue.
 */
export async function checkQueueAccess(queueId: string, userId: string, requireRole?: 'admin' | 'owner'): Promise<boolean> {
  const [queue] = await db.select({ projectId: (schema.queues as any).projectId })
    .from(schema.queues as any)
    .where(eq((schema.queues as any).id, queueId))
    .limit(1);
  if (!queue) return false;

  return checkProjectAccess(queue.projectId, userId, requireRole);
}

/**
 * Checks if user is a member of the organization that owns the job.
 */
export async function checkJobAccess(jobId: string, userId: string, requireRole?: 'admin' | 'owner'): Promise<boolean> {
  const [job] = await db.select({ queueId: (schema.jobs as any).queueId })
    .from(schema.jobs as any)
    .where(eq((schema.jobs as any).id, jobId))
    .limit(1);
  if (!job) return false;

  return checkQueueAccess(job.queueId, userId, requireRole);
}
