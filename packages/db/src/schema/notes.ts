import { relations } from "drizzle-orm";
import {
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { noteTags } from "./note-tags";
import { connections } from "./connections";

// ─── Enums ────────────────────────────────────────────────────────────────────

export const noteTypeEnum = pgEnum("note_type", [
  "fleeting",
  "literature",
  "permanent",
]);

export const sourceTypeEnum = pgEnum("source_type", [
  "article",
  "book",
  "podcast",
  "other",
]);

export const noteStatusEnum = pgEnum("note_status", [
  "inbox",
  "active",
  "on_hold",
  "done",
  "archived",
]);

export const paraCategoryEnum = pgEnum("para_category", [
  "project",
  "area",
  "resource",
  "archive",
]);

// ─── Table ────────────────────────────────────────────────────────────────────

export const notes = pgTable(
  "notes",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    title: text("title").notNull(),
    content: text("content").notNull().default(""),

    type: noteTypeEnum("type").notNull().default("fleeting"),

    /** Only relevant for literature notes */
    sourceType: sourceTypeEnum("source_type"),
    sourceUrl: text("source_url"),
    author: text("author"),

    status: noteStatusEnum("status").notNull().default("inbox"),

    /** PARA method classification */
    para: paraCategoryEnum("para"),

    /** Maturity/strength score 0–100 */
    strength: integer("strength").notNull().default(0),

    /** Timestamp when a fleeting note was promoted or processed */
    processedAt: timestamp("processed_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("notes_type_idx").on(t.type),
    index("notes_status_idx").on(t.status),
    index("notes_para_idx").on(t.para),
    index("notes_created_at_idx").on(t.createdAt),
  ],
);

// ─── Relations ────────────────────────────────────────────────────────────────

export const notesRelations = relations(notes, ({ many }) => ({
  noteTags: many(noteTags),
  connectionsFrom: many(connections, { relationName: "fromNote" }),
  connectionsTo: many(connections, { relationName: "toNote" }),
}));

// ─── Types ────────────────────────────────────────────────────────────────────

export type Note = typeof notes.$inferSelect;
export type NewNote = typeof notes.$inferInsert;
