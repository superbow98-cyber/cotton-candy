// src/app/api/debug-r2/route.ts
// v63 DEBUG: Server-side test of R2 upload to expose actual HTTP error
// Bypasses browser to confirm if issue is server-side or browser-side

import { NextRequest, NextResponse } from 'next/server'
import { S3Client, PutObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function GET() {
  const result: any = {
    timestamp: new Date().toISOString(),
    env: {
      R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID
        ? `${process.env.R2_ACCOUNT_ID.slice(0, 8)}...${process.env.R2_ACCOUNT_ID.slice(-4)} (${process.env.R2_ACCOUNT_ID.length} chars)`
        : 'MISSING',
      R2_BUCKET_NAME: process.env.R2_BUCKET_NAME || 'MISSING',
      R2_ENDPOINT: process.env.R2_ENDPOINT || 'MISSING',
      R2_PUBLIC_URL: process.env.R2_PUBLIC_URL || 'MISSING',
      R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID
        ? `${process.env.R2_ACCESS_KEY_ID.slice(0, 4)}...${process.env.R2_ACCESS_KEY_ID.slice(-4)} (${process.env.R2_ACCESS_KEY_ID.length} chars)`
        : 'MISSING',
      R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY
        ? `set (${process.env.R2_SECRET_ACCESS_KEY.length} chars)`
        : 'MISSING',
    },
    tests: [],
  }

  if (!process.env.R2_ACCOUNT_ID || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY) {
    result.fatal = 'Missing required R2 env vars'
    return NextResponse.json(result, { status: 500 })
  }

  // ===== TEST 1: List bucket (verify auth + bucket exists) =====
  try {
    const client = new S3Client({
      region: 'auto',
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    })
    const listRes = await client.send(new ListObjectsV2Command({
      Bucket: process.env.R2_BUCKET_NAME!,
      MaxKeys: 5,
    }))
    result.tests.push({
      name: 'TEST 1: List bucket (auth check)',
      status: 'PASS',
      details: {
        bucketExists: true,
        keyCount: listRes.KeyCount || 0,
        objects: listRes.Contents?.map(o => ({ key: o.Key, size: o.Size })) || [],
      },
    })
  } catch (e: any) {
    result.tests.push({
      name: 'TEST 1: List bucket (auth check)',
      status: 'FAIL',
      error: {
        name: e.name,
        message: e.message,
        code: e.Code || e.code,
        statusCode: e.$metadata?.httpStatusCode,
        requestId: e.$metadata?.requestId,
      },
    })
  }

  // ===== TEST 2: Direct PUT from server (no browser) =====
  try {
    const client = new S3Client({
      region: 'auto',
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    })

    const testKey = `debug/server-test-${Date.now()}.txt`
    const testContent = 'Hello from Cotton Candy server debug ' + new Date().toISOString()

    const putRes = await client.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: testKey,
      Body: testContent,
      ContentType: 'text/plain',
    }))

    result.tests.push({
      name: 'TEST 2: Direct PUT from server',
      status: 'PASS',
      details: {
        key: testKey,
        etag: putRes.ETag,
        statusCode: putRes.$metadata?.httpStatusCode,
      },
    })
  } catch (e: any) {
    result.tests.push({
      name: 'TEST 2: Direct PUT from server',
      status: 'FAIL',
      error: {
        name: e.name,
        message: e.message,
        code: e.Code || e.code,
        statusCode: e.$metadata?.httpStatusCode,
        requestId: e.$metadata?.requestId,
      },
    })
  }

  // ===== TEST 3: Generate pre-signed PUT URL + try fetch from server =====
  try {
    const client = new S3Client({
      region: 'auto',
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
      forcePathStyle: true,
    })

    const testKey = `debug/presigned-test-${Date.now()}.txt`
    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: testKey,
    })
    const signedUrl = await getSignedUrl(client, command, { expiresIn: 300 })

    // Now use fetch (bypassing SDK) to PUT to that URL
    const testContent = 'Pre-signed URL test ' + new Date().toISOString()
    const fetchRes = await fetch(signedUrl, {
      method: 'PUT',
      body: testContent,
    })

    const responseText = await fetchRes.text().catch(() => '(no body)')

    result.tests.push({
      name: 'TEST 3: Pre-signed URL PUT via fetch (path-style)',
      status: fetchRes.ok ? 'PASS' : 'FAIL',
      details: {
        url: signedUrl.slice(0, 200) + '...',
        status: fetchRes.status,
        statusText: fetchRes.statusText,
        responseHeaders: Object.fromEntries(fetchRes.headers.entries()),
        responseBody: responseText.slice(0, 1000),
      },
    })
  } catch (e: any) {
    result.tests.push({
      name: 'TEST 3: Pre-signed URL PUT via fetch (path-style)',
      status: 'FAIL',
      error: {
        name: e.name,
        message: e.message,
        stack: e.stack?.split('\n').slice(0, 5).join('\n'),
      },
    })
  }

  // ===== TEST 4: Same as TEST 3 but virtual-hosted =====
  try {
    const client = new S3Client({
      region: 'auto',
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
      // No forcePathStyle = virtual-hosted
    })

    const testKey = `debug/vhost-test-${Date.now()}.txt`
    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: testKey,
    })
    const signedUrl = await getSignedUrl(client, command, { expiresIn: 300 })

    const testContent = 'Virtual-hosted test ' + new Date().toISOString()
    const fetchRes = await fetch(signedUrl, {
      method: 'PUT',
      body: testContent,
    })

    const responseText = await fetchRes.text().catch(() => '(no body)')

    result.tests.push({
      name: 'TEST 4: Pre-signed URL PUT via fetch (virtual-hosted)',
      status: fetchRes.ok ? 'PASS' : 'FAIL',
      details: {
        url: signedUrl.slice(0, 200) + '...',
        urlHost: new URL(signedUrl).host,
        status: fetchRes.status,
        statusText: fetchRes.statusText,
        responseBody: responseText.slice(0, 1000),
      },
    })
  } catch (e: any) {
    result.tests.push({
      name: 'TEST 4: Pre-signed URL PUT via fetch (virtual-hosted)',
      status: 'FAIL',
      error: {
        name: e.name,
        message: e.message,
      },
    })
  }

  // Summary
  const passed = result.tests.filter((t: any) => t.status === 'PASS').length
  const failed = result.tests.filter((t: any) => t.status === 'FAIL').length
  result.summary = `${passed} passed, ${failed} failed`

  return NextResponse.json(result, { status: 200 })
}
