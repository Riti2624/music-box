import { randomUUID } from "crypto";
import { RequestHandler } from "express";
import { CreateShareRequest, CreateShareResponse, SharedPlayerData } from "@shared/api";

const sharedPlayers = new Map<string, SharedPlayerData>();

const isValidDataUrl = (value: unknown): value is string => {
  return typeof value === "string" && value.startsWith("data:");
};

const isValidCreatePayload = (payload: unknown): payload is CreateShareRequest => {
  if (!payload || typeof payload !== "object") return false;

  const candidate = payload as CreateShareRequest;
  return (
    (candidate.image === null || isValidDataUrl(candidate.image)) &&
    Boolean(candidate.audioFile) &&
    typeof candidate.audioFile.name === "string" &&
    isValidDataUrl(candidate.audioFile.data)
  );
};

export const createSharedPlayer: RequestHandler = (req, res) => {
  if (!isValidCreatePayload(req.body)) {
    return res.status(400).json({ error: "Invalid request body" });
  }

  const id = randomUUID().replace(/-/g, "").slice(0, 12);
  const payload: SharedPlayerData = {
    image: req.body.image,
    audioFile: req.body.audioFile,
    createdAt: new Date().toISOString(),
  };

  sharedPlayers.set(id, payload);

  const response: CreateShareResponse = { id };
  return res.status(201).json(response);
};

export const getSharedPlayerById: RequestHandler<{ id: string }> = (req, res) => {
  const { id } = req.params;
  const player = sharedPlayers.get(id);

  if (!player) {
    return res.status(404).json({ error: "Player not found" });
  }

  return res.json(player);
};
