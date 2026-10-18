import { Routes, Route } from 'react-router-dom'
import Layout from './app/Layout'
import ProtectedRoute from './app/ProtectedRoute'
import TodayPage from './features/today/TodayPage'
import HabitsPage from './features/habits/HabitsPage'
import GoalsPage from './features/goals/GoalsPage'
import JournalPage from './features/journal/JournalPage'
import NotesPage from './features/notes/NotesPage'
import NoteEditor from './features/notes/NoteEditor'
import WeeklyReviewPage from './features/journal/WeeklyReviewPage'
import ProfilePage from './features/profile/ProfilePage'
import LoginPage from './features/auth/LoginPage'
import RegisterPage from './features/auth/RegisterPage'

export default function App() {
  return (
    <Routes>
      <Route path="login" element={<LoginPage />} />
      <Route path="register" element={<RegisterPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route index element={<TodayPage />} />
          <Route path="habits" element={<HabitsPage />} />
          <Route path="goals" element={<GoalsPage />} />
          <Route path="notes" element={<NotesPage />} />
          <Route path="notes/:id" element={<NoteEditor />} />
          <Route path="journal" element={<JournalPage />} />
          <Route path="journal/weekly-review" element={<WeeklyReviewPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>
      </Route>
    </Routes>
  )
}
