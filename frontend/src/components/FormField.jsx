// UI-5.2: errors appear as text with an icon directly below the field.
export default function FormField({ id, label, error, hint, children }) {
  return (
    <div className={`field ${error ? 'field-invalid' : ''}`}>
      <label htmlFor={id}>{label}</label>
      {children}
      {error ? (
        <p className="field-error" id={`${id}-error`} role="alert">
          <span aria-hidden="true">⚠</span> {error}
        </p>
      ) : (
        hint && <p className="field-hint">{hint}</p>
      )}
    </div>
  );
}

export function Alert({ kind = 'error', children }) {
  const icon = { error: '⛔', warning: '⚠', info: 'ℹ', success: '✓' }[kind];
  return (
    <div className={`alert alert-${kind}`} role={kind === 'error' ? 'alert' : 'status'}>
      <span aria-hidden="true">{icon}</span>
      <div>{children}</div>
    </div>
  );
}
