import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { buildGoogleOAuthUrl } from '@/api/auth'

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  )
}

export default function LoginPage() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuthStore()

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true })
    }
  }, [isAuthenticated, navigate])

  function handleGoogleSignIn() {
    const url = buildGoogleOAuthUrl()
    window.location.href = url
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-slate-100 flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-brand-100 opacity-40 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-slate-200 opacity-60 blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-white shadow-md flex items-center justify-center mb-4 border border-slate-100">
            <svg width="36" height="36" viewBox="0 0 32 32" fill="none">
              <path
                d="M16 2C9.37 2 4 7.37 4 14c0 9.5 12 18 12 18s12-8.5 12-18C28 7.37 22.63 2 16 2z"
                fill="#EF4444"
              />
              <circle cx="16" cy="14" r="5" fill="white" />
            </svg>
          </div>
          <h1 className="text-h1 text-slate-900 tracking-tight">Geo-Alert</h1>
          <p className="text-caption text-slate-500 mt-1">Геозмітки та сповіщення на карті</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
          <div className="text-center mb-6">
            <h2 className="text-h3 text-slate-900 mb-1">Ласкаво просимо</h2>
            <p className="text-caption text-slate-500">
              Увійдіть, щоб створювати карти та позначки
            </p>
          </div>

          <button
            onClick={handleGoogleSignIn}
            className="w-full flex items-center justify-center gap-3 px-5 py-3 bg-white border border-slate-300 rounded-lg text-[15px] font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-400 active:bg-slate-100 transition-all shadow-xs"
          >
            <GoogleIcon />
            Увійти через Google
          </button>

          <p className="text-center text-caption text-slate-400 mt-6">
            Продовжуючи, ви погоджуєтесь з{' '}
            <span className="text-brand-500 hover:text-brand-600 cursor-pointer transition-colors">
              умовами використання
            </span>
          </p>
        </div>

        <p className="text-center text-caption text-slate-400 mt-6">
          © 2026 Geo-Alert. Всі права захищено.
        </p>
      </div>
    </div>
  )
}
