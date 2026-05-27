import express, { type Express } from "express";
import cors from "cors";
import router from "./routes/index.js";

const app: Express = express();

const allowedOrigins = [
  "https://zynum.net",
  "https://www.zynum.net",
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

export default app;
