import { pgTable, text, serial, timestamp, boolean } from "drizzle-orm/pg-core";

export const paymentProvidersTable = pgTable("payment_providers", {
  id: serial("id").primaryKey(),
  category: text("category").notNull(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  isActive: boolean("is_active").notNull().default(false),
  isSelected: boolean("is_selected").notNull().default(false),
  config: text("config"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type PaymentProvider = typeof paymentProvidersTable.$inferSelect;
