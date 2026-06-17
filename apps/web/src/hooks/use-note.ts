import { useCallback, useEffect, useRef, useState } from "react";
import { api, type ApiNote, type CreateNoteBody } from "@/lib/api";
import { brainEvents } from "@/lib/events";

export function useNote(id: string) {
  const [note, setNote] = useState<ApiNote | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchNote = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.notes.get(id);
      setNote(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar nota");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchNote();
  }, [fetchNote]);

  const update = useCallback(
    (fields: Partial<CreateNoteBody>) => {
      if (!note) return;
      const optimistic = { ...note, ...fields } as ApiNote;
      setNote(optimistic);

      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      saveTimeout.current = setTimeout(async () => {
        setSaving(true);
        try {
          const saved = await api.notes.update(id, fields);
          setNote(saved);
          brainEvents.emit("note-updated");
        } catch (e) {
          setError(e instanceof Error ? e.message : "Erro ao salvar");
        } finally {
          setSaving(false);
        }
      }, 600);
    },
    [id, note],
  );

  const processNote = useCallback(
    async (type: "literature" | "permanent") => {
      setSaving(true);
      try {
        const saved = await api.notes.process(id, { type });
        setNote(saved);
        brainEvents.emit("note-updated");
        return saved;
      } finally {
        setSaving(false);
      }
    },
    [id],
  );

  return { note, loading, saving, error, update, processNote, refetch: fetchNote };
}
