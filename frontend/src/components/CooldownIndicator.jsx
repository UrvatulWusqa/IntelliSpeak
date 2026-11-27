import { useEffect, useState } from 'react';

// UI-12.1 / FR2.3: shows remaining cooldown as HH:MM. The end time comes from
// the server (profiles.cooldown_until) so it cannot be skipped client-side.
export function useCooldown(cooldownUntil) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!cooldownUntil) return undefined;
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, [cooldownUntil]);

  const end = cooldownUntil ? new Date(cooldownUntil).getTime() : 0;
  const ms = Math.max(0, end - now);
  return { active: ms > 0, remaining: ms };
}

export function formatHHMM(ms) {
  const totalMinutes = Math.ceil(ms / 60_000);
  const h = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
  const m = String(totalMinutes % 60).padStart(2, '0');
  return `${h}:${m}`;
}

export default function CooldownIndicator({ remaining }) {
  return (
    <div className="cooldown" role="timer" aria-label={`Cooldown, ${formatHHMM(remaining)} remaining`}>
      <span aria-hidden="true">⏳</span> Cooldown {formatHHMM(remaining)} remaining
    </div>
  );
}
