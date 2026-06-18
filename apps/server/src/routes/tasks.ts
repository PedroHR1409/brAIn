import { db, tasks } from "@my-better-t-app/db";
import { and, asc, eq, isNull } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";

export const tasksRouter = Router();

// ─── GET /tasks ───────────────────────────────────────────────────────────────
// ?parentId=uuid — subtasks of a given parent
// ?completed=true — include completed tasks
// default: top-level pending tasks

tasksRouter.get("/", async (req, res) => {
  const parentId   = req.query.parentId as string | undefined;
  const completed  = req.query.completed === "true";

  const rows = await db
    .select()
    .from(tasks)
    .where(
      and(
        parentId ? eq(tasks.parentId, parentId) : isNull(tasks.parentId),
        completed ? undefined : eq(tasks.completed, false),
      ),
    )
    .orderBy(asc(tasks.position), asc(tasks.createdAt));

  return res.json({ tasks: rows });
});

// ─── POST /tasks ──────────────────────────────────────────────────────────────

tasksRouter.post("/", async (req, res) => {
  const schema = z.object({
    title:       z.string().min(1).max(500),
    description: z.string().default(""),
    parentId:    z.string().uuid().optional(),
    dueDate:     z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    priority:    z.number().int().min(1).max(4).default(2),
    position:    z.number().default(0),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const [task] = await db.insert(tasks).values(parsed.data).returning();
  return res.status(201).json(task);
});

// ─── PATCH /tasks/:id ─────────────────────────────────────────────────────────

tasksRouter.patch("/:id", async (req, res) => {
  const schema = z.object({
    title:       z.string().min(1).max(500).optional(),
    description: z.string().optional(),
    completed:   z.boolean().optional(),
    dueDate:     z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
    priority:    z.number().int().min(1).max(4).optional(),
    position:    z.number().optional(),
    parentId:    z.string().uuid().nullable().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const updates: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.completed === true)  updates.completedAt = new Date();
  if (parsed.data.completed === false) updates.completedAt = null;

  const [task] = await db
    .update(tasks)
    .set(updates)
    .where(eq(tasks.id, req.params.id))
    .returning();

  if (!task) return res.status(404).json({ error: "Task not found" });
  return res.json(task);
});

// ─── DELETE /tasks/:id ────────────────────────────────────────────────────────

tasksRouter.delete("/:id", async (req, res) => {
  const deleted = await db
    .delete(tasks)
    .where(eq(tasks.id, req.params.id))
    .returning({ id: tasks.id });

  if (deleted.length === 0) return res.status(404).json({ error: "Task not found" });
  return res.status(204).send();
});
