import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";

export const adminMessagesTable = pgTable("admin_messages", {
  id: serial("id").primaryKey(),
  senderId: integer("sender_id").notNull(),
  type: text("type").notNull().default("popup"),
  target: text("target").notNull().default("all"),
  subject: text("subject"),
  content: text("content").notNull(),
  color: text("color").default("blue"),
  linkUrl: text("link_url"),
  linkLabel: text("link_label"),
  imageUrl: text("image_url"),
  isActive: boolean("is_active").notNull().default(true),
  sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
});

export type AdminMessage = typeof adminMessagesTable.$inferSelect;
