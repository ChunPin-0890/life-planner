# Design tokens & visual language

Reference for the Life Planner UI. Keep this in sync if the palette or
patterns in `index.css` / feature components change.

## Aesthetic

Calm, minimal productivity-app feel — soft neutral surfaces with a single
accent color, generous whitespace, no gradients or heavy shadows, rounded
cards throughout. No emoji as icons — inline stroke-based SVGs only, one
consistent stroke width.

## Color tokens (defined in `src/index.css`)

| Token | Value | Use |
|---|---|---|
| `--bg` | `#f7f7f5` | App background |
| `--surface` | `#ffffff` | Cards, inputs |
| `--surface-2` | `#f0f0ee` | Secondary/inactive fills (progress track, inactive habit dots) |
| `--border` | `#e4e3e0` | Card outlines, dividers |
| `--text` | `#201f1c` | Primary text |
| `--text-2` | `#6b6a66` | Secondary text (meta, labels) |
| `--text-3` | `#9a9994` | Tertiary text (placeholders, disabled) |
| `--accent` | `#3654c9` | Primary actions, active nav, "now" highlights, links |
| `--accent-soft` | `#e7ebfa` | Tinted backgrounds for accent elements (badges, selected states) |
| `--good` | `#2f9e5c` | Completed states — checkmarks, filled habit-streak dots |
| `--good-soft` | `#e6f5ec` | Tinted completed backgrounds |
| _(inline, Habits only)_ | `#c9853b` | Streak flame icon |

## Typography

System-ui font stack (`system-ui, -apple-system, "Segoe UI", sans-serif`).
Bold, compact hierarchy:

- Page title: 22px / `font-bold`
- Card/body text: 13–14px
- Labels, meta, section headers: 10–12px, often `uppercase` + `tracking-wide` for section labels

## Shape language

Consistently rounded — `rounded-xl` / `rounded-2xl` (12–16px) for cards,
fully rounded pills for filter chips and buttons, circular avatars/mood
icons/checkboxes.

## Layout structure

- **Mobile**: single column, bottom tab bar (Today / Habits / Goals /
  Journal), icon + label, active tab in accent color.
- **Desktop** (≥768px, Tailwind `md:`): left sidebar nav (same 4 items,
  logo, user footer) replaces the bottom tabs; content area can go
  multi-column (see the wireframe's dashboard variant: schedule + goals
  side-by-side).
- **Per-screen pattern**: page title + contextual header action
  (quick-add, new goal, filter chips) → scrollable content region →
  persistent action element where relevant (quick-add bar on Today,
  mood picker on Journal).

## Recurring UI patterns

- **Timeline rows** (Today): time label + vertical connector line + event
  card; the current/active block gets an accent border instead of a
  filled background.
- **Progress bars**: thin (`h-1.5`–`h-2`) rounded track in `--surface-2`,
  filled with `--accent` (or `--text-3` for de-emphasized goals). Used for
  daily completion %, goal %, habit-streak summaries.
- **Checkable rows**: circular checkbox for tasks/milestones, square
  checkbox for subtasks — green fill + white checkmark when done, plus
  strikethrough text.
- **Streak dots** (Habits): 7 small squares per habit (Mon–Sun), filled
  `--good` for a completed day, dashed outline for an unmarked day.
- **Expand/collapse cards** (Goals): one goal expanded at a time, chevron
  rotates 90°, nested milestone → task hierarchy indents each level
  (`ml-7` for tasks under a milestone).
- **Filter chips**: fully rounded pill, filled `--accent` + white text
  when active, outlined `--border` + `--text-2` when inactive.

## Component reference (where each pattern lives in code)

| Pattern | File |
|---|---|
| Nav (sidebar + bottom tabs) | `src/app/Layout.tsx`, `src/app/NavIcons.tsx` |
| Timeline + quick-add | `src/features/today/TodayPage.tsx` |
| Streak dots + flame counter | `src/features/habits/HabitsPage.tsx` |
| Goal/milestone/task nesting | `src/features/goals/GoalsPage.tsx` |
| Mood picker + reflection cards | `src/features/journal/JournalPage.tsx` |
