import fastify from 'fastify';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import cors from '@fastify/cors';
import orgRoutes from './routes/orgs';
import queueRoutes from './routes/queues';
import jobRoutes from './routes/jobs';
// import workerRoutes from './routes/workers';
import metricsRoutes from './routes/metrics';

const app = fastify({ logger: true });

// Register CORS
app.register(cors, {
  origin: '*',
});

const JWT_SECRET = process.env.SUPABASE_JWT_SECRET || 'super-secret-key-that-is-at-least-32-chars-long';

// --- Mock Auth (For local testing & E2E scripts) ---
// Using md5 hash of email to create a stable pseudo-UUID
function generateStableUUID(email: string) {
  const crypto = require('crypto');
  const hash = crypto.createHash('md5').update(email).digest('hex');
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

app.post('/auth/register', async (request: any, reply) => {
  const { email, password, name } = request.body;
  if (!email || !password) return reply.code(400).send({ error: 'Email and password required' });
  
  const userId = generateStableUUID(email);

  // Auto-provision an organization, project, and queue for the new user
  try {
    const { schema } = require('db');
    const { db } = require('./db');
    
    // Check if user already has an org
    const existing = await db.select().from(schema.orgMembers).where(require('drizzle-orm').eq(schema.orgMembers.userId, userId));
    if (existing.length === 0) {
      const [org] = await db.insert(schema.organizations).values({ name: `${name || email}'s Org` }).returning();
      await db.insert(schema.orgMembers).values({ orgId: org.id, userId, role: 'owner' });
      const [project] = await db.insert(schema.projects).values({ orgId: org.id, name: 'Default Project' }).returning();
      await db.insert(schema.queues).values({ projectId: project.id, name: 'default', concurrencyLimit: 10, priority: 5 });
    }
  } catch (e) {
    request.log.error(e);
  }

  const token = jwt.sign(
    { sub: userId, aud: 'authenticated', role: 'authenticated', iss: process.env.SUPABASE_URL ? `${process.env.SUPABASE_URL}/auth/v1` : 'supabase' }, 
    JWT_SECRET, { expiresIn: '1d' }
  );
  return reply.send({ token, userId });
});

app.post('/auth/login', async (request: any, reply) => {
  const { email } = request.body || {};
  // Fallback to random uuid if no email provided (for legacy e2e tests)
  const userId = email ? generateStableUUID(email) : uuidv4();
  
  if (email) {
    try {
      const { schema } = require('db');
      const { db } = require('./db');
      
      // Idempotently ensure the user has an organization
      const existing = await db.select().from(schema.orgMembers).where(require('drizzle-orm').eq(schema.orgMembers.userId, userId));
      if (existing.length === 0) {
        const [org] = await db.insert(schema.organizations).values({ name: `${email.split('@')[0]}'s Org` }).returning();
        await db.insert(schema.orgMembers).values({ orgId: org.id, userId, role: 'owner' });
        const [project] = await db.insert(schema.projects).values({ orgId: org.id, name: 'Default Project' }).returning();
        await db.insert(schema.queues).values({ projectId: project.id, name: 'default', concurrencyLimit: 10, priority: 5 });
      }
    } catch (e) {
      request.log.error(e);
    }
  }

  const token = jwt.sign(
    { sub: userId, aud: 'authenticated', role: 'authenticated', iss: process.env.SUPABASE_URL ? `${process.env.SUPABASE_URL}/auth/v1` : 'supabase' }, 
    JWT_SECRET, { expiresIn: '1d' }
  );
  return reply.send({ token, userId });
});

// Middleware to extract user from JWT
app.decorateRequest('user', null);
app.addHook('preHandler', async (request: any, reply) => {
  if (request.url === '/auth/login' || request.url === '/auth/register') return;

  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return reply.code(401).send({ error: 'Missing or invalid Authorization header' });
  }

  const token = authHeader.replace('Bearer ', '');
  try {
    const issuer = process.env.SUPABASE_URL ? `${process.env.SUPABASE_URL}/auth/v1` : undefined;
    const decoded = jwt.verify(token, JWT_SECRET, { issuer }) as any;
    
    if (!decoded.sub) throw new Error('Missing sub claim');
    if (!decoded.exp) throw new Error('Missing exp claim');
    
    request.user = { id: decoded.sub };
  } catch (error: any) {
    return reply.code(401).send({ error: 'Invalid token: ' + error.message });
  }
});

// Register routes
app.register(orgRoutes);
app.register(queueRoutes);
app.register(jobRoutes);
// app.register(workerRoutes);
app.register(metricsRoutes);

const start = async () => {
  try {
    const port = Number(process.env.PORT) || 3000;
    await app.listen({ port, host: '0.0.0.0' });
    console.log(`API listening on http://localhost:${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};
start();
