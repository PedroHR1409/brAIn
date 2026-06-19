import { db, connections, notes } from "@my-better-t-app/db";
import { count, sql } from "drizzle-orm";
import { Router } from "express";

export const vaultRouter = Router();

// ─── GET /vault/stats ─────────────────────────────────────────────────────────

vaultRouter.get("/stats", async (_req, res) => {
  try {
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
  } catch (err) {
    console.error("[vault/stats]", err);
    return res.status(500).json({ error: "Failed to load vault stats" });
  }
});

// ─── GET /vault/graph ─────────────────────────────────────────────────────────

vaultRouter.get("/graph", async (_req, res) => {
  try {
    const [allNotes, allConnectionRows] = await Promise.all([
      db.select({ id: notes.id, title: notes.title, type: notes.type }).from(notes),
      db.query.connections.findMany({ columns: { fromNoteId: true, toNoteId: true } }),
    ]);

    // Deduplicate bidirectional edges — A→B and B→A render on top of each other
    const seen = new Set<string>();
    const allEdges = allConnectionRows
      .filter((c) => {
        const k1 = `${c.fromNoteId}|${c.toNoteId}`;
        const k2 = `${c.toNoteId}|${c.fromNoteId}`;
        if (seen.has(k1) || seen.has(k2)) return false;
        seen.add(k1);
        return true;
      })
      .map((c) => ({ fromNoteId: c.fromNoteId, toNoteId: c.toNoteId }));

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
  } catch (err) {
    console.error("[vault/graph]", err);
    return res.status(500).json({ error: "Failed to load vault graph" });
  }
});
