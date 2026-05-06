// src/lib/r2.ts
// v63: Cloudflare R2 client utility
// Used for: pre-signed PUT URLs (browser direct upload) + GET URLs (server fetch)

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'cotton-candy-uploads'
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL  // https://pub-xxx.r2.dev

let _client: S3Client | null = null

function getClient(): S3Client {
  if (_client) return _client
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    throw new Error('R2 credentials not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY env vars.')
  }
  _client = new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  })
  return _client
}

/**
 * Generate pre-signed URL for browser to upload file directly to R2
 * @param key - R2 object key (e.g. "user-id/job-id.m4a")
 * @param contentType - MIME type
 * @param expiresInSeconds - URL validity (default 1 hour)
 */
export async function getPresignedUploadUrl(
  key: string,
  contentType: string,
  expiresInSeconds = 3600
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  })
  return getSignedUrl(getClient(), command, { expiresIn: expiresInSeconds })
}

/**
 * Generate pre-signed URL for server/client to download file from R2
 */
export async function getPresignedDownloadUrl(
  key: string,
  expiresInSeconds = 3600
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
  })
  return getSignedUrl(getClient(), command, { expiresIn: expiresInSeconds })
}

/**
 * Get public URL for object (requires Public Development URL enabled in R2 settings)
 */
export function getPublicUrl(key: string): string | null {
  if (!R2_PUBLIC_URL) return null
  return `${R2_PUBLIC_URL.replace(/\/$/, '')}/${key}`
}

/**
 * Delete object from R2
 */
export async function deleteObject(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
  })
  await getClient().send(command)
}

/**
 * Generate object key for a user's upload
 */
export function buildUploadKey(userId: string, jobId: string, ext: string): string {
  const safe = ext.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().slice(0, 5) || 'bin'
  return `uploads/${userId}/${jobId}.${safe}`
}

/**
 * Detect file extension from MIME type
 */
export function mimeToExt(mime: string): string {
  if (mime.includes('mp4') || mime.includes('m4a')) return 'm4a'
  if (mime.includes('mpeg') || mime.includes('mp3')) return 'mp3'
  if (mime.includes('wav')) return 'wav'
  if (mime.includes('ogg')) return 'ogg'
  if (mime.includes('flac')) return 'flac'
  if (mime.includes('webm')) return 'webm'
  return 'bin'
}
