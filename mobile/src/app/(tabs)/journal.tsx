import { router } from 'expo-router'
import { useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { formatDay, todayISO } from '@/lib/date'
import { userDoc } from '@/lib/firestore'
import { useLiveDoc } from '@/lib/hooks'
import { MOODS, saveJournalField, setMood, shiftDate, type JournalField } from '@/lib/journal'
import { colors } from '@/lib/theme'
import type { JournalEntry } from '@/lib/types'
import { useWeeklySummary } from '@/lib/weeklySummary'

function EntryField({
  label,
  field,
  date,
  entry,
}: {
  label: string
  field: JournalField
  date: string
  entry: JournalEntry | undefined
}) {
  const saved = entry?.[field] ?? ''
  const [value, setValue] = useState(saved)

  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.textArea}
        multiline
        value={value}
        onChangeText={setValue}
        // Only write when the text actually changed — focusing and leaving
        // a field must never overwrite what's already saved.
        onBlur={() => value !== saved && saveJournalField(date, field, value, entry?.mood !== undefined)}
        placeholder="Tap to write…"
        placeholderTextColor={colors.muted}
      />
    </View>
  )
}

export default function JournalScreen() {
  const today = todayISO()
  const [date, setDate] = useState(today)
  const isToday = date === today
  const { data: entry, loaded } = useLiveDoc(() => userDoc('journalEntries', date), [date])
  const { daysJournaled } = useWeeklySummary()

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <Text style={styles.date}>
          {isToday ? `${formatDay()} · end of day` : formatDay(new Date(date + 'T00:00:00'))}
        </Text>
        <View style={styles.nav}>
          <Pressable style={styles.navBtn} onPress={() => setDate((d) => shiftDate(d, -1))} hitSlop={6}>
            <Text style={styles.navText}>‹</Text>
          </Pressable>
          <Pressable
            style={[styles.navBtn, isToday && styles.disabled]}
            disabled={isToday}
            onPress={() => setDate((d) => shiftDate(d, 1))}
            hitSlop={6}
          >
            <Text style={styles.navText}>›</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>{isToday ? 'How did today feel?' : 'How did that day feel?'}</Text>
        <View style={styles.moods}>
          {MOODS.map((m) => {
            const selected = entry?.mood === m.value
            return (
              <Pressable key={m.value} style={styles.mood} onPress={() => setMood(date, m.value)}>
                <View style={[styles.moodFace, selected && styles.moodFaceSelected]}>
                  <Text style={{ fontSize: selected ? 26 : 22 }}>{m.emoji}</Text>
                </View>
                <Text style={[styles.moodLabel, selected && styles.moodLabelSelected]}>{m.label}</Text>
              </Pressable>
            )
          })}
        </View>
      </View>

      {/* Remount the fields per day, once that day's entry has loaded, so
          their local text starts from the saved values. */}
      {loaded && (
        <View key={date} style={{ gap: 10 }}>
          <EntryField label={isToday ? 'Wins today' : 'Wins that day'} field="wins" date={date} entry={entry} />
          <EntryField label="Challenges" field="challenges" date={date} entry={entry} />
          <EntryField
            label={isToday ? "Tomorrow's focus" : "Next day's focus"}
            field="tomorrowFocus"
            date={date}
            entry={entry}
          />
        </View>
      )}

      {!isToday && (
        <Pressable onPress={() => setDate(today)}>
          <Text style={styles.link}>← Back to today</Text>
        </Pressable>
      )}

      <Pressable style={styles.review} onPress={() => router.push('/weekly-review')}>
        <View>
          <Text style={styles.reviewTitle}>This week&apos;s review</Text>
          <Text style={styles.reviewSub}>{daysJournaled} of 7 days logged</Text>
        </View>
        <Text style={styles.reviewArrow}>›</Text>
      </Pressable>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, gap: 14, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  date: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.muted },
  nav: { flexDirection: 'row', gap: 4 },
  navBtn: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  navText: { fontSize: 22, color: colors.text, lineHeight: 24 },
  disabled: { opacity: 0.3 },
  card: { padding: 14, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, gap: 8 },
  label: { fontSize: 12, fontWeight: '600', color: colors.muted },
  moods: { flexDirection: 'row', justifyContent: 'space-between' },
  mood: { alignItems: 'center', gap: 4 },
  moodFace: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  moodFaceSelected: { width: 50, height: 50, borderRadius: 25, backgroundColor: colors.primarySoft, borderWidth: 2, borderColor: colors.primary },
  moodLabel: { fontSize: 10, color: colors.muted },
  moodLabelSelected: { fontWeight: '700', color: colors.primary },
  textArea: { minHeight: 48, fontSize: 15, color: colors.text, textAlignVertical: 'top', padding: 0 },
  link: { color: colors.primary, fontWeight: '600', fontSize: 13 },
  review: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
  },
  reviewTitle: { fontSize: 15, fontWeight: '700', color: colors.primary },
  reviewSub: { fontSize: 12, color: colors.muted, marginTop: 2 },
  reviewArrow: { fontSize: 24, color: colors.primary },
})
