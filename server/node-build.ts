import path from "path";
import { createServer } from "./index";
import * as express from "express";

const app = createServer();
const port = process.env.PORT || 3000;

// In production, serve the built SPA files
const __dirname = import.meta.dirname;
const distPath = path.join(__dirname, "../spa");
const assetsPath = path.join(distPath, "assets");

// Serve static files
app.use(
  "/assets",
  express.static(assetsPath, {
    immutable: true,
    maxAge: "1y",
  })
);
app.use(express.static(distPath));

// Handle React Router - serve index.html for all non-API routes
app.use((req, res) => {
  // Don't serve index.html for API routes
  if (req.path === "/api" || req.path.startsWith("/api/") || req.path.startsWith("/health")) {
    return res.status(404).json({ error: "API endpoint not found" });
  }

  // Do not rewrite missing static assets to index.html (prevents CSS/JS loading issues).
  if (req.path.includes(".")) {
    return res.status(404).send("Not found");
  }

  // Keep SPA document fresh so it always references the latest hashed CSS/JS bundles.
  res.setHeader("Cache-Control", "no-store");

  res.sendFile(path.join(distPath, "index.html"));
});

app.listen(port, () => {
  console.log(`🚀 Fusion Starter server running on port ${port}`);
  console.log(`📱 Frontend: http://localhost:${port}`);
  console.log(`🔧 API: http://localhost:${port}/api`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("🛑 Received SIGTERM, shutting down gracefully");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("🛑 Received SIGINT, shutting down gracefully");
  process.exit(0);
});
