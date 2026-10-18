import { router } from 'expo-router'
import { query, where } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { BossCard, DailyQuestsCard } from '@/components/game-cards'
import { MascotCard } from '@/components/mascot'
import { Button, Field, Sheet } from '@/components/ui'
import { formatDay, todayISO } from '@/lib/date'
import { userCollection } from '@/lib/firestore'
import { toggleTask } from '@/lib/goals'
import { toggleHabitToday } from '@/lib/habits'
import { useLiveCollection } from '@/lib/hooks'
import { createBlock, deleteBlock, to12h, updateBlock, validateTimes } from '@/lib/schedule'
import { createRecurringTask, createTask, deleteTask, ensureRecurringTasksForToday, renameTask, stopRecurring } from '@/lib/tasks'
import { colors } from '@/lib/theme'
import type { ScheduleBlock, Task } from '@/lib/types'
import { computeLevel, computeRank } from '@/lib/xp'

const REPEAT_CYCLE: (Task['recurring'] | undefined)[] = [undefined, 'daily', 'weekly']

function LevelPill() {
  const xp = useLiveCollection(() => userCollection('xpEvents'), [])
  const { level } = computeLevel(xp.reduce((s, e) => s + e.amount, 0))
  return (
    <Pressable style={styles.levelPill} onPress={() => router.push('/profile')}>
      <Text style={styles.levelText}>
        {computeRank(level).rank} · Lv {level}
      </Text>
    </Pressable>
  )
}

function BlockForm({ block, onDone }: { block?: ScheduleBlock; onDone: () => void }) {
  const [title, setTitle] = useState(block?.title ?? '')
  const [start, setStart] = useState(block?.startTime ?? '09:00')
  const [end, setEnd] = useState(block?.endTime ?? '10:00')
  const [error, setError] = useState('')

  async function save() {
    const trimmed = title.trim()
    if (!trimmed) return
    const times = validateTimes(start, end)
    if ('error' in times) {
      setError(times.error)
      return
    }
    if (block) await updateBlock(block.id, { title: trimmed, startTime: times.start, endTime: times.end })
    else await createBlock(trimmed, times.start, times.end)
    onDone()
  }

  return (
    <>
      <Field label="Event" value={title} onChangeText={setTitle} placeholder="e.g. Deep work" autoFocus={!block} />
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Field label="Start (24h)" value={start} onChangeText={setStart} keyboardType="numbers-and-punctuation" />
        </View>
        <View style={{ flex: 1 }}>
          <Field label="End (24h)" value={end} onChangeText={setEnd} keyboardType="numbers-and-punctuation" />
        </View>
      </View>
      {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
      <Button label={block ? 'Save' : 'Add to schedule'} onPress={save} disabled={!title.trim()} />
      {block && <Button label="Delete event" variant="danger" onPress={() => deleteBlock(block.id).then(onDone)} />}
    </>
  )
}

function TaskForm({ task, onDone }: { task: Task; onDone: () => void }) {
  const [title, setTitle] = useState(task.title)
  const templateId = task.templateId
  return (
    <>
      <Field label="Task" value={title} onChangeText={setTitle} />
      <Button label="Save" disabled={!title.trim()} onPress={() => renameTask(task.id, title.trim()).then(onDone)} />
      {templateId && (
        <Button
          label="Stop repeating"
          variant="ghost"
          onPress={() =>
            Alert.alert('Stop repeating?', 'Future copies won’t be created. Today’s stays.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Stop', onPress: () => stopRecurring(templateId).then(onDone) },
            ])
          }
        />
      )}
      <Button label="Delete task" variant="danger" onPress={() => deleteTask(task).then(onDone)} />
    </>
  )
}

function GoalTag({ title }: { title: string }) {
  return (
    <Pressable style={styles.goalTag} onPress={() => router.navigate('/goals')}>
      <Text style={styles.goalTagText} numberOfLines={1}>
        → {title}
      </Text>
    </Pressable>
  )
}

export default function TodayScreen() {
  const date = todayISO()
  const [draft, setDraft] = useState('')
  const [repeat, setRepeat] = useState<Task['recurring'] | undefined>()
  const [showNewBlock, setShowNewBlock] = useState(false)
  const [editingBlock, setEditingBlock] = useState<ScheduleBlock | null>(null)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  // Standard iOS navigation bar is 44pt below the status bar / notch.
  const headerHeight = useSafeAreaInsets().top + 44

  useEffect(() => {
    ensureRecurringTasksForToday()
  }, [date])

  const tasks = useLiveCollection(() => query(userCollection('tasks'), where('dueDate', '==', date)), [date])
  // Sorted on-device to avoid needing a composite (date + startTime) index.
  const blocks = useLiveCollection(
    () => query(userCollection('scheduleBlocks'), where('date', '==', date)),
    [date],
  ).sort((a, b) => a.startTime.localeCompare(b.startTime))
  const goals = useLiveCollection(() => userCollection('goals'), [])
  const habits = useLiveCollection(() => query(userCollection('habits'), where('frequency', '==', 'daily')), [])
  const logs = useLiveCollection(() => query(userCollection('habitLogs'), where('date', '==', date)), [date])

  const goalTitle = new Map(goals.map((g) => [g.id, g.title]))
  const logByHabit = new Map(logs.map((l) => [l.habitId, l]))
  const doneCount = tasks.filter((t) => t.done).length
  const habitsDone = habits.filter((h) => logByHabit.get(h.id)?.completed).length

  async function addTask() {
    const title = draft.trim()
    if (!title) return
    setDraft('')
    await (repeat ? createRecurringTask(title, repeat) : createTask(title))
  }

  return (
    // Keeps the quick-add bar above the keyboard on iOS.
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={headerHeight}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.date}>{formatDay()}</Text>
          <LevelPill />
        </View>

        <View style={[styles.card, styles.row]}>
          <View style={styles.bar}>
            <View style={[styles.barFill, { width: tasks.length ? `${(doneCount / tasks.length) * 100}%` : '0%' }]} />
          </View>
          <Text style={styles.muted}>
            {doneCount} of {tasks.length} done
          </Text>
        </View>

        {habits.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>TODAY&apos;S HABITS</Text>
              <Text style={styles.muted}>
                {habitsDone} of {habits.length} done
              </Text>
            </View>
            {habits.map((h) => {
              const done = logByHabit.get(h.id)?.completed
              const goal = h.goalId ? goalTitle.get(h.goalId) : undefined
              return (
                <View key={h.id} style={[styles.item, styles.row]}>
                  <Pressable hitSlop={8} onPress={() => toggleHabitToday(h.id, logByHabit.get(h.id))}>
                    <View style={[styles.check, done && styles.checkDone]} />
                  </Pressable>
                  <Text style={[styles.itemText, done && styles.done]}>{h.title}</Text>
                  {goal && <GoalTag title={goal} />}
                  <Text>🔥</Text>
                </View>
              )
            })}
          </View>
        )}

        <MascotCard />
        <BossCard />
        <DailyQuestsCard />

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>SCHEDULE</Text>
            <Pressable onPress={() => setShowNewBlock(true)} hitSlop={8}>
              <Text style={styles.link}>+ Add</Text>
            </Pressable>
          </View>
          {blocks.length === 0 ? (
            <Text style={styles.muted}>No time-blocked events yet.</Text>
          ) : (
            blocks.map((b) => (
              <View key={b.id} style={styles.blockRow}>
                <Text style={styles.blockTime}>{to12h(b.startTime)}</Text>
                <Pressable style={styles.block} onPress={() => setEditingBlock(b)}>
                  <Text style={styles.blockTitle}>{b.title}</Text>
                  <Text style={styles.muted}>
                    {to12h(b.startTime)} – {to12h(b.endTime)}
                  </Text>
                </Pressable>
              </View>
            ))
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>TO-DO</Text>
          {tasks.length === 0 && <Text style={styles.muted}>Nothing planned yet.</Text>}
          {[...tasks]
            .sort((a, b) => Number(a.done) - Number(b.done))
            .map((t) => {
              const goal = t.goalId ? goalTitle.get(t.goalId) : undefined
              return (
                <View key={t.id} style={[styles.item, styles.row]}>
                  <Pressable hitSlop={8} onPress={() => toggleTask(t)}>
                    <View style={[styles.check, t.done && styles.checkDone]} />
                  </Pressable>
                  <Pressable style={{ flex: 1 }} onPress={() => setEditingTask(t)}>
                    <Text style={[styles.itemText, t.done && styles.done]}>
                      {t.title}
                      {t.templateId ? '  ↻' : ''}
                    </Text>
                  </Pressable>
                  {goal && <GoalTag title={goal} />}
                </View>
              )
            })}
        </View>
      </ScrollView>

      <View style={styles.quickAdd}>
        <TextInput
          style={styles.quickInput}
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={addTask}
          returnKeyType="done"
          placeholder={repeat ? `Quick add a ${repeat} task…` : 'Quick add a task…'}
          placeholderTextColor={colors.muted}
        />
        <Pressable
          style={[styles.repeatBtn, repeat && styles.repeatOn]}
          onPress={() => setRepeat(REPEAT_CYCLE[(REPEAT_CYCLE.indexOf(repeat) + 1) % REPEAT_CYCLE.length])}
          accessibilityLabel={repeat ? `Repeats ${repeat}` : 'One-time task, tap to repeat'}
        >
          <Text style={[styles.repeatText, repeat && { color: colors.primary }]}>
            ↻{repeat ? (repeat === 'daily' ? ' D' : ' W') : ''}
          </Text>
        </Pressable>
        <Pressable style={styles.addBtn} onPress={addTask}>
          <Text style={styles.addText}>+</Text>
        </Pressable>
      </View>

      <Sheet open={showNewBlock} onClose={() => setShowNewBlock(false)} title="Add to schedule">
        <BlockForm onDone={() => setShowNewBlock(false)} />
      </Sheet>
      <Sheet open={editingBlock !== null} onClose={() => setEditingBlock(null)} title="Edit event">
        {editingBlock && <BlockForm block={editingBlock} onDone={() => setEditingBlock(null)} />}
      </Sheet>
      <Sheet open={editingTask !== null} onClose={() => setEditingTask(null)} title="Edit task">
        {editingTask && <TaskForm task={editingTask} onDone={() => setEditingTask(null)} />}
      </Sheet>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, gap: 14, paddingBottom: 24 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  date: { fontSize: 20, fontWeight: '700', color: colors.text },
  levelPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: colors.primarySoft },
  levelText: { fontSize: 12, fontWeight: '700', color: colors.primary },
  card: { padding: 14, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bar: { flex: 1, height: 6, borderRadius: 3, backgroundColor: colors.background, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: colors.primary },
  muted: { fontSize: 12, color: colors.muted },
  section: { gap: 8 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, color: colors.muted },
  link: { fontSize: 13, fontWeight: '600', color: colors.primary },
  item: {
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  itemText: { flex: 1, fontSize: 15, color: colors.text },
  done: { color: colors.muted, textDecorationLine: 'line-through' },
  check: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.border },
  checkDone: { backgroundColor: colors.good, borderColor: colors.good },
  goalTag: { maxWidth: '38%', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, backgroundColor: colors.primarySoft },
  goalTagText: { fontSize: 10, fontWeight: '700', color: colors.primary },
  blockRow: { flexDirection: 'row', gap: 10 },
  blockTime: { width: 52, paddingTop: 10, fontSize: 12, color: colors.muted },
  block: { flex: 1, padding: 12, borderRadius: 12, backgroundColor: colors.primarySoft, gap: 2 },
  blockTitle: { fontSize: 14, fontWeight: '600', color: colors.text },
  quickAdd: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    margin: 12,
    marginTop: 0,
    padding: 6,
    paddingLeft: 14,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickInput: { flex: 1, fontSize: 15, color: colors.text, paddingVertical: 6 },
  repeatBtn: { minWidth: 36, height: 36, paddingHorizontal: 6, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  repeatOn: { backgroundColor: colors.primarySoft },
  repeatText: { fontSize: 16, fontWeight: '700', color: colors.muted },
  addBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  addText: { color: '#fff', fontSize: 20 },
})
