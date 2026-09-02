/**
 * Thin REST client. Every dashboard component goes through here rather than calling `fetch`
 * directly, so request shape / error handling stays in one place (see "no business logic in
 * components" project rule).
 */
import type {
  AgentConfigDto,
  AgentConfigInput,
  AgentDto,
  AnalyticsResponse,
  ApiErrorResponse,
  CallDetailDto,
  CallListItemDto,
  KnowledgeDocumentDto,
  KnowledgeTestResponse,
  SessionStartResponse,
  TokenResponse,
} from '@voicelab/shared';

const BASE_URL = import.meta.env.VITE_SERVER_URL ?? 'http://localhost:4100';

export class ApiError extends Error {
  constructor(
    message: string,
    public code: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as ApiErrorResponse | null;
    throw new ApiError(body?.error.message ?? `Request failed (${res.status})`, body?.error.code ?? 'UNKNOWN');
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  agents: {
    list: () => request<AgentDto[]>('/api/agents'),
    get: (id: string) => request<AgentDto>(`/api/agents/${id}`),
    create: (input: { name: string; description?: string }) =>
      request<AgentDto>('/api/agents', { method: 'POST', body: JSON.stringify(input) }),
    saveConfig: (agentId: string, input: AgentConfigInput) =>
      request<AgentConfigDto>(`/api/agents/${agentId}/config`, { method: 'PUT', body: JSON.stringify(input) }),
  },
  sessions: {
    token: (agentId: string, participantName: string) =>
      request<TokenResponse>('/api/sessions/token', { method: 'POST', body: JSON.stringify({ agentId, participantName }) }),
    start: (agentId: string, roomName: string) =>
      request<SessionStartResponse>('/api/sessions/start', { method: 'POST', body: JSON.stringify({ agentId, roomName }) }),
    end: (callId: string, reason: string) =>
      request<{ ok: true }>('/api/sessions/end', { method: 'POST', body: JSON.stringify({ callId, reason }) }),
  },
  calls: {
    list: (agentId?: string) => request<CallListItemDto[]>(`/api/calls${agentId ? `?agentId=${agentId}` : ''}`),
    get: (id: string) => request<CallDetailDto>(`/api/calls/${id}`),
  },
  knowledge: {
    list: (agentId: string) => request<KnowledgeDocumentDto[]>(`/api/knowledge?agentId=${agentId}`),
    upload: async (agentId: string, file: File): Promise<KnowledgeDocumentDto> => {
      const form = new FormData();
      form.append('agentId', agentId);
      form.append('file', file);
      const res = await fetch(`${BASE_URL}/api/knowledge/upload`, { method: 'POST', body: form });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as ApiErrorResponse | null;
        throw new ApiError(body?.error.message ?? `Upload failed (${res.status})`, body?.error.code ?? 'UNKNOWN');
      }
      return res.json();
    },
    remove: (id: string) => request<void>(`/api/knowledge/${id}`, { method: 'DELETE' }),
    test: (agentId: string, question: string) =>
      request<KnowledgeTestResponse>('/api/knowledge/test', { method: 'POST', body: JSON.stringify({ agentId, question }) }),
  },
  tools: {
    weather: (city: string) => request('/api/tools/weather', { method: 'POST', body: JSON.stringify({ city }) }),
    appointment: (input: { customer: string; date: string; time: string; service: string }) =>
      request('/api/tools/appointment', { method: 'POST', body: JSON.stringify(input) }),
    order: (orderId: string) => request('/api/tools/order', { method: 'POST', body: JSON.stringify({ orderId }) }),
  },
  analytics: {
    get: (agentId: string) => request<AnalyticsResponse>(`/api/analytics/${agentId}`),
  },
};
