import { pgTable, text, serial, timestamp, boolean, integer } from "drizzle-orm/pg-core";

export const faqArticlesTable = pgTable("faq_articles", {
  id: serial("id").primaryKey(),
  type: text("type").notNull().default("faq"),
  category: text("category"),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  lang: text("lang").notNull().default("fr"),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type FaqArticle = typeof faqArticlesTable.$inferSelect;
