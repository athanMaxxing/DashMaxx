import { isWin } from './overwatch'
import { rankBands, RANKED_PLAYLISTS } from './rocketleague'

/*
 * Achievements are computed from existing data — nothing extra is stored.
 * Each one has `progress(stats)` returning [current, target]; unlocked when current >= target.
 */
export const ACHIEVEMENTS = [
  // Overwatch
  { id: 'ow-first-win', group: 'Overwatch', emoji: '🏅', title: 'First Blood', desc: 'Win an Overwatch match', progress: (s) => [s.ow.wins, 1] },
  { id: 'ow-streak-3', group: 'Overwatch', emoji: '🔥', title: 'Heating Up', desc: 'Win 3 Overwatch matches in a row', progress: (s) => [s.ow.bestStreak, 3] },
  { id: 'ow-streak-5', group: 'Overwatch', emoji: '☄️', title: 'Unstoppable', desc: 'Win 5 Overwatch matches in a row', progress: (s) => [s.ow.bestStreak, 5] },
  { id: 'ow-veteran', group: 'Overwatch', emoji: '🎖️', title: 'Veteran', desc: 'Play 50 Overwatch matches', progress: (s) => [s.ow.games, 50] },
  { id: 'ow-elims', group: 'Overwatch', emoji: '💥', title: 'Fragger', desc: '30+ eliminations in one match', progress: (s) => [s.ow.maxElims, 30] },
  { id: 'ow-damage', group: 'Overwatch', emoji: '🗡️', title: 'Big Numbers', desc: '15,000 damage in one match', progress: (s) => [s.ow.maxDamage, 15000] },
  { id: 'ow-healing', group: 'Overwatch', emoji: '💚', title: 'Guardian Angel', desc: '12,000 healing in one match', progress: (s) => [s.ow.maxHealing, 12000] },
  { id: 'ow-mitigation', group: 'Overwatch', emoji: '🛡️', title: 'The Wall', desc: '15,000 mitigation in one match', progress: (s) => [s.ow.maxMitigation, 15000] },
  { id: 'ow-flex', group: 'Overwatch', emoji: '🎭', title: 'Flex Player', desc: 'Play 8 different heroes', progress: (s) => [s.ow.heroes, 8] },

  // Fortnite
  { id: 'fn-first-win', group: 'Fortnite', emoji: '👑', title: 'Victory Royale', desc: 'Win a Fortnite game', progress: (s) => [s.fn.wins, 1] },
  { id: 'fn-10-wins', group: 'Fortnite', emoji: '🏆', title: 'Dub Machine', desc: 'Win 10 Fortnite games', progress: (s) => [s.fn.wins, 10] },
  { id: 'fn-10-kills', group: 'Fortnite', emoji: '🎯', title: 'Squad Wiper', desc: '10 kills in one game', progress: (s) => [s.fn.maxKills, 10] },
  { id: 'fn-solo-win', group: 'Fortnite', emoji: '🐺', title: 'Lone Wolf', desc: 'Win a Solo game', progress: (s) => [s.fn.soloWins, 1] },
  { id: 'fn-100-kills', group: 'Fortnite', emoji: '💀', title: 'Century', desc: '100 Fortnite kills in total', progress: (s) => [s.fn.kills, 100] },
  { id: 'fn-sprites-25', group: 'Fortnite', emoji: '✨', title: 'Sprite Hunter', desc: 'Collect 25 sprite variants', progress: (s) => [s.sprites.ticks, 25] },
  { id: 'fn-sprites-all', group: 'Fortnite', emoji: '🌈', title: "Gotta Catch 'Em All", desc: 'Collect every sprite variant in a season', progress: (s) => best(s, 'all') },
  { id: 'fn-sprites-normal', group: 'Fortnite', emoji: '🟢', title: 'Back to Basics', desc: 'Collect every Normal sprite in a season', progress: (s) => best(s, 'Normal') },
  { id: 'fn-sprites-cursed', group: 'Fortnite', emoji: '😈', title: 'Cursed Collector', desc: 'Collect every Cursed sprite in a season', progress: (s) => best(s, 'Cursed') },
  { id: 'fn-sprites-fortune', group: 'Fortnite', emoji: '🍀', title: 'Fortune Finder', desc: 'Collect every Fortune sprite in a season', progress: (s) => best(s, 'Fortune') },
  { id: 'fn-sprites-mastered', group: 'Fortnite', emoji: '👑', title: 'Sprite Master', desc: 'Master every sprite variant in a season', progress: (s) => best(s, 'mastered') },

  // Rocket League
  { id: 'rl-first-win', group: 'Rocket League', emoji: '🚗', title: 'Kickoff', desc: 'Win a Rocket League game', progress: (s) => [s.rl.wins, 1] },
  { id: 'rl-hat-trick', group: 'Rocket League', emoji: '🎩', title: 'Hat Trick', desc: 'Score 3 goals in one game', progress: (s) => [s.rl.maxGoals, 3] },
  { id: 'rl-playmaker', group: 'Rocket League', emoji: '🤝', title: 'Playmaker', desc: '3 assists in one game', progress: (s) => [s.rl.maxAssists, 3] },
  { id: 'rl-brick-wall', group: 'Rocket League', emoji: '🧱', title: 'Brick Wall', desc: '5 saves in one game', progress: (s) => [s.rl.maxSaves, 5] },
  { id: 'rl-mvp-10', group: 'Rocket League', emoji: '⭐', title: 'MVP Machine', desc: 'Be MVP 10 times', progress: (s) => [s.rl.mvps, 10] },
  { id: 'rl-climber', group: 'Rocket League', emoji: '📈', title: 'Climber', desc: 'Gain 100 MMR in a ranked playlist', progress: (s) => [s.rl.bestClimb, 100] },
  { id: 'rl-champ', group: 'Rocket League', emoji: '💜', title: 'Champion', desc: 'Reach Champion I in any ranked playlist', progress: (s) => rankGoal(s, 'champ') },
  { id: 'rl-gc', group: 'Rocket League', emoji: '❤️‍🔥', title: 'Grand Champion', desc: 'Reach Grand Champion I in any ranked playlist', progress: (s) => rankGoal(s, 'gc') },

  // Squad
  { id: 'bounty-5', group: 'Squad', emoji: '🤠', title: 'Bounty Hunter', desc: 'Claim 5 bounties', progress: (s) => [s.squad.claimed, 5] },
  { id: 'quoted-5', group: 'Squad', emoji: '💬', title: 'Quotable', desc: 'Get quoted 5 times', progress: (s) => [s.squad.quoted, 5] },
  { id: 'quote-fire', group: 'Squad', emoji: '🌶️', title: 'Crowd Pleaser', desc: 'Say something that gets 3 fires', progress: (s) => [s.squad.bestQuoteFires, 3] },
  { id: 'all-rounder', group: 'Squad', emoji: '🎮', title: 'All-Rounder', desc: 'Log games in both Overwatch and Fortnite', progress: (s) => [(s.ow.games > 0) + (s.fn.games > 0), 2] },
]

/** [owned, total] for the season closest to complete in one sprite category. */
const best = (s, key) => {
  const b = s.sprites.best[key]
  return b ? [b.owned, b.total] : [0, 1]
}
/** [peak MMR, rank cutoff] in the ranked playlist closest to reaching that rank. */
const RANK_INDEX = { champ: 15, gc: 18 }
const rankGoal = (s, key) => {
  let best = null
  for (const pl of RANKED_PLAYLISTS) {
    const cutoff = rankBands(pl.value)[RANK_INDEX[key]].start
    const peak = s.rl.peaks[pl.value] ?? 0
    if (!best || peak / cutoff > best[0] / best[1]) best = [peak, cutoff]
  }
  return best
}

const SPRITE_KEYS = ['all', 'mastered', 'Normal', 'Cursed', 'Fortune']

const emptyStats = () => ({
  ow: { games: 0, wins: 0, bestStreak: 0, maxElims: 0, maxDamage: 0, maxHealing: 0, maxMitigation: 0, heroes: 0 },
  fn: { games: 0, wins: 0, maxKills: 0, soloWins: 0, kills: 0 },
  rl: { games: 0, wins: 0, maxGoals: 0, maxAssists: 0, maxSaves: 0, mvps: 0, bestClimb: 0, peaks: {} },
  sprites: { ticks: 0, best: {} }, // best[key] = { owned, total } for the season closest to complete
  squad: { claimed: 0, quoted: 0, bestQuoteFires: 0 },
})

/** Build per-player stats from all the raw data. Returns { [userId]: stats }. */
export function buildPlayerStats({ profiles, owMatches, fnMatches, rlMatches = [], bounties, quotes, sprites, collection }) {
  const stats = Object.fromEntries(profiles.map((p) => [p.id, emptyStats()]))
  const get = (id) => (stats[id] ??= emptyStats())

  // Overwatch — oldest first for streaks.
  const heroSets = {}
  const streak = {}
  for (const m of [...owMatches].reverse()) {
    const won = isWin(m.result)
    for (const s of m.ow_match_stats) {
      const o = get(s.player_id).ow
      o.games += 1
      if (won) o.wins += 1
      streak[s.player_id] = won ? (streak[s.player_id] ?? 0) + 1 : 0
      o.bestStreak = Math.max(o.bestStreak, streak[s.player_id])
      o.maxElims = Math.max(o.maxElims, s.eliminations ?? 0)
      o.maxDamage = Math.max(o.maxDamage, s.damage ?? 0)
      o.maxHealing = Math.max(o.maxHealing, s.healing ?? 0)
      o.maxMitigation = Math.max(o.maxMitigation, s.mitigation ?? 0)
      if (s.hero?.trim()) (heroSets[s.player_id] ??= new Set()).add(s.hero.trim().toLowerCase())
    }
  }
  for (const [id, set] of Object.entries(heroSets)) get(id).ow.heroes = set.size

  // Fortnite
  for (const m of fnMatches) {
    for (const s of m.fn_match_stats) {
      const f = get(s.player_id).fn
      f.games += 1
      f.kills += s.kills ?? 0
      f.maxKills = Math.max(f.maxKills, s.kills ?? 0)
      if (m.won) {
        f.wins += 1
        if (m.team_size === 1) f.soloWins += 1
      }
    }
  }

  // Rocket League. Climb = best rise above the lowest MMR logged before it, per playlist.
  const lowest = {}
  for (const m of [...rlMatches].reverse()) {
    for (const s of m.rl_match_stats) {
      const r = get(s.player_id).rl
      r.games += 1
      if (m.won) r.wins += 1
      r.maxGoals = Math.max(r.maxGoals, s.goals ?? 0)
      r.maxAssists = Math.max(r.maxAssists, s.assists ?? 0)
      r.maxSaves = Math.max(r.maxSaves, s.saves ?? 0)
      if (s.mvp) r.mvps += 1
      if (m.ranked && s.mmr != null) {
        r.peaks[m.team_size] = Math.max(r.peaks[m.team_size] ?? 0, s.mmr)
        const k = `${s.player_id}|${m.team_size}`
        lowest[k] = Math.min(lowest[k] ?? s.mmr, s.mmr)
        r.bestClimb = Math.max(r.bestClimb, s.mmr - lowest[k])
      }
    }
  }

  // Sprites: total ticks + per category (all / mastered / each variant) the season closest to complete.
  const totals = {} // `${key}|${season}` -> variants available
  const spriteById = {}
  for (const sp of sprites) {
    spriteById[sp.id] = sp
    for (const v of sp.variants) {
      for (const key of ['all', 'mastered', v]) totals[`${key}|${sp.season}`] = (totals[`${key}|${sp.season}`] ?? 0) + 1
    }
  }
  const counts = {} // `${uid}|${key}|${season}` -> owned
  for (const c of collection) {
    get(c.user_id).sprites.ticks += 1
    const sp = spriteById[c.sprite_id]
    if (!sp || !sp.variants.includes(c.variant)) continue
    for (const key of ['all', c.variant, ...(c.mastered ? ['mastered'] : [])]) {
      const k = `${c.user_id}|${key}|${sp.season}`
      counts[k] = (counts[k] ?? 0) + 1
    }
  }
  for (const [k, owned] of Object.entries(counts)) {
    const [uid, key, season] = k.split('|')
    if (!SPRITE_KEYS.includes(key)) continue
    const total = totals[`${key}|${season}`]
    const cur = get(uid).sprites.best[key]
    if (!cur || owned / total > cur.owned / cur.total || (owned / total === cur.owned / cur.total && total > cur.total)) {
      get(uid).sprites.best[key] = { owned, total }
    }
  }

  // Squad
  for (const b of bounties) if (b.claimed_by) get(b.claimed_by).squad.claimed += 1
  for (const q of quotes) {
    if (!q.said_by) continue
    const sq = get(q.said_by).squad
    sq.quoted += 1
    sq.bestQuoteFires = Math.max(sq.bestQuoteFires, q.quote_likes?.length ?? 0)
  }

  return stats
}

/** [{ ...achievement, current, target, unlocked, pct }] for one player's stats. */
export function evaluate(stats) {
  return ACHIEVEMENTS.map((a) => {
    const [current, target] = a.progress(stats)
    const capped = Math.min(current, target)
    return { ...a, current: capped, target, unlocked: current >= target, pct: Math.round((capped / target) * 100) }
  })
}
