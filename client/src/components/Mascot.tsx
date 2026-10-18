import { useEffect, useRef, useState } from 'react'
import { computeRank } from '../lib/xp'

export type MascotMood = 'happy' | 'neutral' | 'sad'

const RANK_COLORS: Record<string, { body: string; cheek: string }> = {
  E: { body: '#b3b0ff', cheek: '#ff9ec4' },
  D: { body: '#6ee7a8', cheek: '#ff9ec4' },
  C: { body: '#6c8cff', cheek: '#ffb3d1' },
  B: { body: '#c39bff', cheek: '#ffb3d1' },
  A: { body: '#ffb56b', cheek: '#ff8fa8' },
  S: { body: '#ff8080', cheek: '#ffd166' },
}

const POKE_MESSAGES = ["That tickles!", "Let's go!", "You've got this.", "Hi there!", "Ready when you are.", "*wiggle*"]

function Face({ mood, blink }: { mood: MascotMood; blink: boolean }) {
  if (blink) {
    return (
      <>
        <path d="M34 51h10M60 51h10" stroke="#28243d" strokeWidth={3} strokeLinecap="round" />
        <ellipse cx="30" cy="59" rx="4" ry="2.5" fill="#ff9ec4" opacity="0.5" />
        <ellipse cx="74" cy="59" rx="4" ry="2.5" fill="#ff9ec4" opacity="0.5" />
        <path d="M43 64c3 2 15 2 18 0" stroke="#28243d" strokeWidth={2.6} strokeLinecap="round" fill="none" />
      </>
    )
  }
  if (mood === 'happy') {
    return (
      <>
        <ellipse cx="39" cy="50" rx="5.5" ry="7" fill="#28243d" />
        <ellipse cx="65" cy="50" rx="5.5" ry="7" fill="#28243d" />
        <circle cx="41" cy="46" r="1.8" fill="white" />
        <circle cx="67" cy="46" r="1.8" fill="white" />
        <ellipse cx="30" cy="60" rx="5" ry="3" fill="#ff9ec4" opacity="0.7" />
        <ellipse cx="74" cy="60" rx="5" ry="3" fill="#ff9ec4" opacity="0.7" />
        <path d="M40 62c4 6 20 6 24 0" stroke="#28243d" strokeWidth={3} strokeLinecap="round" fill="none" />
      </>
    )
  }
  if (mood === 'sad') {
    return (
      <>
        <ellipse cx="39" cy="52" rx="5" ry="6" fill="#28243d" />
        <ellipse cx="65" cy="52" rx="5" ry="6" fill="#28243d" />
        <circle cx="41" cy="49" r="1.5" fill="white" />
        <circle cx="67" cy="49" r="1.5" fill="white" />
        <path d="M33 42l10 4M71 42l-10 4" stroke="#28243d" strokeWidth={2.2} strokeLinecap="round" />
        <path d="M41 66c4 -4 18 -4 22 0" stroke="#28243d" strokeWidth={3} strokeLinecap="round" fill="none" />
        <path d="M35 58c0 3-3 3-3 5a1.5 1.5 0 0 0 3 0c0-2-3-2-3-5z" fill="#8ec9ff" opacity="0.85" />
      </>
    )
  }
  return (
    <>
      <ellipse cx="39" cy="51" rx="5" ry="6.5" fill="#28243d" />
      <ellipse cx="65" cy="51" rx="5" ry="6.5" fill="#28243d" />
      <circle cx="41" cy="47.5" r="1.6" fill="white" />
      <circle cx="67" cy="47.5" r="1.6" fill="white" />
      <ellipse cx="30" cy="59" rx="4" ry="2.5" fill="#ff9ec4" opacity="0.5" />
      <ellipse cx="74" cy="59" rx="4" ry="2.5" fill="#ff9ec4" opacity="0.5" />
      <path d="M43 64c3 2 15 2 18 0" stroke="#28243d" strokeWidth={2.6} strokeLinecap="round" fill="none" />
    </>
  )
}

/** The planner's companion — a round, big-eyed creature whose color
 * evolves with rank (E→S) and whose face reflects today's progress. Idles
 * with a gentle sway and periodic blink; tapping it pokes a quick reaction.
 * Pure inline SVG, no external assets, cheap to render everywhere. */
export default function Mascot({
  level,
  mood,
  size = 88,
  animate = true,
  interactive = true,
}: {
  level: number
  mood: MascotMood
  size?: number
  animate?: boolean
  interactive?: boolean
}) {
  const rank = computeRank(level).rank
  const colors = RANK_COLORS[rank] ?? RANK_COLORS.E

  const [blink, setBlink] = useState(false)
  const [poked, setPoked] = useState(false)
  const [walking, setWalking] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // Periodic blink, independent of mood/interaction — keeps the idle state
  // feeling alive instead of a static bounce.
  useEffect(() => {
    if (!animate) return
    const id = setInterval(
      () => {
        setBlink(true)
        setTimeout(() => setBlink(false), 140)
      },
      2600 + Math.random() * 2000,
    )
    return () => clearInterval(id)
  }, [animate])

  // Every so often, wander a few steps instead of just bobbing in place —
  // only when calm (not sad, not mid-poke-reaction) so it doesn't fight
  // the other animations.
  useEffect(() => {
    if (!animate || mood === 'sad') return
    const id = setInterval(
      () => {
        if (!poked) {
          setWalking(true)
          setTimeout(() => setWalking(false), 2500)
        }
      },
      9000 + Math.random() * 8000,
    )
    return () => clearInterval(id)
  }, [animate, mood, poked])

  function handlePoke() {
    if (!interactive) return
    setPoked(true)
    setMessage(POKE_MESSAGES[Math.floor(Math.random() * POKE_MESSAGES.length)])
    clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => {
      setPoked(false)
      setMessage(null)
    }, 1400)
  }

  const idleAnim =
    animate && mood !== 'sad'
      ? walking
        ? 'animate-[mascot-walk_2.5s_ease-in-out]'
        : 'animate-[mascot-bounce_2.4s_ease-in-out_infinite,mascot-sway_4.8s_ease-in-out_infinite]'
      : ''

  return (
    <div className="relative inline-block" style={{ width: size, height: size }}>
      {message && (
        <div className="absolute -top-2 left-1/2 z-10 -translate-x-1/2 -translate-y-full animate-[badge-pop_0.25s_ease-out] rounded-xl bg-[var(--surface)] px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap text-[var(--text)] shadow-md">
          {message}
          <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-[var(--surface)]" />
        </div>
      )}
      <button
        onClick={handlePoke}
        aria-label="Poke the mascot"
        disabled={!interactive}
        style={{ width: size, height: size }}
        className={`${idleAnim} ${poked ? 'animate-[mascot-wiggle_0.4s_ease-in-out_2]' : ''} ${interactive ? 'cursor-pointer' : 'cursor-default'}`}
      >
        <svg width={size} height={size} viewBox="0 0 104 104">
          <ellipse cx="52" cy="97" rx="26" ry="4.5" fill="black" opacity="0.08" />

          <ellipse cx="38" cy="90" rx="9" ry="6" fill={colors.body} />
          <ellipse cx="66" cy="90" rx="9" ry="6" fill={colors.body} />

          <circle cx="52" cy="54" r="40" fill={colors.body} />
          <ellipse cx="52" cy="42" rx="40" ry="30" fill="white" opacity="0.12" />

          <ellipse cx="14" cy="58" rx="7" ry="10" fill={colors.body} />
          <ellipse cx="90" cy="58" rx="7" ry="10" fill={colors.body} />

          <circle cx="24" cy="20" r="9" fill={colors.body} />
          <circle cx="80" cy="20" r="9" fill={colors.body} />
          <circle cx="24" cy="21" r="4.5" fill={colors.cheek} opacity="0.6" />
          <circle cx="80" cy="21" r="4.5" fill={colors.cheek} opacity="0.6" />

          {rank !== 'E' && (
            <path
              d="M40 16c3-6 8-9 12-9M64 16c-3-6-8-9-12-9"
              stroke={colors.cheek}
              strokeWidth={3}
              strokeLinecap="round"
              fill="none"
              opacity="0.9"
            />
          )}

          <ellipse cx="52" cy="70" rx="16" ry="12" fill="white" opacity="0.25" />

          <Face mood={mood} blink={blink} />
        </svg>
      </button>
    </div>
  )
}
