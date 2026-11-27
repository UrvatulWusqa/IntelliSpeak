import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { NAV_ITEMS, initials } from '../lib/constants';
import Logo from './Logo';
import CooldownIndicator, { useCooldown } from './CooldownIndicator';

function Sidebar({ profile, user }) {
  return (
    <aside className="sidebar" aria-label="Main navigation">
      <Logo />
      <nav>
        <ul>
          {NAV_ITEMS.map((item) => (
            <li key={item.to}>
              <NavLink to={item.to} className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
                <span className="nav-icon" aria-hidden="true">{item.icon}</span>
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <div className="sidebar-user">
        <div className="avatar" aria-hidden="true">{initials(profile?.full_name, user?.email)}</div>
        <div className="sidebar-user-text">
          <strong>{profile?.full_name || 'Your account'}</strong>
          <span>{user?.email}</span>
        </div>
      </div>
    </aside>
  );
}

function AccountMenu({ profile, user, onSignOut }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const close = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  return (
    <div className="account-menu" ref={ref}>
      <button
        type="button"
        className="avatar avatar-button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account options"
        onClick={() => setOpen((o) => !o)}
      >
        {initials(profile?.full_name, user?.email)}
      </button>
      {open && (
        <div className="menu" role="menu">
          <div className="menu-header">
            <strong>{profile?.full_name || 'Your account'}</strong>
            <span>{user?.email}</span>
          </div>
          <button type="button" role="menuitem" onClick={() => { setOpen(false); navigate('/profile'); }}>
            Profile and settings
          </button>
          <button type="button" role="menuitem" onClick={onSignOut}>Sign out</button>
        </div>
      )}
    </div>
  );
}

function Header({ title, profile, user, onSignOut }) {
  const cooldown = useCooldown(profile?.cooldown_until);
  return (
    <header className="topbar">
      <nav aria-label="Breadcrumb" className="breadcrumb">
        <span>Home</span> <span aria-hidden="true">/</span> <strong>{title}</strong>
      </nav>
      <div className="topbar-actions">
        {cooldown.active && <CooldownIndicator remaining={cooldown.remaining} />}
        <button
          type="button"
          className="btn btn-primary"
          disabled={cooldown.active}
          title={cooldown.active ? 'Available when the cooldown ends' : 'Recording arrives in a later phase'}
        >
          <span aria-hidden="true">●</span> Start Recording
        </button>
        <button type="button" className="icon-button" aria-label="Notifications, 0 unread">
          <span aria-hidden="true">🔔</span>
        </button>
        <AccountMenu profile={profile} user={user} onSignOut={onSignOut} />
      </div>
    </header>
  );
}

export default function AppLayout() {
  const { profile, user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const current = NAV_ITEMS.find((i) => location.pathname.startsWith(i.to));

  const handleSignOut = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  return (
    <div className="app-shell">
      <Sidebar profile={profile} user={user} />
      <div className="app-main">
        <Header title={current?.label ?? 'IntelliSpeak'} profile={profile} user={user} onSignOut={handleSignOut} />
        <main className="page" id="main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
