const rawApiUrl = import.meta.env.VITE_API_URL as string | undefined;
const BASE = rawApiUrl
  ? rawApiUrl.startsWith("http") ? rawApiUrl : `https://${rawApiUrl}`
  : "http://localhost:3000";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ApiNote {
  id: string;
  title: string;
  content: string;
  type: "fleeting" | "literature" | "permanent";
  sourceType?: "article" | "book" | "podcast" | "other" | null;
  sourceUrl?: string | null;
  author?: string | null;
  status: "inbox" | "active" | "on_hold" | "done" | "archived";
  para?: "project" | "area" | "resource" | "archive" | null;
  strength: number;
  processedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  connections: number;
}

export interface ApiGraphNode {
  id: string;
  title: string;
  type: "fleeting" | "literature" | "permanent";
  connectionCount: number;
}

export interface ApiGraphEdge {
  fromNoteId: string;
  toNoteId: string;
}

export interface ApiVaultStats {
  total: number;
  permanent: number;
  literature: number;
  fleeting: number;
  pending: number;
  connections: number;
  healthScore: number;
}

export interface ApiDailyNote {
  id?: string;
  date: string;
  intention: string;
  studied: string;
  tomorrow: string;
}

export interface ApiTag {
  id: string;
  name: string;
  color: string | null;
  noteCount: number;
}

export interface NoteListParams {
  type?: string;
  status?: string;
  para?: string;
  q?: string;
  tag?: string;
  limit?: number;
  offset?: number;
}

export interface CreateNoteBody {
  title: string;
  content?: string;
  type?: "fleeting" | "literature" | "permanent";
  sourceType?: string;
  sourceUrl?: string;
  author?: string;
  status?: string;
  para?: string;
  tags?: string[];
}

// ─── Base fetch ───────────────────────────────────────────────────────────────

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

function toQuery(params?: Record<string, unknown>): string {
  if (!params) return "";
  const qs = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join("&");
  return qs ? `?${qs}` : "";
}

// ─── Habits types ─────────────────────────────────────────────────────────────

export interface ApiHabit {
  id: string;
  name: string;
  description?: string | null;
  keywords: string[];
  color: string;
  isActive: boolean;
  completedToday: boolean;
  logSource: "manual" | "ai" | null;
  createdAt: string;
}

export interface ApiTodo {
  noteId: string;
  noteTitle: string;
  text: string;
  lineIndex: number;
}

export interface ApiTask {
  id: string;
  title: string;
  description: string;
  parentId: string | null;
  completed: boolean;
  completedAt: string | null;
  dueDate: string | null;
  priority: number;
  position: number;
  createdAt: string;
  updatedAt: string;
}

// ─── API client ───────────────────────────────────────────────────────────────

export const api = {
  notes: {
    list: (params?: NoteListParams) =>
      request<{ data: ApiNote[]; total: number; limit: number; offset: number }>(
        `/notes${toQuery(params as Record<string, unknown>)}`,
      ),
    get: (id: string) => request<ApiNote>(`/notes/${id}`),
    create: (body: CreateNoteBody) =>
      request<ApiNote>("/notes", { method: "POST", body: JSON.stringify(body) }),
    update: (id: string, body: Partial<CreateNoteBody>) =>
      request<ApiNote>(`/notes/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    process: (id: string, body: { type: "literature" | "permanent"; status?: string }) =>
      request<ApiNote>(`/notes/${id}/process`, { method: "POST", body: JSON.stringify(body) }),
    delete: (id: string) => request<void>(`/notes/${id}`, { method: "DELETE" }),
  },
  tags: {
    list: () => request<ApiTag[]>("/tags"),
  },
  connections: {
    list: (noteId: string) =>
      request<{ id: string; label: string | null; strength: number; direction: string; note: { id: string; title: string; type: string } }[]>(
        `/connections?noteId=${encodeURIComponent(noteId)}`,
      ),
    create: (body: { fromNoteId: string; toNoteId: string; label?: string; strength?: number }) =>
      request<{ id: string }>("/connections", { method: "POST", body: JSON.stringify(body) }),
    delete: (id: string) => request<void>(`/connections/${id}`, { method: "DELETE" }),
  },
  dailyNotes: {
    get: (date: string) => request<ApiDailyNote>(`/daily-notes/${date}`),
    upsert: (date: string, body: { intention: string; studied: string; tomorrow: string }) =>
      request<ApiDailyNote>(`/daily-notes/${date}`, { method: "PUT", body: JSON.stringify(body) }),
  },
  vault: {
    stats: () => request<ApiVaultStats>("/vault/stats"),
    graph: () => request<{ nodes: ApiGraphNode[]; edges: ApiGraphEdge[] }>("/vault/graph"),
  },
  habits: {
    list: (date?: string) =>
      request<ApiHabit[]>(`/habits${date ? `?date=${date}` : ""}`),
    create: (body: { name: string; description?: string; keywords: string[]; color: string }) =>
      request<ApiHabit>("/habits", { method: "POST", body: JSON.stringify(body) }),
    update: (id: string, body: Partial<{ name: string; description: string; keywords: string[]; color: string; isActive: boolean }>) =>
      request<ApiHabit>(`/habits/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    delete: (id: string) => request<void>(`/habits/${id}`, { method: "DELETE" }),
    log: (id: string, body: { date?: string; toggle?: boolean; source?: string }) =>
      request<{ completed: boolean; source?: string }>(`/habits/${id}/log`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    aiDetect: (date?: string) =>
      request<{ detected: string[]; date: string }>("/habits/ai-detect", {
        method: "POST",
        body: JSON.stringify({ date }),
      }),
  },
  todos: {
    list: () => request<{ todos: ApiTodo[] }>("/notes/todos"),
    toggle: (noteId: string, lineIndex: number, checked: boolean) =>
      request<{ content: string }>(`/notes/${noteId}/todos`, {
        method: "PATCH",
        body: JSON.stringify({ lineIndex, checked }),
      }),
  },
  tasks: {
    list: (params?: { parentId?: string; completed?: boolean }) =>
      request<{ tasks: ApiTask[] }>(`/tasks${toQuery(params as Record<string, unknown>)}`),
    create: (body: { title: string; description?: string; parentId?: string; dueDate?: string; priority?: number }) =>
      request<ApiTask>("/tasks", { method: "POST", body: JSON.stringify(body) }),
    update: (id: string, body: Partial<{ title: string; description: string; completed: boolean; dueDate: string | null; priority: number; parentId: string | null }>) =>
      request<ApiTask>(`/tasks/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    delete: (id: string) => request<void>(`/tasks/${id}`, { method: "DELETE" }),
  },
  ai: {
    suggestAreas: (notes: Array<{ title: string; type: string; tags: string[] }>) =>
      request<{ suggestions: string }>("/ai/suggest-areas", {
        method: "POST",
        body: JSON.stringify({ notes }),
      }),
  },
};
