import { useEffect, useState } from 'react'
import { Animated, Pressable, StyleSheet, Text } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAchievementWatcher, type Achievement } from '@/lib/achievements'

/** Watches for newly earned achievements and shows them one at a time. */
export function AchievementToast() {
  const [queue, setQueue] = useState<Achievement[]>([])
  const [opacity] = useState(() => new Animated.Value(0))
  const insets = useSafeAreaInsets()
  useAchievementWatcher((a) => setQueue((q) => [...q, a]))

  const current = queue[0]

  useEffect(() => {
    if (!current) return
    Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }).start()
    const t = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => setQueue((q) => q.slice(1)))
    }, 3000)
    return () => clearTimeout(t)
  }, [current, opacity])

  if (!current) return null

  return (
    <Animated.View style={[styles.toast, { top: insets.top + 8, opacity }]}>
      <Pressable onPress={() => setQueue((q) => q.slice(1))}>
        <Text style={styles.kicker}>⭐ ACHIEVEMENT UNLOCKED</Text>
        <Text style={styles.title}>{current.title}</Text>
        <Text style={styles.desc}>{current.description}</Text>
      </Pressable>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: 16,
    right: 16,
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#1c1c1e',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  kicker: { fontSize: 11, fontWeight: '700', color: '#f3c77b', letterSpacing: 0.5 },
  title: { fontSize: 16, fontWeight: '700', color: '#fff', marginTop: 2 },
  desc: { fontSize: 13, color: 'rgba(255,255,255,0.75)' },
})
