/*
 * Emoji / initial avatar in the user's chosen colour.
 * `profile` = { username, avatar_emoji, avatar_color }.
 */
export const AVATAR_COLORS = {
  indigo: 'from-indigo-500 to-violet-600',
  violet: 'from-violet-500 to-fuchsia-600',
  fuchsia: 'from-fuchsia-500 to-pink-600',
  rose: 'from-rose-500 to-red-600',
  orange: 'from-orange-500 to-amber-600',
  amber: 'from-amber-400 to-yellow-600',
  emerald: 'from-emerald-500 to-teal-600',
  sky: 'from-sky-500 to-cyan-600',
}

export const AVATAR_EMOJIS = [
  '🎮', '🕹️', '👾', '🤖', '👻', '💀', '🔥', '⚡', '🎯', '🏆', '👑', '🛡️',
  '⚔️', '🗡️', '🏹', '🚀', '🐉', '🦊', '🐺', '🐸', '🦖', '🍕', '🧃', '😎',
]

const SIZES = {
  xs: 'h-5 w-5 text-[10px]',
  sm: 'h-6 w-6 text-xs',
  md: 'h-8 w-8 text-sm',
  lg: 'h-12 w-12 text-xl',
}

export default function Avatar({ profile, size = 'sm', className = '' }) {
  const color = AVATAR_COLORS[profile?.avatar_color] ?? AVATAR_COLORS.indigo
  const content = profile?.avatar_emoji || (profile?.username ?? '?').charAt(0).toUpperCase()
  return (
    <span
      className={`inline-flex shrink-0 select-none items-center justify-center rounded-full bg-gradient-to-br font-bold leading-none text-white ${color} ${SIZES[size]} ${className}`}
      aria-hidden="true"
    >
      {content}
    </span>
  )
}

/** Avatar + name, the standard way to show a squad member. */
export function PlayerName({ profile, size = 'xs', className = '', nameClass = '' }) {
  return (
    <span className={`inline-flex min-w-0 items-center gap-1.5 ${className}`}>
      <Avatar profile={profile} size={size} />
      <span className={`truncate ${nameClass}`}>{profile?.username ?? 'Unknown'}</span>
    </span>
  )
}
