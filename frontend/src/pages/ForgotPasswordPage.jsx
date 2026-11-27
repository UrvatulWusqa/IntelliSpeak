import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import FormField, { Alert } from '../components/FormField';
import Logo from '../components/Logo';
import { EMAIL_RE } from '../lib/constants';

export default function ForgotPasswordPage() {
  const { sendPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [touched, setTouched] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fieldError = !email.trim() ? 'Email is required.' : !EMAIL_RE.test(email.trim()) ? 'Enter a valid email address.' : '';

  const onSubmit = async (e) => {
    e.preventDefault();
    setTouched(true);
    if (fieldError) return;
    setSubmitting(true);
    const { error: err } = await sendPasswordReset(email.trim());
    setSubmitting(false);
    // Show the same message either way so we don't reveal which emails exist.
    if (err && /rate|too many/i.test(err.message)) return setError('Too many requests. Please try again later.');
    setSent(true);
  };

  return (
    <div className="center-page">
      <section className="auth-card narrow">
        <Logo />
        <h1>Reset your password</h1>
        {sent ? (
          <Alert kind="success">
            If an account exists for {email.trim()}, a reset link is on its way. The link can be used once.
          </Alert>
        ) : (
          <form onSubmit={onSubmit} noValidate>
            <p className="muted">Enter your registered email and we will send you a reset link.</p>
            {error && <Alert kind="error">{error}</Alert>}
            <FormField id="email" label="Email address" error={touched ? fieldError : undefined}>
              <input id="email" type="email" autoComplete="email" value={email}
                onChange={(e) => setEmail(e.target.value)} onBlur={() => setTouched(true)} />
            </FormField>
            <button className="btn btn-primary btn-block" disabled={submitting}>
              {submitting ? 'Sending…' : 'Send reset link'}
            </button>
          </form>
        )}
        <p className="auth-switch"><Link to="/login">Back to sign in</Link></p>
      </section>
    </div>
  );
}
