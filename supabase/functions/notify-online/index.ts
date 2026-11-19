// Supabase Edge Function: notify-online
//
// Called by the app right after someone sets their Ready Check status to "On now".
// Sends a push notification ("<name> is on now") to every OTHER squad member's devices
// that switched notifications on. A cooldown stops spam if someone toggles back and forth.
//
// Secrets it needs (Supabase → Edge Functions → Secrets):
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided automatically.

import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

const COOLDOWN_MS = 20 * 60 * 1000 // at most one "on now" ping per person every 20 minutes
const APP_URL = 'https://athanmaxxing.github.io/DashMaxx/'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  // Who is calling? (the app sends the signed-in user's access token)
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
  const { data: auth } = await admin.auth.getUser(token)
  const user = auth?.user
  if (!user) return json({ error: 'Not signed in' }, 401)

  // Only ping if they really are "On now", and not too often.
  const { data: status } = await admin
    .from('squad_status')
    .select('status, game, online_notified_at')
    .eq('user_id', user.id)
    .maybeSingle()
  if (status?.status !== 'online') return json({ sent: 0, reason: 'not online' })
  if (status.online_notified_at && Date.now() - new Date(status.online_notified_at).getTime() < COOLDOWN_MS) {
    return json({ sent: 0, reason: 'cooldown' })
  }
  await admin.from('squad_status').update({ online_notified_at: new Date().toISOString() }).eq('user_id', user.id)

  const { data: profile } = await admin.from('profiles').select('username').eq('id', user.id).maybeSingle()
  const name = profile?.username ?? 'Someone'

  const { data: subs } = await admin
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .neq('user_id', user.id)
  if (!subs?.length) return json({ sent: 0, reason: 'nobody subscribed' })

  webpush.setVapidDetails(APP_URL, Deno.env.get('VAPID_PUBLIC_KEY')!, Deno.env.get('VAPID_PRIVATE_KEY')!)

  const payload = JSON.stringify({
    title: `${name} is on now 🎮`,
    body: status.game ? `Playing ${status.game}. Jump in!` : 'Jump in!',
    url: `${APP_URL}#/?tab=squad`,
    tag: `online-${user.id}`, // replaces an older ping about the same person
  })

  let sent = 0
  const expired: number[] = []
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, {
          TTL: 60 * 60, // drop it if the phone is offline for over an hour
        })
        sent++
      } catch (err) {
        // 404/410 = the device unsubscribed or the app was removed: clean it up.
        const code = (err as { statusCode?: number }).statusCode
        if (code === 404 || code === 410) expired.push(s.id)
        else console.error('push failed', code, (err as Error).message)
      }
    }),
  )
  if (expired.length) await admin.from('push_subscriptions').delete().in('id', expired)

  return json({ sent, removed: expired.length })
})
