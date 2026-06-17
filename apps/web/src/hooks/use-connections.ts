import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";

export interface NoteConnection {
  id: string;
  label: string | null;
  strength: number;
  direction: string;
  note: { id: string; title: string; type: string };
}

export function useConnections(noteId: string) {
  const [connections, setConnections] = useState<NoteConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.connections.list(noteId);
      setConnections(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar conexões");
    } finally {
      setLoading(false);
    }
  }, [noteId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const remove = useCallback(
    async (connectionId: string) => {
      await api.connections.delete(connectionId);
      setConnections((prev) => prev.filter((c) => c.id !== connectionId));
    },
    [],
  );

  return { connections, loading, error, refetch: fetch, remove };
}
