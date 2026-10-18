import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { getNorthStarNote, setNorthStar } from '../lib/northStar'
import { toast } from '../lib/toast'

function StarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="white" stroke="none">
      <path d="M12 2l2.9 6.6 7.1.7-5.4 4.7 1.6 7-6.2-3.7-6.2 3.7 1.6-7L2 9.3l7.1-.7z" />
    </svg>
  )
}

export default function NorthStarCard() {
  const northStar = useLiveQuery(getNorthStarNote)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  function startEdit() {
    setDraft(northStar?.body ?? '')
    setEditing(true)
  }

  async function saveAndClose() {
    const trimmed = draft.trim()
    setEditing(false)
    if (trimmed === (northStar?.body ?? '')) return
    await setNorthStar(trimmed)
    toast('North Star saved')
  }

  if (editing) {
    return (
      <div className="rounded-2xl bg-gradient-to-br from-[var(--accent)] to-[oklch(48%_0.13_260)] p-4">
        <div className="mb-2 flex items-center gap-2 text-white">
          <StarIcon />
          <span className="text-xs font-bold uppercase tracking-wide">Your North Star</span>
        </div>
        <textarea
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={saveAndClose}
          placeholder="What's the one dream all of this is in service of?"
          rows={3}
          className="w-full resize-none rounded-xl bg-white/10 p-3 text-sm text-white outline-none placeholder:text-white/60"
        />
        <div className="mt-1 text-right text-[11px] text-white/60">Saves automatically</div>
      </div>
    )
  }

  return (
    <button
      onClick={startEdit}
      className="w-full rounded-2xl bg-gradient-to-br from-[var(--accent)] to-[oklch(48%_0.13_260)] p-4 text-left"
    >
      <div className="mb-1.5 flex items-center gap-2 text-white">
        <StarIcon />
        <span className="text-xs font-bold uppercase tracking-wide">Your North Star</span>
      </div>
      {northStar?.body ? (
        <p className="text-sm leading-relaxed text-white">{northStar.body}</p>
      ) : (
        <p className="text-sm text-white/70 italic">Tap to write the one dream everything below is working toward.</p>
      )}
    </button>
  )
}
