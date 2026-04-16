import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const region = process.env.AWS_REGION ?? "ap-south-1";
const bucket = process.env.AWS_S3_BUCKET ?? "";

const s3Client =
  process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY && bucket
    ? new S3Client({
        region,
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
        }
      })
    : null;

// Allowed MIME types and their max sizes
const ALLOWED_TYPES: Record<string, number> = {
  "image/jpeg": 10 * 1024 * 1024,
  "image/png": 10 * 1024 * 1024,
  "image/gif": 5 * 1024 * 1024,
  "image/webp": 10 * 1024 * 1024,
  "video/mp4": 100 * 1024 * 1024,
  "video/webm": 100 * 1024 * 1024,
  "audio/mpeg": 20 * 1024 * 1024,
  "audio/ogg": 20 * 1024 * 1024,
  "audio/webm": 20 * 1024 * 1024,
  "application/pdf": 20 * 1024 * 1024,
  "application/octet-stream": 50 * 1024 * 1024
};

function randomId(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function validateMimeType(mimeType: string): { valid: boolean; maxSize: number } {
  const maxSize = ALLOWED_TYPES[mimeType];
  return { valid: !!maxSize, maxSize: maxSize ?? 0 };
}

export async function createPresignedUpload(input: {
  userId: string;
  mimeType: string;
  extension: string;
}): Promise<{ uploadUrl: string; fileUrl: string; key: string; maxSize: number }> {
  const { valid, maxSize } = validateMimeType(input.mimeType);
  if (!valid) {
    throw new Error(`Unsupported file type: ${input.mimeType}`);
  }

  const key = `uploads/${input.userId}/${randomId()}.${input.extension}`;

  if (!s3Client || !bucket) {
    const fallbackUrl = `https://example.local/${key}`;
    return { uploadUrl: fallbackUrl, fileUrl: fallbackUrl, key, maxSize };
  }

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: input.mimeType,
    ContentLengthRange: [1, maxSize] as unknown as undefined // hint for client
  });

  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 60 * 5 });
  const fileUrl = `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
  return { uploadUrl, fileUrl, key, maxSize };
}

export async function createSignedReadUrl(key: string, expiresIn = 3600): Promise<string> {
  if (!s3Client || !bucket) return `https://example.local/${key}`;

  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  return getSignedUrl(s3Client, command, { expiresIn });
}
