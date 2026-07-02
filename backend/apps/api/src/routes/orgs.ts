import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { schema } from 'db';
import { eq, and } from 'drizzle-orm';
import { db } from '../db';

const CreateOrgSchema = z.object({
  name: z.string().min(1),
});

const CreateProjectSchema = z.object({
  name: z.string().min(1),
});

export default async function orgRoutes(app: FastifyInstance) {
  app.post('/orgs', async (request: any, reply) => {
    try {
      const { name } = CreateOrgSchema.parse(request.body);
      const userId = request.user.id;

      const [org] = await db.insert(schema.organizations).values({ name }).returning();

      await db.insert(schema.orgMembers).values({
        orgId: org.id,
        userId: userId,
        role: 'owner',
      });

      return reply.code(201).send({ data: org });
    } catch (error) {
      if (error instanceof z.ZodError) return reply.code(400).send({ error: error.errors });
      throw error;
    }
  });

  app.get('/orgs', async (request: any, reply) => {
    const userId = request.user.id;

    const orgs = await db.select({
      id: schema.organizations.id,
      name: schema.organizations.name,
      createdAt: schema.organizations.createdAt,
    })
    .from(schema.organizations)
    .innerJoin(schema.orgMembers, eq(schema.organizations.id, schema.orgMembers.orgId))
    .where(eq(schema.orgMembers.userId, userId));

    return reply.send({ data: orgs, meta: { count: orgs.length } });
  });

  app.post('/orgs/:orgId/projects', async (request: any, reply) => {
    const { orgId } = request.params;
    const userId = request.user.id;

    try {
      const { name } = CreateProjectSchema.parse(request.body);

      const member = await db.select().from(schema.orgMembers)
        .where(and(eq(schema.orgMembers.orgId, orgId), eq(schema.orgMembers.userId, userId)))
        .limit(1);

      if (member.length === 0) {
        return reply.code(403).send({ error: 'Forbidden: You are not a member of this organization.' });
      }

      const [project] = await db.insert(schema.projects).values({
        orgId,
        name,
      }).returning();

      return reply.code(201).send({ data: project });
    } catch (error) {
      if (error instanceof z.ZodError) return reply.code(400).send({ error: error.errors });
      throw error;
    }
  });

  app.get('/orgs/:orgId/projects', async (request: any, reply) => {
    const { orgId } = request.params;
    const userId = request.user.id;

    const member = await db.select().from(schema.orgMembers)
      .where(and(eq(schema.orgMembers.orgId, orgId), eq(schema.orgMembers.userId, userId)))
      .limit(1);

    if (member.length === 0) {
      return reply.code(403).send({ error: 'Forbidden: You are not a member of this organization.' });
    }

    const projects = await db.select().from(schema.projects).where(eq(schema.projects.orgId, orgId));
    return reply.send({ data: projects, meta: { count: projects.length } });
  });
}
