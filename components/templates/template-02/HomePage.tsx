import { headers } from 'next/headers';
import type { PublicTenant } from '@/lib/tenant';
import { getPublicVehiclesByHost } from '@/lib/vehicles';
import './template-02.css';
import { getTemplateTheme } from './theme';
import SiteHeader from './SiteHeader';
import HeroSection from './HeroSection';
import ShopByBudget from './ShopByBudget';
import ShopByBodyStyle from './ShopByBodyStyle';
import FeaturedInventory from './FeaturedInventory';
import FindItForMe from './FindItForMe';
import FinancingSection from './FinancingSection';
import SellTradeSection from './SellTradeSection';
import HowItWorks from './HowItWorks';
import DeliverySection from './DeliverySection';
import SiteFooter from './SiteFooter';

type Props = {
  tenant: PublicTenant;
};

export default async function Template02HomePage({ tenant }: Props) {
  const theme = getTemplateTheme(tenant);
  const requestHeaders = await headers();
  const host = requestHeaders.get('host') || 'localhost';

  let vehicles: Awaited<ReturnType<typeof getPublicVehiclesByHost>> = [];
  try {
    vehicles = await getPublicVehiclesByHost(host);
  } catch {
    vehicles = [];
  }

  return (
    <div className="t02-root">
      <SiteHeader tenant={tenant} theme={theme} />
      <HeroSection tenant={tenant} theme={theme} />
      <ShopByBudget theme={theme} />
      <ShopByBodyStyle theme={theme} />
      <FeaturedInventory theme={theme} vehicles={vehicles} />
      <FindItForMe theme={theme} />
      <FinancingSection theme={theme} />
      <SellTradeSection theme={theme} />
      <HowItWorks theme={theme} />
      <DeliverySection theme={theme} />
      <SiteFooter tenant={tenant} theme={theme} />
    </div>
  );
}
