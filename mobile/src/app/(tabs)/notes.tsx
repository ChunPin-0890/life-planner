import { router } from 'expo-router'
import { orderBy, query } from 'firebase/firestore'
import { useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { Chip } from '@/components/ui'
import { userCollection } from '@/lib/firestore'
import { useLiveCollection } from '@/lib/hooks'
import { createNote, notePreview } from '@/lib/notes'
import { colors } from '@/lib/theme'
import type { Note } from '@/lib/types'

function NoteRow({ note }: { note: Note }) {
  return (
    <Pressable style={[styles.note, note.pinned && styles.notePinned]} onPress={() => router.push(`/note/${note.id}`)}>
      <Text style={styles.noteTitle}>
        {note.pinned ? '★ ' : ''}
        {note.title || 'Untitled'}
      </Text>
      <Text style={styles.preview} numberOfLines={1}>
        {notePreview(note.body)}
      </Text>
    </Pressable>
  )
}

export default function NotesScreen() {
  const [search, setSearch] = useState('')
  const [folder, setFolder] = useState('all')
  const notes = useLiveCollection(() => query(userCollection('notes'), orderBy('updatedAt', 'desc')), [])
  const folders = [...new Set(notes.map((n) => n.folder).filter(Boolean))]

  const q = search.trim().toLowerCase()
  const filtered = notes.filter(
    (n) =>
      (folder === 'all' || n.folder === folder) &&
      (!q || n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q)),
  )
  const pinned = filtered.filter((n) => n.pinned)
  const rest = filtered.filter((n) => !n.pinned)

  async function newNote() {
    const id = await createNote(folder === 'all' ? '' : folder)
    router.push(`/note/${id}`)
  }

  return (
    <View style={styles.screen}>
      <View style={styles.top}>
        <TextInput
          style={styles.search}
          value={search}
          onChangeText={setSearch}
          placeholder="Search notes…"
          placeholderTextColor={colors.muted}
        />
        <Pressable style={styles.add} onPress={newNote}>
          <Text style={styles.addText}>+</Text>
        </Pressable>
      </View>

      {folders.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} style={{ flexGrow: 0 }}>
          <Chip label="All" selected={folder === 'all'} onPress={() => setFolder('all')} />
          {folders.map((f) => (
            <Chip key={f} label={f} selected={folder === f} onPress={() => setFolder(f)} />
          ))}
        </ScrollView>
      )}

      <ScrollView contentContainerStyle={{ gap: 8, paddingBottom: 24 }}>
        {filtered.length === 0 && (
          <Text style={styles.empty}>{q ? 'No notes match your search.' : 'No notes yet — tap + to capture your first one.'}</Text>
        )}
        {pinned.length > 0 && <Text style={styles.section}>PINNED</Text>}
        {pinned.map((n) => (
          <NoteRow key={n.id} note={n} />
        ))}
        {pinned.length > 0 && rest.length > 0 && <Text style={styles.section}>NOTES</Text>}
        {rest.map((n) => (
          <NoteRow key={n.id} note={n} />
        ))}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16, gap: 12, backgroundColor: colors.background },
  top: { flexDirection: 'row', gap: 8 },
  search: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    color: colors.text,
  },
  add: { width: 44, borderRadius: 10, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  addText: { color: '#fff', fontSize: 22 },
  section: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, color: colors.muted, marginTop: 4 },
  note: { padding: 14, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, gap: 2 },
  notePinned: { backgroundColor: colors.primarySoft },
  noteTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
  preview: { fontSize: 13, color: colors.muted },
  empty: { color: colors.muted, textAlign: 'center', marginTop: 32 },
})
