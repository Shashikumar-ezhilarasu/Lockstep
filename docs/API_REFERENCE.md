# API Reference

The Lockstep Backend REST API is built with Fastify. 

## Authentication & Headers

Every request to a protected endpoint must include an `Authorization` header containing a valid Supabase JWT.

```http
Authorization: Bearer <your-jwt-token>
Content-Type: application/json
```

---

## Auth Endpoints (Unprotected)

### 1. Register User
* **Method**: `POST`
* **Path**: `/auth/register`
* **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "securepassword",
    "name": "User Name"
  }
  ```
* **Response (200 OK)**:
  ```json
  {
    "token": "jwt-token-string",
    "userId": "stable-uuid-generated-from-email"
  }
  ```
* **Description**: Automatically provisions a default organization, project, and queue (`default`) for the user if they do not already exist, and issues a signed JWT.

### 2. Login User
* **Method**: `POST`
* **Path**: `/auth/login`
* **Request Body**:
  ```json
  {
    "email": "user@example.com"
  }
  ```
* **Response (200 OK)**:
  ```json
  {
    "token": "jwt-token-string",
    "userId": "stable-uuid"
  }
  ```
* **Description**: Generates and issues a mock JWT containing the stable pseudo-UUID of the user (or a random UUID if no email is supplied).

---

## Organization & Project Endpoints (Protected)

### 1. Create Organization
* **Method**: `POST`
* **Path**: `/orgs`
* **Request Body**:
  ```json
  {
    "name": "Acme Corp"
  }
  ```
* **Response (201 Created)**:
  ```json
  {
    "data": {
      "id": "org-uuid",
      "name": "Acme Corp",
      "createdAt": "2026-07-03T10:46:05.000Z"
    }
  }
  ```

### 2. List Organizations
* **Method**: `GET`
* **Path**: `/orgs`
* **Response (200 OK)**:
  ```json
  {
    "data": [
      {
        "id": "org-uuid",
        "name": "Acme Corp",
        "createdAt": "2026-07-03T10:46:05.000Z"
      }
    ]
  }
  ```

### 3. Create Project
* **Method**: `POST`
* **Path**: `/orgs/:orgId/projects`
* **Response (201 Created)**:
  ```json
  {
    "data": {
      "id": "project-uuid",
      "orgId": "org-uuid",
      "name": "Project Alpha",
      "createdAt": "2026-07-03T10:46:05.000Z"
    }
  }
  ```

### 4. List Projects
* **Method**: `GET`
* **Path**: `/orgs/:orgId/projects`
* **Response (200 OK)**:
  ```json
  {
    "data": [
      {
        "id": "project-uuid",
        "orgId": "org-uuid",
        "name": "Project Alpha",
        "createdAt": "2026-07-03T10:46:05.000Z"
      }
    ]
  }
  ```

---

## Queue Endpoints (Protected)

### 1. Create Queue
* **Method**: `POST`
* **Path**: `/projects/:projectId/queues`
* **Request Body**:
  ```json
  {
    "name": "critical-tasks",
    "priority": 20,
    "concurrency_limit": 5,
    "retry_policy": {
      "strategy": "exponential",
      "base_delay_ms": 1000,
      "multiplier": 2,
      "max_attempts": 3,
      "max_delay_ms": 10000
    }
  }
  ```
* **Response (201 Created)**:
  ```json
  {
    "data": {
      "id": "queue-uuid",
      "projectId": "project-uuid",
      "name": "critical-tasks",
      "priority": 20,
      "concurrencyLimit": 5,
      "status": "active",
      "defaultRetryPolicyId": "policy-uuid",
      "totalJobs": 0,
      "failedJobs": 0,
      "completedJobs": 0,
      "createdAt": "2026-07-03T10:46:05.000Z"
    }
  }
  ```

### 2. List Project Queues
* **Method**: `GET`
* **Path**: `/projects/:projectId/queues`
* **Response (200 OK)**:
  ```json
  {
    "data": [
      {
        "id": "queue-uuid",
        "projectId": "project-uuid",
        "name": "critical-tasks",
        "priority": 20,
        "concurrencyLimit": 5,
        "status": "active",
        "defaultRetryPolicyId": "policy-uuid",
        "totalJobs": 0,
        "failedJobs": 0,
        "completedJobs": 0,
        "createdAt": "2026-07-03T10:46:05.000Z"
      }
    ],
    "meta": {
      "count": 1
    }
  }
  ```

### 3. Get Queue Details
* **Method**: `GET`
* **Path**: `/queues/:queueId`
* **Response (200 OK)**:
  ```json
  {
    "data": {
      "id": "queue-uuid",
      "projectId": "project-uuid",
      "name": "critical-tasks",
      "priority": 20,
      "concurrencyLimit": 5,
      "status": "active",
      "defaultRetryPolicyId": "policy-uuid",
      "totalJobs": 0,
      "failedJobs": 0,
      "completedJobs": 0,
      "createdAt": "2026-07-03T10:46:05.000Z"
    }
  }
  ```

### 4. Pause Queue
* **Method**: `POST`
* **Path**: `/queues/:queueId/pause`
* **Response (200 OK)**:
  ```json
  {
    "data": {
      "id": "queue-uuid",
      "status": "paused"
    }
  }
  ```
* **Description**: Pauses the queue immediately. Workers will skip polling jobs from this queue until it is resumed.

### 5. Resume Queue
* **Method**: `POST`
* **Path**: `/queues/:queueId/resume`
* **Response (200 OK)**:
  ```json
  {
    "data": {
      "id": "queue-uuid",
      "status": "active"
    }
  }
  ```

### 6. Get Queue Statistics
* **Method**: `GET`
* **Path**: `/queues/:queueId/stats`
* **Response (200 OK)**:
  ```json
  {
    "data": {
      "total_jobs": 15,
      "completed_jobs": 10,
      "failed_jobs": 5
    }
  }
  ```

---

## Job Endpoints (Protected)

### 1. Create Job (Immediate, Delayed, Scheduled, or Batch)
* **Method**: `POST`
* **Path**: `/queues/:queueId/jobs`
* **Request Body (Zod Validated)**:
  ```json
  {
    "type": "immediate",
    "payload": { "handler": "sleep_simulate", "ms": 500 },
    "priority": 10,
    "idempotency_key": "unique-uuid-key"
  }
  ```
  * Note: For `type: "delayed"`, pass `"delay_ms": 60000`. For `type: "scheduled"`, pass `"scheduled_at": "2026-07-04T12:00:00.000Z"`.
  * For `type: "batch"`, pass `"items": [{ "payload": { "handler": "sleep" } }]` along with batch parameters.
* **Response (201 Created)**:
  ```json
  {
    "data": {
      "id": "job-uuid",
      "queueId": "queue-uuid",
      "type": "immediate",
      "status": "queued",
      "priority": 10,
      "payload": { "handler": "sleep_simulate", "ms": 500 },
      "idempotencyKey": "unique-uuid-key",
      "scheduledAt": "2026-07-03T10:46:05.000Z",
      "createdAt": "2026-07-03T10:46:05.000Z"
    }
  }
  ```

### 2. Create Recurring Cron Job
* **Method**: `POST`
* **Path**: `/queues/:queueId/jobs/recurring`
* **Request Body**:
  ```json
  {
    "cron": "*/5 * * * *",
    "timezone": "America/New_York",
    "job_template": {
      "payload": { "handler": "sleep_simulate", "ms": 100 }
    }
  }
  ```
* **Response (201 Created)**:
  ```json
  {
    "data": {
      "id": "scheduled-job-uuid",
      "queueId": "queue-uuid",
      "cronExpression": "*/5 * * * *",
      "timezone": "America/New_York",
      "jobTemplate": {
        "payload": { "handler": "sleep_simulate", "ms": 100 }
      },
      "nextRunAt": "2026-07-03T10:50:00.000Z",
      "enabled": true
    }
  }
  ```

### 3. List & Filter Jobs
* **Method**: `GET`
* **Path**: `/jobs`
* **Query Parameters**:
  * `queue_id` (optional, uuid)
  * `worker_id` (optional, uuid)
  * `status` (optional, string)
  * `limit` (optional, number, default: `50`, max: `100`)
  * `offset` (optional, number, default: `0`)
* **Response (200 OK)**:
  ```json
  {
    "data": [
      {
        "id": "job-uuid",
        "queueId": "queue-uuid",
        "retryPolicyId": null,
        "parentJobId": null,
        "type": "immediate",
        "status": "completed",
        "priority": 10,
        "payload": { "handler": "sleep_simulate", "ms": 500 },
        "createdAt": "2026-07-03T10:46:05.000Z"
      }
    ],
    "meta": {
      "limit": 50,
      "offset": 0,
      "count": 1
    }
  }
  ```

### 4. Get Job Details & Executions
* **Method**: `GET`
* **Path**: `/jobs/:jobId`
* **Response (200 OK)**:
  ```json
  {
    "data": {
      "id": "job-uuid",
      "queueId": "queue-uuid",
      "status": "completed",
      "payload": { "handler": "sleep_simulate" },
      "createdAt": "2026-07-03T10:46:05.000Z",
      "job_executions": [
        {
          "id": "execution-uuid",
          "jobId": "job-uuid",
          "workerId": "worker-uuid",
          "startedAt": "2026-07-03T10:46:06.000Z",
          "finishedAt": "2026-07-03T10:46:06.500Z",
          "status": "completed",
          "result": { "success": true },
          "error": null,
          "durationMs": 500
        }
      ]
    }
  }
  ```

### 5. Get Job Execution Logs
* **Method**: `GET`
* **Path**: `/jobs/:jobId/logs`
* **Response (200 OK)**:
  ```json
  {
    "data": [
      {
        "id": 1024,
        "ts": "2026-07-03T10:46:06.000Z",
        "level": "info",
        "message": "Job execution started",
        "executionId": "execution-uuid"
      }
    ],
    "meta": {
      "count": 1
    }
  }
  ```

### 6. Cancel Job
* **Method**: `POST`
* **Path**: `/jobs/:jobId/cancel`
* **Response (200 OK)**:
  ```json
  {
    "data": {
      "id": "job-uuid",
      "status": "cancelled"
    }
  }
  ```
* **Description**: Transitions a job from `queued` or `scheduled` status directly to `cancelled`. Cannot cancel running/completed jobs.

### 7. Force Retry Job
* **Method**: `POST`
* **Path**: `/jobs/:jobId/retry`
* **Response (200 OK)**:
  ```json
  {
    "data": {
      "id": "job-uuid",
      "status": "queued",
      "attempt": 0,
      "claimedBy": null,
      "claimedAt": null,
      "scheduledAt": "2026-07-03T10:46:05.000Z"
    }
  }
  ```
* **Description**: Forces a failed or cancelled job back into the `queued` state with attempt reset to 0.

---

## Dead Letter Queue (DLQ) Endpoints (Protected)

### 1. List All DLQ Entries for User Org
* **Method**: `GET`
* **Path**: `/dlq`
* **Response (200 OK)**:
  ```json
  {
    "data": [
      {
        "id": "dlq-uuid",
        "jobId": "job-uuid",
        "failureReason": "Simulated failure",
        "attemptsMade": 3,
        "originalPayload": { "handler": "fail_simulate" },
        "movedAt": "2026-07-03T10:47:05.000Z"
      }
    ]
  }
  ```

### 2. List DLQ Entries for Specific Queue
* **Method**: `GET`
* **Path**: `/queues/:queueId/dlq`
* **Response (200 OK)**:
  ```json
  {
    "data": [
      {
        "id": "dlq-uuid",
        "jobId": "job-uuid",
        "failureReason": "Simulated failure",
        "attemptsMade": 3,
        "originalPayload": { "handler": "fail_simulate" },
        "movedAt": "2026-07-03T10:47:05.000Z"
      }
    ],
    "meta": {
      "count": 1
    }
  }
  ```

### 3. Requeue DLQ Entry
* **Method**: `POST`
* **Path**: `/dlq/:dlqId/requeue`
* **Response (200 OK)**:
  ```json
  {
    "data": {
      "requeued": true
    }
  }
  ```
* **Description**: Transactions the job status back to `queued`, resets attempts to 0, sets scheduled time to now, and deletes the corresponding DLQ entry.

### 4. Delete DLQ Entry
* **Method**: `DELETE`
* **Path**: `/dlq/:dlqId`
* **Response (200 OK)**:
  ```json
  {
    "data": {
      "deleted": true
    }
  }
  ```

---

## Metrics Endpoints (Protected)

### 1. Get Tenant Metrics
* **Method**: `GET`
* **Path**: `/metrics`
* **Response (200 OK)**:
  ```json
  {
    "data": {
      "total_jobs": 150,
      "failed_jobs": 12,
      "completed_jobs": 120,
      "active_workers": 2,
      "failure_rate": "8.0%"
    }
  }
  ```
