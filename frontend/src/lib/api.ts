// Basic API client to interact with the backend service
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Local development token helper. Production deployments should pass the Supabase session token.
let cachedToken: string | null = null;

export type JsonRecord = Record<string, unknown>;

export function setAuthToken(token: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('lockstep_token', token);
  }
  cachedToken = token;
}

export function clearAuthToken() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('lockstep_token');
  }
  cachedToken = null;
}

export async function getAuthToken() {
  if (cachedToken) return cachedToken;
  if (typeof window !== 'undefined') {
    const local = localStorage.getItem('lockstep_token');
    if (local) {
      cachedToken = local;
      return local;
    }
  }
  return null;
}

async function fetchWithAuth(endpoint: string, options: RequestInit = {}) {
  const token = await getAuthToken();
  const headers: Record<string, string> = {
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };
  
  if (options.body) {
    headers['Content-Type'] = 'application/json';
  }
  
  Object.assign(headers, options.headers || {});
  
  const res = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
  
  if (res.status === 401) {
    clearAuthToken();
    if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
  }
  
  if (!res.ok) {
    throw new Error(`API Error: ${res.statusText}`);
  }
  return res.json();
}

export const api = {
  login: async (payload: JsonRecord) => {
    const res = await fetch(`${API_URL}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (!res.ok) throw new Error('Login failed');
    return res.json();
  },
  register: async (payload: JsonRecord) => {
    const res = await fetch(`${API_URL}/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (!res.ok) throw new Error('Registration failed');
    return res.json();
  },
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
  getJobs: (filters?: Record<string, string>) => fetchWithAuth(`/jobs?${new URLSearchParams(filters || {}).toString()}`),
  createJob: (queueId: string, payload: JsonRecord) => fetchWithAuth(`/queues/${queueId}/jobs`, { method: 'POST', body: JSON.stringify(payload) }),
  cancelJob: (jobId: string) => fetchWithAuth(`/jobs/${jobId}/cancel`, { method: 'POST' }),
  
  // DLQ Management
  getDlq: () => fetchWithAuth(`/dlq`),
  requeueDlq: (dlqId: string) => fetchWithAuth(`/dlq/${dlqId}/requeue`, { method: 'POST' }),
  deleteDlq: (dlqId: string) => fetchWithAuth(`/dlq/${dlqId}`, { method: 'DELETE' }),
  getJobLogs: (jobId: string) => fetchWithAuth(`/jobs/${jobId}/logs`),
  retryJob: (jobId: string) => fetchWithAuth(`/jobs/${jobId}/retry`, { method: 'POST' }),
};
