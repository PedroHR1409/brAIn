import { db, connections, notes } from "@my-better-t-app/db";
import { count, sql } from "drizzle-orm";
import { Router } from "express";

export const vaultRouter = Router();

// ─── GET /vault/stats ─────────────────────────────────────────────────────────

vaultRouter.get("/stats", async (_req, res) => {
  const [noteStatsRows, connectionRows] = await Promise.all([
    db
      .select({
        total: count(),
        permanent: sql<number>`COUNT(*) FILTER (WHERE type = 'permanent')::int`,
        literature: sql<number>`COUNT(*) FILTER (WHERE type = 'literature')::int`,
        fleeting: sql<number>`COUNT(*) FILTER (WHERE type = 'fleeting')::int`,
        pending: sql<number>`COUNT(*) FILTER (WHERE type = 'fleeting' AND status = 'inbox')::int`,
      })
      .from(notes),
    db.select({ total: count() }).from(connections),
  ]);

  const noteStats = noteStatsRows[0] ?? { total: 0, permanent: 0, literature: 0, fleeting: 0, pending: 0 };
  const totalConnections = connectionRows[0]?.total ?? 0;

  const total = noteStats.total;
  const permanent = noteStats.permanent ?? 0;
  const pending = noteStats.pending ?? 0;

  const permanentRatio = total > 0 ? permanent / total : 0;
  const pendingRatio = total > 0 ? pending / total : 0;
  const healthScore = Math.round(
    Math.max(0, Math.min(100, permanentRatio * 80 + (1 - pendingRatio) * 20)),
  );

  return res.json({
    total,
    permanent,
    literature: noteStats.literature ?? 0,
    fleeting: noteStats.fleeting ?? 0,
    pending,
    connections: totalConnections,
    healthScore,
  });
});
