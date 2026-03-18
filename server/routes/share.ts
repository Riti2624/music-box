import { randomUUID } from "crypto";
import { RequestHandler } from "express";
import { z } from "zod";
import {
  CreateShareRequest,
  CreateShareResponse,
  ManagedShare,
  SharedPlayerData,
  SharedPlayerResponse,
} from "@shared/api";
import { executeDb, isDatabaseConfigured, queryDb, upsertUser } from "../lib/database";
import {
  deleteObjectByKey,
  getSignedReadUrl,
  isStorageConfigured,
  putDataUrlObject,
} from "../lib/storage";
import { getRequiredUserId } from "../lib/auth";

const DATA_URL_REGEX = /^data:[^;]+;base64,.+$/;
const MAX_AUDIO_BYTES = 25 * 1024 * 1024;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

const createShareBodySchema = z.object({
  image: z.string().regex(DATA_URL_REGEX).nullable(),
  audioFile: z.object({
    name: z.string().trim().min(1).max(255),
    data: z.string().regex(DATA_URL_REGEX),
  }),
  expiresInHours: z.number().int().min(1).max(24 * 30).optional(),
});

type ShareRow = {
  id: string;
  user_id: string;
  image_key: string | null;
  audio_key: string;
  audio_file_name: string;
  created_at: string;
  expires_at: string;
  revoked_at: string | null;
};

type InMemoryShareRecord = {
  id: string;
  userId: string;
  data: SharedPlayerData;
  expiresAt: string;
  revokedAt: string | null;
};

const inMemoryShares = new Map<string, InMemoryShareRecord>();
const canUseManagedStorage = isDatabaseConfigured && isStorageConfigured;

export const createSharedPlayer: RequestHandler = async (req, res) => {
  let imageKey: string | null = null;
  let audioKey: string | null = null;

  try {
    const userId = getRequiredUserId(req);
    const payload = createShareBodySchema.parse(req.body) as CreateShareRequest;
    const shareId = randomUUID().replace(/-/g, "");
    const expiresInHours = payload.expiresInHours ?? 24 * 7;
    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

    if (!canUseManagedStorage) {
      const record: InMemoryShareRecord = {
        id: shareId,
        userId,
        data: {
          image: payload.image,
          audioFile: payload.audioFile,
          createdAt: new Date().toISOString(),
        },
        expiresAt: expiresAt.toISOString(),
        revokedAt: null,
      };

      inMemoryShares.set(shareId, record);

      const response: CreateShareResponse = {
        id: shareId,
        expiresAt: record.expiresAt,
        playerUrl: `/player/${shareId}`,
      };

      return res.status(201).json(response);
    }

    await upsertUser(userId);

    audioKey = await putDataUrlObject({
      ownerUserId: userId,
      shareId,
      kind: "audio",
      dataUrl: payload.audioFile.data,
      maxBytes: MAX_AUDIO_BYTES,
    });

    if (payload.image) {
      imageKey = await putDataUrlObject({
        ownerUserId: userId,
        shareId,
        kind: "image",
        dataUrl: payload.image,
        maxBytes: MAX_IMAGE_BYTES,
      });
    }

    await executeDb(
      `
        INSERT INTO shares (id, user_id, image_key, audio_key, audio_file_name, expires_at)
        VALUES ($1, $2, $3, $4, $5, $6)
      `,
      [shareId, userId, imageKey, audioKey, payload.audioFile.name, expiresAt.toISOString()],
    );

    const response: CreateShareResponse = {
      id: shareId,
      expiresAt: expiresAt.toISOString(),
      playerUrl: `/player/${shareId}`,
    };

    return res.status(201).json(response);
  } catch (error) {
    if (audioKey) {
      await deleteObjectByKey(audioKey).catch(() => undefined);
    }

    if (imageKey) {
      await deleteObjectByKey(imageKey).catch(() => undefined);
    }

    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid request body", issues: error.issues });
    }

    if (error instanceof Error && error.message.includes("x-user-id")) {
      return res.status(401).json({ error: error.message });
    }

    console.error("Failed to create shared player", error);
    return res.status(500).json({ error: "Failed to create share link" });
  }
};

export const getSharedPlayerById: RequestHandler<{ id: string }> = async (req, res) => {
  try {
    const { id } = req.params;

    if (!canUseManagedStorage) {
      const record = inMemoryShares.get(id);

      if (!record) {
        return res.status(404).json({ error: "Player not found" });
      }

      if (record.revokedAt) {
        return res.status(410).json({ error: "This share link has been revoked" });
      }

      if (new Date(record.expiresAt).getTime() <= Date.now()) {
        inMemoryShares.delete(id);
        return res.status(410).json({ error: "This share link has expired" });
      }

      const response: SharedPlayerResponse = {
        id: record.id,
        imageUrl: record.data.image,
        audioUrl: record.data.audioFile.data,
        audioFileName: record.data.audioFile.name,
        createdAt: record.data.createdAt,
        expiresAt: record.expiresAt,
      };

      return res.json(response);
    }

    const rows = await queryDb<ShareRow>(
      `
        SELECT id, image_key, audio_key, audio_file_name, created_at, expires_at, revoked_at
        FROM shares
        WHERE id = $1
      `,
      [id],
    );

    if (!rows.length) {
      return res.status(404).json({ error: "Player not found" });
    }

    const share = rows[0];
    if (share.revoked_at) {
      return res.status(410).json({ error: "This share link has been revoked" });
    }

    if (new Date(share.expires_at).getTime() <= Date.now()) {
      return res.status(410).json({ error: "This share link has expired" });
    }

    const [audioUrl, imageUrl] = await Promise.all([
      getSignedReadUrl(share.audio_key, 180),
      share.image_key ? getSignedReadUrl(share.image_key, 180) : Promise.resolve(null),
    ]);

    const response: SharedPlayerResponse = {
      id: share.id,
      imageUrl,
      audioUrl,
      audioFileName: share.audio_file_name,
      createdAt: share.created_at,
      expiresAt: share.expires_at,
    };

    return res.json(response);
  } catch (error) {
    console.error("Failed to load shared player", error);
    return res.status(500).json({ error: "Failed to load shared player" });
  }
};

export const listOwnedShares: RequestHandler = async (req, res) => {
  try {
    const userId = getRequiredUserId(req);

    if (!canUseManagedStorage) {
      const response: ManagedShare[] = [...inMemoryShares.values()]
        .filter((item) => item.userId === userId)
        .sort((a, b) => new Date(b.data.createdAt).getTime() - new Date(a.data.createdAt).getTime())
        .map((item) => ({
          id: item.id,
          userId: item.userId,
          audioFileName: item.data.audioFile.name,
          createdAt: item.data.createdAt,
          expiresAt: item.expiresAt,
          revokedAt: item.revokedAt,
        }));

      return res.json(response);
    }

    const rows = await queryDb<ShareRow>(
      `
        SELECT id, user_id, audio_file_name, created_at, expires_at, revoked_at
        FROM shares
        WHERE user_id = $1
        ORDER BY created_at DESC
      `,
      [userId],
    );

    const response: ManagedShare[] = rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      audioFileName: row.audio_file_name,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
      revokedAt: row.revoked_at,
    }));

    return res.json(response);
  } catch (error) {
    if (error instanceof Error && error.message.includes("x-user-id")) {
      return res.status(401).json({ error: error.message });
    }

    console.error("Failed to list user shares", error);
    return res.status(500).json({ error: "Failed to list user shares" });
  }
};

export const revokeOwnedShare: RequestHandler<{ id: string }> = async (req, res) => {
  try {
    const userId = getRequiredUserId(req);
    const { id } = req.params;

    if (!canUseManagedStorage) {
      const record = inMemoryShares.get(id);
      if (!record) {
        return res.status(404).json({ error: "Share not found" });
      }

      if (record.userId !== userId) {
        return res.status(403).json({ error: "Forbidden" });
      }

      record.revokedAt = new Date().toISOString();
      inMemoryShares.set(id, record);
      return res.status(204).send();
    }

    const rows = await queryDb<ShareRow>(
      `
        SELECT id, user_id, image_key, audio_key, revoked_at
        FROM shares
        WHERE id = $1
      `,
      [id],
    );

    if (!rows.length) {
      return res.status(404).json({ error: "Share not found" });
    }

    const share = rows[0];
    if (share.user_id !== userId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    if (share.revoked_at) {
      return res.status(204).send();
    }

    await executeDb(
      `
        UPDATE shares
        SET revoked_at = NOW()
        WHERE id = $1 AND user_id = $2
      `,
      [id, userId],
    );

    return res.status(204).send();
  } catch (error) {
    if (error instanceof Error && error.message.includes("x-user-id")) {
      return res.status(401).json({ error: error.message });
    }

    console.error("Failed to revoke share", error);
    return res.status(500).json({ error: "Failed to revoke share" });
  }
};
