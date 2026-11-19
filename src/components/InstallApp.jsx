import { useEffect, useState, useSyncExternalStore } from 'react'
import { Download, Share, SquarePlus, X } from 'lucide-react'
import { canPromptInstall, isIos, isStandalone, promptInstall, subscribe } from '../lib/install'
import { useToast } from './Toast'

/** Header button: installs the app (Android/desktop) or explains how (iPhone). Hidden once installed. */
export default function InstallApp() {
  const toast = useToast()
  const promptable = useSyncExternalStore(subscribe, canPromptInstall, () => false)
  const [showIosHelp, setShowIosHelp] = useState(false)

  if (isStandalone()) return null // already running as the installed app
  const ios = isIos()
  if (!promptable && !ios) return null // browser can't install (e.g. Firefox desktop)

  async function install() {
    if (ios) return setShowIosHelp(true)
    if (await promptInstall()) toast.success('DashMaxx installed — find it on your home screen')
  }

  return (
    <>
      <button onClick={install} className="btn-ghost shrink-0 px-2 py-1.5 sm:px-3" title="Install DashMaxx as an app">
        <Download className="h-4 w-4" />
        <span className="hidden sm:inline">Install app</span>
      </button>
      {showIosHelp && <IosHelp onClose={() => setShowIosHelp(false)} />}
    </>
  )
}

function IosHelp({ onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const steps = [
    { icon: Share, text: <>Tap the <b>Share</b> button in Safari&apos;s toolbar</> },
    { icon: SquarePlus, text: <>Scroll down and tap <b>Add to Home Screen</b></> },
    { icon: Download, text: <>Tap <b>Add</b>. DashMaxx now opens like an app from your home screen</> },
  ]

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div className="card w-full max-w-sm animate-fade-up p-5" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Install on iPhone">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Install on iPhone</h2>
          <button className="btn-ghost p-1.5" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        <ol className="space-y-3">
          {steps.map(({ icon: Icon, text }, i) => (
            <li key={i} className="flex items-start gap-3 text-sm text-gray-300">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-500/15 text-indigo-300 ring-1 ring-indigo-400/30">
                <Icon className="h-4 w-4" />
              </span>
              <span className="pt-1.5">{text}</span>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-xs text-gray-500">This only works in Safari. In Chrome on iPhone, use the Share button in the address bar instead.</p>
      </div>
    </div>
  )
}
