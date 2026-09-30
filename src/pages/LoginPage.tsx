import { useState } from 'react';
import { Mail, ArrowRight, Sparkles, Clock, Send, Search } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { Logo } from '@/components/Logo';

export function LoginPage() {
  const { signIn, signUp } = useAuth();
  const { showToast } = useToast();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);

    const result =
      mode === 'signin'
        ? await signIn(email, password)
        : await signUp(email, password, fullName);

    setLoading(false);

    if (result.error) {
      showToast(result.error, 'error');
    } else if (mode === 'signup') {
      showToast('Account created! You are now signed in.', 'success');
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-blue-300 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 flex flex-col justify-between p-12 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 backdrop-blur rounded-xl">
              <Mail className="w-8 h-8 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-2xl font-bold tracking-tight">
              ReachInbox
            </span>
          </div>

          <div className="max-w-md">
            <h1 className="text-4xl font-bold leading-tight mb-4">
              Email outreach, scheduled intelligently.
            </h1>
            <p className="text-blue-100 text-lg leading-relaxed">
              Schedule thousands of personalized emails with rate limiting,
              per-email delays, and real-time delivery tracking.
            </p>

            <div className="mt-10 space-y-5">
              {[
                {
                  icon: Clock,
                  title: 'Smart Scheduling',
                  desc: 'BullMQ-style delayed jobs with per-email delays',
                },
                {
                  icon: Send,
                  title: 'Multi-Sender Support',
                  desc: 'Per-sender rate limiting and Ethereal SMTP',
                },
                {
                  icon: Search,
                  title: 'Full-Text Search',
                  desc: 'Search across all sent and scheduled emails',
                },
              ].map((f) => (
                <div key={f.title} className="flex items-start gap-4">
                  <div className="p-2 bg-white/10 backdrop-blur rounded-lg flex-shrink-0">
                    <f.icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-white">{f.title}</p>
                    <p className="text-blue-200 text-sm">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="text-blue-200 text-sm flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            Built for the ReachInbox hiring assignment
          </p>
        </div>
      </div>

      {/* Right panel — auth form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-gray-50">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-8 flex justify-center">
            <Logo size="lg" />
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900">
              {mode === 'signin' ? 'Welcome back' : 'Create your account'}
            </h2>
            <p className="text-gray-500 mt-1.5 text-sm">
              {mode === 'signin'
                ? 'Sign in to manage your email campaigns'
                : 'Start scheduling intelligent email outreach'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="label-text" htmlFor="name">
                  Full name
                </label>
                <input
                  id="name"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="input-field"
                  placeholder="John Doe"
                  required
                />
              </div>
            )}

            <div>
              <label className="label-text" htmlFor="email">
                Email address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="you@example.com"
                required
              />
            </div>

            <div>
              <label className="label-text" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full !py-3 mt-2"
            >
              {loading ? (
                <div className="animate-spin rounded-full border-2 border-white/30 border-t-white w-5 h-5" />
              ) : (
                <>
                  {mode === 'signin' ? 'Sign in' : 'Create account'}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() =>
                setMode(mode === 'signin' ? 'signup' : 'signin')
              }
              className="text-sm text-gray-600 hover:text-blue-600 transition-colors"
            >
              {mode === 'signin' ? (
                <>Don't have an account? <span className="font-semibold">Sign up</span></>
              ) : (
                <>Already have an account? <span className="font-semibold">Sign in</span></>
              )}
            </button>
          </div>

          <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-100">
            <p className="text-xs text-blue-700 leading-relaxed">
              <strong>Demo tip:</strong> Create an account with any email and
              password (6+ characters). No email confirmation required.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
