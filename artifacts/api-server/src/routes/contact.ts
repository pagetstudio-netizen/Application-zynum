import { Router, type IRouter } from "express";
import { db, contactMessagesTable, apiWaitlistTable, socialLinksTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/authMiddleware.js";
import { requireAdmin } from "../middlewares/adminMiddleware.js";
import { notifyContact } from "../lib/telegram.js";

const router: IRouter = Router();
const auth = [requireAuth, requireAdmin];

/* ── Public: get active social links (deduplicated by platform) ── */
router.get("/v1/social-links", async (_req, res): Promise<void> => {
  const links = await db
    .select()
    .from(socialLinksTable)
    .orderBy(socialLinksTable.sortOrder);

  const seen = new Set<string>();
  const unique = links.filter((l) => {
    if (!l.isActive) return false;
    const key = l.platform.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  res.json({ links: unique });
});

/* ── Public: submit contact form ── */
router.post("/v1/contact", async (req, res): Promise<void> => {
  const { name, email, subject, message } = req.body;
  if (!name || !email || !subject || !message) {
    res.status(400).json({ error: "Validation error", message: "Tous les champs sont requis" });
    return;
  }
  if (!email.includes("@")) {
    res.status(400).json({ error: "Validation error", message: "Adresse email invalide" });
    return;
  }
  const [msg] = await db
    .insert(contactMessagesTable)
    .values({ name: String(name), email: String(email), subject: String(subject), message: String(message) })
    .returning();
  res.status(201).json({ success: true, id: msg.id });

  // Fire-and-forget Telegram notification
  notifyContact({ name: String(name), email: String(email), subject: String(subject), message: String(message) }).catch(() => {});
});

/* ── Public: subscribe to API waitlist ── */
router.post("/v1/waitlist", async (req, res): Promise<void> => {
  const { email } = req.body;
  if (!email || !String(email).includes("@")) {
    res.status(400).json({ error: "Validation error", message: "Adresse email invalide" });
    return;
  }
  await db
    .insert(apiWaitlistTable)
    .values({ email: String(email) })
    .onConflictDoNothing();
  res.status(201).json({ success: true });
});

/* ── Admin: list contact messages ── */
router.get("/v1/admin/contact", ...auth, async (_req, res): Promise<void> => {
  const messages = await db
    .select()
    .from(contactMessagesTable)
    .orderBy(desc(contactMessagesTable.createdAt));
  res.json(messages);
});

/* ── Admin: mark message as read / unread ── */
router.patch("/v1/admin/contact/:id", ...auth, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const { isRead } = req.body;
  await db
    .update(contactMessagesTable)
    .set({ isRead: Boolean(isRead) })
    .where(eq(contactMessagesTable.id, id));
  res.json({ success: true });
});

/* ── Admin: delete contact message ── */
router.delete("/v1/admin/contact/:id", ...auth, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  await db.delete(contactMessagesTable).where(eq(contactMessagesTable.id, id));
  res.json({ success: true });
});

/* ── Admin: list API waitlist ── */
router.get("/v1/admin/waitlist", ...auth, async (_req, res): Promise<void> => {
  const list = await db
    .select()
    .from(apiWaitlistTable)
    .orderBy(desc(apiWaitlistTable.createdAt));
  res.json(list);
});

/* ── Admin: delete waitlist entry ── */
router.delete("/v1/admin/waitlist/:id", ...auth, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  await db.delete(apiWaitlistTable).where(eq(apiWaitlistTable.id, id));
  res.json({ success: true });
});

export default router;
