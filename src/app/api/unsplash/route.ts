// src/app/api/unsplash/route.ts
// v28 — Search Unsplash for hero image based on keyword.
// Returns image URL + photographer credit.

import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

const UNSPLASH_URL = 'https://api.unsplash.com/search/photos'

export async function GET(req: NextRequest) {
  try {
    const apiKey = process.env.UNSPLASH_ACCESS_KEY
    if (!apiKey) {
      return NextResponse.json({
        error: 'UNSPLASH_ACCESS_KEY not configured.',
      }, { status: 500 })
    }

    const url = new URL(req.url)
    const query = url.searchParams.get('q')?.trim()

    if (!query) {
      return NextResponse.json({ error: 'Missing query param "q"' }, { status: 400 })
    }

    // Search Unsplash
    const params = new URLSearchParams({
      query,
      per_page: '1',
      orientation: 'landscape',
      content_filter: 'high', // safe content
    })

    const res = await fetch(`${UNSPLASH_URL}?${params}`, {
      headers: {
        Authorization: `Client-ID ${apiKey}`,
        'Accept-Version': 'v1',
      },
    })

    if (!res.ok) {
      console.error('[unsplash] error:', res.status)
      return NextResponse.json({
        error: 'Image search failed',
      }, { status: 502 })
    }

    const data = await res.json()
    const photo = data.results?.[0]

    if (!photo) {
      return NextResponse.json({
        image: null,
        message: 'No image found',
      })
    }

    return NextResponse.json({
      image: {
        url: photo.urls.regular,        // ~1080px wide
        thumb: photo.urls.small,         // ~400px
        full: photo.urls.full,           // original
        alt: photo.alt_description || query,
        photographer: {
          name: photo.user.name,
          username: photo.user.username,
          link: `https://unsplash.com/@${photo.user.username}?utm_source=cotton_candy&utm_medium=referral`,
        },
        unsplashLink: `https://unsplash.com?utm_source=cotton_candy&utm_medium=referral`,
      },
    })
  } catch (e: any) {
    console.error('[unsplash] Error:', e)
    return NextResponse.json({
      error: e.message || 'Image search failed',
    }, { status: 500 })
  }
}
