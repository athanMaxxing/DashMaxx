import { useEffect, useState } from 'react'
import { BellRing, MessageSquare, Send } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { disablePush, enablePush, getShoutPref, isSubscribed, needsInstallForPush, pushConfigured, pushSupported, sendTestPush, setShoutPref } from '../lib/push'
import { useToast } from './Toast'

/** "Ping me when someone goes On now" switch. Applies to this device only. */
export default function PushToggle() {
  const { user } = useAuth()
  const toast = useToast()
  const [on, setOn] = useState(false)
  const [busy, setBusy] = useState(true)
  const [shout, setShout] = useState(null) // null = unknown / migration not run

  useEffect(() => {
    let active = true
    isSubscribed()
      .then(async (v) => {
        if (!active) return
        setOn(v)
        if (v) {
          const pref = await getShoutPref()
          if (active) setShout(pref)
        }
      })
      .finally(() => active && setBusy(false))
    return () => {
      active = false
    }
  }, [])

  const unavailable = !pushConfigured
    ? 'Notifications aren’t set up on the server yet.'
    : !pushSupported()
      ? 'This browser doesn’t support notifications.'
      : needsInstallForPush()
        ? 'On iPhone: add DashMaxx to your home screen, open it from there, then turn this on.'
        : typeof Notification !== 'undefined' && Notification.permission === 'denied'
          ? 'Notifications are blocked for this site. Allow them in your browser or phone settings.'
          : ''

  async function test() {
    setBusy(true)
    try {
      const r = await sendTestPush()
      if (r?.sent > 0) toast.success(`Test sent to ${r.sent} of your device${r.sent === 1 ? '' : 's'}. Check your notifications.`)
      else if (r?.failures?.length) toast.error(`Push was rejected: ${r.failures[0]}`)
      else toast.error(r?.reason ? `Nothing sent: ${r.reason}` : 'Nothing sent.')
    } catch (err) {
      toast.error(`Test failed: ${err.message}`)
    } finally {
      setBusy(false)
    }
  }

  async function toggle() {
    setBusy(true)
    try {
      if (on) {
        await disablePush()
        setOn(false)
        setShout(null)
        toast.info('Notifications off on this device')
      } else {
        await enablePush(user.id)
        setOn(true)
        setShout(await getShoutPref())
        toast.success('You’ll get a ping when someone goes On now')
      }
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function toggleShout() {
    const next = !shout
    setShout(next)
    try {
      await setShoutPref(next)
      toast.info(next ? 'Shoutbox pings on for this device' : 'Shoutbox pings off for this device')
    } catch (err) {
      setShout(!next)
      toast.error(err.message)
    }
  }

  return (
    <div>
      <div className="para flex items-center gap-3 bg-white/[0.04] py-3 pl-4 pr-5">
        <BellRing className="h-[18px] w-[18px] shrink-0 text-indigo-400" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-200">Ping me when someone goes On now</p>
          <p className="text-[11px] text-gray-500">{unavailable || 'Only on this device. Max one ping per person every 20 min.'}</p>
        </div>
        <Switch on={on} onClick={toggle} disabled={busy || (Boolean(unavailable) && !on)} />
      </div>
      {on && shout !== null && (
        <div className="para mt-1.5 flex items-center gap-3 bg-white/[0.04] py-3 pl-4 pr-5">
          <MessageSquare className="h-[18px] w-[18px] shrink-0 text-indigo-400" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-gray-200">Also ping me for shoutbox messages</p>
            <p className="text-[11px] text-gray-500">One ping per burst. Only on this device.</p>
          </div>
          <Switch on={shout} onClick={toggleShout} disabled={busy} />
        </div>
      )}
      {on && (
        <button type="button" className="btn-ghost mt-2 w-full py-1.5 text-xs" onClick={test} disabled={busy}>
          <Send className="h-3.5 w-3.5" /> Send test notification to my devices
        </button>
      )}
    </div>
  )
}

function Switch({ on, onClick, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onClick}
      disabled={disabled}
      className={`para relative h-6 w-12 shrink-0 transition [--cut:6px] disabled:opacity-40 ${on ? 'bg-indigo-400' : 'bg-gray-700'}`}
    >
      <span className={`para absolute top-1 h-4 w-5 transition-all [--cut:4px] ${on ? 'left-[24px] bg-gray-950' : 'left-1 bg-gray-400'}`} />
    </button>
  )
}
