import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Alert } from '../components/FormField';

const QUICK_ACTIONS = [
  { title: 'Upload Recording', text: 'Get a full analysis of a recorded presentation.', icon: '⇪', to: '/upload' },
  { title: 'Record a Presentation', text: 'Rehearse live with real-time coaching cues.', icon: '●', to: '/practice' },
  { title: 'AI Practice', text: 'Generate a script or outline and practise it.', icon: '✦', to: '/practice' },
];

const SKILLS = ['Speech & vocal delivery', 'Body language & movement', 'Facial & visual attention', 'Content relevance'];

const STATUS_LABEL = {
  pending: 'Pending', recording: 'Recording', processing: 'Processing',
  partial_results: 'Partial results', report_ready: 'Report ready', failed: 'Failed',
};
const TYPE_LABEL = { ai_practice: 'AI Practice', recording: 'Recording', upload: 'Upload' };

export default function DashboardPage() {
  const { profile, user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [error, setError] = useState('');
  const firstName = (profile?.full_name || '').trim().split(/\s+/)[0] || user?.email?.split('@')[0];

  useEffect(() => {
    supabase
      .from('sessions')
      .select('id, title, session_type, status, overall_score, created_at')
      .order('created_at', { ascending: false })
      .limit(5)
      .then(({ data, error: err }) => {
        if (err) setError('Could not load your recent sessions. Please refresh to try again.');
        else setSessions(data);
      });
  }, []);

  return (
    <div className="dashboard">
      <div className="page-heading">
        <div>
          <h1>Welcome back, {firstName} 👋</h1>
          <p className="muted">Here is an overview of your presentation practice.</p>
        </div>
        <label className="period-filter">
          <span className="sr-only">Period</span>
          <select defaultValue="30" disabled title="Available once you have sessions">
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
        </label>
      </div>

      <section className="grid-3" aria-label="Quick actions">
        {QUICK_ACTIONS.map((a) => (
          <Link key={a.title} to={a.to} className="card quick-action">
            <span className="quick-icon" aria-hidden="true">{a.icon}</span>
            <strong>{a.title}</strong>
            <span className="muted">{a.text}</span>
          </Link>
        ))}
      </section>

      <section className="grid-3" aria-label="Progress summary">
        {[
          ['Total sessions', '0'],
          ['Average score', '–'],
          ['Practice time', '0 min'],
        ].map(([label, value]) => (
          <div className="card stat" key={label}>
            <span className="muted">{label}</span>
            <strong className="stat-value">{value}</strong>
          </div>
        ))}
      </section>

      <div className="grid-2">
        <section className="card" aria-labelledby="skills-heading">
          <h2 id="skills-heading">Skill breakdown</h2>
          <ul className="skill-list">
            {SKILLS.map((s) => (
              <li key={s}>
                <span>{s}</span>
                <span className="muted">– / 100</span>
              </li>
            ))}
          </ul>
          <p className="muted small">Scores appear after your first completed analysis.</p>
        </section>

        <section className="card" aria-labelledby="insight-heading">
          <h2 id="insight-heading">Coaching insight</h2>
          <p className="muted">
            Complete a practice session and your coach will compare it with earlier ones here.
          </p>
        </section>
      </div>

      <section className="card" aria-labelledby="recent-heading">
        <div className="row-between">
          <h2 id="recent-heading">Recent sessions</h2>
          <Link to="/history">View all</Link>
        </div>
        {error && <Alert kind="error">{error}</Alert>}
        {!error && sessions.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon" aria-hidden="true">🎤</div>
            <p><strong>No sessions yet</strong></p>
            <p className="muted">Your practice sessions and reports will show up here.</p>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr><th>Name</th><th>Type</th><th>Date</th><th>Status</th><th>Score</th></tr>
            </thead>
            <tbody>
              {sessions.map((s) => (
                <tr key={s.id}>
                  <td>{s.title}</td>
                  <td>{TYPE_LABEL[s.session_type]}</td>
                  <td>{new Date(s.created_at).toLocaleDateString()}</td>
                  <td>{STATUS_LABEL[s.status]}</td>
                  <td>{s.status === 'report_ready' && s.overall_score != null ? Math.round(s.overall_score) : '–'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
