import { db, dailyNotes } from "@my-better-t-app/db";
import { eq } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";

export const dailyNotesRouter = Router();

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const bodySchema = z.object({
  intention: z.string().default(""),
  studied: z.string().default(""),
  tomorrow: z.string().default(""),
});

// ─── GET /daily-notes/:date ───────────────────────────────────────────────────

dailyNotesRouter.get("/:date", async (req, res) => {
  if (!ISO_DATE.test(req.params.date)) {
    return res.status(400).json({ error: "Date must be in YYYY-MM-DD format" });
  }

  const note = await db.query.dailyNotes.findFirst({
    where: eq(dailyNotes.date, req.params.date),
  });

  // Return empty shell if not yet created
  if (!note) {
    return res.json({ date: req.params.date, intention: "", studied: "", tomorrow: "" });
  }

  return res.json(note);
});

// ─── PUT /daily-notes/:date ───────────────────────────────────────────────────

dailyNotesRouter.put("/:date", async (req, res) => {
  if (!ISO_DATE.test(req.params.date)) {
    return res.status(400).json({ error: "Date must be in YYYY-MM-DD format" });
  }

  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const [note] = await db
    .insert(dailyNotes)
    .values({ date: req.params.date, ...parsed.data })
    .onConflictDoUpdate({
      target: dailyNotes.date,
      set: { ...parsed.data, updatedAt: new Date() },
    })
    .returning();

  return res.json(note);
});
