import { db, noteTags, tags } from "@my-better-t-app/db";
import { asc, count, eq } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";

export const tagsRouter = Router();

// ─── GET /tags ────────────────────────────────────────────────────────────────

tagsRouter.get("/", async (_req, res) => {
  const rows = await db
    .select({
      id: tags.id,
      name: tags.name,
      color: tags.color,
      createdAt: tags.createdAt,
      noteCount: count(noteTags.noteId),
    })
    .from(tags)
    .leftJoin(noteTags, eq(tags.id, noteTags.tagId))
    .groupBy(tags.id)
    .orderBy(asc(tags.name));

  return res.json(rows);
});

// ─── POST /tags ───────────────────────────────────────────────────────────────

tagsRouter.post("/", async (req, res) => {
  const schema = z.object({
    name: z.string().min(1).max(50),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const [tag] = await db
    .insert(tags)
    .values({ ...parsed.data, name: parsed.data.name.toLowerCase().trim() })
    .onConflictDoNothing()
    .returning();

  if (!tag) return res.status(409).json({ error: "Tag already exists" });

  return res.status(201).json(tag);
});

// ─── PATCH /tags/:id ──────────────────────────────────────────────────────────

tagsRouter.patch("/:id", async (req, res) => {
  const schema = z.object({
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().nullable(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const [tag] = await db
    .update(tags)
    .set(parsed.data)
    .where(eq(tags.id, req.params.id))
    .returning();

  if (!tag) return res.status(404).json({ error: "Tag not found" });

  return res.json(tag);
});

// ─── DELETE /tags/:id ─────────────────────────────────────────────────────────

tagsRouter.delete("/:id", async (req, res) => {
  const deleted = await db.delete(tags).where(eq(tags.id, req.params.id)).returning({ id: tags.id });
  if (deleted.length === 0) return res.status(404).json({ error: "Tag not found" });
  return res.status(204).send();
});
