import { date, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

// ─── Table ────────────────────────────────────────────────────────────────────

export const dailyNotes = pgTable("daily_notes", {
  id: uuid("id").defaultRandom().primaryKey(),

  /** ISO date string YYYY-MM-DD — one row per day */
  date: date("date").notNull().unique(),

  intention: text("intention").notNull().default(""),
  studied: text("studied").notNull().default(""),
  tomorrow: text("tomorrow").notNull().default(""),

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type DailyNote = typeof dailyNotes.$inferSelect;
export type NewDailyNote = typeof dailyNotes.$inferInsert;
