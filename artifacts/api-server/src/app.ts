import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import express, { type Express } from "express";
import cors from "cors";
import router from "./routes/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app: Express = express();

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

app.use("/api", router);

if (process.env.NODE_ENV === "production") {
  const frontendPath = path.join(__dirname, "../../zynum/dist/public");
  if (fs.existsSync(frontendPath)) {
    app.use(express.static(frontendPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(frontendPath, "index.html"));
    });
  } else {
    app.get("/", (_req, res) => res.json({ status: "ok" }));
  }
} else {
  app.get("/", (_req, res) => res.json({ status: "ok" }));
}

export default app;
