import { env } from "@my-better-t-app/env/server";
import cors from "cors";
import express from "express";

import { aiRouter } from "./routes/ai";
import { connectionsRouter } from "./routes/connections";
import { dailyNotesRouter } from "./routes/daily-notes";
import { notesRouter } from "./routes/notes";
import { tagsRouter } from "./routes/tags";
import { vaultRouter } from "./routes/vault";

const app = express();

app.use(
  cors({
    origin: env.CORS_ORIGIN,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(express.json());

// ─── Health check ─────────────────────────────────────────────────────────────

app.get("/", (_req, res) => {
  res.status(200).json({ status: "ok", version: "0.1.0" });
});

// ─── Routes ───────────────────────────────────────────────────────────────────

app.use("/ai", aiRouter);
app.use("/notes", notesRouter);
app.use("/tags", tagsRouter);
app.use("/connections", connectionsRouter);
app.use("/daily-notes", dailyNotesRouter);
app.use("/vault", vaultRouter);

// ─── Global error handler ─────────────────────────────────────────────────────

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
