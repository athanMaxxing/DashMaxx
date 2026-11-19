import { supabase } from './supabase'
import { isIos, isStandalone } from './install'

/*
 * Web Push: each device subscribes separately and is stored in `push_subscriptions`.
 * The Supabase Edge Function `notify-online` sends the actual notifications.
 */
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY

export const pushConfigured = Boolean(VAPID_PUBLIC_KEY)

export const pushSupported = () =>
  typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window

/** iPhone only allows push for the app added to the home screen. */
export const needsInstallForPush = () => isIos() && !isStandalone()

function base64ToUint8Array(base64) {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(padded)
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)))
}

/** The service worker registration, or null if there isn't one (e.g. the dev server). */
async function registration() {
  if (!pushSupported()) return null
  const timeout = new Promise((resolve) => setTimeout(() => resolve(null), 4000))
  return Promise.race([navigator.serviceWorker.ready, timeout])
}

/** Is THIS device currently subscribed? */
export async function isSubscribed() {
  const reg = await registration()
  const sub = await reg?.pushManager.getSubscription()
  return Boolean(sub)
}

export async function enablePush(userId) {
  if (!pushConfigured) throw new Error('Push isn’t set up yet (missing VAPID key).')
  if (!pushSupported()) throw new Error('This browser doesn’t support notifications.')
  if (needsInstallForPush()) throw new Error('On iPhone, add DashMaxx to your home screen first, then turn this on from the app.')

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('Notifications are blocked. Allow them in your browser/phone settings.')

  const reg = await registration()
  if (!reg) throw new Error('Notifications only work on the live site / installed app.')

  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64ToUint8Array(VAPID_PUBLIC_KEY) }))
  const { endpoint, keys } = sub.toJSON()

  // Replace any previous row for this device.
  await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint)
  const { error } = await supabase
    .from('push_subscriptions')
    .insert({ user_id: userId, endpoint, p256dh: keys.p256dh, auth: keys.auth })
  if (error) {
    if (error.code === '23505') throw new Error('This device is linked to another DashMaxx account. Turn notifications off there first.')
    throw error
  }
}

export async function disablePush() {
  const reg = await registration()
  const sub = await reg?.pushManager.getSubscription()
  if (!sub) return
  await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
  await sub.unsubscribe()
}

/** Ask the server to ping the squad that I'm on now (it handles cooldowns). Returns its summary. */
export async function notifySquadOnline() {
  const { data, error } = await supabase.functions.invoke('notify-online', { body: {} })
  if (error) throw error
  return data // { sent, devices, reason?, minutesLeft? }
}

/** Push a test notification to all of MY subscribed devices. */
export async function sendTestPush() {
  const { data, error } = await supabase.functions.invoke('notify-online', { body: { test: true } })
  if (error) throw error
  return data // { sent, devices, removed, failures, reason? }
}
