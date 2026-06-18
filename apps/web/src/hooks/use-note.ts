import { useCallback, useEffect, useRef, useState } from "react";
import { api, type ApiNote, type CreateNoteBody } from "@/lib/api";
import { brainEvents } from "@/lib/events";

export function useNote(id: string) {
  const [note, setNote] = useState<ApiNote | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Ref so update() never has stale closure over note state
  const noteRef = useRef<ApiNote | null>(null);

  const fetchNote = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.notes.get(id);
      setNote(data);
      noteRef.current = data;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error loading note");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchNote();
  }, [fetchNote]);

  // update depends only on id, not on note state — no more stale closure
  const update = useCallback(
    (fields: Partial<CreateNoteBody>) => {
      if (!noteRef.current) return;
      const optimistic = { ...noteRef.current, ...fields } as ApiNote;
      setNote(optimistic);
      noteRef.current = optimistic;

      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      saveTimeout.current = setTimeout(async () => {
        setSaving(true);
        try {
          const saved = await api.notes.update(id, fields);
          setNote(saved);
          noteRef.current = saved;
          brainEvents.emit("note-updated");
        } catch (e) {
          setError(e instanceof Error ? e.message : "Error saving note");
        } finally {
          setSaving(false);
        }
      }, 600);
    },
    [id],
  );

  // processNote uses separate processing state so action buttons stay enabled during auto-save
  const processNote = useCallback(
    async (type: "literature" | "permanent") => {
      setProcessing(true);
      try {
        const saved = await api.notes.process(id, { type });
        // Preserve existing tags if server omits them (defensive)
        const merged: ApiNote = { ...saved, tags: saved.tags ?? noteRef.current?.tags ?? [] };
        setNote(merged);
        noteRef.current = merged;
        brainEvents.emit("note-updated");
        return merged;
      } finally {
        setProcessing(false);
      }
    },
    [id],
  );

  return { note, loading, saving, processing, error, update, processNote, refetch: fetchNote };
}
