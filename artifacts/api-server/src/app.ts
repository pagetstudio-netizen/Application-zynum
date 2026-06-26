import path from "path";
import fs from "fs";
import express, { type Express } from "express";
import cors from "cors";
import router from "./routes/index.js";

const app: Express = express();

type StartupState =
  | { status: "starting"; startedAt: string }
  | { status: "ok"; startedAt: string; readyAt: string }
  | { status: "error"; startedAt: string; errorAt: string; error: string; stack?: string };

const startedAt = new Date().toISOString();
let startupState: StartupState = { status: "starting", startedAt };

export function setStartupOk() {
  startupState = {
    status: "ok",
    startedAt,
    readyAt: new Date().toISOString(),
  };
}

export function setStartupError(err: unknown) {
  const e = err instanceof Error ? err : new Error(String(err));
  startupState = {
    status: "error",
    startedAt,
    errorAt: new Date().toISOString(),
    error: e.message,
    stack: e.stack,
  };
}

// Keep backwards-compatible export used by index.ts
export function setDbReady(ready: boolean) {
  if (ready) setStartupOk();
}

const allowedOrigins = [
  "https://zynum.net",
  "https://www.zynum.net",
  "https://app.zynum.net",
  /\.replit\.app$/,
  /\.replit\.dev$/,
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const allowed = allowedOrigins.some((pattern) =>
      typeof pattern === "string" ? pattern === origin : pattern.test(origin)
    );
    callback(null, allowed ? origin : false);
  },
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check — toujours HTTP 200 (Passenger/Plesk intercepte les 5xx/503)
// Le vrai statut est dans le champ JSON "status"
app.get("/health", (_req, res) => {
  res.status(200).json({
    ...startupState,
    uptime: Math.round(process.uptime()) + "s",
    node: process.version,
    env: process.env.NODE_ENV ?? "undefined",
    db: process.env.SUPABASE_DATABASE_URL
      ? "SUPABASE_DATABASE_URL set ✓"
      : process.env.DATABASE_URL
        ? "DATABASE_URL set ✓"
        : "⚠ no database URL found",
    port: process.env.PORT ?? "undefined",
  });
});

app.use("/api", router);

if (process.env.NODE_ENV === "production") {
  const frontendPath = path.resolve(__dirname, "../../zynum/dist/public");
  if (fs.existsSync(frontendPath)) {
    app.use(express.static(frontendPath));
    app.get("/{*splat}", (_req, res) => {
      res.sendFile(path.join(frontendPath, "index.html"));
    });
  } else {
    app.get("/", (_req, res) => res.json({ status: "ok" }));
  }
} else {
  app.get("/", (_req, res) => res.json({ status: "ok" }));
}

export default app;
