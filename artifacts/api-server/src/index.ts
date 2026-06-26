import app, { setStartupOk, setStartupError } from "./app";
import { initDb } from "./lib/initDb.js";
import { scheduleDailyReport } from "./lib/telegram.js";
import { scheduleAutoCancel } from "./lib/scheduler.js";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

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
