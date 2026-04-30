import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function Auth() {
  const [loading, setLoading] = useState(false)
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

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4">
      <div className="glass-panel w-full max-w-[420px] text-center animate-[slideUp_0.4s_cubic-bezier(0.16,1,0.3,1)]">
        <h1 className="text-3xl font-bold mb-2 font-heading text-text-primary tracking-tight">MinTrack Cloud Sync</h1>
        <p className="text-sm text-text-secondary mb-8">Sign in via magic link with your email below.</p>
        
        <form onSubmit={handleLogin} className="flex flex-col gap-4 text-left">
          <div>
            <label htmlFor="email-input" className="block text-sm text-text-secondary mb-2">Email Address</label>
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
            className={`primary-btn w-full mt-4 flex justify-center items-center h-[52px] ${loading ? 'opacity-70 cursor-not-allowed hover:translate-y-0' : ''}`} 
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center gap-2">
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
          <div className={`mt-6 p-4 rounded-lg text-sm font-medium ${status.type === 'error' ? 'bg-[rgba(239,68,68,0.1)] text-brand-danger border border-[rgba(239,68,68,0.2)]' : 'bg-[rgba(16,185,129,0.1)] text-brand-success border border-[rgba(16,185,129,0.2)]'}`}>
            {status.message}
          </div>
        )}
      </div>
    </div>
  )
}
