// Supabase Edge Function: notify-online
//
// 1) Normal mode — called by the app right after someone sets Ready Check to "On now".
//    Pushes "<name> is on now" to every OTHER squad member's subscribed devices.
//    A cooldown stops spam if someone toggles back and forth.
// 2) Test mode — body { "test": true }: pushes a test notification to the CALLER's own
//    devices (no cooldown), used by the "Send test notification" button in Settings.
// 3) Shoutbox mode — body { "shout": <message id> }: called right after someone posts in
//    the shoutbox. Pushes the message to every OTHER member's devices that have shoutbox
//    pings on. Only the first message of a burst buzzes (see SHOUT_QUIET_MS).
//
// Every call logs one summary line (see Edge Functions → notify-online → Logs).
//
// Secrets it needs (Supabase → Edge Functions → Secrets):
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided automatically.

import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

const COOLDOWN_MS = 20 * 60 * 1000 // at most one "on now" ping per person every 20 minutes
const SHOUT_QUIET_MS = 2 * 60 * 1000 // no new shoutbox ping if the same person posted in the last 2 minutes
const APP_URL = 'https://athanmaxxing.github.io/DashMaxx/'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

const deviceKind = (endpoint: string) =>
  endpoint.includes('web.push.apple.com') ? 'iphone' : endpoint.includes('fcm.googleapis.com') ? 'android/chrome' : 'other'

type Sub = { id: number; endpoint: string; p256dh: string; auth: string }

/** Send one payload to many devices; returns counts and removes dead subscriptions. */
async function sendAll(admin: ReturnType<typeof createClient>, subs: Sub[], payload: string) {
  let sent = 0
  const expired: number[] = []
  const failures: string[] = []
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, {
          TTL: 60 * 60, // drop it if the phone is offline for over an hour
          urgency: 'high',
        })
        sent++
      } catch (err) {
        const e = err as { statusCode?: number; body?: string; message?: string }
        // 404/410 = the device unsubscribed or the app was removed: clean it up.
        if (e.statusCode === 404 || e.statusCode === 410) expired.push(s.id)
        failures.push(`${deviceKind(s.endpoint)} ${e.statusCode ?? '?'} ${(e.body || e.message || '').slice(0, 200)}`)
      }
    }),
  )
  if (expired.length) await admin.from('push_subscriptions').delete().in('id', expired)
  return { sent, removed: expired.length, failures }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  // Who is calling? (the app sends the signed-in user's access token)
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
  const { data: auth } = await admin.auth.getUser(token)
  const user = auth?.user
  if (!user) {
    console.log('rejected: not signed in')
    return json({ error: 'Not signed in' }, 401)
  }

  const body = await req.json().catch(() => ({}))
  const { data: profile } = await admin.from('profiles').select('username').eq('id', user.id).maybeSingle()
  const name = profile?.username ?? 'Someone'

  const pub = Deno.env.get('VAPID_PUBLIC_KEY')
  const priv = Deno.env.get('VAPID_PRIVATE_KEY')
  if (!pub || !priv) {
    console.log('error: VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY secrets are missing')
    return json({ error: 'Push keys not configured on the server' }, 500)
  }
  webpush.setVapidDetails(APP_URL, pub, priv)

  // ---- Test mode: ping the caller's own devices -----------------------------
  if (body?.test) {
    const { data: subs } = await admin.from('push_subscriptions').select('id, endpoint, p256dh, auth').eq('user_id', user.id)
    if (!subs?.length) {
      console.log(`test by ${name}: no devices subscribed`)
      return json({ sent: 0, reason: 'none of your devices are subscribed' })
    }
    const result = await sendAll(
      admin,
      subs,
      JSON.stringify({ title: 'DashMaxx test 🔔', body: 'Notifications work on this device!', url: `${APP_URL}#/`, tag: 'test' }),
    )
    console.log(`test by ${name}: devices ${subs.length}, sent ${result.sent}, removed ${result.removed}`, result.failures.join(' | '))
    return json({ ...result, devices: subs.length })
  }

  // ---- Shoutbox mode: "<name>: <message>" -----------------------------------
  if (body?.shout) {
    const { data: msg } = await admin
      .from('shoutbox_messages')
      .select('id, user_id, body, created_at')
      .eq('id', body.shout)
      .maybeSingle()
    if (!msg || msg.user_id !== user.id) {
      console.log(`shout by ${name}: skipped (message ${body.shout} not found or not theirs)`)
      return json({ sent: 0, reason: 'message not found' })
    }
    const since = new Date(new Date(msg.created_at).getTime() - SHOUT_QUIET_MS).toISOString()
    const { count } = await admin
      .from('shoutbox_messages')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .neq('id', msg.id)
      .gte('created_at', since)
      .lte('created_at', msg.created_at)
    if (count) {
      console.log(`shout by ${name}: skipped (posted recently)`)
      return json({ sent: 0, reason: 'burst' })
    }
    const { data: subs } = await admin
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .neq('user_id', user.id)
      .eq('notify_shoutbox', true)
    if (!subs?.length) {
      console.log(`shout by ${name}: skipped (nobody has shoutbox pings on)`)
      return json({ sent: 0, reason: 'nobody else subscribed' })
    }
    const text = msg.body.length > 140 ? `${msg.body.slice(0, 139)}…` : msg.body
    const result = await sendAll(
      admin,
      subs,
      JSON.stringify({ title: `💬 ${name}`, body: text, url: `${APP_URL}#/?tab=squad`, tag: 'shoutbox' }),
    )
    console.log(`shout by ${name}: devices ${subs.length}, sent ${result.sent}, removed ${result.removed}`, result.failures.join(' | '))
    return json({ ...result, devices: subs.length })
  }

  // ---- Normal mode: "<name> is on now" --------------------------------------
  const { data: status } = await admin
    .from('squad_status')
    .select('status, game, online_notified_at')
    .eq('user_id', user.id)
    .maybeSingle()
  if (status?.status !== 'online') {
    console.log(`${name}: skipped (status is ${status?.status ?? 'none'}, not online)`)
    return json({ sent: 0, reason: 'not online' })
  }
  if (status.online_notified_at && Date.now() - new Date(status.online_notified_at).getTime() < COOLDOWN_MS) {
    const mins = Math.ceil((COOLDOWN_MS - (Date.now() - new Date(status.online_notified_at).getTime())) / 60000)
    console.log(`${name}: skipped (cooldown, ${mins} min left)`)
    return json({ sent: 0, reason: 'cooldown', minutesLeft: mins })
  }

  const { data: subs } = await admin
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .neq('user_id', user.id)
  if (!subs?.length) {
    console.log(`${name}: skipped (no other squad member has notifications on)`)
    return json({ sent: 0, reason: 'nobody else subscribed' })
  }

  await admin.from('squad_status').update({ online_notified_at: new Date().toISOString() }).eq('user_id', user.id)

  const result = await sendAll(
    admin,
    subs,
    JSON.stringify({
      title: `${name} is on now 🎮`,
      body: status.game ? `Playing ${status.game}. Jump in!` : 'Jump in!',
      url: `${APP_URL}#/?tab=squad`,
      tag: `online-${user.id}`, // replaces an older ping about the same person
    }),
  )
  console.log(`${name} online: devices ${subs.length}, sent ${result.sent}, removed ${result.removed}`, result.failures.join(' | '))
  return json({ ...result, devices: subs.length })
})
