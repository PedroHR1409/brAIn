import { db, connections, notes } from "@my-better-t-app/db";
import { count, sql } from "drizzle-orm";
import { Router } from "express";
import { ne } from "drizzle-orm";

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

// ─── GET /vault/graph ─────────────────────────────────────────────────────────

vaultRouter.get("/graph", async (_req, res) => {
  const [allNotes, allEdges] = await Promise.all([
    db.select({ id: notes.id, title: notes.title, type: notes.type }).from(notes),
    db.select({ fromNoteId: connections.fromNoteId, toNoteId: connections.toNoteId }).from(connections),
  ]);

  const connectionCountMap = new Map<string, number>();
  for (const note of allNotes) connectionCountMap.set(note.id, 0);
  for (const edge of allEdges) {
    connectionCountMap.set(edge.fromNoteId, (connectionCountMap.get(edge.fromNoteId) ?? 0) + 1);
    connectionCountMap.set(edge.toNoteId, (connectionCountMap.get(edge.toNoteId) ?? 0) + 1);
  }

  return res.json({
    nodes: allNotes.map((n) => ({ ...n, connectionCount: connectionCountMap.get(n.id) ?? 0 })),
    edges: allEdges,
  });
});
