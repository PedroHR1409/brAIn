import { env } from "@my-better-t-app/env/server";
import { db, dailyNotes, notes, noteTags, tags } from "@my-better-t-app/db";
import { eq, ilike } from "drizzle-orm";
import cors from "cors";
import express from "express";
import cron from "node-cron";

import { aiRouter } from "./routes/ai";
import { connectionsRouter } from "./routes/connections";
import { dailyNotesRouter } from "./routes/daily-notes";
import { habitsRouter } from "./routes/habits";
import { notesRouter } from "./routes/notes";
import { tagsRouter } from "./routes/tags";
import { tasksRouter } from "./routes/tasks";
import { vaultRouter } from "./routes/vault";

const app = express();

const allowedOrigins = [
  env.CORS_ORIGIN,
  "http://localhost:5173",
  "http://localhost:3001",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin not allowed — ${origin}`));
      }
    },
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);

app.use(express.json());

// ─── Health check ─────────────────────────────────────────────────────────────

app.get("/", (_req, res) => {
  res.status(200).json({ status: "ok", version: "0.1.0" });
});

// ─── Routes ───────────────────────────────────────────────────────────────────

app.use("/ai", aiRouter);
app.use("/habits", habitsRouter);
app.use("/notes", notesRouter);
app.use("/tags", tagsRouter);
app.use("/tasks", tasksRouter);
app.use("/connections", connectionsRouter);
app.use("/daily-notes", dailyNotesRouter);
app.use("/vault", vaultRouter);

// ─── Global error handler ─────────────────────────────────────────────────────

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

// ─── Daily-note auto-archive cron ─────────────────────────────────────────────
// Runs at 00:05 every night; archives yesterday's daily note if it has content

async function archiveYesterdayDailyNote() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const dateKey = yesterday.toISOString().slice(0, 10);

  const formatted = yesterday.toLocaleDateString("en-US", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
  const noteTitle = `Daily Note — ${formatted}`;

  // Skip if already archived
  const existing = await db
    .select({ id: notes.id })
    .from(notes)
    .where(ilike(notes.title, noteTitle))
    .limit(1);

  if (existing.length > 0) return;

  const dailyNote = await db.query.dailyNotes.findFirst({
    where: eq(dailyNotes.date, dateKey),
  });

  if (!dailyNote) return;

  const content = [
    dailyNote.intention && `## Intention\n${dailyNote.intention}`,
    dailyNote.studied   && `## What I Studied\n${dailyNote.studied}`,
    dailyNote.tomorrow  && `## For Tomorrow\n${dailyNote.tomorrow}`,
  ].filter(Boolean).join("\n\n");

  if (!content.trim()) return;

  const [created] = await db
    .insert(notes)
    .values({
      title:   noteTitle,
      content,
      type:    "permanent",
      status:  "archived",
      para:    "archive",
    })
    .returning({ id: notes.id });

  if (!created) return;

  // Tag as daily-note
  const [tagRow] = await db
    .insert(tags)
    .values({ name: "daily-note" })
    .onConflictDoUpdate({ target: tags.name, set: { name: "daily-note" } })
    .returning({ id: tags.id });

  if (tagRow) {
    await db.insert(noteTags).values({ noteId: created.id, tagId: tagRow.id }).onConflictDoNothing();
  }

  console.log(`[cron] Auto-archived daily note for ${dateKey}`);
}

cron.schedule("5 0 * * *", () => {
  archiveYesterdayDailyNote().catch((err) =>
    console.error("[cron] Daily-note archive failed:", err),
  );
});

// ─── Start ────────────────────────────────────────────────────────────────────

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
