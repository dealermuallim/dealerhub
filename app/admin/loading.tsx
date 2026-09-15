import AdminShell from '@/components/admin/AdminShell';
import { BusyIndicator } from '@/components/admin/OperationStatus';

export default function AdminLoading() {
  return <AdminShell title="DealerHub"><section className="adm-card"><BusyIndicator label="Getting your dealership ready…" /></section></AdminShell>;
}
