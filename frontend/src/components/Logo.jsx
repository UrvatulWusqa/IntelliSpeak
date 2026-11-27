export default function Logo({ compact = false }) {
  return (
    <div className="logo">
      <img src="/favicon.svg" alt="" width="32" height="32" />
      {!compact && <span>IntelliSpeak</span>}
    </div>
  );
}
