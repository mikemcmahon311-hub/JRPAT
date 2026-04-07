import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import { YearProvider } from './lib/YearContext'

// Pages
import Dashboard from './pages/Dashboard'
import Leaderboard from './pages/Leaderboard'
import Roster from './pages/Roster'
import MemberDetail from './pages/MemberDetail'
import Trends from './pages/Trends'
import Login from './pages/Login'
import Admin from './pages/Admin'

export default function App() {
  return (
    <YearProvider>
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/roster" element={<Roster />} />
        <Route path="/member/:id" element={<MemberDetail />} />
        <Route path="/trends" element={<Trends />} />
        <Route path="/login" element={<Login />} />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <Admin />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Layout>
    </YearProvider>
  )
}
