import { z } from 'zod'
import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase'
import type { Conversation, Message } from '@/types'

export const runtime = 'nodejs'

const IdSchema = z.string().uuid({ message: 'Conversation invalide.' })

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const sb = await createServerSupabaseClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Connexion requise.' }, { status: 401 })
  }

  const { id } = await ctx.params
  const parsed = IdSchema.safeParse(id)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]!.message }, { status: 400 })
  }

  const admin = createServiceClient()

  const { data: conversation } = await admin
    .from('conversations')
    .select('id, user_id, title, created_at, updated_at')
    .eq('id', parsed.data)
    .maybeSingle<Conversation & { user_id: string }>()

  if (!conversation) {
    return NextResponse.json({ error: 'Conversation introuvable.' }, { status: 404 })
  }
  if (conversation.user_id !== user.id) {
    return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  }

  const { data: messages } = await admin
    .from('messages')
    .select('*')
    .eq('conversation_id', parsed.data)
    .order('created_at', { ascending: true })
    .limit(200)
    .returns<Message[]>()

  return NextResponse.json({
    conversation: {
      id: conversation.id,
      title: conversation.title,
      created_at: conversation.created_at,
      updated_at: conversation.updated_at,
    },
    messages: messages ?? [],
  })
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const sb = await createServerSupabaseClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Connexion requise.' }, { status: 401 })
  }

  const { id } = await ctx.params
  const parsed = IdSchema.safeParse(id)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]!.message }, { status: 400 })
  }

  const admin = createServiceClient()

  const { data: conversation } = await admin
    .from('conversations')
    .select('id, user_id')
    .eq('id', parsed.data)
    .maybeSingle()

  if (!conversation) {
    return NextResponse.json({ error: 'Conversation introuvable.' }, { status: 404 })
  }
  if (conversation.user_id !== user.id) {
    return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  }

  // Hard delete (messages cascade via FK ON DELETE CASCADE)
  const { error } = await admin.from('conversations').delete().eq('id', parsed.data)
  if (error) {
    return NextResponse.json({ error: 'Suppression impossible.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
