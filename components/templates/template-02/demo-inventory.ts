export type DemoVehicle = {
  id: number;
  year: number;
  make: string;
  model: string;
  trim: string;
  mileage: number;
  price: number;
  driveType: string;
  transmission: string;
  imageUrl: string;
  badge: 'Great Value' | 'Recently Added' | 'Low Mileage' | null;
};

/** Temporary demo cards — replace with real inventory feed later. */
export const DEMO_FEATURED_VEHICLES: DemoVehicle[] = [
  {
    id: 101,
    year: 2024,
    make: 'Acura',
    model: 'MDX',
    trim: 'SH-AWD A-Spec',
    mileage: 118767,
    price: 30777,
    driveType: 'AWD',
    transmission: 'Automatic',
    imageUrl:
      'https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?auto=format&fit=crop&w=1200&q=80',
    badge: 'Great Value',
  },
  {
    id: 102,
    year: 2022,
    make: 'Toyota',
    model: 'Camry',
    trim: 'XSE AWD',
    mileage: 47644,
    price: 26987,
    driveType: 'AWD',
    transmission: 'Automatic',
    imageUrl:
      'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?auto=format&fit=crop&w=1200&q=80',
    badge: 'Low Mileage',
  },
  {
    id: 103,
    year: 2019,
    make: 'Honda',
    model: 'CR-V',
    trim: 'EX-L',
    mileage: 62000,
    price: 21995,
    driveType: 'AWD',
    transmission: 'CVT',
    imageUrl:
      'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?auto=format&fit=crop&w=1200&q=80',
    badge: 'Recently Added',
  },
  {
    id: 104,
    year: 2018,
    make: 'Ford',
    model: 'F-150',
    trim: 'XLT',
    mileage: 78000,
    price: 24950,
    driveType: '4WD',
    transmission: 'Automatic',
    imageUrl:
      'https://images.unsplash.com/photo-1601362840469-51e4d8d58785?auto=format&fit=crop&w=1200&q=80',
    badge: 'Great Value',
  },
];

export const BUDGET_BREAKS = [5000, 10000, 15000, 20000, 25000] as const;

export const BODY_STYLES = [
  'SUV',
  'Truck',
  'Sedan',
  'Crossover',
  'Hybrid',
  'Minivan',
  'Hatchback',
  'Coupe',
  'Convertible',
  'Wagon',
  'Van',
] as const;
