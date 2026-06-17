import { relations } from "drizzle-orm";
import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { noteTags } from "./note-tags";

// ─── Table ────────────────────────────────────────────────────────────────────

export const tags = pgTable("tags", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull().unique(),
  /** Optional hex color override for this tag */
  color: text("color"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ─── Relations ────────────────────────────────────────────────────────────────

export const tagsRelations = relations(tags, ({ many }) => ({
  noteTags: many(noteTags),
}));

// ─── Types ────────────────────────────────────────────────────────────────────

export type Tag = typeof tags.$inferSelect;
export type NewTag = typeof tags.$inferInsert;
