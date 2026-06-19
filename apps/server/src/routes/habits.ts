import { db, habits, habitLogs, notes } from "@my-better-t-app/db";
import { and, eq, gte, lte } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";

export const habitsRouter = Router();

// ─── GET /habits?date=YYYY-MM-DD ─────────────────────────────────────────────

habitsRouter.get("/", async (req, res) => {
  const date = (req.query.date as string) || todayISO();

  const [allHabits, logsForDate] = await Promise.all([
    db.select().from(habits).where(eq(habits.isActive, true)).orderBy(habits.createdAt),
    db.select().from(habitLogs).where(eq(habitLogs.date, date)),
  ]);

  const logMap = new Map(logsForDate.map((l) => [l.habitId, l]));

  return res.json(
    allHabits.map((h) => ({
      ...h,
      completedToday: logMap.has(h.id),
      logSource: logMap.get(h.id)?.source ?? null,
    })),
  );
});

// ─── GET /habits/logs?days=30 ─────────────────────────────────────────────────
// Returns all habit log dates within the last N days (for history grid display)

habitsRouter.get("/logs", async (req, res) => {
  const days = Math.min(parseInt(req.query.days as string) || 30, 365);
  const today = todayISO();
  const start = new Date();
  start.setDate(start.getDate() - (days - 1));
  const startDate = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`;

  const logs = await db
    .select({ habitId: habitLogs.habitId, date: habitLogs.date })
    .from(habitLogs)
    .where(and(gte(habitLogs.date, startDate), lte(habitLogs.date, today)));

  return res.json({ logs });
});

// ─── POST /habits ─────────────────────────────────────────────────────────────

habitsRouter.post("/", async (req, res) => {
  const schema = z.object({
    name:        z.string().min(1).max(100),
    description: z.string().optional(),
    keywords:    z.array(z.string()).default([]),
    color:       z.string().default("#8B5CF6"),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const [habit] = await db.insert(habits).values(parsed.data).returning();
  return res.status(201).json({ ...habit, completedToday: false, logSource: null });
});

// ─── PATCH /habits/:id ────────────────────────────────────────────────────────

habitsRouter.patch("/:id", async (req, res) => {
  const schema = z.object({
    name:        z.string().min(1).max(100).optional(),
    description: z.string().optional(),
    keywords:    z.array(z.string()).optional(),
    color:       z.string().optional(),
    isActive:    z.boolean().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const [habit] = await db.update(habits).set(parsed.data).where(eq(habits.id, req.params.id)).returning();
  if (!habit) return res.status(404).json({ error: "Habit not found" });

  // Include today's log status so the client doesn't lose completedToday / logSource
  const today = todayISO();
  const [log] = await db
    .select({ source: habitLogs.source })
    .from(habitLogs)
    .where(and(eq(habitLogs.habitId, habit.id), eq(habitLogs.date, today)));

  return res.json({
    ...habit,
    completedToday: !!log,
    logSource: log?.source ?? null,
  });
});

// ─── DELETE /habits/:id ───────────────────────────────────────────────────────

habitsRouter.delete("/:id", async (req, res) => {
  const deleted = await db.delete(habits).where(eq(habits.id, req.params.id)).returning({ id: habits.id });
  if (deleted.length === 0) return res.status(404).json({ error: "Habit not found" });
  return res.status(204).send();
});

// ─── POST /habits/:id/log ─────────────────────────────────────────────────────

habitsRouter.post("/:id/log", async (req, res) => {
  const schema = z.object({
    date:   z.string().default(() => todayISO()),
    toggle: z.boolean().default(true),
    source: z.enum(["manual", "ai"]).default("manual"),
    noteId: z.string().uuid().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { date, toggle, source, noteId } = parsed.data;
  const habitId = req.params.id;

  const existing = await db.select({ id: habitLogs.id })
    .from(habitLogs)
    .where(and(eq(habitLogs.habitId, habitId), eq(habitLogs.date, date)));

  if (existing.length > 0) {
    if (toggle) {
      await db.delete(habitLogs).where(eq(habitLogs.id, existing[0]!.id));
      return res.json({ completed: false });
    }
    return res.json({ completed: true });
  }

  await db.insert(habitLogs).values({ habitId, date, source, noteId });
  return res.json({ completed: true, source });
});

// ─── POST /habits/ai-detect ───────────────────────────────────────────────────
// Scans today's notes for keyword matches and auto-logs matching habits

habitsRouter.post("/ai-detect", async (req, res) => {
  const date = (req.body?.date as string) || todayISO();
  const dayStart = new Date(date + "T00:00:00.000Z");

  const [allHabits, todayNotes, existingLogs] = await Promise.all([
    db.select().from(habits).where(eq(habits.isActive, true)),
    db.select({ id: notes.id, title: notes.title, content: notes.content })
      .from(notes)
      .where(gte(notes.updatedAt, dayStart)),
    db.select({ habitId: habitLogs.habitId })
      .from(habitLogs)
      .where(and(eq(habitLogs.date, date), eq(habitLogs.source, "manual"))),
  ]);

  const manuallyLoggedHabitIds = new Set(existingLogs.map((l) => l.habitId));
  const detected: string[] = [];

  for (const habit of allHabits) {
    if (manuallyLoggedHabitIds.has(habit.id) || habit.keywords.length === 0) continue;

    const matchingNote = todayNotes.find((note) =>
      habit.keywords.some((kw) => {
        const pattern = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
        return pattern.test(note.title) || pattern.test(note.content);
      }),
    );

    if (matchingNote) {
      await db
        .insert(habitLogs)
        .values({ habitId: habit.id, date, source: "ai", noteId: matchingNote.id })
        .onConflictDoNothing();
      detected.push(habit.id);
    }
  }

  return res.json({ detected, date });
});

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
