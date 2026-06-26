import { Router, type IRouter } from "express";
import { db, adminSettingsTable } from "@workspace/db";
import { sql, eq } from "drizzle-orm";

const router: IRouter = Router();

// Basique — pour les health checks simples (load balancers, etc.)
router.get("/healthz", (_req, res) => {
  res.json({ status: "ok" });
});

// Complet — état réel de la DB + services, toujours HTTP 200
// (Passenger/Plesk intercepte les 5xx)
router.get("/health", async (_req, res) => {
  const startTime = Date.now();

  // ── Test de connexion DB ─────────────────────────────────────
  let dbStatus: "ok" | "error" = "error";
  let dbLatencyMs: number | null = null;
  let dbError: string | null = null;

  try {
    const t0 = Date.now();
    await db.execute(sql`SELECT 1`);
    dbLatencyMs = Date.now() - t0;
    dbStatus = "ok";
  } catch (err) {
    dbError = err instanceof Error ? err.message : String(err);
  }

  // ── Clé API 5sim (stockée en DB) ────────────────────────────
  let fiveSimConfigured = false;
  try {
    if (dbStatus === "ok") {
      const rows = await db
        .select()
        .from(adminSettingsTable)
        .where(eq(adminSettingsTable.key, "fivesim_api_key"));
      fiveSimConfigured = rows.length > 0 && rows[0].value.trim().length > 0;
    }
  } catch {
    // non bloquant
  }

  // ── Services via variables d'environnement ───────────────────
  const services = {
    database: {
      status: dbStatus,
      latencyMs: dbLatencyMs,
      ...(dbError ? { error: dbError } : {}),
    },
    fivesim: {
      status: fiveSimConfigured ? "configured" : "not_configured",
      note: fiveSimConfigured
        ? "Clé API présente en base"
        : "Clé API manquante — configurer dans le dashboard admin",
    },
    resend: {
      status: process.env.RESEND_API_KEY ? "configured" : "missing",
    },
    telegram: {
      status: process.env.TELEGRAM_BOT_TOKEN ? "configured" : "missing",
    },
    ashtechpay: {
      status: process.env.ASHTECHPAY_API_KEY ? "configured" : "missing",
    },
    sendavapay: {
      status:
        process.env.SENDAVAPAY_SDK_KEY && process.env.SENDAVAPAY_WEBHOOK_SECRET
          ? "configured"
          : "missing",
    },
  };

  const allOk =
    dbStatus === "ok" &&
    fiveSimConfigured &&
    !!process.env.RESEND_API_KEY &&
    !!process.env.TELEGRAM_BOT_TOKEN;

  res.status(200).json({
    status: allOk ? "ok" : "degraded",
    uptime: Math.round(process.uptime()) + "s",
    node: process.version,
    env: process.env.NODE_ENV ?? "undefined",
    responseTimeMs: Date.now() - startTime,
    services,
  });
});

export default router;
