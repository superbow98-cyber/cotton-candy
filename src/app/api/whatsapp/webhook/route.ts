import { NextRequest, NextResponse } from 'next/server'
import { adminClient } from '@/lib/supabase/server'
export const maxDuration = 300 // 5 minit

// Helper — send message via Twilio
async function sendMessage(to: string, body: string) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID!
  const authToken = process.env.TWILIO_AUTH_TOKEN!
  const from = 'whatsapp:+14155238886'

  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({ To: to, From: from, Body: body }).toString()
  })
  const result = await res.json()
  console.log('sendMessage result:', JSON.stringify(result))
}
export async function POST(req: NextRequest) {
  const text = await req.text()
  console.log('RAW BODY:', text)

  const params = new URLSearchParams(text)
  const from = params.get('From') as string
  const type = params.get('MediaContentType0')
  const body = (params.get('Body') ?? '').toUpperCase().trim()
  const mediaUrl = params.get('MediaUrl0')

  console.log('PARSED:', { from, type, body, mediaUrl })

  const twiml = '<?xml version="1.0" encoding="UTF-8"?><Response></Response>'

  if (mediaUrl && type?.startsWith('audio')) {
    await handleVoiceNote(from, mediaUrl)
  } else if (body) {
    await handleTextReply(from, body)
  }
  return new NextResponse(twiml, {
    status: 200,
    headers: { 'Content-Type': 'text/xml' }
  })
}
async function handleVoiceNote(from: string, mediaUrl: string) {
  await sendMessage(from, '🍬 *Cotton Candy*\n\n⏳ Processing voice note kamu...\nBiasanya ambil 30-60 saat.')

  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID!
    const authToken = process.env.TWILIO_AUTH_TOKEN!

    // Download audio dari Twilio
    const audioRes = await fetch(mediaUrl, {
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64')
      }
    })
    const audioBuffer = Buffer.from(await audioRes.arrayBuffer())

    // Hantar ke transcription pipeline
    const formData = new FormData()
    formData.append('audio', new Blob([audioBuffer], { type: 'audio/ogg' }), 'lecture.ogg')
    formData.append('source', 'whatsapp')

    const transcribeRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/upload-audio`, {
      method: 'POST',
      body: formData
    })
    const { jobId } = await transcribeRes.json()

    // Poll sampai done
    let transcript = ''
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 3000))
      const status = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/upload-audio/status/${jobId}`)
      const data = await status.json()
      if (data.status === 'done') { transcript = data.transcript_md; break }
    }

    if (!transcript) throw new Error('Transcription timeout')

    // Summarize
    const sumRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/ai-summarize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript_md: transcript, type: 'lecture' })
    })
    const summary = await sumRes.json()

    // Save session
    // Save session
    const sb = adminClient()
    await sb.from('whatsapp_sessions').insert({
      phone: from,
      transcript_md: transcript,
      summary_json: summary
    })

    // Balas dengan key points
    const keyPoints = summary.keyPoints?.slice(0, 5)
      .map((p: string, i: number) => `${i + 1}. ${p}`).join('\n') ?? ''

    await sendMessage(from,
      `🍬 *Cotton Candy — Ready!*\n\n📋 *Key Points:*\n${keyPoints}\n\n` +
      `Reply dengan:\n• *SUMMARY* — Full summary\n• *QUIZ* — 10 soalan MCQ\n• *FLASH* — Flashcards\n• *ASK [soalan]* — Tanya tentang lecture`
    )

  } catch (err) {
    console.error(err)
    await sendMessage(from, '❌ Ada masalah processing. Cuba hantar semula.')
  }
}

async function handleTextReply(from: string, text: string) {
  try {
    console.log('handleTextReply START', { from, text })
    const sb = adminClient()
    console.log('supabase client created')

    const { data: session, error } = await sb
      .from('whatsapp_sessions')
      .select('*')
      .eq('phone', from)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    console.log('session query result:', { session, error })

    if (!session) {
      console.log('no session, sending voice note prompt')
      await sendMessage(from, '🍬 Hantar voice note dulu untuk mulakan sesi baru!')
      return
    }

    const summary = session.summary_json

    if (text === 'SUMMARY') {
      await sendMessage(from, `📋 *Summary*\n\n${summary.summary ?? 'Tiada summary.'}`)
    } else if (text === 'QUIZ') {
      const questions = summary.questions?.slice(0, 5) ?? []
      const quizText = questions.map((q: any, i: number) =>
        `*Q${i + 1}.* ${q.question}\n` +
        q.options?.map((o: string, j: number) => `${['A', 'B', 'C', 'D'][j]}. ${o}`).join('\n')
      ).join('\n\n')
      await sendMessage(from, `✅ *Quiz*\n\n${quizText}`)
    } else if (text === 'FLASH') {
      const cards = summary.flashcards?.slice(0, 8) ?? []
      const flashText = cards.map((c: any, i: number) =>
        `*${i + 1}. ${c.front}*\n→ ${c.back}`
      ).join('\n\n')
      await sendMessage(from, `🃏 *Flashcards*\n\n${flashText}`)
    } else if (text.startsWith('ASK ')) {
      const question = text.slice(4)
      const askRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/ai-summarize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript_md: session.transcript_md, question, type: 'ask' })
      })
      const { answer } = await askRes.json()
      await sendMessage(from, `💬 *${question}*\n\n${answer}`)
    } else {
      await sendMessage(from, `Reply dengan:\n• *SUMMARY*\n• *QUIZ*\n• *FLASH*\n• *ASK [soalan]*`)
    }
  } catch (err) {
    console.error('handleTextReply ERROR:', err)
    await sendMessage(from, '❌ Error. Cuba lagi.')
  }
}
