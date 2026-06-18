import { date, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { habits } from "./habits";

export const habitLogs = pgTable(
  "habit_logs",
  {
    id:        uuid("id").defaultRandom().primaryKey(),
    habitId:   uuid("habit_id").notNull().references(() => habits.id, { onDelete: "cascade" }),
    date:      date("date").notNull(),
    source:    text("source").notNull().default("manual"),
    noteId:    uuid("note_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("habit_log_unique_day").on(t.habitId, t.date)],
);

export const habitLogsRelations = relations(habitLogs, ({ one }) => ({
  habit: one(habits, { fields: [habitLogs.habitId], references: [habits.id] }),
}));

export type HabitLog    = typeof habitLogs.$inferSelect;
export type NewHabitLog = typeof habitLogs.$inferInsert;
