import { useEffect, useRef } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import MapPage from '@/pages/MapPage'
import LoginPage from '@/pages/LoginPage'
import AuthCallbackPage from '@/pages/AuthCallbackPage'
import ProtectedRoute from '@/components/ProtectedRoute'
import UserProfilePage from '@/pages/UserProfilePage'
import BlockedSettingsPage from '@/pages/BlockedSettingsPage'
import FeedPage from '@/pages/FeedPage'
import SearchPage from '@/pages/SearchPage'
import MyCardsPage from '@/pages/MyCardsPage'
import CardPage from '@/pages/CardPage'
import { ToastContainer } from '@/components/Toast'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { useAuthStore } from '@/store/auth'
import { fetchMe } from '@/api/auth'

/**
 * On mount: if we have a stored token, verify it by calling GET /auth/me.
 * If the server rejects it (401) the axios interceptor will try refresh,
 * and if that fails too it will call logout() — clearing the store.
 */
function AuthInit() {
  const { isAuthenticated, setUser, logout } = useAuthStore()
  const checked = useRef(false)

  useEffect(() => {
    if (!isAuthenticated || checked.current) return
    checked.current = true

    fetchMe()
      .then((user) => setUser(user))
      .catch(() => logout())
  }, [isAuthenticated, setUser, logout])

  return null
}

function PushInit() {
  usePushNotifications()
  return null
}

export default function App() {
  return (
    <>
      <AuthInit />
      <PushInit />
      <ToastContainer />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />

        {/* Protected routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<MapPage />} />
          <Route path="/users/:id" element={<UserProfilePage />} />
          <Route path="/settings/blocked" element={<BlockedSettingsPage />} />
          <Route path="/feed" element={<FeedPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/my-cards" element={<MyCardsPage />} />
          <Route path="/cards/:id" element={<CardPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}
