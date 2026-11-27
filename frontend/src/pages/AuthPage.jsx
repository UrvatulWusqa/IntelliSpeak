import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import FormField, { Alert } from '../components/FormField';
import Logo from '../components/Logo';
import { EMAIL_RE } from '../lib/constants';

const MIN_PASSWORD = 8;

function validate(mode, values) {
  const errors = {};
  if (mode === 'register' && !values.fullName.trim()) errors.fullName = 'Full name is required.';
  if (!values.email.trim()) errors.email = 'Email is required.';
  else if (!EMAIL_RE.test(values.email.trim())) errors.email = 'Enter a valid email address.';
  if (!values.password) errors.password = 'Password is required.';
  else if (mode === 'register' && values.password.length < MIN_PASSWORD)
    errors.password = `Use at least ${MIN_PASSWORD} characters.`;
  if (mode === 'register' && values.confirm !== values.password) errors.confirm = 'Passwords do not match.';
  return errors;
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

export default function AuthPage({ mode }) {
  const isRegister = mode === 'register';
  const { signIn, signUp, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [values, setValues] = useState({ fullName: '', email: '', password: '', confirm: '', remember: true });
  const [touched, setTouched] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState('');

  const errors = validate(mode, values);
  const fieldError = (name) => (touched[name] ? errors[name] : undefined);
  const set = (name) => (e) =>
    setValues((v) => ({ ...v, [name]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const blur = (name) => () => setTouched((t) => ({ ...t, [name]: true }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setTouched({ fullName: true, email: true, password: true, confirm: true });
    setFormError('');
    if (Object.keys(errors).length) return;

    setSubmitting(true);
    const email = values.email.trim();
    if (isRegister) {
      const { data, error } = await signUp({ email, password: values.password, fullName: values.fullName.trim() });
      setSubmitting(false);
      if (error) return setFormError(error.message);
      if (!data.session) {
        setNotice(`We sent a confirmation link to ${email}. Open it to activate your account, then sign in.`);
        return;
      }
      navigate('/dashboard', { replace: true });
    } else {
      const { error } = await signIn({ email, password: values.password, remember: values.remember });
      setSubmitting(false);
      if (error) {
        // FR1.7: never reveal whether the email or the password was wrong.
        const msg = /confirm/i.test(error.message)
          ? 'Please confirm your email address before signing in.'
          : /rate|too many/i.test(error.message)
            ? 'Too many attempts. Please wait a few minutes and try again.'
            : 'The email or password is incorrect.';
        return setFormError(msg);
      }
      navigate(location.state?.from || '/dashboard', { replace: true });
    }
  };

  const onGoogle = async () => {
    setFormError('');
    const { error } = await signInWithGoogle();
    if (error) setFormError('Google sign-in is not available right now. Please use email and password.');
  };

  return (
    <div className="auth-page">
      <section className="auth-hero" aria-hidden="true">
        <Logo />
        <h2>Practise smarter. Present with confidence.</h2>
        <p>Real-time AI coaching on your voice, body language, facial engagement and content.</p>
        <ul>
          <li>✓ Live feedback while you rehearse</li>
          <li>✓ Detailed reports after every session</li>
          <li>✓ Track your progress over time</li>
        </ul>
      </section>

      <section className="auth-card">
        <h1>{isRegister ? 'Create your account' : 'Welcome back'}</h1>
        <p className="muted">
          {isRegister ? 'Start practising with your AI presentation coach.' : 'Sign in to continue to IntelliSpeak.'}
        </p>

        {notice ? (
          <Alert kind="success">
            {notice} <Link to="/login">Go to sign in</Link>
          </Alert>
        ) : (
          <>
            {formError && <Alert kind="error">{formError}</Alert>}

            <form onSubmit={onSubmit} noValidate>
              {isRegister && (
                <FormField id="fullName" label="Full name" error={fieldError('fullName')}>
                  <input
                    id="fullName"
                    autoComplete="name"
                    value={values.fullName}
                    onChange={set('fullName')}
                    onBlur={blur('fullName')}
                    aria-invalid={Boolean(fieldError('fullName'))}
                  />
                </FormField>
              )}

              <FormField id="email" label="Email address" error={fieldError('email')}>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={values.email}
                  onChange={set('email')}
                  onBlur={blur('email')}
                  aria-invalid={Boolean(fieldError('email'))}
                />
              </FormField>

              <FormField
                id="password"
                label="Password"
                error={fieldError('password')}
                hint={isRegister ? `At least ${MIN_PASSWORD} characters.` : undefined}
              >
                <div className="input-with-button">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete={isRegister ? 'new-password' : 'current-password'}
                    value={values.password}
                    onChange={set('password')}
                    onBlur={blur('password')}
                    aria-invalid={Boolean(fieldError('password'))}
                  />
                  <button
                    type="button"
                    className="input-button"
                    onClick={() => setShowPassword((s) => !s)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showPassword}
                  >
                    {showPassword ? '🙈' : '👁'}
                  </button>
                </div>
              </FormField>

              {isRegister && (
                <FormField id="confirm" label="Confirm password" error={fieldError('confirm')}>
                  <input
                    id="confirm"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={values.confirm}
                    onChange={set('confirm')}
                    onBlur={blur('confirm')}
                    aria-invalid={Boolean(fieldError('confirm'))}
                  />
                </FormField>
              )}

              {!isRegister && (
                <div className="row-between">
                  <label className="checkbox">
                    <input type="checkbox" checked={values.remember} onChange={set('remember')} /> Remember me
                  </label>
                  <Link to="/forgot-password">Forgot password?</Link>
                </div>
              )}

              <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
                {submitting ? 'Please wait…' : isRegister ? 'Create account' : 'Sign in'}
              </button>
            </form>

            <div className="divider"><span>or</span></div>

            <button type="button" className="btn btn-outline btn-block" onClick={onGoogle}>
              <GoogleIcon /> Continue with Google
            </button>

            <p className="auth-switch">
              {isRegister ? (
                <>Already have an account? <Link to="/login">Sign in</Link></>
              ) : (
                <>New to IntelliSpeak? <Link to="/register">Sign up</Link></>
              )}
            </p>
          </>
        )}
      </section>
    </div>
  );
}
