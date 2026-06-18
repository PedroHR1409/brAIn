import { useCallback, useEffect, useState } from "react";
import { api, type ApiNote, type NoteListParams } from "@/lib/api";
import { brainEvents } from "@/lib/events";

export function useNotes(params: NoteListParams = {}) {
  const [notes, setNotes] = useState<ApiNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Stringify for stable dep
  const paramsKey = JSON.stringify(params);

  const fetchNotes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.notes.list(JSON.parse(paramsKey) as NoteListParams);
      setNotes(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar notas");
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramsKey]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  useEffect(() => brainEvents.on("note-created", fetchNotes), [fetchNotes]);
  useEffect(() => brainEvents.on("note-updated", fetchNotes), [fetchNotes]);
  useEffect(() => brainEvents.on("note-deleted", fetchNotes), [fetchNotes]);

  return { notes, loading, error, refetch: fetchNotes };
}

export function useCreateNote() {
  const [loading, setLoading] = useState(false);

  const create = useCallback(
    async (body: Parameters<typeof api.notes.create>[0]) => {
      setLoading(true);
      try {
        const note = await api.notes.create(body);
        brainEvents.emit("note-created");
        return note;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  return { create, loading };
}

export function useProcessNote() {
  const [loading, setLoading] = useState(false);

  const process = useCallback(
    async (id: string, body: { type: "literature" | "permanent" }) => {
      setLoading(true);
      try {
        const note = await api.notes.process(id, body);
        brainEvents.emit("note-updated");
        return note;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  return { process, loading };
}

export function useInboxCount() {
  const [count, setCount] = useState<number | null>(null);

  const fetch = useCallback(async () => {
    try {
      // Use a high limit — `total` in the response is page-length, not overall count
      const { data } = await api.notes.list({ status: "inbox", limit: 200 });
      setCount(data.length);
    } catch {}
  }, []);

  useEffect(() => { fetch(); }, [fetch]);
  useEffect(() => brainEvents.on("note-created", fetch), [fetch]);
  useEffect(() => brainEvents.on("note-updated", fetch), [fetch]);
  useEffect(() => brainEvents.on("note-deleted", fetch), [fetch]);

  return count;
}

export function useDeleteNote() {
  const [loading, setLoading] = useState(false);

  const remove = useCallback(async (id: string) => {
    setLoading(true);
    try {
      await api.notes.delete(id);
      brainEvents.emit("note-deleted");
    } finally {
      setLoading(false);
    }
  }, []);

  return { remove, loading };
}
