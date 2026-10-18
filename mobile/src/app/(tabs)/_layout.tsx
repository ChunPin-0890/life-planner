import { router, Tabs } from 'expo-router'
import { Pressable, Text, View } from 'react-native'
import { AchievementToast } from '@/components/achievement-toast'
import { colors } from '@/lib/theme'

export default function TabsLayout() {
  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: colors.primary,
          // Profile lives behind a header button so the tab bar stays at 5.
          headerRight: () => (
            <Pressable onPress={() => router.push('/profile')} hitSlop={8} style={{ marginRight: 16 }}>
              <Text style={{ color: colors.primary, fontWeight: '600' }}>Profile</Text>
            </Pressable>
          ),
        }}
      >
        <Tabs.Screen name="index" options={{ title: 'Today' }} />
        <Tabs.Screen name="goals" options={{ title: 'Goals' }} />
        <Tabs.Screen name="habits" options={{ title: 'Habits' }} />
        <Tabs.Screen name="journal" options={{ title: 'Journal' }} />
        <Tabs.Screen name="notes" options={{ title: 'Notes' }} />
      </Tabs>
      <AchievementToast />
    </View>
  )
}
