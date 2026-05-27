import app from "./app";
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

initDb()
  .then(() => {
    app.listen(port, () => {
      console.log(`Server listening on port ${port}`);
      scheduleDailyReport();
      scheduleAutoCancel();
    });
  })
  .catch((err) => {
    console.error("Failed to initialize database:", err);
    process.exit(1);
  });
