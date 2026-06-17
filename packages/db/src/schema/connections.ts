import { relations } from "drizzle-orm";
import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import { notes } from "./notes";

// ─── Table ────────────────────────────────────────────────────────────────────

/**
 * Directed note-to-note connections.
 * Treated as undirected in queries — always fetch both directions.
 */
export const connections = pgTable(
  "connections",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    fromNoteId: uuid("from_note_id")
      .notNull()
      .references(() => notes.id, { onDelete: "cascade" }),

    toNoteId: uuid("to_note_id")
      .notNull()
      .references(() => notes.id, { onDelete: "cascade" }),

    /** Relationship label (e.g. "supports", "contradicts", "expands") */
    label: text("label"),

    /** Connection strength 1–10 */
    strength: integer("strength").notNull().default(1),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique("connections_unique_pair").on(t.fromNoteId, t.toNoteId),
    index("connections_from_idx").on(t.fromNoteId),
    index("connections_to_idx").on(t.toNoteId),
  ],
);

// ─── Relations ────────────────────────────────────────────────────────────────

export const connectionsRelations = relations(connections, ({ one }) => ({
  fromNote: one(notes, {
    fields: [connections.fromNoteId],
    references: [notes.id],
    relationName: "fromNote",
  }),
  toNote: one(notes, {
    fields: [connections.toNoteId],
    references: [notes.id],
    relationName: "toNote",
  }),
}));

// ─── Types ────────────────────────────────────────────────────────────────────

export type Connection = typeof connections.$inferSelect;
export type NewConnection = typeof connections.$inferInsert;
