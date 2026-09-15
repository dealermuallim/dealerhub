import type { PublicTenant } from '@/lib/tenant';

import Template01HomePage from '@/components/templates/template-01/HomePage';
import Template02HomePage from '@/components/templates/template-02/HomePage';

type Props = {
  tenant: PublicTenant;
};

export default function TemplateRenderer({
  tenant,
}: Props) {
  const templateCode =
    tenant.TEMPLATE_CODE ||
    'TEMPLATE_01';

  switch (templateCode) {
    case 'TEMPLATE_02':
      return (
        <Template02HomePage
          tenant={tenant}
        />
      );

    case 'TEMPLATE_01':
    default:
      return (
        <Template01HomePage
          tenant={tenant}
        />
      );
  }
}