import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader, AlertCircle } from 'lucide-react'
import { useAuth } from '../lib/AuthContext'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const { signIn } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const { error: signInError } = await signIn(email, password)
      if (signInError) {
        setError(signInError.message)
      } else {
        navigate('/admin')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
      <div className="w-full max-w-sm bg-surface border border-border rounded-lg p-6 md:p-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-ember mb-2">JRPAT Tracker</h1>
          <p className="text-muted text-sm">Cedar Hill Fire Department</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-fire bg-opacity-10 border border-fire rounded-lg flex items-start gap-3">
            <AlertCircle size={20} className="text-fire flex-shrink-0 mt-0.5" />
            <p className="text-fire text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-txt mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full bg-surface2 border border-border rounded-lg px-4 py-2 text-txt placeholder-muted focus:outline-none focus:border-ember transition-colors"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-semibold text-txt mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full bg-surface2 border border-border rounded-lg px-4 py-2 text-txt placeholder-muted focus:outline-none focus:border-ember transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-ember hover:bg-orange-600 disabled:bg-muted disabled:cursor-not-allowed text-bg font-semibold py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {loading && <Loader size={18} className="animate-spin" />}
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="text-xs text-muted text-center mt-6">
          Contact your department admin for credentials
        </p>
      </div>
    </div>
  )
}
