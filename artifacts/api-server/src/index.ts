import app, { setStartupOk, setStartupError } from "./app";
import { initDb } from "./lib/initDb.js";
import { scheduleDailyReport } from "./lib/telegram.js";
import { scheduleAutoCancel } from "./lib/scheduler.js";

// En déploiement Replit artifact mode, PORT peut ne pas être injecté
// → on default à 8080 (le port attendu par l'artifact runner).
// En Plesk, app.js set PORT=3000 avant de charger ce bundle.
const rawPort = process.env["PORT"] ?? "8080";
const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// Start listening immediately so Passenger/Plesk doesn't timeout
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});

// Init DB in background — /health reports the real state
initDb()
  .then(() => {
    setStartupOk();
    scheduleDailyReport();
    scheduleAutoCancel();
  })
  .catch((err) => {
    setStartupError(err);
    console.error("Failed to initialize database:", err);
    // Stay alive so /health exposes the real error — check zynum.net/health in your browser
    // Passenger will eventually restart; you can also force-restart after fixing the env var
  });
