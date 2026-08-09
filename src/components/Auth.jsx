import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function Auth() {
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState({ type: '', message: '' })

  const handleLogin = async (event) => {
    event.preventDefault()
    setLoading(true)
    setStatus({ type: '', message: '' })
    
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin,
      },
    })
    
    if (error) {
      setStatus({ type: 'error', message: error.error_description || error.message })
    } else {
      setStatus({ type: 'success', message: 'Check your email for the login link!' })
    }
    setLoading(false)
  }

  const handleGoogleLogin = async () => {
    setGoogleLoading(true)
    setStatus({ type: '', message: '' })
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    })
    if (error) {
      setStatus({ type: 'error', message: error.error_description || error.message })
      setGoogleLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-8">
      <div className="glass-panel w-full max-w-[420px] text-center animate-[slideUp_0.4s_cubic-bezier(0.16,1,0.3,1)]">
        <h1 className="text-3xl font-bold mb-3 font-heading text-text-primary tracking-tight">MinTrack Cloud Sync</h1>
        <p className="text-sm text-text-secondary mb-12">Tie your week together with a magic link — or use Google.</p>
        
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={googleLoading}
          className={`w-full flex items-center justify-center gap-3 px-8 py-3.5 rounded-full text-sm font-medium border border-text-primary/10 bg-text-primary/[0.03] hover:bg-text-primary/[0.07] transition-all text-text-primary/85 ${googleLoading ? 'opacity-60 cursor-not-allowed' : ''}`}
        >
          {googleLoading ? (
            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 48 48">
              <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
              <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
              <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
              <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
            </svg>
          )}
          {googleLoading ? 'Redirecting...' : 'Continue with Google'}
        </button>

        <div className="flex items-center gap-4 my-8">
          <div className="flex-1 h-px bg-text-primary/10"></div>
          <span className="text-[11px] uppercase tracking-widest text-text-secondary/40">or</span>
          <div className="flex-1 h-px bg-text-primary/10"></div>
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-6 text-left">
          <div>
            <label htmlFor="email-input" className="block text-sm text-text-secondary mb-3">Email Address</label>
            <input
              id="email-input"
              className="input-field"
              type="email"
              placeholder="you@university.edu"
              value={email}
              required={true}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          
          <button 
            className={`primary-btn w-full mt-6 flex justify-center items-center h-[56px] ${loading ? 'opacity-70 cursor-not-allowed hover:translate-y-0' : ''}`} 
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center gap-3">
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Sending...
              </span>
            ) : (
              <span>Send Magic Link</span>
            )}
          </button>
        </form>

        {status.message && (
          <div className={`mt-9 p-8 rounded-lg text-sm font-medium ${status.type === 'error' ? 'bg-[rgba(239,68,68,0.1)] text-brand-danger border border-[rgba(239,68,68,0.2)]' : 'bg-[rgba(16,185,129,0.1)] text-brand-success border border-[rgba(16,185,129,0.2)]'}`}>
            {status.message}
          </div>
        )}
      </div>
    </div>
  )
}