import "./lib/env.js";
import cors from "cors";
import express from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ensureUserProfile } from "./lib/prisma.js";
import { contentRouter } from "./routes/content.js";
import { progressRouter } from "./routes/progress.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT || 4000);

const DEFAULT_ORIGINS = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  `http://localhost:${PORT}`,
  `http://127.0.0.1:${PORT}`,
];

const allowedOrigins = new Set(
  (process.env.ALLOWED_ORIGINS || DEFAULT_ORIGINS.join(","))
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean)
);

app.disable("x-powered-by");

app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  next();
});

app.use(
  cors({
    origin(origin, callback) {
      // Allow same-origin / CLI / curl requests (no Origin header) or explicitly allowlisted browser origins
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`Origin ${origin} is not allowed by OOPForge CORS policy`));
    },
  })
);

app.use(express.json({ limit: "2mb" }));

app.use("/api", contentRouter);
app.use("/api", progressRouter);

// Serve built frontend in production if present
const frontendDist = path.resolve(__dirname, "../../frontend/dist");
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(frontendDist, "index.html"));
  });
}

async function main() {
  await ensureUserProfile();
  app.listen(PORT, () => {
    console.log(`OOPForge backend running on http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  console.error("Failed to start OOPForge backend:", err);
  process.exit(1);
});
