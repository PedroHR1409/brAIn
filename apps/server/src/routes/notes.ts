import {
  db,
  connections,
  notes,
  noteTags,
  tags,
} from "@my-better-t-app/db";
import {
  and,
  desc,
  eq,
  getTableColumns,
  ilike,
  inArray,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";

export const notesRouter = Router();

// ─── Validation schemas ────────────────────────────────────────────────────────

const noteTypeValues = ["fleeting", "literature", "permanent"] as const;
const sourceTypeValues = ["article", "book", "podcast", "other"] as const;
const noteStatusValues = ["inbox", "active", "on_hold", "done", "archived"] as const;
const paraCategoryValues = ["project", "area", "resource", "archive"] as const;

const createNoteSchema = z.object({
  title: z.string().min(1).max(500),
  content: z.string().default(""),
  type: z.enum(noteTypeValues).default("fleeting"),
  sourceType: z.enum(sourceTypeValues).optional(),
  sourceUrl: z.string().url().optional(),
  author: z.string().optional(),
  status: z.enum(noteStatusValues).default("inbox"),
  para: z.enum(paraCategoryValues).optional(),
  strength: z.number().int().min(0).max(100).default(0),
  tags: z.array(z.string().min(1).max(50)).default([]),
});

const updateNoteSchema = createNoteSchema.partial();

const listQuerySchema = z.object({
  type: z.enum(noteTypeValues).optional(),
  status: z.enum(noteStatusValues).optional(),
  para: z.enum(paraCategoryValues).optional(),
  q: z.string().optional(),
  tag: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Upsert tags by name and return their IDs */
async function upsertTagNames(names: string[]): Promise<string[]> {
  if (names.length === 0) return [];
  const unique = [...new Set(names.map((n) => n.toLowerCase().trim()))];
  await db.insert(tags).values(unique.map((name) => ({ name }))).onConflictDoNothing();
  const rows = await db.select({ id: tags.id, name: tags.name })
    .from(tags)
    .where(inArray(tags.name, unique));
  return rows.map((r) => r.id);
}

/** Replace a note's tags */
async function replaceNoteTags(noteId: string, tagNames: string[]) {
  await db.delete(noteTags).where(eq(noteTags.noteId, noteId));
  const tagIds = await upsertTagNames(tagNames);
  if (tagIds.length > 0) {
    await db.insert(noteTags).values(tagIds.map((tagId) => ({ noteId, tagId }))).onConflictDoNothing();
  }
}

/** Fetch tags grouped by note IDs */
async function fetchTagsForNotes(noteIds: string[]): Promise<Record<string, string[]>> {
  if (noteIds.length === 0) return {};
  const rows = await db
    .select({ noteId: noteTags.noteId, tagName: tags.name })
    .from(noteTags)
    .innerJoin(tags, eq(noteTags.tagId, tags.id))
    .where(inArray(noteTags.noteId, noteIds));

  return rows.reduce<Record<string, string[]>>((acc, { noteId, tagName }) => {
    (acc[noteId] ??= []).push(tagName);
    return acc;
  }, {});
}

/** Count connections per note */
async function fetchConnectionCounts(noteIds: string[]): Promise<Record<string, number>> {
  if (noteIds.length === 0) return {};
  const rows = await db
    .select({
      noteId: sql<string>`unnest(ARRAY[${connections.fromNoteId}, ${connections.toNoteId}])`,
      cnt: sql<number>`count(*)::int`,
    })
    .from(connections)
    .where(
      or(
        inArray(connections.fromNoteId, noteIds),
        inArray(connections.toNoteId, noteIds),
      ),
    )
    .groupBy(sql`1`);

  return rows.reduce<Record<string, number>>((acc, { noteId, cnt }) => {
    if (noteIds.includes(noteId)) acc[noteId] = (acc[noteId] ?? 0) + cnt;
    return acc;
  }, {});
}

// ─── GET /notes ───────────────────────────────────────────────────────────────

notesRouter.get("/", async (req, res) => {
  const parsed = listQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const { type, status, para, q, tag, limit, offset } = parsed.data;
  const conditions: SQL[] = [];

  if (type) conditions.push(eq(notes.type, type));
  if (status) conditions.push(eq(notes.status, status));
  if (para) conditions.push(eq(notes.para, para));
  if (q) conditions.push(or(ilike(notes.title, `%${q}%`), ilike(notes.content, `%${q}%`))!);
  if (tag) {
    const subq = db
      .select({ noteId: noteTags.noteId })
      .from(noteTags)
      .innerJoin(tags, eq(noteTags.tagId, tags.id))
      .where(eq(tags.name, tag.toLowerCase().trim()));
    conditions.push(inArray(notes.id, subq));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db
    .select(getTableColumns(notes))
    .from(notes)
    .where(where)
    .orderBy(desc(notes.createdAt))
    .limit(limit)
    .offset(offset);

  const ids = rows.map((r) => r.id);
  const [tagsByNote, countsByNote] = await Promise.all([
    fetchTagsForNotes(ids),
    fetchConnectionCounts(ids),
  ]);

  const data = rows.map((n) => ({
    ...n,
    tags: tagsByNote[n.id] ?? [],
    connections: countsByNote[n.id] ?? 0,
  }));

  return res.json({ data, total: data.length, limit, offset });
});

// ─── GET /notes/todos ─────────────────────────────────────────────────────────
// MUST be before /:id so Express doesn't treat "todos" as a note ID

notesRouter.get("/todos", async (_req, res) => {
  const rows = await db
    .select({ id: notes.id, title: notes.title, content: notes.content })
    .from(notes)
    .where(
      sql`(${notes.content} LIKE '%- [ ] %' OR ${notes.content} LIKE '%* [ ] %')`,
    )
    .orderBy(desc(notes.updatedAt))
    .limit(200);

  const todos: { noteId: string; noteTitle: string; text: string; lineIndex: number }[] = [];

  for (const note of rows) {
    const lines = note.content.split("\n");
    lines.forEach((line, lineIndex) => {
      const m = line.match(/^\s*[-*] \[ \] (.+)/);
      if (m) todos.push({ noteId: note.id, noteTitle: note.title, text: m[1]!.trim(), lineIndex });
    });
  }

  return res.json({ todos: todos.slice(0, 30) });
});

// ─── GET /notes/:id ───────────────────────────────────────────────────────────

notesRouter.get("/:id", async (req, res) => {
  const note = await db.query.notes.findFirst({
    where: eq(notes.id, req.params.id),
    with: {
      noteTags: { with: { tag: true } },
      connectionsFrom: { with: { toNote: true } },
      connectionsTo: { with: { fromNote: true } },
    },
  });

  if (!note) return res.status(404).json({ error: "Note not found" });

  return res.json({
    ...note,
    tags: note.noteTags.map((nt) => nt.tag.name),
    noteTags: undefined,
    connectionsFrom: note.connectionsFrom.map((c) => ({
      id: c.id,
      noteId: c.toNoteId,
      title: c.toNote.title,
      type: c.toNote.type,
      label: c.label,
      strength: c.strength,
    })),
    connectionsTo: note.connectionsTo.map((c) => ({
      id: c.id,
      noteId: c.fromNoteId,
      title: c.fromNote.title,
      type: c.fromNote.type,
      label: c.label,
      strength: c.strength,
    })),
  });
});

// ─── POST /notes ──────────────────────────────────────────────────────────────

notesRouter.post("/", async (req, res) => {
  const parsed = createNoteSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { tags: tagNames, ...noteData } = parsed.data;

  const note = (await db.insert(notes).values(noteData).returning())[0];
  if (!note) return res.status(500).json({ error: "Failed to create note" });
  await replaceNoteTags(note.id, tagNames);

  return res.status(201).json({ ...note, tags: tagNames });
});

// ─── PATCH /notes/:id ─────────────────────────────────────────────────────────

notesRouter.patch("/:id", async (req, res) => {
  const parsed = updateNoteSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { tags: tagNames, ...noteData } = parsed.data;

  const existing = await db.select({ id: notes.id }).from(notes).where(eq(notes.id, req.params.id));
  if (existing.length === 0) return res.status(404).json({ error: "Note not found" });

  const note = (await db.update(notes).set(noteData).where(eq(notes.id, req.params.id)).returning())[0];
  if (!note) return res.status(500).json({ error: "Failed to update note" });

  if (tagNames !== undefined) await replaceNoteTags(note.id, tagNames);

  const currentTags = tagNames !== undefined
    ? tagNames
    : (await db.select({ name: tags.name }).from(noteTags).innerJoin(tags, eq(noteTags.tagId, tags.id)).where(eq(noteTags.noteId, note.id))).map((r) => r.name);

  return res.json({ ...note, tags: currentTags });
});

// ─── POST /notes/:id/process ──────────────────────────────────────────────────

/** Promote a fleeting note to literature or permanent */
notesRouter.post("/:id/process", async (req, res) => {
  const schema = z.object({
    type: z.enum(["literature", "permanent"]),
    status: z.enum(noteStatusValues).default("active"),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const [note] = await db
    .update(notes)
    .set({ ...parsed.data, processedAt: new Date() })
    .where(eq(notes.id, req.params.id))
    .returning();

  if (!note) return res.status(404).json({ error: "Note not found" });

  const tagRows = await db
    .select({ name: tags.name })
    .from(noteTags)
    .innerJoin(tags, eq(noteTags.tagId, tags.id))
    .where(eq(noteTags.noteId, note.id));

  return res.json({ ...note, tags: tagRows.map((r) => r.name) });
});

// ─── DELETE /notes/:id ────────────────────────────────────────────────────────

notesRouter.delete("/:id", async (req, res) => {
  const deleted = await db.delete(notes).where(eq(notes.id, req.params.id)).returning({ id: notes.id });
  if (deleted.length === 0) return res.status(404).json({ error: "Note not found" });
  return res.status(204).send();
});

// ─── PATCH /notes/:id/todos ───────────────────────────────────────────────────
// Toggle a specific todo line in a note

notesRouter.patch("/:id/todos", async (req, res) => {
  const schema = z.object({ lineIndex: z.number().int().min(0), checked: z.boolean() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const note = await db.query.notes.findFirst({ where: eq(notes.id, req.params.id) });
  if (!note) return res.status(404).json({ error: "Note not found" });

  const lines = note.content.split("\n");
  const { lineIndex, checked } = parsed.data;
  if (lineIndex >= lines.length) return res.status(400).json({ error: "Invalid line" });

  lines[lineIndex] = (lines[lineIndex] ?? "")
    .replace(/^(\s*[-*]) \[ \] /, (_, b) => checked ? `${b} [x] ` : `${b} [ ] `)
    .replace(/^(\s*[-*]) \[x\] /, (_, b) => checked ? `${b} [x] ` : `${b} [ ] `);

  const newContent = lines.join("\n");
  await db.update(notes).set({ content: newContent }).where(eq(notes.id, req.params.id));

  return res.json({ content: newContent });
});
