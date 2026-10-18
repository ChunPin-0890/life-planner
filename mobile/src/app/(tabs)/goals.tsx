import { router } from 'expo-router'
import { orderBy, query, where } from 'firebase/firestore'
import { useState } from 'react'
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native'
import { NorthStarCard } from '@/components/game-cards'
import { Button, Chip, ChipRow, Field, Label, Sheet } from '@/components/ui'
import { todayISO } from '@/lib/date'
import { userCollection } from '@/lib/firestore'
import {
  CATEGORIES,
  createGoal,
  deleteGoal,
  deleteMilestone,
  renameMilestone,
  stepGoalCounter,
  TEMPLATES,
  toggleMilestone,
  toggleTask,
  updateGoal,
} from '@/lib/goals'
import { toggleHabitToday } from '@/lib/habits'
import { useLiveCollection } from '@/lib/hooks'
import { colors } from '@/lib/theme'
import type { Goal, Milestone } from '@/lib/types'
import { XP_REWARDS } from '@/lib/xp'

function GoalCard({
  goal,
  expanded,
  onToggle,
  onEdit,
  onEditMilestone,
}: {
  goal: Goal
  expanded: boolean
  onToggle: () => void
  onEdit: () => void
  onEditMilestone: (m: Milestone) => void
}) {
  // Sorted on-device: where + orderBy on different fields would need a
  // composite Firestore index.
  const milestones = useLiveCollection(
    () => query(userCollection('milestones'), where('goalId', '==', goal.id)),
    [goal.id],
  ).sort((a, b) => a.order - b.order)
  const tasks = useLiveCollection(() => query(userCollection('tasks'), where('goalId', '==', goal.id)), [goal.id])

  const target = goal.targetCount ?? 0
  const count = goal.currentCount ?? 0
  const isCounter = target > 0
  const progress = isCounter
    ? Math.round((count / target) * 100)
    : milestones.length
      ? Math.round((milestones.filter((m) => m.done).length / milestones.length) * 100)
      : 0

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Pressable style={{ flex: 1 }} onPress={onToggle}>
          <Text style={styles.category}>{goal.category}</Text>
          <Text style={styles.goalTitle}>{goal.title}</Text>
        </Pressable>
        <Pressable onPress={onEdit} hitSlop={8}>
          <Text style={styles.link}>Edit</Text>
        </Pressable>
      </View>

      <View style={styles.row}>
        <View style={styles.bar}>
          <View style={[styles.barFill, { width: `${progress}%` }]} />
        </View>
        <Text style={styles.muted}>{isCounter ? `${count}/${target}` : `${progress}%`}</Text>
      </View>

      {expanded && isCounter && (
        <View style={styles.counter}>
          <Pressable style={[styles.stepBtn, count === 0 && styles.disabled]} disabled={count === 0} onPress={() => stepGoalCounter(goal, -1)}>
            <Text style={styles.stepText}>−</Text>
          </Pressable>
          <View style={{ alignItems: 'center' }}>
            <Text style={styles.counterValue}>
              {count} <Text style={styles.muted}>/ {target}</Text>
            </Text>
            <Text style={[styles.small, count >= target && { color: colors.good }]}>
              {count >= target ? 'Complete!' : `+${XP_REWARDS.goalCounter} XP at ${target}`}
            </Text>
          </View>
          <Pressable
            style={[styles.stepBtn, styles.stepBtnPrimary, count >= target && styles.disabled]}
            disabled={count >= target}
            onPress={() => stepGoalCounter(goal, 1)}
          >
            <Text style={[styles.stepText, { color: '#fff' }]}>+</Text>
          </Pressable>
        </View>
      )}

      {expanded &&
        !isCounter &&
        milestones.map((m) => (
          <View key={m.id} style={{ gap: 6 }}>
            <Pressable style={styles.row} onPress={() => toggleMilestone(m)} onLongPress={() => onEditMilestone(m)}>
              <View style={[styles.check, m.done && styles.checkDone]} />
              <Text style={[styles.milestone, m.done && styles.done]}>{m.title}</Text>
              {!m.done && <Text style={styles.small}>+{XP_REWARDS.milestone} XP</Text>}
            </Pressable>
            {tasks
              .filter((t) => t.milestoneId === m.id)
              .map((t) => (
                <Pressable key={t.id} style={[styles.row, { marginLeft: 30 }]} onPress={() => toggleTask(t)}>
                  <View style={[styles.taskBox, t.done && styles.checkDone]} />
                  <Text style={[styles.taskTitle, t.done && styles.done]}>{t.title}</Text>
                </Pressable>
              ))}
          </View>
        ))}

      {expanded && <LinkedHabits goalId={goal.id} />}
    </View>
  )
}

function LinkedHabits({ goalId }: { goalId: string }) {
  const today = todayISO()
  const habits = useLiveCollection(() => query(userCollection('habits'), where('goalId', '==', goalId)), [goalId])
  const todaysLogs = useLiveCollection(() => query(userCollection('habitLogs'), where('date', '==', today)), [today])
  if (habits.length === 0) return null

  return (
    <View style={styles.linked}>
      <View style={styles.row}>
        <Text style={[styles.small, { flex: 1, fontWeight: '700' }]}>HABITS DRIVING THIS GOAL</Text>
        <Pressable onPress={() => router.navigate('/habits')}>
          <Text style={styles.link}>View all</Text>
        </Pressable>
      </View>
      {habits.map((h) => {
        const log = todaysLogs.find((l) => l.habitId === h.id)
        return (
          <Pressable key={h.id} style={styles.row} onPress={() => toggleHabitToday(h.id, log)}>
            <View style={[styles.check, styles.checkSmall, log?.completed && styles.checkDone]} />
            <Text style={[styles.taskTitle, log?.completed && styles.done]}>{h.title} 🔥</Text>
          </Pressable>
        )
      })}
    </View>
  )
}

function NewGoalForm({ onDone }: { onDone: () => void }) {
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState(CATEGORIES[0])
  const [targetDate, setTargetDate] = useState('')
  const [targetCount, setTargetCount] = useState('')
  const [milestones, setMilestones] = useState<string[]>([''])
  const isCounter = (parseInt(targetCount, 10) || 0) > 0

  async function save() {
    const trimmed = title.trim()
    if (!trimmed) return
    await createGoal({
      title: trimmed,
      category,
      targetDate: /^\d{4}-\d{2}-\d{2}$/.test(targetDate) ? targetDate : undefined,
      targetCount: parseInt(targetCount, 10) || undefined,
      milestones,
    })
    onDone()
  }

  return (
    <>
      <View style={{ gap: 6 }}>
        <Label>Start from a template</Label>
        <ChipRow>
          {TEMPLATES.map((t) => (
            <Chip
              key={t.name}
              label={t.name}
              selected={false}
              onPress={() => {
                setTitle(t.title)
                setCategory(t.category)
                setMilestones(t.milestones)
              }}
            />
          ))}
        </ChipRow>
      </View>
      <Field label="Goal" value={title} onChangeText={setTitle} placeholder="What do you want to achieve?" />
      <View style={{ gap: 6 }}>
        <Label>Category</Label>
        <ChipRow>
          {CATEGORIES.map((c) => (
            <Chip key={c} label={c} selected={category === c} onPress={() => setCategory(c)} />
          ))}
        </ChipRow>
      </View>
      <Field label="Target date (optional, YYYY-MM-DD)" value={targetDate} onChangeText={setTargetDate} placeholder="2026-12-31" />
      <Field
        label="Count target (optional — e.g. 50 for “chant 50 times”)"
        value={targetCount}
        onChangeText={setTargetCount}
        keyboardType="number-pad"
        placeholder="Leave empty to use milestones"
      />
      {!isCounter && (
        <View style={{ gap: 8 }}>
          <Label>Milestones</Label>
          {milestones.map((m, i) => (
            <View key={i} style={styles.row}>
              <View style={{ flex: 1 }}>
                <Field
                  label={`Milestone ${i + 1}`}
                  value={m}
                  onChangeText={(v) => setMilestones((all) => all.map((x, idx) => (idx === i ? v : x)))}
                />
              </View>
              {milestones.length > 1 && (
                <Pressable onPress={() => setMilestones((all) => all.filter((_, idx) => idx !== i))} hitSlop={8}>
                  <Text style={[styles.link, { color: colors.danger, marginTop: 18 }]}>Remove</Text>
                </Pressable>
              )}
            </View>
          ))}
          <Button label="+ Add milestone" variant="ghost" onPress={() => setMilestones((all) => [...all, ''])} />
        </View>
      )}
      <Button label="Create goal" onPress={save} disabled={!title.trim()} />
    </>
  )
}

function EditGoalForm({ goal, onDone }: { goal: Goal; onDone: () => void }) {
  const [title, setTitle] = useState(goal.title)
  const [category, setCategory] = useState(goal.category)
  const [targetDate, setTargetDate] = useState(goal.targetDate ?? '')

  async function save() {
    const trimmed = title.trim()
    if (!trimmed) return
    await updateGoal(goal.id, {
      title: trimmed,
      category,
      targetDate: /^\d{4}-\d{2}-\d{2}$/.test(targetDate) ? targetDate : undefined,
    })
    onDone()
  }

  function confirmDelete() {
    Alert.alert('Delete goal?', 'Its milestones, linked tasks and their XP will be removed.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteGoal(goal).then(onDone) },
    ])
  }

  return (
    <>
      <Field label="Goal" value={title} onChangeText={setTitle} />
      <View style={{ gap: 6 }}>
        <Label>Category</Label>
        <ChipRow>
          {CATEGORIES.map((c) => (
            <Chip key={c} label={c} selected={category === c} onPress={() => setCategory(c)} />
          ))}
        </ChipRow>
      </View>
      <Field label="Target date (YYYY-MM-DD)" value={targetDate} onChangeText={setTargetDate} />
      <Button label="Save" onPress={save} disabled={!title.trim()} />
      <Button label="Delete goal" variant="danger" onPress={confirmDelete} />
    </>
  )
}

function EditMilestoneForm({ milestone, onDone }: { milestone: Milestone; onDone: () => void }) {
  const [title, setTitle] = useState(milestone.title)
  return (
    <>
      <Field label="Milestone" value={title} onChangeText={setTitle} />
      <Button
        label="Save"
        disabled={!title.trim()}
        onPress={() => renameMilestone(milestone.id, title.trim()).then(onDone)}
      />
      <Button
        label="Delete milestone"
        variant="danger"
        onPress={() =>
          Alert.alert('Delete milestone?', 'Its tasks and XP will be removed.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => deleteMilestone(milestone).then(onDone) },
          ])
        }
      />
    </>
  )
}

export default function GoalsScreen() {
  const goals = useLiveCollection(() => query(userCollection('goals'), orderBy('createdAt')), [])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showNew, setShowNew] = useState(false)
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null)

  return (
    <View style={styles.screen}>
      <Button label="New goal" onPress={() => setShowNew(true)} />
      <FlatList
        data={goals}
        keyExtractor={(g) => g.id}
        contentContainerStyle={{ gap: 12, paddingBottom: 24 }}
        ListHeaderComponent={<NorthStarCard />}
        ListEmptyComponent={<Text style={styles.empty}>No goals yet.</Text>}
        ListFooterComponent={goals.length ? <Text style={styles.hint}>Tap a milestone to complete · long-press to edit</Text> : null}
        renderItem={({ item, index }) => (
          <GoalCard
            goal={item}
            // First goal starts expanded, like the web app.
            expanded={expandedId === null ? index === 0 : expandedId === item.id}
            onToggle={() => setExpandedId(expandedId === item.id ? '' : item.id)}
            onEdit={() => setEditingGoal(item)}
            onEditMilestone={setEditingMilestone}
          />
        )}
      />

      <Sheet open={showNew} onClose={() => setShowNew(false)} title="New goal">
        <NewGoalForm onDone={() => setShowNew(false)} />
      </Sheet>
      <Sheet open={editingGoal !== null} onClose={() => setEditingGoal(null)} title="Edit goal">
        {editingGoal && <EditGoalForm goal={editingGoal} onDone={() => setEditingGoal(null)} />}
      </Sheet>
      <Sheet open={editingMilestone !== null} onClose={() => setEditingMilestone(null)} title="Edit milestone">
        {editingMilestone && <EditMilestoneForm milestone={editingMilestone} onDone={() => setEditingMilestone(null)} />}
      </Sheet>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16, gap: 12, backgroundColor: colors.background },
  card: { padding: 16, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  category: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5, color: colors.primary, textTransform: 'uppercase' },
  goalTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginTop: 2 },
  link: { color: colors.primary, fontWeight: '600', fontSize: 13 },
  bar: { flex: 1, height: 8, borderRadius: 4, backgroundColor: colors.background, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: colors.primary },
  muted: { color: colors.muted, fontSize: 13, fontWeight: '600' },
  small: { color: colors.muted, fontSize: 11, fontWeight: '600' },
  counter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderRadius: 12, backgroundColor: colors.background },
  counterValue: { fontSize: 20, fontWeight: '800', color: colors.text },
  stepBtn: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  stepBtnPrimary: { backgroundColor: colors.primary },
  stepText: { fontSize: 20, fontWeight: '700', color: colors.text },
  disabled: { opacity: 0.3 },
  check: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.primary },
  checkSmall: { width: 17, height: 17, borderColor: colors.border },
  checkDone: { backgroundColor: colors.good, borderColor: colors.good },
  taskBox: { width: 15, height: 15, borderRadius: 4, borderWidth: 1, borderColor: colors.border },
  milestone: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.text },
  taskTitle: { flex: 1, fontSize: 13, color: colors.text },
  done: { color: colors.muted, textDecorationLine: 'line-through' },
  linked: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12, gap: 8 },
  empty: { color: colors.muted, textAlign: 'center', marginTop: 32 },
  hint: { color: colors.muted, textAlign: 'center', fontSize: 12, marginTop: 4 },
})
