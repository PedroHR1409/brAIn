const BASE = (import.meta.env.VITE_SERVER_URL as string | undefined) ?? "http://localhost:3000";

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
  },
};
