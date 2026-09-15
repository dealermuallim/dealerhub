type Props = {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
};

export default function SectionCard({ title, children, action }: Props) {
  return (
    <section className="adm-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
        <h2>{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
