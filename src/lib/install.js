/*
 * "Install app" support.
 * Android/desktop Chrome fire `beforeinstallprompt`, which we keep so a button can trigger the
 * real install dialog later. iPhone Safari has no such event, so we show instructions instead.
 * This module is imported from main.jsx so the listener is attached before the event fires.
 */
let deferredPrompt = null
const listeners = new Set()
const notify = () => listeners.forEach((fn) => fn())

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferredPrompt = e
    notify()
  })
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null
    notify()
  })
}

export const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true

export const isIos = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) // iPadOS reports as Mac

export const canPromptInstall = () => Boolean(deferredPrompt)

export async function promptInstall() {
  if (!deferredPrompt) return false
  deferredPrompt.prompt()
  const { outcome } = await deferredPrompt.userChoice
  deferredPrompt = null
  notify()
  return outcome === 'accepted'
}

export function subscribe(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
