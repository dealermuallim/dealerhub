type Props = {
  kind: 'AVAILABLE' | 'SOLD' | 'ARCHIVED' | 'FEATURED' | 'ACTIVE' | 'INACTIVE';
};

const MAP = {
  AVAILABLE: ['adm-badge-ok', 'Available'],
  SOLD: ['adm-badge-sold', 'Sold'],
  ARCHIVED: ['adm-badge-arch', 'Archived'],
  FEATURED: ['adm-badge-feat', 'Featured'],
  ACTIVE: ['adm-badge-ok', 'Active'],
  INACTIVE: ['adm-badge-off', 'Inactive'],
} as const;

export default function StatusBadge({ kind }: Props) {
  const [cls, label] = MAP[kind];
  return <span className={`adm-badge ${cls}`}>{label}</span>;
}
