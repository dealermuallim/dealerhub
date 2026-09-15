export type AdminDemoVehicle = {
  id: number;
  year: number;
  make: string;
  model: string;
  trim: string;
  stockNumber: string;
  vin: string;
  mileage: number;
  askingPrice: number;
  status: 'AVAILABLE' | 'SOLD' | 'ARCHIVED';
  featured: boolean;
  imageUrl: string | null;
};

export type AdminDemoTenant = {
  id: number;
  dealerName: string;
  tenantCode: string;
  domain: string;
  templateCode: 'TEMPLATE_01' | 'TEMPLATE_02';
  active: boolean;
  city: string;
  state: string;
};

/** Isolated demo data — replace with live APIs later. */
export const ADMIN_DEMO_DEALER = {
  dealerName: 'Shelby Motorcars',
  templateCode: 'TEMPLATE_02' as const,
  websiteLive: true,
};

export const ADMIN_DEMO_STATS = {
  activeInventory: 24,
  sold: 8,
  featured: 5,
};

export const ADMIN_DEMO_VEHICLES: AdminDemoVehicle[] = [
  {
    id: 22,
    year: 2024,
    make: 'Acura',
    model: 'MDX',
    trim: 'A-Spec',
    stockNumber: 'SHB-MDX24',
    vin: '5J8YE1H80RL000001',
    mileage: 118767,
    askingPrice: 30777,
    status: 'AVAILABLE',
    featured: true,
    imageUrl: null,
  },
  {
    id: 23,
    year: 2022,
    make: 'Toyota',
    model: 'Camry',
    trim: 'XSE',
    stockNumber: 'SHB-CAM22',
    vin: '4T1G11AK5NU000002',
    mileage: 47644,
    askingPrice: 26987,
    status: 'AVAILABLE',
    featured: true,
    imageUrl: null,
  },
  {
    id: 24,
    year: 2016,
    make: 'Honda',
    model: 'Civic',
    trim: 'LX',
    stockNumber: 'SHB-CIV16',
    vin: '2HGFC2F59GH000003',
    mileage: 98000,
    askingPrice: 9995,
    status: 'AVAILABLE',
    featured: false,
    imageUrl: null,
  },
  {
    id: 21,
    year: 2019,
    make: 'Honda',
    model: 'Accord',
    trim: 'Sport',
    stockNumber: 'TEST-969912',
    vin: '1HGBH41JXMN969912',
    mileage: 42000,
    askingPrice: 18995,
    status: 'AVAILABLE',
    featured: false,
    imageUrl: null,
  },
  {
    id: 18,
    year: 2018,
    make: 'Ford',
    model: 'Escape',
    trim: 'SE',
    stockNumber: 'SHB-ESC18',
    vin: '1FMCU9GD5JUA00018',
    mileage: 72000,
    askingPrice: 14950,
    status: 'SOLD',
    featured: false,
    imageUrl: null,
  },
];

export const ADMIN_DEMO_TENANTS: AdminDemoTenant[] = [
  {
    id: 21,
    dealerName: 'Shelby Motorcars',
    tenantCode: 'SHELBYMOTOR',
    domain: 'localhost',
    templateCode: 'TEMPLATE_02',
    active: true,
    city: 'Springfield',
    state: 'MA',
  },
  {
    id: 22,
    dealerName: 'Stop & Drive Autos',
    tenantCode: 'STOPDRIVE',
    domain: 'stopanddrive.demo',
    templateCode: 'TEMPLATE_01',
    active: true,
    city: 'Hartford',
    state: 'CT',
  },
  {
    id: 23,
    dealerName: 'Pioneer Auto Group',
    tenantCode: 'PIONEER',
    domain: 'pioneer.demo',
    templateCode: 'TEMPLATE_02',
    active: false,
    city: 'Worcester',
    state: 'MA',
  },
];

export function money(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);
}

export function vinLast4(vin: string): string {
  return vin.slice(-4);
}
