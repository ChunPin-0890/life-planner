import { query, where } from 'firebase/firestore'
import { useState } from 'react'
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native'
import { Button, Chip, ChipRow, Field, Label, Sheet } from '@/components/ui'
import { todayISO } from '@/lib/date'
import { userCollection } from '@/lib/firestore'
import { createHabit, currentStreak, deleteHabit, lastNDates, toggleHabitToday, updateHabit } from '@/lib/habits'
import { useLiveCollection } from '@/lib/hooks'
import { colors } from '@/lib/theme'
import type { Habit } from '@/lib/types'

const WEEKDAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
type Filter = 'daily' | 'weekly' | 'all'

function HabitRow({ habit, onEdit }: { habit: Habit; onEdit: () => void }) {
  const logs = useLiveCollection(() => query(userCollection('habitLogs'), where('habitId', '==', habit.id)), [habit.id])
  const logsByDate = new Map(logs.map((l) => [l.date, l]))
  const today = todayISO()

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Pressable onPress={onEdit} style={{ flex: 1 }}>
          <Text style={styles.habitTitle}>{habit.title}</Text>
        </Pressable>
        <Text style={styles.streak}>🔥 {currentStreak(logs)}</Text>
      </View>
      <View style={styles.days}>
        {lastNDates(7).map((d) => {
          const isToday = d === today
          const completed = logsByDate.get(d)?.completed
          return (
            <Pressable
              key={d}
              disabled={!isToday}
              onPress={() => toggleHabitToday(habit.id, logsByDate.get(d))}
              style={[styles.day, completed ? styles.dayDone : isToday ? styles.dayToday : null]}
            >
              <Text style={[styles.dayLetter, completed && styles.dayTextDone, isToday && !completed && styles.dayTextToday]}>
                {WEEKDAY_LETTERS[new Date(d + 'T00:00:00').getDay()]}
              </Text>
              <Text style={[styles.dayNum, completed && styles.dayTextDone, isToday && !completed && styles.dayTextToday]}>
                {parseInt(d.slice(-2), 10)}
              </Text>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

function HabitForm({ habit, onDone }: { habit?: Habit; onDone: () => void }) {
  const [title, setTitle] = useState(habit?.title ?? '')
  const [frequency, setFrequency] = useState<Habit['frequency']>(habit?.frequency ?? 'daily')
  const [goalId, setGoalId] = useState(habit?.goalId ?? '')
  const goals = useLiveCollection(() => userCollection('goals'), [])

  async function save() {
    const trimmed = title.trim()
    if (!trimmed) return
    if (habit) await updateHabit(habit.id, { title: trimmed, frequency, goalId: goalId || null })
    else await createHabit({ title: trimmed, frequency, goalId: goalId || undefined })
    onDone()
  }

  function confirmDelete() {
    if (!habit) return
    Alert.alert('Delete habit?', 'Its history and XP will be removed.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteHabit(habit.id).then(onDone) },
    ])
  }

  return (
    <>
      <Field label="Habit name" value={title} onChangeText={setTitle} placeholder="e.g. Meditate 10 minutes" autoFocus={!habit} />
      <View style={{ gap: 6 }}>
        <Label>Frequency</Label>
        <ChipRow>
          <Chip label="Daily" selected={frequency === 'daily'} onPress={() => setFrequency('daily')} />
          <Chip label="Weekly" selected={frequency === 'weekly'} onPress={() => setFrequency('weekly')} />
        </ChipRow>
      </View>
      {goals.length > 0 && (
        <View style={{ gap: 6 }}>
          <Label>Supports goal (optional)</Label>
          <ChipRow>
            <Chip label="None" selected={!goalId} onPress={() => setGoalId('')} />
            {goals.map((g) => (
              <Chip key={g.id} label={g.title} selected={goalId === g.id} onPress={() => setGoalId(g.id)} />
            ))}
          </ChipRow>
        </View>
      )}
      <Button label={habit ? 'Save' : 'Add habit'} onPress={save} disabled={!title.trim()} />
      {habit && <Button label="Delete habit" variant="danger" onPress={confirmDelete} />}
    </>
  )
}

export default function HabitsScreen() {
  const [filter, setFilter] = useState<Filter>('daily')
  const [showNew, setShowNew] = useState(false)
  const [editing, setEditing] = useState<Habit | null>(null)
  const allHabits = useLiveCollection(() => userCollection('habits'), [])
  const habits = allHabits.filter((h) => filter === 'all' || h.frequency === filter)

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <ChipRow>
          {(['daily', 'weekly', 'all'] as const).map((f) => (
            <Chip key={f} label={f[0].toUpperCase() + f.slice(1)} selected={filter === f} onPress={() => setFilter(f)} />
          ))}
        </ChipRow>
        <Pressable style={styles.add} onPress={() => setShowNew(true)}>
          <Text style={styles.addText}>+</Text>
        </Pressable>
      </View>

      <FlatList
        data={habits}
        keyExtractor={(h) => h.id}
        contentContainerStyle={{ gap: 10, paddingBottom: 24 }}
        ListEmptyComponent={<Text style={styles.empty}>No {filter !== 'all' ? filter : ''} habits yet.</Text>}
        renderItem={({ item }) => <HabitRow habit={item} onEdit={() => setEditing(item)} />}
      />

      <Sheet open={showNew} onClose={() => setShowNew(false)} title="New habit">
        <HabitForm onDone={() => setShowNew(false)} />
      </Sheet>
      <Sheet open={editing !== null} onClose={() => setEditing(null)} title="Edit habit">
        {editing && <HabitForm habit={editing} onDone={() => setEditing(null)} />}
      </Sheet>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16, gap: 12, backgroundColor: colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  add: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  addText: { color: '#fff', fontSize: 22, lineHeight: 24 },
  card: { padding: 14, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, gap: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  habitTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
  streak: { fontSize: 13, fontWeight: '700', color: colors.streak },
  days: { flexDirection: 'row', justifyContent: 'space-between' },
  day: { width: 38, height: 46, borderRadius: 10, alignItems: 'center', justifyContent: 'center', gap: 2, backgroundColor: colors.background },
  dayToday: { backgroundColor: colors.primarySoft, borderWidth: 2, borderColor: colors.primary },
  dayDone: { backgroundColor: colors.good },
  dayLetter: { fontSize: 10, fontWeight: '600', color: colors.muted },
  dayNum: { fontSize: 14, fontWeight: '700', color: colors.text },
  dayTextDone: { color: '#fff' },
  dayTextToday: { color: colors.primary },
  empty: { color: colors.muted, textAlign: 'center', marginTop: 32 },
})
