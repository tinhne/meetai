import "server-only";

import {
  DeleteObjectsCommand,
  GetObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Readable } from "node:stream";
import type { ReadableStream as WebReadableStream } from "node:stream/web";

import { env, isStorageEnabled } from "@/env";

// Private Cloudflare R2 bucket for recordings and transcripts. Files are only
// ever served through short-lived signed URLs after an authorization check.
const client = isStorageEnabled
  ? new S3Client({
      region: "auto",
      endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: env.R2_ACCESS_KEY_ID!,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY!,
      },
    })
  : null;

export const storageKeys = {
  recording: (meetingId: string) => `meetings/${meetingId}/recording.mp4`,
  transcript: (meetingId: string) => `meetings/${meetingId}/transcript.jsonl`,
};

// Streams a remote file (e.g. a Stream recording URL) into the bucket using a
// multipart upload, so large recordings are never buffered in memory.
export async function copyUrlToStorage(params: {
  sourceUrl: string;
  key: string;
  contentType: string;
}) {
  if (!client || !env.R2_BUCKET) return null;

  const source = await fetch(params.sourceUrl);
  if (!source.ok || !source.body) {
    throw new Error(`Could not download source file (${source.status})`);
  }

  await new Upload({
    client,
    params: {
      Bucket: env.R2_BUCKET,
      Key: params.key,
      Body: Readable.fromWeb(source.body as WebReadableStream),
      ContentType: params.contentType,
    },
    queueSize: 2,
    partSize: 16 * 1024 * 1024,
  }).done();

  return params.key;
}

export async function getSignedDownloadUrl(key: string, expiresInSec = 3600) {
  if (!client || !env.R2_BUCKET) return null;

  return getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: env.R2_BUCKET, Key: key }),
    { expiresIn: expiresInSec },
  );
}

export async function deleteFromStorage(keys: (string | null | undefined)[]) {
  const objects = keys.filter((key): key is string => !!key);
  if (!client || !env.R2_BUCKET || objects.length === 0) return;

  await client.send(
    new DeleteObjectsCommand({
      Bucket: env.R2_BUCKET,
      Delete: { Objects: objects.map((Key) => ({ Key })) },
    }),
  );
}
