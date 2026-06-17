import { useCallback, useEffect, useRef, useState } from "react";
import { api, type ApiDailyNote } from "@/lib/api";

export function useDailyNote(date: string) {
  const [note, setNote] = useState<ApiDailyNote>({ date, intention: "", studied: "", tomorrow: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.dailyNotes
      .get(date)
      .then((data) => { if (!cancelled) setNote(data); })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : "Erro"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [date]);

  const save = useCallback(
    async (fields: { intention?: string; studied?: string; tomorrow?: string }) => {
      const updated = { ...note, ...fields };
      setNote(updated);

      // Debounce 800 ms
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      saveTimeout.current = setTimeout(async () => {
        setSaving(true);
        try {
          const saved = await api.dailyNotes.upsert(date, {
            intention: updated.intention,
            studied: updated.studied,
            tomorrow: updated.tomorrow,
          });
          setNote(saved);
        } catch (e) {
          setError(e instanceof Error ? e.message : "Erro ao salvar");
        } finally {
          setSaving(false);
        }
      }, 800);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [date, note],
  );

  return { note, loading, saving, error, save };
}
