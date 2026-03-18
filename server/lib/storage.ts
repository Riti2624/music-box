import { randomUUID } from "crypto";
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const S3_REGION = process.env.S3_REGION;
const S3_BUCKET = process.env.S3_BUCKET;
const S3_ACCESS_KEY_ID = process.env.S3_ACCESS_KEY_ID;
const S3_SECRET_ACCESS_KEY = process.env.S3_SECRET_ACCESS_KEY;
const S3_ENDPOINT = process.env.S3_ENDPOINT;

const s3Client =
  S3_REGION && S3_BUCKET && S3_ACCESS_KEY_ID && S3_SECRET_ACCESS_KEY
    ? new S3Client({
        region: S3_REGION,
        endpoint: S3_ENDPOINT,
        forcePathStyle: Boolean(S3_ENDPOINT),
        credentials: {
          accessKeyId: S3_ACCESS_KEY_ID,
          secretAccessKey: S3_SECRET_ACCESS_KEY,
        },
      })
    : null;

  export const isStorageConfigured = Boolean(s3Client);

const DATA_URL_REGEX = /^data:([^;]+);base64,(.+)$/;

function getStorage(): { client: S3Client; bucket: string } {
  if (!s3Client || !S3_BUCKET) {
    throw new Error(
      "Missing S3 configuration. Expected S3_REGION, S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY",
    );
  }

  return { client: s3Client, bucket: S3_BUCKET };
}

function parseDataUrl(dataUrl: string): { contentType: string; bytes: Buffer } {
  const match = DATA_URL_REGEX.exec(dataUrl);
  if (!match) {
    throw new Error("Invalid data URL payload");
  }

  const [, contentType, base64Payload] = match;
  const bytes = Buffer.from(base64Payload, "base64");
  return { contentType, bytes };
}

function extensionForContentType(contentType: string): string {
  if (contentType === "audio/mpeg" || contentType === "audio/mp3") return "mp3";
  if (contentType === "image/jpeg") return "jpg";
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  return "bin";
}

export async function putDataUrlObject(args: {
  ownerUserId: string;
  shareId: string;
  kind: "audio" | "image";
  dataUrl: string;
  maxBytes: number;
}): Promise<string> {
  const { ownerUserId, shareId, kind, dataUrl, maxBytes } = args;
  const { bytes, contentType } = parseDataUrl(dataUrl);

  if (bytes.byteLength > maxBytes) {
    throw new Error(`${kind} file exceeds max size limit`);
  }

  const extension = extensionForContentType(contentType);
  const randomSuffix = randomUUID().replace(/-/g, "").slice(0, 10);
  const key = `${kind}/${ownerUserId}/${shareId}-${randomSuffix}.${extension}`;
  const { client, bucket } = getStorage();

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: bytes,
      ContentType: contentType,
      CacheControl: "private, max-age=0, no-store",
    }),
  );

  return key;
}

export async function getSignedReadUrl(key: string, expiresInSeconds = 120): Promise<string> {
  const { client, bucket } = getStorage();
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  return getSignedUrl(client, command, { expiresIn: expiresInSeconds });
}

export async function deleteObjectByKey(key: string): Promise<void> {
  const { client, bucket } = getStorage();

  await client.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    }),
  );
}
