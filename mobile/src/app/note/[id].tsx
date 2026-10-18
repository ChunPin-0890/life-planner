import { router, Stack, useLocalSearchParams } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { userDoc } from '@/lib/firestore'
import { useLiveDoc } from '@/lib/hooks'
import {
  applyFormat,
  CHECKLIST_RE,
  deleteNote,
  sendLineToToday,
  toggleChecklistLine,
  updateNote,
  type FormatAction,
} from '@/lib/notes'
import { colors } from '@/lib/theme'
import type { Note } from '@/lib/types'

const TOOLBAR: { action: FormatAction; label: string }[] = [
  { action: 'bold', label: 'B' },
  { action: 'italic', label: 'I' },
  { action: 'bullet', label: '•' },
  { action: 'checklist', label: '☐' },
]

/** Renders **bold** and _italic_ spans inside a checklist item. */
function Formatted({ text, style }: { text: string; style: object }) {
  const parts = text.split(/(\*\*[^*]+\*\*|_[^_]+_)/g).filter(Boolean)
  return (
    <Text style={style}>
      {parts.map((p, i) =>
        p.startsWith('**') && p.endsWith('**') ? (
          <Text key={i} style={{ fontWeight: '700' }}>
            {p.slice(2, -2)}
          </Text>
        ) : p.startsWith('_') && p.endsWith('_') ? (
          <Text key={i} style={{ fontStyle: 'italic' }}>
            {p.slice(1, -1)}
          </Text>
        ) : (
          p
        ),
      )}
    </Text>
  )
}

function Editor({ note }: { note: Note }) {
  const [title, setTitle] = useState(note.title)
  const [folder, setFolder] = useState(note.folder)
  const [body, setBody] = useState(note.body)
  // Selection is tracked in a ref and only pushed back into the input right
  // after a toolbar action — a permanently controlled `selection` makes the
  // cursor jump while typing on Android.
  const selection = useRef({ start: 0, end: 0 })
  const [forcedSelection, setForcedSelection] = useState<{ start: number; end: number } | undefined>()
  const [sent, setSent] = useState<Set<number>>(new Set())

  // Batch keystrokes into one write ~0.5s after typing stops — a write per
  // keystroke would be slow on poor connections and costs Firestore writes.
  const pending = useRef<Partial<Note>>({})
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  function save(fields: Partial<Pick<Note, 'title' | 'body' | 'folder'>>) {
    pending.current = { ...pending.current, ...fields }
    clearTimeout(timer.current)
    timer.current = setTimeout(flush, 500)
  }
  function flush() {
    clearTimeout(timer.current)
    const fields = pending.current
    pending.current = {}
    if (Object.keys(fields).length) updateNote(note.id, fields)
  }
  // Flush on leaving the screen so the last edit isn't lost.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => flush, [])

  function format(action: FormatAction) {
    const { text, selection: next } = applyFormat(body, selection.current.start, selection.current.end, action)
    setBody(text)
    selection.current = next
    setForcedSelection(next)
    save({ body: text })
  }

  function toggleLine(i: number) {
    const next = toggleChecklistLine(body, i)
    setBody(next)
    save({ body: next })
  }

  function confirmDelete() {
    Alert.alert('Delete note?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          pending.current = {}
          clearTimeout(timer.current)
          await deleteNote(note.id)
          router.back()
        },
      },
    ])
  }

  const lines = body.split('\n')

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Stack.Screen
        options={{
          headerRight: () => (
            <View style={styles.headerActions}>
              <Pressable onPress={() => updateNote(note.id, { pinned: !note.pinned })} hitSlop={8}>
                <Text style={[styles.headerBtn, note.pinned && { color: colors.primary }]}>{note.pinned ? '★' : '☆'}</Text>
              </Pressable>
              <Pressable onPress={confirmDelete} hitSlop={8}>
                <Text style={[styles.headerBtn, { color: colors.danger, fontSize: 15 }]}>Delete</Text>
              </Pressable>
            </View>
          ),
        }}
      />

      <TextInput
        style={styles.title}
        value={title}
        onChangeText={(v) => {
          setTitle(v)
          save({ title: v })
        }}
        placeholder="Title"
        placeholderTextColor={colors.muted}
      />
      <TextInput
        style={styles.folder}
        value={folder}
        onChangeText={(v) => {
          setFolder(v)
          save({ folder: v })
        }}
        placeholder="Folder (optional)"
        placeholderTextColor={colors.muted}
      />

      <View style={styles.card}>
        <View style={styles.toolbar}>
          {TOOLBAR.map((t) => (
            <Pressable key={t.action} style={styles.toolBtn} onPress={() => format(t.action)}>
              <Text
                style={[
                  styles.toolText,
                  t.action === 'bold' && { fontWeight: '800' },
                  t.action === 'italic' && { fontStyle: 'italic' },
                ]}
              >
                {t.label}
              </Text>
            </Pressable>
          ))}
        </View>
        <TextInput
          style={styles.body}
          multiline
          value={body}
          selection={forcedSelection}
          onSelectionChange={(e) => {
            selection.current = e.nativeEvent.selection
            if (forcedSelection) setForcedSelection(undefined)
          }}
          onChangeText={(v) => {
            setBody(v)
            save({ body: v })
          }}
          placeholder="Write freely, or use the toolbar for bold, bullets and checklists…"
          placeholderTextColor={colors.muted}
        />
      </View>

      {lines.some((l) => CHECKLIST_RE.test(l)) && (
        <View style={[styles.card, { padding: 14, gap: 8 }]}>
          <Text style={styles.label}>Checklist</Text>
          {lines.map((line, i) => {
            const match = line.match(CHECKLIST_RE)
            if (!match) return null
            const checked = match[1].toLowerCase() === 'x'
            const text = match[2]
            return (
              <View key={i} style={styles.checkRow}>
                <Pressable onPress={() => toggleLine(i)} hitSlop={6} style={[styles.checkbox, checked && styles.checkboxOn]} />
                <Formatted text={text || 'Checklist item'} style={[styles.checkText, checked && styles.checked]} />
                {!checked && text && (
                  <Pressable
                    disabled={sent.has(i)}
                    onPress={() => sendLineToToday(text).then(() => setSent((s) => new Set(s).add(i)))}
                    style={styles.sendBtn}
                  >
                    <Text style={styles.sendText}>{sent.has(i) ? '✓ Sent' : '→ Today'}</Text>
                  </Pressable>
                )}
              </View>
            )
          })}
        </View>
      )}

      <Text style={styles.hint}>
        Start a line with [ ] to make a checklist item you can tick off or send to Today&apos;s to-do list.
      </Text>
    </ScrollView>
  )
}

export default function NoteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { data: note, loaded } = useLiveDoc(() => userDoc('notes', id), [id])

  if (!loaded) return <Text style={styles.status}>Loading…</Text>
  if (!note) return <Text style={styles.status}>This note no longer exists.</Text>
  // Keyed by id so local edit state resets if the route param changes.
  return <Editor key={note.id} note={note} />
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, gap: 12, paddingBottom: 60 },
  status: { padding: 16, color: colors.muted },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  headerBtn: { fontSize: 22, color: colors.muted },
  title: { fontSize: 22, fontWeight: '700', color: colors.text, padding: 0 },
  folder: {
    alignSelf: 'flex-start',
    minWidth: 140,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
    fontSize: 13,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  card: { borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  toolbar: { flexDirection: 'row', gap: 4, padding: 6, borderBottomWidth: 1, borderBottomColor: colors.border },
  toolBtn: { width: 38, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  toolText: { fontSize: 16, color: colors.text },
  body: { minHeight: 180, padding: 14, fontSize: 15, lineHeight: 22, color: colors.text, textAlignVertical: 'top' },
  label: { fontSize: 12, fontWeight: '600', color: colors.muted },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkbox: { width: 18, height: 18, borderRadius: 4, borderWidth: 1.5, borderColor: colors.border },
  checkboxOn: { backgroundColor: colors.good, borderColor: colors.good },
  checkText: { flex: 1, fontSize: 14, color: colors.text },
  checked: { color: colors.muted, textDecorationLine: 'line-through' },
  sendBtn: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: colors.primarySoft },
  sendText: { fontSize: 11, fontWeight: '700', color: colors.primary },
  hint: { fontSize: 12, color: colors.muted },
})
