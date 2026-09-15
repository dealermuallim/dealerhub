type Props = { label: string; value: string | number; hint?: string };

export default function StatCard({ label, value, hint }: Props) {
  return (
    <div className="adm-stat">
      <span>{label}</span>
      <strong>{value}</strong>
      {hint ? <p className="adm-muted" style={{ margin: '0.4rem 0 0', fontSize: 13 }}>{hint}</p> : null}
    </div>
  );
}
