const COLORS = ['#ff8080', '#ffd166', '#6ee7a8', '#6c8cff', '#c39bff', '#ff9ec4']

/** A short burst of falling confetti pieces, purely CSS-animated (no
 * physics lib). Meant to sit absolutely-positioned over a celebratory
 * toast; each piece finishes and fades within ~1.2s. */
export default function Confetti({ count = 18 }: { count?: number }) {
  const pieces = Array.from({ length: count }, (_, i) => i)
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-center overflow-visible">
      {pieces.map((i) => {
        const left = (Math.random() - 0.5) * 220
        const delay = Math.random() * 0.3
        const duration = 0.9 + Math.random() * 0.6
        const color = COLORS[i % COLORS.length]
        const size = 5 + Math.random() * 4
        return (
          <span
            key={i}
            style={{
              left: `calc(50% + ${left}px)`,
              width: size,
              height: size * 1.6,
              backgroundColor: color,
              animationDelay: `${delay}s`,
              animationDuration: `${duration}s`,
            }}
            className="absolute top-0 animate-[confetti-fall_1s_ease-in_forwards] rounded-[1px]"
          />
        )
      })}
    </div>
  )
}
