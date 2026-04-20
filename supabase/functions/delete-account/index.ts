import { createClient } from 'npm:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
}

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

const transferOwnedLists = async (userId: string) => {
  const { data: ownedMemberships, error: ownedMembershipsError } = await admin
    .from('shopping_list_members')
    .select('list_id')
    .eq('user_id', userId)
    .eq('role', 'owner')

  if (ownedMembershipsError) throw ownedMembershipsError

  for (const membership of ownedMemberships ?? []) {
    const listId = membership.list_id as string

    const { data: replacementMembership, error: replacementError } = await admin
      .from('shopping_list_members')
      .select('user_id')
      .eq('list_id', listId)
      .neq('user_id', userId)
      .order('joined_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (replacementError) throw replacementError

    if (!replacementMembership?.user_id) {
      const { error: deleteListError } = await admin.from('shopping_lists').delete().eq('id', listId)
      if (deleteListError) throw deleteListError
      continue
    }

    const { error: promoteError } = await admin
      .from('shopping_list_members')
      .update({ role: 'owner' })
      .eq('list_id', listId)
      .eq('user_id', replacementMembership.user_id)

    if (promoteError) throw promoteError
  }
}

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ ok: false, error: 'Method not allowed' }), {
        status: 405,
        headers: { 'content-type': 'application/json' },
      })
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ ok: false, error: 'Missing bearer token' }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      })
    }

    const jwt = authHeader.replace('Bearer ', '').trim()
    const { data: userData, error: userError } = await admin.auth.getUser(jwt)

    if (userError || !userData.user) {
      return new Response(JSON.stringify({ ok: false, error: 'Invalid user token' }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      })
    }

    const userId = userData.user.id
    await transferOwnedLists(userId)
    const { error: deleteError } = await admin.auth.admin.deleteUser(userId)

    if (deleteError) {
      console.error('deleteUser failed', deleteError)
      return new Response(JSON.stringify({ ok: false, error: deleteError.message }), {
        status: 500,
        headers: { 'content-type': 'application/json' },
      })
    }

    console.log(JSON.stringify({ event: 'account_deleted', user_id: userId }))

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('delete-account fatal error', message)
    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    })
  }
})
