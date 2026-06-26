"use strict";

// PM2 Ecosystem — ZyNum (Plesk deployment)
// Usage:
//   pm2 start ecosystem.config.cjs
//   pm2 reload zynum
//   pm2 save && pm2 startup

module.exports = {
  apps: [
    {
      name: "zynum",
      script: "./app.js",
      cwd: "/var/www/vhosts/app.zynum.net/app.zynum.net/artifacts",

      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",

      env: {
        NODE_ENV: "production",
        PORT: "3000",

        // ─── Base de données ─────────────────────────────────────────────────
        SUPABASE_DATABASE_URL: "",         // postgresql://...

        // ─── Email (Resend) ──────────────────────────────────────────────────
        RESEND_API_KEY: "",                // re_...
        RESEND_FROM_EMAIL: "noreply@zynum.net",

        // ─── Paiements ───────────────────────────────────────────────────────
        ASHTECHPAY_API_KEY: "",            // ak_...
        SENDAVAPAY_SDK_KEY: "",            // sdk_...
        SENDAVAPAY_WEBHOOK_SECRET: "",     // whsec_...

        // ─── Telegram ────────────────────────────────────────────────────────
        TELEGRAM_BOT_TOKEN: "",           // 123456789:AAB...

        // ─── Admin ───────────────────────────────────────────────────────────
        ADMIN_EMAIL: "pagetstudio@gmail.com",
        ADMIN_PASSWORD: "",               // mot de passe admin dashboard
      },

      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      error_file: "./logs/zynum-error.log",
      out_file: "./logs/zynum-out.log",
      merge_logs: true,
    },
  ],
};
