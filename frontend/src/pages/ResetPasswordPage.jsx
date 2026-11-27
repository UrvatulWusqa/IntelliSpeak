import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import FormField, { Alert } from '../components/FormField';
import Logo from '../components/Logo';

export default function ResetPasswordPage() {
  const { session, loading, updatePassword, setRecoveryMode } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [touched, setTouched] = useState({});
  const [error, setError] = useState('');

  const errors = {
    password: password.length < 8 ? 'Use at least 8 characters.' : '',
    confirm: confirm !== password ? 'Passwords do not match.' : '',
  };

  if (loading) return null;

  if (!session) {
    return (
      <div className="center-page">
        <section className="auth-card narrow">
          <Logo />
          <Alert kind="warning">This reset link is invalid or has expired. Please request a new one.</Alert>
          <p className="auth-switch"><Link to="/forgot-password">Request a new link</Link></p>
        </section>
      </div>
    );
  }

  const onSubmit = async (e) => {
    e.preventDefault();
    setTouched({ password: true, confirm: true });
    if (errors.password || errors.confirm) return;
    const { error: err } = await updatePassword(password);
    if (err) return setError(err.message);
    setRecoveryMode(false);
    toast('Password updated.');
    navigate('/dashboard', { replace: true });
  };

  return (
    <div className="center-page">
      <section className="auth-card narrow">
        <Logo />
        <h1>Choose a new password</h1>
        {error && <Alert kind="error">{error}</Alert>}
        <form onSubmit={onSubmit} noValidate>
          <FormField id="password" label="New password" error={touched.password ? errors.password : undefined}>
            <input id="password" type="password" autoComplete="new-password" value={password}
              onChange={(e) => setPassword(e.target.value)} onBlur={() => setTouched((t) => ({ ...t, password: true }))} />
          </FormField>
          <FormField id="confirm" label="Confirm new password" error={touched.confirm ? errors.confirm : undefined}>
            <input id="confirm" type="password" autoComplete="new-password" value={confirm}
              onChange={(e) => setConfirm(e.target.value)} onBlur={() => setTouched((t) => ({ ...t, confirm: true }))} />
          </FormField>
          <button className="btn btn-primary btn-block">Update password</button>
        </form>
      </section>
    </div>
  );
}
