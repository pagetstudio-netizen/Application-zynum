import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const apiWaitlistTable = pgTable("api_waitlist", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ApiWaitlist = typeof apiWaitlistTable.$inferSelect;
