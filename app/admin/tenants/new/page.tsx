import AdminShell from '@/components/admin/AdminShell';
import SectionCard from '@/components/admin/SectionCard';
import NewTenantForm from './NewTenantForm';

export const dynamic = 'force-dynamic';

export default function AdminNewTenantPage() {
  return (
    <AdminShell title="Add Dealer" subtitle="Provision a new dealership tenant">
      <SectionCard title="New dealer">
        <NewTenantForm />
      </SectionCard>
    </AdminShell>
  );
}