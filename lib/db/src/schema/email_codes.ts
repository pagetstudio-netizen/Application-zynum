import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";

export const emailCodesTable = pgTable("email_codes", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  userId: integer("user_id"),
  code: text("code").notNull(),
  token: text("token").notNull().unique(),
  type: text("type").notNull(), // verify_email | reset_password | login_2fa
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type EmailCode = typeof emailCodesTable.$inferSelect;
