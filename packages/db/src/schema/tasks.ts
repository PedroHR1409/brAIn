import { boolean, integer, pgTable, real, text, timestamp, uuid } from "drizzle-orm/pg-core";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const tasks = pgTable("tasks", {
  id:          uuid("id").defaultRandom().primaryKey(),
  title:       text("title").notNull(),
  description: text("description").default(""),
  parentId:    uuid("parent_id").references((): AnyPgColumn => tasks.id, { onDelete: "cascade" }),
  completed:   boolean("completed").notNull().default(false),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  dueDate:     text("due_date"), // YYYY-MM-DD
  priority:    integer("priority").notNull().default(2), // 1=low 2=medium 3=high 4=urgent
  position:    real("position").notNull().default(0),
  createdAt:   timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:   timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
               .$onUpdate(() => new Date()),
});

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  parent:   one(tasks, { fields: [tasks.parentId], references: [tasks.id], relationName: "subtasks" }),
  subtasks: many(tasks, { relationName: "subtasks" }),
}));

export type Task    = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
