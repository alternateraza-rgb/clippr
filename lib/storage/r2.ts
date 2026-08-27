import {
  DeleteObjectsCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  hasR2,
  r2AccessKeyId,
  r2AccountId,
  r2Bucket,
  r2SecretAccessKey,
} from "@/lib/config";

/** Where a clip's bytes live. Recorded per render so reads never have to guess. */
export type StorageProvider = "supabase" | "r2";

let client: S3Client | null = null;

/**
 * Null when R2 is not configured, so every caller falls back to Supabase
 * rather than throwing. Kept as a module singleton: the SDK holds a connection
 * pool, and building one per request throws that away.
 */
export function r2Client(): S3Client | null {
  if (!hasR2()) return null;
  if (!client) {
    client = new S3Client({
      // R2 is single-region behind the scenes and expects "auto".
      region: "auto",
      endpoint: `https://${r2AccountId()}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: r2AccessKeyId(),
        secretAccessKey: r2SecretAccessKey(),
      },
    });
  }
  return client;
}

export async function putR2Object(
  key: string,
  body: Uint8Array,
  contentType: string,
): Promise<boolean> {
  const s3 = r2Client();
  if (!s3) return false;
  await s3.send(
    new PutObjectCommand({
      Bucket: r2Bucket(),
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
  return true;
}

/**
 * A time-limited link to a private object. The bucket stays private so a clip
 * is only reachable by someone the app handed a link to.
 */
export async function presignR2Url(key: string, expiresIn: number): Promise<string | null> {
  const s3 = r2Client();
  if (!s3) return null;
  return getSignedUrl(s3, new GetObjectCommand({ Bucket: r2Bucket(), Key: key }), {
    expiresIn,
  });
}

export async function deleteR2Objects(keys: string[]): Promise<boolean> {
  const s3 = r2Client();
  if (!s3 || !keys.length) return false;
  await s3.send(
    new DeleteObjectsCommand({
      Bucket: r2Bucket(),
      Delete: { Objects: keys.map((Key) => ({ Key })) },
    }),
  );
  return true;
}
