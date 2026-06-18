import { useCallback, useEffect, useRef, useState } from "react";
import { api, type ApiDailyNote } from "@/lib/api";

export function useDailyNote(date: string) {
  const empty: ApiDailyNote = { date, intention: "", studied: "", tomorrow: "" };
  const [note, setNote] = useState<ApiDailyNote>(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Always holds the latest note values — avoids stale closure on rapid typing
  const noteRef = useRef<ApiDailyNote>(empty);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api.dailyNotes
      .get(date)
      .then((data) => {
        if (!cancelled) {
          setNote(data);
          noteRef.current = data;
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Erro ao carregar nota diária");
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [date]);

  const save = useCallback(
    (fields: { intention?: string; studied?: string; tomorrow?: string }) => {
      // Merge into ref immediately so subsequent rapid calls get fresh values
      const updated = { ...noteRef.current, ...fields };
      noteRef.current = updated;
      setNote(updated);

      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      saveTimeout.current = setTimeout(async () => {
        setSaving(true);
        try {
          const saved = await api.dailyNotes.upsert(date, {
            intention: noteRef.current.intention,
            studied:   noteRef.current.studied,
            tomorrow:  noteRef.current.tomorrow,
          });
          setNote(saved);
          noteRef.current = saved;
          setError(null);
        } catch (e) {
          setError(e instanceof Error ? e.message : "Erro ao salvar nota diária");
        } finally {
          setSaving(false);
        }
      }, 800);
    },
    [date], // stable — does not depend on note state
  );

  return { note, loading, saving, error, save };
}
