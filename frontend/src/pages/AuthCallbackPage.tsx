import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { exchangeCodeForTokens } from '@/api/auth'

export default function AuthCallbackPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { setTokens, setUser } = useAuthStore()
  const [error, setError] = useState<string | null>(null)
  const handled = useRef(false)

  useEffect(() => {
    // Guard against React StrictMode double-invoke
    if (handled.current) return
    handled.current = true

    const code = searchParams.get('code')
    const errorParam = searchParams.get('error')

    if (errorParam) {
      setError('Авторизацію скасовано або сталася помилка. Спробуйте ще раз.')
      return
    }

    if (!code) {
      setError('Код авторизації відсутній. Спробуйте ввійти знову.')
      return
    }

    exchangeCodeForTokens(code)
      .then((data) => {
        setTokens(data.access_token, data.refresh_token)
        setUser(data.user)
        navigate('/', { replace: true })
      })
      .catch(() => {
        setError('Помилка авторизації. Перевірте з\'єднання та спробуйте ще раз.')
      })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 max-w-sm w-full text-center">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                stroke="#EF4444"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h2 className="text-h3 text-slate-900 mb-2">Помилка входу</h2>
          <p className="text-caption text-slate-500 mb-6">{error}</p>
          <button
            onClick={() => navigate('/login', { replace: true })}
            className="btn-primary w-full"
          >
            Повернутися до входу
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-slate-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 max-w-sm w-full text-center">
        <div className="w-12 h-12 rounded-full bg-brand-50 flex items-center justify-center mx-auto mb-4">
          <svg
            className="animate-spin text-brand-500"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        </div>
        <h2 className="text-h3 text-slate-900 mb-1">Авторизація…</h2>
        <p className="text-caption text-slate-500">Зачекайте, будь ласка</p>
      </div>
    </div>
  )
}
