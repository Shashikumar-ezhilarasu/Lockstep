// Basic API client to interact with the backend service
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Local development token helper. Production deployments should pass the Supabase session token.
let cachedToken: string | null = null;

export type JsonRecord = Record<string, unknown>;

export async function getAuthToken() {
  if (cachedToken) return cachedToken;
  try {
    const res = await fetch(`${API_URL}/auth/login`, { method: 'POST' });
    const data = await res.json() as { token?: string };
    cachedToken = data.token ?? null;
    return cachedToken;
  } catch (e) {
    console.error('Failed to get auth token', e);
    return null;
  }
}

async function fetchWithAuth(endpoint: string, options: RequestInit = {}) {
  const token = await getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers,
  };
  
  const res = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
  if (!res.ok) {
    throw new Error(`API Error: ${res.statusText}`);
  }
  return res.json();
}

export const api = {
  getMetrics: () => fetchWithAuth(`/metrics`),
  getOrgs: () => fetchWithAuth(`/orgs`),
  createOrg: (payload: { name: string }) => fetchWithAuth(`/orgs`, { method: 'POST', body: JSON.stringify(payload) }),
  getProjects: (orgId: string) => fetchWithAuth(`/orgs/${orgId}/projects`),
  createProject: (orgId: string, payload: { name: string }) => fetchWithAuth(`/orgs/${orgId}/projects`, { method: 'POST', body: JSON.stringify(payload) }),

  // Queue Management
  getProjectQueues: (projectId: string) => fetchWithAuth(`/projects/${projectId}/queues`),
  createQueue: (projectId: string, payload: JsonRecord) => fetchWithAuth(`/projects/${projectId}/queues`, { method: 'POST', body: JSON.stringify(payload) }),
  pauseQueue: (queueId: string) => fetchWithAuth(`/queues/${queueId}/pause`, { method: 'POST' }),
  resumeQueue: (queueId: string) => fetchWithAuth(`/queues/${queueId}/resume`, { method: 'POST' }),
  
  // Job Management
  createJob: (queueId: string, payload: JsonRecord) => fetchWithAuth(`/queues/${queueId}/jobs`, { method: 'POST', body: JSON.stringify(payload) }),
  cancelJob: (jobId: string) => fetchWithAuth(`/jobs/${jobId}/cancel`, { method: 'POST' }),
  
  // DLQ Management
  getDlq: () => fetchWithAuth(`/dlq`),
  requeueDlq: (dlqId: string) => fetchWithAuth(`/dlq/${dlqId}/requeue`, { method: 'POST' }),
  deleteDlq: (dlqId: string) => fetchWithAuth(`/dlq/${dlqId}`, { method: 'DELETE' }),
  getJobLogs: (jobId: string) => fetchWithAuth(`/jobs/${jobId}/logs`),
  retryJob: (jobId: string) => fetchWithAuth(`/jobs/${jobId}/retry`, { method: 'POST' }),
};
