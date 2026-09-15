import AdminShell from '@/components/admin/AdminShell';
import SectionCard from '@/components/admin/SectionCard';
import AdminButton from '@/components/admin/AdminButton';
import TenantsTable from './TenantsTable';

export const dynamic = 'force-dynamic';

export default function AdminTenantsPage() {
  return (
    <AdminShell title="Tenants" subtitle="Live dealership list from Oracle">
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap' }}>
        <AdminButton href="/admin/tenants/new">Add Dealer</AdminButton>
      </div>

      <SectionCard title="Dealerships">
        <TenantsTable />
      </SectionCard>
    </AdminShell>
  );
}