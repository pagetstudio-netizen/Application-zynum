import app, { setDbReady } from "./app";
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

// Start listening immediately so Passenger/Plesk doesn't timeout waiting for the port
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});

// Init DB in background — server is already accepting requests
initDb()
  .then(() => {
    setDbReady(true);
    scheduleDailyReport();
    scheduleAutoCancel();
  })
  .catch((err) => {
    console.error("Failed to initialize database:", err);
    process.exit(1);
  });
