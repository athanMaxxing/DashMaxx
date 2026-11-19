import { useCallback, useEffect, useRef, useState } from 'react'
import { MessageSquare, Send, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { timeAgo } from '../../lib/time'
import { useAuth } from '../../context/AuthContext'
import { useSquadData } from '../../context/SquadDataContext'
import Avatar from '../Avatar'
import GadgetCard, { GadgetMessage, GadgetSkeleton } from '../GadgetCard'

const LIMIT = 50

/** Tiny live squad chat via Supabase Realtime. */
export default function Shoutbox() {
  const { user } = useAuth()
  const { usernames, profileById } = useSquadData()
  const [messages, setMessages] = useState([])
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const listRef = useRef(null)

  const load = useCallback(async () => {
    const { data, error: err } = await supabase
      .from('shoutbox_messages')
      .select('id, user_id, body, created_at')
      .order('created_at', { ascending: false })
      .limit(LIMIT)
    if (err) setError(err.message)
    else setMessages(data.reverse())
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
    const channel = supabase
      .channel('shoutbox_changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'shoutbox_messages' }, ({ new: msg }) =>
        setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg].slice(-LIMIT))),
      )
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'shoutbox_messages' }, ({ old }) =>
        setMessages((prev) => prev.filter((m) => m.id !== old.id)),
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [load])

  // Keep the newest message in view.
  useEffect(() => {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages.length])

  async function send(e) {
    e.preventDefault()
    const text = body.trim()
    if (!text) return
    setSending(true)
    setError('')
    const { data, error: err } = await supabase
      .from('shoutbox_messages')
      .insert({ user_id: user.id, body: text })
      .select('id, user_id, body, created_at')
      .single()
    if (err) setError(err.message)
    else {
      setBody('')
      setMessages((prev) => (prev.some((m) => m.id === data.id) ? prev : [...prev, data].slice(-LIMIT)))
    }
    setSending(false)
  }

  async function remove(id) {
    const before = messages
    setMessages((prev) => prev.filter((m) => m.id !== id))
    const { error: err } = await supabase.from('shoutbox_messages').delete().eq('id', id)
    if (err) {
      setMessages(before)
      setError(err.message)
    }
  }

  return (
    <GadgetCard title="Shoutbox" icon={MessageSquare}>
      <div ref={listRef} className="mb-3 h-64 space-y-2 overflow-y-auto pr-1">
        {loading ? (
          <GadgetSkeleton />
        ) : messages.length === 0 ? (
          <GadgetMessage>Quiet in here. Say something.</GadgetMessage>
        ) : (
          messages.map((m) => {
            const mine = m.user_id === user.id
            return (
              <div key={m.id} className="group flex items-start gap-2">
                <Avatar profile={profileById[m.user_id] ?? { username: usernames[m.user_id] }} size="md" className="mt-0.5" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs">
                    <span className={`font-semibold ${mine ? 'text-indigo-300' : 'text-gray-200'}`}>
                      {usernames[m.user_id] ?? 'Someone'}
                    </span>
                    <span className="ml-1.5 text-gray-600">{timeAgo(m.created_at)}</span>
                  </p>
                  <p className="whitespace-pre-wrap break-words text-sm text-gray-300">{m.body}</p>
                </div>
                {mine && (
                  <button
                    onClick={() => remove(m.id)}
                    className="p-1 text-gray-600 opacity-0 transition hover:text-red-400 focus:opacity-100 group-hover:opacity-100"
                    title="Delete message"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            )
          })
        )}
      </div>
      {error && <p className="mb-2 text-sm text-red-400">{error}</p>}
      <form onSubmit={send} className="flex gap-2">
        <input
          className="input"
          placeholder="Message the squad…"
          value={body}
          maxLength={500}
          onChange={(e) => setBody(e.target.value)}
        />
        <button type="submit" className="btn-primary shrink-0 px-3" disabled={sending || !body.trim()} title="Send">
          <Send className="h-4 w-4" />
        </button>
      </form>
    </GadgetCard>
  )
}
