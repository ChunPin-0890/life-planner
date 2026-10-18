import { useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { useAchievements } from '@/lib/achievements'
import { metaDoc } from '@/lib/firestore'
import { useLiveDoc } from '@/lib/hooks'
import { setNorthStar } from '@/lib/northStar'
import { useDailyQuests } from '@/lib/quests'
import { colors } from '@/lib/theme'
import { defeatBoss, useWeeklyBoss } from '@/lib/weeklyBoss'
import { XP_REWARDS } from '@/lib/xp'

export function DailyQuestsCard() {
  const { quests, allDone } = useDailyQuests()
  const onAccent = allDone ? { color: '#fff' } : null

  return (
    <View style={[styles.card, allDone && styles.cardAccent]}>
      <View style={styles.cardHeader}>
        <Text style={[styles.cardTitle, onAccent]}>DAILY QUESTS</Text>
        <Text style={[styles.small, onAccent]}>
          {allDone ? `+${XP_REWARDS.quest} XP earned` : `+${XP_REWARDS.quest} XP for clearing all`}
        </Text>
      </View>
      {quests.map((q) => (
        <View key={q.id} style={styles.row}>
          <View
            style={[
              styles.dot,
              q.done && { backgroundColor: allDone ? '#fff' : colors.good, borderColor: allDone ? '#fff' : colors.good },
              allDone && !q.done && { borderColor: 'rgba(255,255,255,0.5)' },
            ]}
          />
          <Text style={[styles.questTitle, q.done && !allDone && styles.done, onAccent]}>{q.title}</Text>
          <Text style={[styles.small, onAccent]}>
            {q.current}/{q.target}
          </Text>
        </View>
      ))}
    </View>
  )
}

export function BossCard() {
  const { milestone, weekKey, bonusClaimed } = useWeeklyBoss()
  if (!milestone) return null
  const reward = XP_REWARDS.milestone + (bonusClaimed ? 0 : XP_REWARDS.boss)

  return (
    <View style={[styles.card, styles.boss]}>
      <Text style={[styles.cardTitle, { color: '#fff' }]}>⚔️ THIS WEEK&apos;S BOSS</Text>
      <Text style={styles.bossTitle}>{milestone.title}</Text>
      <Text style={styles.bossSub}>Part of: {milestone.goalTitle}</Text>
      <Pressable style={styles.bossButton} onPress={() => defeatBoss(milestone.id, weekKey)}>
        <Text style={styles.bossButtonText}>Defeat boss · +{reward} XP</Text>
      </Pressable>
    </View>
  )
}

export function NorthStarCard() {
  const { data } = useLiveDoc(() => metaDoc('northStar'), [])
  const [draft, setDraft] = useState<string | null>(null)
  const body = data?.body ?? ''

  async function saveAndClose() {
    const trimmed = (draft ?? '').trim()
    setDraft(null)
    if (trimmed !== body) await setNorthStar(trimmed)
  }

  return (
    <Pressable style={[styles.card, styles.northStar]} onPress={() => draft === null && setDraft(body)}>
      <Text style={[styles.cardTitle, { color: '#fff' }]}>★ YOUR NORTH STAR</Text>
      {draft !== null ? (
        <TextInput
          autoFocus
          multiline
          value={draft}
          onChangeText={setDraft}
          onBlur={saveAndClose}
          placeholder="What's the one dream all of this is in service of?"
          placeholderTextColor="rgba(255,255,255,0.6)"
          style={styles.northStarInput}
        />
      ) : body ? (
        <Text style={styles.northStarText}>{body}</Text>
      ) : (
        <Text style={[styles.northStarText, { opacity: 0.7, fontStyle: 'italic' }]}>
          Tap to write the one dream everything below is working toward.
        </Text>
      )}
    </Pressable>
  )
}

export function BadgeGrid() {
  const achievements = useAchievements()
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>ACHIEVEMENTS</Text>
      <View style={styles.grid}>
        {achievements.map((a) => (
          <View key={a.id} style={styles.badge}>
            <View style={[styles.badgeIcon, a.unlocked && styles.badgeIconUnlocked]}>
              <Text style={{ fontSize: 22 }}>{a.unlocked ? '⭐' : '🔒'}</Text>
            </View>
            <Text style={[styles.badgeTitle, !a.unlocked && { color: colors.muted }]}>{a.title}</Text>
            <Text style={styles.badgeDesc}>{a.description}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: { padding: 16, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, gap: 10 },
  cardAccent: { backgroundColor: colors.primary, borderColor: colors.primary },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, color: colors.muted },
  small: { fontSize: 11, fontWeight: '600', color: colors.muted },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: colors.border },
  questTitle: { flex: 1, fontSize: 14, color: colors.text },
  done: { color: colors.muted, textDecorationLine: 'line-through' },
  boss: { backgroundColor: '#8e2a2a', borderColor: '#8e2a2a' },
  bossTitle: { fontSize: 15, fontWeight: '700', color: '#fff' },
  bossSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: -6 },
  bossButton: { backgroundColor: '#fff', borderRadius: 12, padding: 11, alignItems: 'center' },
  bossButtonText: { fontWeight: '700', color: '#8e2a2a' },
  northStar: { backgroundColor: colors.primary, borderColor: colors.primary },
  northStarText: { fontSize: 15, lineHeight: 22, color: '#fff' },
  northStarInput: {
    minHeight: 70,
    borderRadius: 10,
    padding: 10,
    fontSize: 15,
    color: '#fff',
    backgroundColor: 'rgba(255,255,255,0.12)',
    textAlignVertical: 'top',
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 14 },
  badge: { width: '33.33%', alignItems: 'center', gap: 4, paddingHorizontal: 4 },
  badgeIcon: { width: 54, height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  badgeIconUnlocked: { backgroundColor: '#f3c77b' },
  badgeTitle: { fontSize: 11, fontWeight: '700', color: colors.text, textAlign: 'center' },
  badgeDesc: { fontSize: 10, color: colors.muted, textAlign: 'center' },
})
