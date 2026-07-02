import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { v4 as uuidv4 } from 'uuid';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not set. Check that your .env file exists and is being loaded.');
}
const sql = postgres(connectionString, { max: 1 });
const db = drizzle(sql, { schema });

async function seed() {
  console.log('🌱 Seeding database...');

  try {
    // 1. Create Organization
    const [org] = await db.insert(schema.organizations).values({
      name: 'Demo Corp',
    }).returning();
    console.log(`Created Org: ${org.name} (${org.id})`);

    // 2. Create Project
    const [project] = await db.insert(schema.projects).values({
      orgId: org.id,
      name: 'Default Project',
    }).returning();
    console.log(`Created Project: ${project.name} (${project.id})`);

    // 3. Create Queues
    const [highPriorityQueue] = await db.insert(schema.queues).values({
      projectId: project.id,
      name: 'High Priority Queue',
      priority: 100,
      concurrencyLimit: 20,
    }).returning();

    const [defaultQueue] = await db.insert(schema.queues).values({
      projectId: project.id,
      name: 'Default Queue',
      priority: 10,
      concurrencyLimit: 5,
    }).returning();

    console.log(`Created Queues: ${highPriorityQueue.name}, ${defaultQueue.name}`);

    // 4. Create Jobs
    const jobsToInsert = [
      {
        queueId: highPriorityQueue.id,
        type: 'immediate' as const,
        status: 'queued' as const,
        priority: 100,
        payload: { task: 'send_welcome_email', userId: 'user_1' },
      },
      {
        queueId: defaultQueue.id,
        type: 'immediate' as const,
        status: 'queued' as const,
        priority: 10,
        payload: { task: 'process_image', imageId: 'img_1' },
      },
      {
        queueId: defaultQueue.id,
        type: 'delayed' as const,
        status: 'scheduled' as const,
        priority: 10,
        scheduledAt: new Date(Date.now() + 1000 * 60 * 60), // 1 hour from now
        payload: { task: 'cleanup_session', sessionId: 'sess_1' },
      },
    ];

    await db.insert(schema.jobs).values(jobsToInsert);
    console.log(`Created ${jobsToInsert.length} Jobs`);

    console.log('✅ Seeding completed successfully.');
  } catch (error) {
    console.error('❌ Error during seeding:', error);
  } finally {
    await sql.end();
  }
}

seed();
