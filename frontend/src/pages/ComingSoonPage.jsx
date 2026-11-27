export default function ComingSoonPage({ title, module }) {
  return (
    <div className="empty-state card">
      <div className="empty-icon" aria-hidden="true">🛠</div>
      <h1>{title}</h1>
      <p className="muted">This section is part of {module} and will be built in a later phase.</p>
    </div>
  );
}
