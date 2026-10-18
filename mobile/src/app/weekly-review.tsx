import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { colors } from '@/lib/theme'
import { useWeeklySummary } from '@/lib/weeklySummary'

const MOOD_LABELS = ['', 'Rough', 'Meh', 'Good', 'Great', 'Amazing']
const WEEKDAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

function Stat({ value, label }: { value: string | number; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  )
}

export default function WeeklyReviewScreen() {
  const { dates, tasksCompleted, habitConsistency, moodByDate, averageMood, xpEarned, daysJournaled } = useWeeklySummary()

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.subtitle}>Last 7 days</Text>

      <View style={styles.stats}>
        <Stat value={tasksCompleted} label="Tasks done" />
        <Stat value={xpEarned} label="XP earned" />
        <Stat value={`${daysJournaled}/7`} label="Days journaled" />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>MOOD TREND</Text>
        <View style={styles.chart}>
          {moodByDate.map((mood, i) => (
            <View key={dates[i]} style={styles.barCol}>
              <View style={styles.barTrack}>
                <View
                  style={[styles.bar, { height: mood ? `${(mood / 5) * 100}%` : '6%' }, !mood && styles.barEmpty]}
                />
              </View>
              {/* Label each bar with its real weekday — the window ends
                  today, so it doesn't always start on Monday. */}
              <Text style={styles.barLabel}>{WEEKDAY_LETTERS[new Date(dates[i] + 'T00:00:00').getDay()]}</Text>
            </View>
          ))}
        </View>
        {averageMood !== null && (
          <Text style={styles.muted}>
            Average mood: <Text style={{ fontWeight: '700' }}>{MOOD_LABELS[Math.round(averageMood)]}</Text> (
            {averageMood.toFixed(1)}/5)
          </Text>
        )}
      </View>

      {habitConsistency.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>HABIT CONSISTENCY</Text>
          {habitConsistency.map((h) => (
            <View key={h.habitId} style={{ gap: 4 }}>
              <View style={styles.habitRow}>
                <Text style={styles.habitTitle}>{h.title}</Text>
                <Text style={styles.muted}>{h.percent}%</Text>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${h.percent}%` }]} />
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, gap: 14, paddingBottom: 40 },
  subtitle: { color: colors.muted, fontSize: 14 },
  stats: { flexDirection: 'row', gap: 10 },
  stat: { flex: 1, padding: 14, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '700', color: colors.primary },
  statLabel: { fontSize: 11, color: colors.muted, marginTop: 2 },
  card: { padding: 16, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, gap: 12 },
  cardTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, color: colors.muted },
  chart: { flexDirection: 'row', gap: 6, height: 100 },
  barCol: { flex: 1, alignItems: 'center', gap: 6 },
  barTrack: { flex: 1, width: '100%', justifyContent: 'flex-end' },
  bar: { width: '100%', borderTopLeftRadius: 6, borderTopRightRadius: 6, backgroundColor: colors.primary },
  barEmpty: { backgroundColor: colors.border },
  barLabel: { fontSize: 10, color: colors.muted },
  muted: { fontSize: 13, color: colors.muted },
  habitRow: { flexDirection: 'row', justifyContent: 'space-between' },
  habitTitle: { fontSize: 14, color: colors.text },
  progressTrack: { height: 6, borderRadius: 3, backgroundColor: colors.background, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.good },
})
