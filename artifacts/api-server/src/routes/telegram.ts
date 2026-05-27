import { Router, type IRouter, type Request, type Response } from "express";
import { requireAuth } from "../middlewares/authMiddleware.js";
import { requireAdmin } from "../middlewares/adminMiddleware.js";
import {
  sendMessage, detectGroupChats, saveChatId, getChatId,
  getBotInfo, sendDailyReport,
} from "../lib/telegram.js";

const router: IRouter = Router();

// ─── Webhook (bot commands) ───────────────────────────────────────────────────

router.post("/v1/telegram/webhook", async (req: Request, res: Response): Promise<void> => {
  try {
    const body = req.body ?? {};
    const msg  = body.message ?? body.channel_post;
    if (!msg) { res.json({ ok: true }); return; }

    const chatId = String(msg.chat?.id ?? "");
    const text   = String(msg.text ?? "").trim().toLowerCase();

    if (text.startsWith("/start")) {
      await sendMessage(chatId, [
        `👋 <b>Bienvenue sur ZyNum Bot !</b>`,
        ``,
        `Je vous enverrai des notifications en temps réel pour :`,
        `• 💰 Dépôts reçus`,
        `• 📲 Achats de numéros virtuels`,
        `• 📊 Rapports quotidiens`,
        ``,
        `Tapez /aide pour voir toutes les commandes.`,
      ].join("\n"));
    } else if (text.startsWith("/aide") || text.startsWith("/help")) {
      await sendMessage(chatId, [
        `📋 <b>Commandes disponibles</b>`,
        ``,
        `/start — Message de bienvenue`,
        `/aide — Afficher cette aide`,
        `/stat — Statistiques du jour`,
        `/rapport — Envoyer le rapport maintenant`,
        `/chatid — Afficher l'ID de ce chat`,
        `/ping — Tester la connexion`,
      ].join("\n"));
    } else if (text.startsWith("/chatid")) {
      await sendMessage(chatId, `🆔 <b>Chat ID :</b> <code>${chatId}</code>\n\nCopiez cet ID et collez-le dans la section Telegram du panneau admin.`);
    } else if (text.startsWith("/ping")) {
      await sendMessage(chatId, `🏓 <b>Pong !</b> ZyNum Bot est opérationnel ✅`);
    } else if (text.startsWith("/stat")) {
      await sendDailyReport();
    } else if (text.startsWith("/rapport")) {
      await sendDailyReport();
      await sendMessage(chatId, `✅ Rapport envoyé dans le groupe configuré.`);
    }

    res.json({ ok: true });
  } catch (err) {
    console.error("[Telegram webhook] Error:", err);
    res.json({ ok: true });
  }
});

// ─── Admin: get bot info ──────────────────────────────────────────────────────

router.get("/v1/admin/telegram/info", requireAuth, requireAdmin, async (_req: Request, res: Response): Promise<void> => {
  const hasToken = !!process.env.TELEGRAM_BOT_TOKEN;
  const botInfo  = hasToken ? await getBotInfo() : { ok: false };
  const chatId   = await getChatId();
  res.json({ hasToken, botInfo, chatId });
});

// ─── Admin: detect group chats from getUpdates ────────────────────────────────

router.get("/v1/admin/telegram/detect", requireAuth, requireAdmin, async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await detectGroupChats();
    res.json({ success: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur";
    res.status(500).json({ success: false, message });
  }
});

// ─── Admin: save chat ID ──────────────────────────────────────────────────────

router.post("/v1/admin/telegram/chat-id", requireAuth, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { chatId } = req.body ?? {};
    if (!chatId) { res.status(400).json({ error: "chatId requis" }); return; }
    await saveChatId(String(chatId));
    res.json({ success: true, chatId: String(chatId) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur";
    res.status(500).json({ success: false, message });
  }
});

// ─── Admin: send test message ─────────────────────────────────────────────────

router.post("/v1/admin/telegram/test", requireAuth, requireAdmin, async (_req: Request, res: Response): Promise<void> => {
  try {
    const chatId = await getChatId();
    if (!chatId) { res.status(400).json({ error: "Aucun Chat ID configuré" }); return; }
    const ok = await sendMessage(chatId, `✅ <b>Test ZyNum Bot</b>\n\nConnexion opérationnelle ! Les notifications sont actives.`);
    res.json({ success: ok, chatId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur";
    res.status(500).json({ success: false, message });
  }
});

// ─── Admin: send daily report now ────────────────────────────────────────────

router.post("/v1/admin/telegram/report", requireAuth, requireAdmin, async (_req: Request, res: Response): Promise<void> => {
  try {
    const chatId = await getChatId();
    if (!chatId) { res.status(400).json({ error: "Aucun Chat ID configuré" }); return; }
    await sendDailyReport();
    res.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur";
    res.status(500).json({ success: false, message });
  }
});

export default router;
