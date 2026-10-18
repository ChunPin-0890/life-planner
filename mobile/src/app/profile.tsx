import { signOut } from 'firebase/auth'
import { onSnapshot } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { BadgeGrid } from '@/components/game-cards'
import { useAuth } from '@/lib/auth-context'
import { auth } from '@/lib/firebase'
import { userCollection } from '@/lib/firestore'
import { colors } from '@/lib/theme'
import { computeLevel, computeRank } from '@/lib/xp'

export default function ProfileScreen() {
  const { user } = useAuth()
  const [totalXp, setTotalXp] = useState(0)

  // Total XP is derived from the ledger, same as the web client.
  useEffect(
    () => onSnapshot(userCollection('xpEvents'), (snap) => setTotalXp(snap.docs.reduce((sum, d) => sum + d.data().amount, 0))),
    [],
  )

  const level = computeLevel(totalXp)
  const rank = computeRank(level.level)

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.email}>{user?.email}</Text>

      <View style={styles.card}>
        <Text style={styles.rank}>{rank.name}</Text>
        <Text style={styles.level}>Level {level.level}</Text>
        <View style={styles.bar}>
          <View style={[styles.barFill, { width: `${level.progress * 100}%` }]} />
        </View>
        <Text style={styles.muted}>
          {level.xpIntoLevel} / {level.xpForNextLevel} XP · {totalXp} total
        </Text>
      </View>

      <BadgeGrid />

      <Pressable style={styles.signOut} onPress={() => signOut(auth)}>
        <Text style={styles.signOutText}>Sign out</Text>
      </Pressable>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, gap: 16, paddingBottom: 40 },
  email: { fontSize: 16, color: colors.muted },
  card: { padding: 16, borderRadius: 12, backgroundColor: colors.surface, gap: 6 },
  rank: { fontSize: 14, fontWeight: '600', color: colors.primary },
  level: { fontSize: 28, fontWeight: '700', color: colors.text },
  bar: { height: 8, borderRadius: 4, backgroundColor: colors.border, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: colors.primary },
  muted: { color: colors.muted },
  signOut: { padding: 14, borderRadius: 10, borderWidth: 1, borderColor: colors.danger, alignItems: 'center' },
  signOutText: { color: colors.danger, fontWeight: '600' },
})
