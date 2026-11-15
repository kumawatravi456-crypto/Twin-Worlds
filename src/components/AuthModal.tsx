import { useEffect, useState, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  Orbit,
  User,
  X
} from 'lucide-react';
import { formatAuthError, useAuth } from '../contexts/AuthContext';
import { FIREBASE_LIMITS } from '../lib/firebase';

export type AuthModalMode = 'login' | 'signup' | 'forgot';

interface AuthModalProps {
  open: boolean;
  initialMode: AuthModalMode;
  redirectReason?: string | null;
  onClose: () => void;
  onAuthSuccess: () => void;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function AuthModal({
  open,
  initialMode,
  redirectReason,
  onClose,
  onAuthSuccess
}: AuthModalProps) {
  const { signInWithEmail, signUpWithEmail, signInWithGoogle, resetPassword } = useAuth();
  const [mode, setMode] = useState<AuthModalMode>(initialMode);

  // Form fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Status
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [providerDisabledHint, setProviderDisabledHint] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setMode(initialMode);
      setErrorMsg(null);
      setSuccessMsg(null);
      setProviderDisabledHint(false);
    }
  }, [open, initialMode]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, submitting, onClose]);

  const switchMode = (nextMode: AuthModalMode) => {
    setMode(nextMode);
    setErrorMsg(null);
    setSuccessMsg(null);
    setProviderDisabledHint(false);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setProviderDisabledHint(false);

    const cleanEmail = email.trim();
    if (!cleanEmail || !EMAIL_RE.test(cleanEmail)) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    if (mode === 'forgot') {
      setSubmitting(true);
      try {
        await resetPassword(cleanEmail);
        setSuccessMsg(`Password reset link sent to ${cleanEmail}. Check your inbox.`);
      } catch (err) {
        const formatted = formatAuthError(err);
        setErrorMsg(formatted.message);
        setProviderDisabledHint(formatted.isProviderDisabled);
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    if (mode === 'signup') {
      const cleanFirst = firstName.trim();
      const cleanLast = lastName.trim();
      if (!cleanFirst || !cleanLast) {
        setErrorMsg('First Name and Last Name are required.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg('Passwords do not match.');
        return;
      }

      setSubmitting(true);
      try {
        await signUpWithEmail({
          firstName: cleanFirst,
          lastName: cleanLast,
          email: cleanEmail,
          password
        });
        setSuccessMsg('Account created. Launching Twin Worlds Explorer...');
        window.setTimeout(() => {
          onAuthSuccess();
        }, 550);
      } catch (err) {
        const formatted = formatAuthError(err);
        setErrorMsg(formatted.message);
        setProviderDisabledHint(formatted.isProviderDisabled);
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // Login mode
    setSubmitting(true);
    try {
      await signInWithEmail({
        email: cleanEmail,
        password,
        rememberMe
      });
      setSuccessMsg('Authenticated. Entering Mission Control...');
      window.setTimeout(() => {
        onAuthSuccess();
      }, 450);
    } catch (err) {
      const formatted = formatAuthError(err);
      setErrorMsg(formatted.message);
      setProviderDisabledHint(formatted.isProviderDisabled);
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setProviderDisabledHint(false);
    setSubmitting(true);
    try {
      await signInWithGoogle(rememberMe);
      setSuccessMsg('Signed in with Google. Launching Twin Worlds Explorer...');
      window.setTimeout(() => {
        onAuthSuccess();
      }, 400);
    } catch (err) {
      const formatted = formatAuthError(err);
      setErrorMsg(formatted.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#02050f]/80 backdrop-blur-md"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !submitting) onClose();
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="auth-modal-heading"
            className="glass-panel-deep w-full max-w-md rounded-3xl p-6 sm:p-7 relative overflow-hidden"
          >
            {/* Subtle glowing rim accent */}
            <div
              className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-40 rounded-full opacity-35 blur-3xl"
              style={{ background: 'radial-gradient(circle, #38bdf8 0%, #2563eb 55%, transparent 100%)' }}
              aria-hidden="true"
            />

            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              aria-label="Close authentication modal"
              className="absolute top-4 right-4 p-2 rounded-full text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header */}
            <div className="relative space-y-2 mb-5">
              <div className="inline-flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-sky-400/15 border border-sky-300/35 flex items-center justify-center">
                  <Orbit className="w-4 h-4 text-sky-300" />
                </span>
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-sky-300">
                  Twin Worlds Access
                </span>
              </div>
              <h2 id="auth-modal-heading" className="font-display text-2xl font-semibold tracking-tight text-white">
                {mode === 'login'
                  ? 'Welcome back, Explorer'
                  : mode === 'signup'
                    ? 'Create Researcher Account'
                    : 'Reset Your Password'}
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                {redirectReason
                  ? redirectReason
                  : mode === 'login'
                    ? 'Sign in to enter the Twin Worlds Mission Control, 3D Terrain Morphing, and Global Analog Explorer.'
                    : mode === 'signup'
                      ? 'Register to unlock full planetary target selection, live telemetry feeds, and saved analog comparisons.'
                      : 'Enter your registered email address and we will send a Firebase password reset link.'}
              </p>
            </div>

            {/* Mode Switch Tabs for Login / Sign Up */}
            {mode !== 'forgot' && (
              <div className="glass-segmented grid grid-cols-2 gap-1 rounded-full p-1 mb-5">
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className={`py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                    mode === 'login' ? 'glass-btn-active' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Login
                </button>
                <button
                  type="button"
                  onClick={() => switchMode('signup')}
                  className={`py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                    mode === 'signup' ? 'glass-btn-active' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Sign Up
                </button>
              </div>
            )}

            {/* Feedback Messages */}
            {errorMsg && (
              <div className="mb-4 rounded-2xl border border-rose-400/40 bg-rose-950/45 px-3.5 py-2.5 flex items-start gap-2.5 text-xs text-rose-100">
                <AlertCircle className="w-4 h-4 text-rose-300 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p>{errorMsg}</p>
                  {providerDisabledHint && (
                    <p className="text-[11px] text-amber-200">
                      Console path: Firebase Console &rarr; Authentication &rarr; Sign-in method &rarr; Enable Email/Password.
                    </p>
                  )}
                </div>
              </div>
            )}

            {successMsg && (
              <div className="mb-4 rounded-2xl border border-emerald-400/45 bg-emerald-950/45 px-3.5 py-2.5 flex items-start gap-2.5 text-xs text-emerald-100">
                <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0 mt-0.5" />
                <p>{successMsg}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              {mode === 'signup' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="auth-first-name" className="block text-[11px] font-medium text-slate-200 mb-1">
                      First Name
                    </label>
                    <div className="relative">
                      <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        id="auth-first-name"
                        type="text"
                        required
                        maxLength={FIREBASE_LIMITS.MAX_NAME_LENGTH}
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="Ada"
                        className="glass-input w-full rounded-xl pl-8.5 pr-3 py-2 text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="auth-last-name" className="block text-[11px] font-medium text-slate-200 mb-1">
                      Last Name
                    </label>
                    <div className="relative">
                      <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        id="auth-last-name"
                        type="text"
                        required
                        maxLength={FIREBASE_LIMITS.MAX_NAME_LENGTH}
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Lovelace"
                        className="glass-input w-full rounded-xl pl-8.5 pr-3 py-2 text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="auth-email" className="block text-[11px] font-medium text-slate-200 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="auth-email"
                    type="email"
                    required
                    maxLength={FIREBASE_LIMITS.MAX_EMAIL_LENGTH}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="researcher@mission.org"
                    autoComplete="email"
                    className="glass-input w-full rounded-xl pl-8.5 pr-3 py-2 text-xs"
                  />
                </div>
              </div>

              {mode !== 'forgot' && (
                <div>
                  <label htmlFor="auth-password" className="block text-[11px] font-medium text-slate-200 mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      id="auth-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                      className="glass-input w-full rounded-xl pl-8.5 pr-9 py-2 text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-100 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              )}

              {mode === 'signup' && (
                <div>
                  <label htmlFor="auth-confirm-password" className="block text-[11px] font-medium text-slate-200 mb-1">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      id="auth-confirm-password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      autoComplete="new-password"
                      className="glass-input w-full rounded-xl pl-8.5 pr-9 py-2 text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((v) => !v)}
                      aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-100 cursor-pointer"
                    >
                      {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              )}

              {mode === 'login' && (
                <div className="flex items-center justify-between gap-2 pt-0.5">
                  <label className="inline-flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded border-slate-600 bg-slate-900 text-sky-400 focus:ring-sky-400 cursor-pointer"
                    />
                    Remember me
                  </label>

                  <button
                    type="button"
                    onClick={() => switchMode('forgot')}
                    className="text-xs text-sky-300 hover:text-sky-200 underline-offset-4 hover:underline cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="glass-btn-primary w-full rounded-full py-2.5 px-4 text-xs font-semibold inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : mode === 'login' ? (
                  <>
                    <span>Sign In to Explorer</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                ) : mode === 'signup' ? (
                  <>
                    <span>Create Account &amp; Explore</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                ) : (
                  <span>Send Reset Email</span>
                )}
              </button>
            </form>

            {mode === 'forgot' ? (
              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="text-xs text-sky-300 hover:text-white cursor-pointer"
                >
                  &larr; Back to Login
                </button>
              </div>
            ) : (
              <>
                <div className="my-4 flex items-center gap-3">
                  <div className="h-px flex-1 bg-white/15" />
                  <span className="font-mono text-[10px] uppercase tracking-widest text-slate-400">or</span>
                  <div className="h-px flex-1 bg-white/15" />
                </div>

                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={submitting}
                  className="glass-btn w-full rounded-full py-2.5 px-4 text-xs font-medium inline-flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-60"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.88-3.05c-.98.66-2.23 1.06-3.4 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </button>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
