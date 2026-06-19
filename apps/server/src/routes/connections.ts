import { db, connections, notes } from "@my-better-t-app/db";
import { eq, or } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";

export const connectionsRouter = Router();

// ─── GET /connections?noteId=:id ──────────────────────────────────────────────

connectionsRouter.get("/", async (req, res) => {
  const schema = z.object({ noteId: z.string().uuid() });
  const parsed = schema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { noteId } = parsed.data;
  const rows = await db.query.connections.findMany({
    where: or(eq(connections.fromNoteId, noteId), eq(connections.toNoteId, noteId)),
    with: { fromNote: true, toNote: true },
    orderBy: (c, { desc }) => [desc(c.createdAt)],
  });

  const formatted = rows
    .filter((c) => {
      // Skip orphaned connections where the other note was deleted
      const isFrom = c.fromNoteId === noteId;
      return isFrom ? !!c.toNote : !!c.fromNote;
    })
    .map((c) => {
      const isFrom = c.fromNoteId === noteId;
      const other = (isFrom ? c.toNote : c.fromNote)!;
      return {
        id: c.id,
        label: c.label,
        strength: c.strength,
        direction: isFrom ? "outgoing" : "incoming",
        note: { id: other.id, title: other.title, type: other.type },
      };
    });

  return res.json(formatted);
});

// ─── POST /connections ────────────────────────────────────────────────────────

connectionsRouter.post("/", async (req, res) => {
  const schema = z.object({
    fromNoteId: z.string().uuid(),
    toNoteId: z.string().uuid(),
    label: z.string().max(100).optional(),
    strength: z.number().int().min(1).max(10).default(1),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  if (parsed.data.fromNoteId === parsed.data.toNoteId) {
    return res.status(400).json({ error: "Cannot connect a note to itself" });
  }

  // Verify both notes exist
  const [from, to] = await Promise.all([
    db.select({ id: notes.id }).from(notes).where(eq(notes.id, parsed.data.fromNoteId)),
    db.select({ id: notes.id }).from(notes).where(eq(notes.id, parsed.data.toNoteId)),
  ]);
  if (from.length === 0 || to.length === 0) {
    return res.status(404).json({ error: "One or both notes not found" });
  }

  const [connection] = await db
    .insert(connections)
    .values(parsed.data)
    .onConflictDoNothing()
    .returning();

  if (!connection) return res.status(409).json({ error: "Connection already exists" });

  return res.status(201).json(connection);
});

// ─── PATCH /connections/:id ───────────────────────────────────────────────────

connectionsRouter.patch("/:id", async (req, res) => {
  const schema = z.object({
    label: z.string().max(100).optional().nullable(),
    strength: z.number().int().min(1).max(10).optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const [connection] = await db
    .update(connections)
    .set(parsed.data)
    .where(eq(connections.id, req.params.id))
    .returning();

  if (!connection) return res.status(404).json({ error: "Connection not found" });

  return res.json(connection);
});

// ─── DELETE /connections/:id ──────────────────────────────────────────────────

connectionsRouter.delete("/:id", async (req, res) => {
  const deleted = await db
    .delete(connections)
    .where(eq(connections.id, req.params.id))
    .returning({ id: connections.id });

  if (deleted.length === 0) return res.status(404).json({ error: "Connection not found" });

  return res.status(204).send();
});
