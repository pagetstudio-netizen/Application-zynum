// ZyNum – Plesk startup file (CommonJS)
// No build needed on server — dist files are committed to git.

if (!process.env.PORT) {
  process.env.PORT = "3000";
}

if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = "production";
}

var http = require("http");
var path = require("path");
var fs = require("fs");

var port = Number(process.env.PORT);
var startedAt = new Date().toISOString();
var crashError = null;
var appLoaded = false;

// Global uncaught exception handler — keeps the process alive
// so the diagnostic server can still respond
process.on("uncaughtException", function (err) {
  console.error("[ZyNum] Uncaught exception:", err.message);
  console.error(err.stack);
  if (!crashError) crashError = err;
});

process.on("unhandledRejection", function (reason) {
  var err = reason instanceof Error ? reason : new Error(String(reason));
  console.error("[ZyNum] Unhandled rejection:", err.message);
  if (!crashError) crashError = err;
});

function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function makeDiagnosticHtml() {
  var distPath = path.join(__dirname, "api-server/dist/index.cjs");
  var distExists = fs.existsSync(distPath);
  var dbStatus = process.env.SUPABASE_DATABASE_URL
    ? "✅ SUPABASE_DATABASE_URL configurée"
    : process.env.DATABASE_URL
      ? "✅ DATABASE_URL configurée"
      : "❌ Aucune variable de base de données trouvée (SUPABASE_DATABASE_URL manquante)";

  var errorHtml = crashError
    ? "<h2 style='color:#c00'>Erreur détectée</h2>" +
      "<pre style='background:#fff0f0;border:1px solid #c00;padding:16px;border-radius:6px;overflow:auto;white-space:pre-wrap;word-break:break-all'>" +
      escapeHtml(crashError.message) + "\n\n" +
      escapeHtml(crashError.stack || "") +
      "</pre>"
    : "<p style='color:#555'>Aucune erreur capturée — l'application est peut-être en cours de démarrage ou a crashé sans lever d'exception.</p>";

  return [
    "<!DOCTYPE html><html lang='fr'><head><meta charset='utf-8'>",
    "<title>ZyNum – Diagnostic</title>",
    "<style>body{font-family:monospace;max-width:900px;margin:40px auto;padding:0 20px;background:#f9f9f9}",
    "h1{color:#1a1a2e}table{border-collapse:collapse;width:100%}",
    "td,th{text-align:left;padding:8px 12px;border:1px solid #ddd}",
    "th{background:#eee}tr:nth-child(even){background:#f5f5f5}</style></head>",
    "<body>",
    "<h1>🔧 ZyNum – Page de diagnostic</h1>",
    "<p>Cette page s'affiche car l'application principale n'a pas pu démarrer.</p>",
    "<table>",
    "<tr><th>Clé</th><th>Valeur</th></tr>",
    "<tr><td>Statut</td><td>" + (crashError ? "❌ Crash au démarrage" : "⏳ En attente / chargement") + "</td></tr>",
    "<tr><td>Node.js</td><td>" + escapeHtml(process.version) + "</td></tr>",
    "<tr><td>NODE_ENV</td><td>" + escapeHtml(process.env.NODE_ENV) + "</td></tr>",
    "<tr><td>PORT</td><td>" + escapeHtml(String(process.env.PORT)) + "</td></tr>",
    "<tr><td>Répertoire de travail</td><td>" + escapeHtml(process.cwd()) + "</td></tr>",
    "<tr><td>__dirname (app.js)</td><td>" + escapeHtml(__dirname) + "</td></tr>",
    "<tr><td>dist/index.cjs</td><td>" + (distExists ? "✅ Fichier présent" : "❌ Fichier ABSENT — relancer git pull") + "</td></tr>",
    "<tr><td>Base de données</td><td>" + dbStatus + "</td></tr>",
    "<tr><td>ADMIN_EMAIL</td><td>" + (process.env.ADMIN_EMAIL ? "✅ configuré" : "⚠️ non configuré (défaut: admin@zynum.net)") + "</td></tr>",
    "<tr><td>ADMIN_PASSWORD</td><td>" + (process.env.ADMIN_PASSWORD ? "✅ configuré" : "⚠️ non configuré (défaut utilisé)") + "</td></tr>",
    "<tr><td>RESEND_API_KEY</td><td>" + (process.env.RESEND_API_KEY ? "✅ configuré" : "❌ manquant") + "</td></tr>",
    "<tr><td>TELEGRAM_BOT_TOKEN</td><td>" + (process.env.TELEGRAM_BOT_TOKEN ? "✅ configuré" : "❌ manquant") + "</td></tr>",
    "<tr><td>Démarré à</td><td>" + escapeHtml(startedAt) + "</td></tr>",
    "</table>",
    "<br>",
    errorHtml,
    "<p><small>Actualisez cette page pour voir l'erreur mise à jour. Si le crash est résolu, l'application principale remplacera cette page.</small></p>",
    "</body></html>",
  ].join("");
}

// Phase 1: Démarrer un serveur HTTP minimal immédiatement pour que Passenger
// voie le port comme lié (empêche le timeout "something went wrong").
// IMPORTANT: Status 200 obligatoire — Passenger intercepte les 5xx et affiche
// sa propre page d'erreur, cachant ainsi le vrai diagnostic.
var diagServer = http.createServer(function (req, res) {
  var body = makeDiagnosticHtml();
  res.writeHead(200, {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(body);
});

diagServer.listen(port, function () {
  console.log("[ZyNum] Serveur de diagnostic démarré sur le port " + port);

  var distPath = path.join(__dirname, "api-server/dist/index.cjs");

  if (!fs.existsSync(distPath)) {
    crashError = new Error(
      "Fichier de build introuvable: " + distPath +
      "\nRelancez git pull pour récupérer le dossier dist/"
    );
    console.error("[ZyNum] ERREUR DE DÉMARRAGE:", crashError.message);
    return; // Rester en vie comme serveur de diagnostic
  }

  // Phase 2: Fermer le serveur de diagnostic et passer à l'application principale.
  diagServer.close(function () {
    console.log("[ZyNum] Chargement de l'application principale...");
    try {
      require(distPath);
      appLoaded = true;
      console.log("[ZyNum] Application principale chargée avec succès.");
    } catch (err) {
      crashError = err;
      console.error("[ZyNum] CRASH AU DÉMARRAGE:", err.message);
      console.error(err.stack);

      // Rouvrir le serveur de diagnostic avec l'erreur visible (status 200!)
      diagServer = http.createServer(function (req, res) {
        var body = makeDiagnosticHtml();
        res.writeHead(200, {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store",
        });
        res.end(body);
      });
      diagServer.listen(port, function () {
        console.log("[ZyNum] Serveur de diagnostic relancé sur le port " + port + " — ouvrez /health pour voir l'erreur");
      });
    }
  });
});
