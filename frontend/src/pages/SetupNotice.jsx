export default function SetupNotice() {
  return (
    <div className="center-page">
      <section className="auth-card narrow">
        <h1>Almost there</h1>
        <p>
          Supabase is not configured. Copy <code>.env.example</code> to <code>.env</code> in the repo root,
          fill in <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code>, then restart
          <code> npm run dev</code>.
        </p>
      </section>
    </div>
  );
}
