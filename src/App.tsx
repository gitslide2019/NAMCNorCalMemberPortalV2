import { useState, useEffect } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import LoginPage from './pages/Login'
import RegisterPage from './pages/Register'
import DashboardPage from './pages/Dashboard'
import MembersPage from './pages/Members'
import EventsPage from './pages/Events'
import ResourcesPage from './pages/Resources'
import MessagesPage from './pages/Messages'
import ProfilePage from './pages/Profile'

interface User {
  id: string
  firstName: string
  lastName: string
  email: string
  company?: string
  memberType: string
  memberSince: string
}

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    // Check if user is logged in
    const storedUser = localStorage.getItem('user')
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser))
      } catch (error) {
        console.error('Failed to parse user data:', error)
        localStorage.removeItem('user')
      }
    }
    setIsLoading(false)
  }, [])

  // Protected route component
  const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    if (isLoading) return <div>Loading...</div>
    if (!user) return <Navigate to="/login" replace />
    return <>{children}</>
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginPage setUser={setUser} />} />
      <Route path="/register" element={<RegisterPage setUser={setUser} />} />
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <DashboardPage user={user} />
        </ProtectedRoute>
      } />
      <Route path="/members" element={
        <ProtectedRoute>
          <MembersPage />
        </ProtectedRoute>
      } />
      <Route path="/events" element={
        <ProtectedRoute>
          <EventsPage />
        </ProtectedRoute>
      } />
      <Route path="/resources" element={
        <ProtectedRoute>
          <ResourcesPage />
        </ProtectedRoute>
      } />
      <Route path="/messages" element={
        <ProtectedRoute>
          <MessagesPage />
        </ProtectedRoute>
      } />
      <Route path="/profile" element={
        <ProtectedRoute>
          <ProfilePage user={user} setUser={setUser} />
        </ProtectedRoute>
      } />
      <Route path="/" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

export default App