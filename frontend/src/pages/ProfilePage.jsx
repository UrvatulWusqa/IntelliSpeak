import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/Toast';
import FormField, { Alert } from '../components/FormField';
import { COOLDOWN_OPTIONS, EMAIL_RE, PRESENTATION_GOALS, SKILL_LEVELS, initials } from '../lib/constants';

const EDITABLE = [
  'full_name', 'role', 'institution', 'skill_level', 'presentation_goals',
  'concise_cues', 'practice_reminders', 'alert_pace', 'alert_filler_words', 'alert_pauses',
  'cooldown_minutes',
];

function toForm(profile, user) {
  const form = { email: user?.email ?? '' };
  EDITABLE.forEach((k) => { form[k] = profile?.[k] ?? ''; });
  form.presentation_goals = profile?.presentation_goals ?? [];
  form.role = profile?.role ?? '';
  form.institution = profile?.institution ?? '';
  form.cooldown_minutes = profile?.cooldown_minutes ?? 720;
  return form;
}

function Toggle({ id, label, description, checked, onChange }) {
  return (
    <div className="toggle-row">
      <div>
        <label htmlFor={id}><strong>{label}</strong></label>
        <p className="muted small">{description}</p>
      </div>
      <input id={id} type="checkbox" role="switch" className="switch" checked={checked}
        onChange={(e) => onChange(e.target.checked)} />
    </div>
  );
}

export default function ProfilePage() {
  const { profile, user, setProfile } = useAuth();
  const toast = useToast();
  const initial = useMemo(() => toForm(profile, user), [profile, user]);
  const [form, setForm] = useState(initial);
  const [touched, setTouched] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => setForm(initial), [initial]);

  const errors = {
    full_name: !form.full_name.trim() ? 'Full name is required.' : '',
    email: !EMAIL_RE.test(form.email.trim()) ? 'Enter a valid email address.' : '',
  };
  const dirty = JSON.stringify(form) !== JSON.stringify(initial);
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));
  const blur = (key) => () => setTouched((t) => ({ ...t, [key]: true }));
  const fieldError = (key) => (touched[key] ? errors[key] || undefined : undefined);

  const toggleGoal = (goal) =>
    setForm((f) => ({
      ...f,
      presentation_goals: f.presentation_goals.includes(goal)
        ? f.presentation_goals.filter((g) => g !== goal)
        : [...f.presentation_goals, goal],
    }));

  const onCancel = () => {
    setForm(initial);
    setTouched({});
    setError('');
  };

  const onSave = async (e) => {
    e.preventDefault();
    setTouched({ full_name: true, email: true });
    setError('');
    setNotice('');
    if (errors.full_name || errors.email) return;

    setSaving(true);
    const updates = Object.fromEntries(EDITABLE.map((k) => [k, form[k]]));
    updates.full_name = form.full_name.trim();
    updates.role = form.role.trim() || null;
    updates.institution = form.institution.trim() || null;
    updates.cooldown_minutes = Number(form.cooldown_minutes);

    const { data, error: err } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();

    if (err) {
      setSaving(false);
      return setError('Your changes could not be saved. Please try again.');
    }

    // Email changes go through Supabase Auth and need confirmation by email.
    const newEmail = form.email.trim();
    if (newEmail.toLowerCase() !== (user.email || '').toLowerCase()) {
      const { error: emailErr } = await supabase.auth.updateUser({ email: newEmail });
      if (emailErr) setError(`Profile saved, but the email could not be changed: ${emailErr.message}`);
      else setNotice(`Check ${newEmail} for a link to confirm your new email address.`);
    }

    setSaving(false);
    setProfile(data);
    toast('Changes saved.');
  };

  if (!profile) {
    return <Alert kind="error">Your profile could not be loaded. Please refresh the page.</Alert>;
  }

  return (
    <form className="profile" onSubmit={onSave} noValidate>
      <section className="card profile-summary">
        <div className="avatar avatar-lg" aria-hidden="true">{initials(profile.full_name, user.email)}</div>
        <div>
          <h1>{profile.full_name || 'Your profile'}</h1>
          <p className="muted">{profile.role || 'Add your role or field below'}</p>
        </div>
      </section>

      {error && <Alert kind="error">{error}</Alert>}
      {notice && <Alert kind="info">{notice}</Alert>}

      <section className="card" aria-labelledby="personal-heading">
        <h2 id="personal-heading">Personal information</h2>
        <div className="grid-2">
          <FormField id="full_name" label="Full name" error={fieldError('full_name')}>
            <input id="full_name" autoComplete="name" value={form.full_name}
              onChange={(e) => set('full_name')(e.target.value)} onBlur={blur('full_name')} />
          </FormField>
          <FormField id="email" label="Email address" error={fieldError('email')}
            hint="Changing it sends a confirmation link to the new address.">
            <input id="email" type="email" autoComplete="email" value={form.email}
              onChange={(e) => set('email')(e.target.value)} onBlur={blur('email')} />
          </FormField>
          <FormField id="role" label="Role or field">
            <input id="role" placeholder="e.g. BS Computer Science student" value={form.role}
              onChange={(e) => set('role')(e.target.value)} />
          </FormField>
          <FormField id="institution" label="Institution">
            <input id="institution" placeholder="e.g. COMSATS University Islamabad" value={form.institution}
              onChange={(e) => set('institution')(e.target.value)} />
          </FormField>
        </div>
      </section>

      <section className="card" aria-labelledby="skill-heading">
        <h2 id="skill-heading">Skill level</h2>
        <div className="segmented" role="radiogroup" aria-labelledby="skill-heading">
          {SKILL_LEVELS.map((s) => (
            <label key={s.value} className={form.skill_level === s.value ? 'selected' : ''}>
              <input type="radio" name="skill_level" value={s.value} checked={form.skill_level === s.value}
                onChange={() => set('skill_level')(s.value)} />
              {form.skill_level === s.value && <span aria-hidden="true">✓ </span>}
              {s.label}
            </label>
          ))}
        </div>
      </section>

      <section className="card" aria-labelledby="goals-heading">
        <h2 id="goals-heading">Presentation goals</h2>
        <p className="muted small">Choose the feedback categories you want to focus on. You can pick several.</p>
        <div className="chips">
          {PRESENTATION_GOALS.map((g) => {
            const on = form.presentation_goals.includes(g.value);
            return (
              <label key={g.value} className={`chip ${on ? 'selected' : ''}`}>
                <input type="checkbox" checked={on} onChange={() => toggleGoal(g.value)} />
                {on && <span aria-hidden="true">✓ </span>}
                {g.label}
              </label>
            );
          })}
        </div>
      </section>

      <section className="card" aria-labelledby="coaching-heading">
        <h2 id="coaching-heading">Coaching preferences</h2>
        <Toggle id="concise_cues" label="Concise coaching cues"
          description="Keep coaching to short, actionable recommendations."
          checked={form.concise_cues} onChange={set('concise_cues')} />
        <Toggle id="practice_reminders" label="Practice reminders"
          description="Show a gentle in-app reminder to practise when you come back."
          checked={form.practice_reminders} onChange={set('practice_reminders')} />

        <h3>Real-time alerts during rehearsal</h3>
        <Toggle id="alert_pace" label="Pace" description="Alert me when I speak too fast or too slow."
          checked={form.alert_pace} onChange={set('alert_pace')} />
        <Toggle id="alert_filler_words" label="Filler words" description="Alert me when I use filler words like “um”."
          checked={form.alert_filler_words} onChange={set('alert_filler_words')} />
        <Toggle id="alert_pauses" label="Pauses" description="Alert me about long or missing pauses."
          checked={form.alert_pauses} onChange={set('alert_pauses')} />
      </section>

      <section className="card" aria-labelledby="cooldown-heading">
        <h2 id="cooldown-heading">Post-session cooldown</h2>
        <p className="muted small">
          After each practice session, new sessions are locked for this long so you can review your feedback
          and do exercises. The change applies from your next session.
        </p>
        <FormField id="cooldown_minutes" label="Cooldown duration">
          <select id="cooldown_minutes" value={form.cooldown_minutes}
            onChange={(e) => set('cooldown_minutes')(Number(e.target.value))}>
            {COOLDOWN_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </FormField>
      </section>

      <div className="form-actions">
        <button type="button" className="btn btn-outline" onClick={onCancel} disabled={!dirty || saving}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={!dirty || saving}>
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </form>
  );
}
