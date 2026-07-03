# Backend Engineering Design

This document details the backend engineering architecture of the Lockstep job scheduler API and services.

---

## 1. REST API Architecture (`backend/apps/api`)

The API layer is built using Fastify for high-throughput, low-overhead HTTP performance.

### Project Layout
```text
backend/apps/api/src/
├── index.ts        # Server bootstrap, middleware, and mock auth routes
├── db.ts           # Drizzle connection configuration
├── authz.ts        # Multi-tenant resource access helper rules
└── routes/         # Modular route groups
    ├── orgs.ts     # Organizations & projects creation
    ├── queues.ts   # Queue configurations & stats
    ├── jobs.ts     # Job dispatch, retry, and cancellation
    └── metrics.ts  # Operational counters and statistics
```

---

## 2. Authentication & Request Scoping

### JWT Signature Verification
All requests except `/auth/login` and `/auth/register` undergo JWT extraction and validation.
* **Token Verification**: Uses standard `jsonwebtoken` signature checking verified against the environment secret (`SUPABASE_JWT_SECRET`).
* **Sub Claim Extraction**: On verification success, `decoded.sub` (the user UUID) is attached to the decorated request object:
  ```typescript
  app.decorateRequest('user', null);
  // Middleware decorator
  request.user = { id: decoded.sub };
  ```

### Tenant Scoping Helpers (`authz.ts`)
We implement strict query-level validation to prevent Cross-Tenant Data Access (IDOR).
* **Project Level**: Checks if the calling user belongs to the project's organization:
  ```typescript
  export async function checkProjectAccess(projectId: string, userId: string, requireRole?: 'admin' | 'owner') {
    const [project] = await db.select({ orgId: schema.projects.orgId })
      .from(schema.projects)
      .where(eq(schema.projects.id, projectId));
    if (!project) return false;

    const [member] = await db.select({ role: schema.orgMembers.role })
      .from(schema.orgMembers)
      .where(and(
        eq(schema.orgMembers.orgId, project.orgId),
        eq(schema.orgMembers.userId, userId)
      ));
    // Validates matching roles (owner, admin, member)
    ...
  }
  ```
* **Queue Level**: Resolves queue parent association to verify project/org membership.
* **Job Level**: Resolves job parent queue and project associations to verify membership.

---

## 3. Query Execution with Drizzle ORM

The backend utilizes Drizzle ORM to build SQL queries with type safety.

### AST Parameterization
All queries are parameterized out-of-the-box by Drizzle, preventing SQL injection vulnerabilities.

### Database Connection Management (`db.ts`)
* **API Service**: Connects via a PostgreSQL connection pool configured to target the transaction pooler or session-mode pooler based on the configured environment.
* **Worker & Scheduler**: Configured with a session-mode connection (`ssl: 'require'`) to maintain dedicated process backend affinity.

---

## 4. Input Validation & Serialization

The API uses **Zod** to validate request payloads before hitting database executors.

### Example Validation Schema (`CreateJobSchema`)
```typescript
const CreateJobSchema = z.object({
  type: z.enum(['immediate', 'delayed', 'scheduled', 'batch']),
  payload: z.any().optional(),
  delay_ms: z.number().int().optional(),
  scheduled_at: z.string().datetime().optional(),
  priority: z.number().int().optional(),
  idempotency_key: z.string().optional(),
  items: z.array(z.object({ payload: z.any() })).optional(),
});
```

Input parse failures trigger a `ZodError` caught by Fastify handlers, returning standardized Zod error details to clients with HTTP `400 Bad Request`.
