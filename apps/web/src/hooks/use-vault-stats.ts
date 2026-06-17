import { useCallback, useEffect, useState } from "react";
import { api, type ApiVaultStats } from "@/lib/api";
import { brainEvents } from "@/lib/events";

export function useVaultStats() {
  const [stats, setStats] = useState<ApiVaultStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.vault.stats();
      setStats(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar stats");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => brainEvents.on("note-created", fetchStats), [fetchStats]);
  useEffect(() => brainEvents.on("note-updated", fetchStats), [fetchStats]);
  useEffect(() => brainEvents.on("note-deleted", fetchStats), [fetchStats]);

  return { stats, loading, error, refetch: fetchStats };
}
