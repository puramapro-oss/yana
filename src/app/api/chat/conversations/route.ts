import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase'

export const runtime = 'nodejs'

interface ConversationRow {
  id: string
  title: string | null
  created_at: string
  updated_at: string
}

interface MessagePreview {
  conversation_id: string
  content: string
  role: string
  created_at: string
}

export async function GET() {
  const sb = await createServerSupabaseClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Connexion requise.' }, { status: 401 })
  }

  const admin = createServiceClient()
  const { data: conversations, error } = await admin
    .from('conversations')
    .select('id, title, created_at, updated_at')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(50)
    .returns<ConversationRow[]>()

  if (error) {
    return NextResponse.json(
      { error: 'Impossible de récupérer tes conversations.' },
      { status: 500 },
    )
  }

  // Preview du dernier message de chaque conversation (pour affichage liste)
  const ids = (conversations ?? []).map((c) => c.id)
  const previews: Record<string, MessagePreview | undefined> = {}
  if (ids.length > 0) {
    const { data: lastMessages } = await admin
      .from('messages')
      .select('conversation_id, content, role, created_at')
      .in('conversation_id', ids)
      .order('created_at', { ascending: false })
      .returns<MessagePreview[]>()

    for (const m of lastMessages ?? []) {
      if (!previews[m.conversation_id]) {
        previews[m.conversation_id] = m
      }
    }
  }

  const withPreview = (conversations ?? []).map((c) => ({
    ...c,
    preview: previews[c.id]?.content?.slice(0, 120) ?? null,
    preview_role: previews[c.id]?.role ?? null,
  }))

  return NextResponse.json({ conversations: withPreview })
}
