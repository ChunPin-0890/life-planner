import { useEffect, useRef, useState } from 'react'
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native'
import Svg, { Circle, Ellipse, Path } from 'react-native-svg'
import { userCollection } from '@/lib/firestore'
import { useLiveCollection } from '@/lib/hooks'
import { useMascotState, type MascotMood } from '@/lib/mascotMood'
import { colors } from '@/lib/theme'
import { computeLevel, computeRank } from '@/lib/xp'

// Ported from client/src/components/Mascot.tsx — same SVG, with the CSS
// keyframe animations rebuilt on React Native's Animated API.

const RANK_COLORS: Record<string, { body: string; cheek: string }> = {
  E: { body: '#b3b0ff', cheek: '#ff9ec4' },
  D: { body: '#6ee7a8', cheek: '#ff9ec4' },
  C: { body: '#6c8cff', cheek: '#ffb3d1' },
  B: { body: '#c39bff', cheek: '#ffb3d1' },
  A: { body: '#ffb56b', cheek: '#ff8fa8' },
  S: { body: '#ff8080', cheek: '#ffd166' },
}

const POKE_MESSAGES = ["That tickles!", "Let's go!", "You've got this.", 'Hi there!', 'Ready when you are.', '*wiggle*']
const INK = '#28243d'

function Face({ mood, blink }: { mood: MascotMood; blink: boolean }) {
  if (blink) {
    return (
      <>
        <Path d="M34 51h10M60 51h10" stroke={INK} strokeWidth={3} strokeLinecap="round" />
        <Ellipse cx="30" cy="59" rx="4" ry="2.5" fill="#ff9ec4" opacity={0.5} />
        <Ellipse cx="74" cy="59" rx="4" ry="2.5" fill="#ff9ec4" opacity={0.5} />
        <Path d="M43 64c3 2 15 2 18 0" stroke={INK} strokeWidth={2.6} strokeLinecap="round" fill="none" />
      </>
    )
  }
  if (mood === 'happy') {
    return (
      <>
        <Ellipse cx="39" cy="50" rx="5.5" ry="7" fill={INK} />
        <Ellipse cx="65" cy="50" rx="5.5" ry="7" fill={INK} />
        <Circle cx="41" cy="46" r="1.8" fill="white" />
        <Circle cx="67" cy="46" r="1.8" fill="white" />
        <Ellipse cx="30" cy="60" rx="5" ry="3" fill="#ff9ec4" opacity={0.7} />
        <Ellipse cx="74" cy="60" rx="5" ry="3" fill="#ff9ec4" opacity={0.7} />
        <Path d="M40 62c4 6 20 6 24 0" stroke={INK} strokeWidth={3} strokeLinecap="round" fill="none" />
      </>
    )
  }
  if (mood === 'sad') {
    return (
      <>
        <Ellipse cx="39" cy="52" rx="5" ry="6" fill={INK} />
        <Ellipse cx="65" cy="52" rx="5" ry="6" fill={INK} />
        <Circle cx="41" cy="49" r="1.5" fill="white" />
        <Circle cx="67" cy="49" r="1.5" fill="white" />
        <Path d="M33 42l10 4M71 42l-10 4" stroke={INK} strokeWidth={2.2} strokeLinecap="round" />
        <Path d="M41 66c4 -4 18 -4 22 0" stroke={INK} strokeWidth={3} strokeLinecap="round" fill="none" />
        <Path d="M35 58c0 3-3 3-3 5a1.5 1.5 0 0 0 3 0c0-2-3-2-3-5z" fill="#8ec9ff" opacity={0.85} />
      </>
    )
  }
  return (
    <>
      <Ellipse cx="39" cy="51" rx="5" ry="6.5" fill={INK} />
      <Ellipse cx="65" cy="51" rx="5" ry="6.5" fill={INK} />
      <Circle cx="41" cy="47.5" r="1.6" fill="white" />
      <Circle cx="67" cy="47.5" r="1.6" fill="white" />
      <Ellipse cx="30" cy="59" rx="4" ry="2.5" fill="#ff9ec4" opacity={0.5} />
      <Ellipse cx="74" cy="59" rx="4" ry="2.5" fill="#ff9ec4" opacity={0.5} />
      <Path d="M43 64c3 2 15 2 18 0" stroke={INK} strokeWidth={2.6} strokeLinecap="round" fill="none" />
    </>
  )
}

export function Mascot({ level, mood, size = 88 }: { level: number; mood: MascotMood; size?: number }) {
  const rank = computeRank(level).rank
  const palette = RANK_COLORS[rank] ?? RANK_COLORS.E
  const [blink, setBlink] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [bounce] = useState(() => new Animated.Value(0))
  const [wiggle] = useState(() => new Animated.Value(0))
  const messageTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // Idle bounce (paused when sad, like the web version).
  useEffect(() => {
    if (mood === 'sad') {
      bounce.setValue(0)
      return
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bounce, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(bounce, { toValue: 0, duration: 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    )
    loop.start()
    return () => loop.stop()
  }, [mood, bounce])

  // Periodic blink.
  useEffect(() => {
    let blinkOff: ReturnType<typeof setTimeout> | undefined
    const id = setInterval(
      () => {
        setBlink(true)
        blinkOff = setTimeout(() => setBlink(false), 140)
      },
      2600 + Math.random() * 2000,
    )
    return () => {
      clearInterval(id)
      clearTimeout(blinkOff)
    }
  }, [])

  useEffect(() => () => clearTimeout(messageTimer.current), [])

  function poke() {
    setMessage(POKE_MESSAGES[Math.floor(Math.random() * POKE_MESSAGES.length)])
    clearTimeout(messageTimer.current)
    messageTimer.current = setTimeout(() => setMessage(null), 1400)
    wiggle.setValue(0)
    Animated.timing(wiggle, { toValue: 1, duration: 800, useNativeDriver: true }).start()
  }

  const translateY = bounce.interpolate({ inputRange: [0, 1], outputRange: [0, -4] })
  const rotate = wiggle.interpolate({
    inputRange: [0, 0.125, 0.375, 0.625, 0.875, 1],
    outputRange: ['0deg', '-8deg', '8deg', '-8deg', '8deg', '0deg'],
  })

  return (
    <View style={{ width: size, height: size }}>
      {message && (
        <View style={styles.bubble}>
          <Text style={styles.bubbleText}>{message}</Text>
        </View>
      )}
      <Pressable onPress={poke} accessibilityLabel="Poke the mascot">
        <Animated.View style={{ transform: [{ translateY }, { rotate }] }}>
          <Svg width={size} height={size} viewBox="0 0 104 104">
            <Ellipse cx="52" cy="97" rx="26" ry="4.5" fill="black" opacity={0.08} />
            <Ellipse cx="38" cy="90" rx="9" ry="6" fill={palette.body} />
            <Ellipse cx="66" cy="90" rx="9" ry="6" fill={palette.body} />
            <Circle cx="52" cy="54" r="40" fill={palette.body} />
            <Ellipse cx="52" cy="42" rx="40" ry="30" fill="white" opacity={0.12} />
            <Ellipse cx="14" cy="58" rx="7" ry="10" fill={palette.body} />
            <Ellipse cx="90" cy="58" rx="7" ry="10" fill={palette.body} />
            <Circle cx="24" cy="20" r="9" fill={palette.body} />
            <Circle cx="80" cy="20" r="9" fill={palette.body} />
            <Circle cx="24" cy="21" r="4.5" fill={palette.cheek} opacity={0.6} />
            <Circle cx="80" cy="21" r="4.5" fill={palette.cheek} opacity={0.6} />
            {rank !== 'E' && (
              <Path
                d="M40 16c3-6 8-9 12-9M64 16c-3-6-8-9-12-9"
                stroke={palette.cheek}
                strokeWidth={3}
                strokeLinecap="round"
                fill="none"
                opacity={0.9}
              />
            )}
            <Ellipse cx="52" cy="70" rx="16" ry="12" fill="white" opacity={0.25} />
            <Face mood={mood} blink={blink} />
          </Svg>
        </Animated.View>
      </Pressable>
    </View>
  )
}

export function MascotCard() {
  const xpEvents = useLiveCollection(() => userCollection('xpEvents'), [])
  const level = computeLevel(xpEvents.reduce((s, e) => s + e.amount, 0)).level
  const { mood, message } = useMascotState()

  return (
    <View style={styles.card}>
      <Mascot level={level} mood={mood} size={64} />
      <Text style={styles.message}>{message}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  message: { flex: 1, fontSize: 14, color: colors.muted },
  bubble: {
    position: 'absolute',
    bottom: '100%',
    left: -20,
    zIndex: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: colors.text,
  },
  bubbleText: { fontSize: 11, fontWeight: '600', color: '#fff' },
})
