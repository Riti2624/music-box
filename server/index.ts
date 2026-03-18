import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import { createSharedPlayer, getSharedPlayerById } from "./routes/share";

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));

  // Example API routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/demo", handleDemo);

  // Shareable player routes
  app.post("/api/create", createSharedPlayer);
  app.post("/create", createSharedPlayer);
  app.get("/api/player/:id", getSharedPlayerById);
  app.get("/api/:id", getSharedPlayerById);

  return app;
}
