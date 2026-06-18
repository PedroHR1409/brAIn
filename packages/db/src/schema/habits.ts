import { boolean, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { habitLogs } from "./habit-logs";

export const habits = pgTable("habits", {
  id:          uuid("id").defaultRandom().primaryKey(),
  name:        text("name").notNull(),
  description: text("description"),
  keywords:    text("keywords").array().notNull().default([]),
  color:       text("color").notNull().default("#8B5CF6"),
  isActive:    boolean("is_active").notNull().default(true),
  createdAt:   timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:   timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
               .$onUpdate(() => new Date()),
});

export const habitsRelations = relations(habits, ({ many }) => ({
  logs: many(habitLogs),
}));

export type Habit    = typeof habits.$inferSelect;
export type NewHabit = typeof habits.$inferInsert;
