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
app.post('/auth/login', async (request, reply) => {
  // Return a token signed with the SUPABASE_JWT_SECRET so it passes verification
  const userId = uuidv4();
  const token = jwt.sign(
    { 
      sub: userId, 
      aud: 'authenticated', 
      role: 'authenticated',
      iss: process.env.SUPABASE_URL ? `${process.env.SUPABASE_URL}/auth/v1` : 'supabase'
    }, 
    JWT_SECRET, 
    { expiresIn: '1d' }
  );
  return reply.send({ token, userId });
});

// Middleware to extract user from JWT
app.decorateRequest('user', null);
app.addHook('preHandler', async (request: any, reply) => {
  if (request.url === '/auth/login') return;

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
