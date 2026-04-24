/**
 * Static vehicle data — Origin Car Leasing fleet.
 * Source: company inventory spreadsheet (April 2026).
 *
 * Pricing model:
 * - Price: AED out-of-freezone price (includes insurance + plate fee)
 * - Down payment: 20% of price
 * - 3-year instalment: (price - down payment) / 36
 * - Monthly lease fee: instalment × 1.3 (30% profit margin)
 *
 * One entry per model (colours + stock listed per card).
 * Used as fallback when the backend API is unreachable.
 */

export interface StaticVehicle {
  id: string;
  brand: string;
  model: string;
  year: number;
  category: string;
  fuel: string;
  transmission: string;
  seats: number;
  colour: string;
  /** Rental rate per month (short-term, with km limit) */
  monthlyAed: number;
  dailyAed: number;
  mileageLimit: number;
  imageUrl: string;
  available: boolean;
  features: string[];
  /** Vehicle selling price (AED) including insurance + plate */
  priceAed?: number;
  /** Down payment for leasing (20% of price) */
  downPaymentAed?: number;
  /** Lease-to-own monthly instalment (36 months, 30% profit margin, no km limit) */
  leaseMonthlyAed?: number;
  /** Number of units in stock */
  stock?: number;
  /** Available colour options */
  colours?: string[];
}

/**
 * Generate a branded placeholder image URL for vehicles without photos.
 * Uses placehold.co which is a reliable, free placeholder service.
 */
function placeholder(brand: string, model: string): string {
  const text = encodeURIComponent(`${brand} ${model}`);
  return `https://placehold.co/800x500/163478/ffffff?text=${text}&font=inter`;
}

export const STATIC_VEHICLES: StaticVehicle[] = [
  // ── NIO ────────────────────────────────────────────────────────────────────
  {
    id: 'nio-es6', brand: 'NIO', model: 'ES6', year: 2025,
    category: 'Electric SUV', fuel: 'electric', transmission: 'Automatic',
    seats: 5, colour: 'White / Black', monthlyAed: 8500, dailyAed: 400, mileageLimit: 3000,
    available: true, priceAed: 240000, downPaymentAed: 48000, leaseMonthlyAed: 6933,
    stock: 2, colours: ['White', 'Black'],
    imageUrl: placeholder('NIO', 'ES6'),
    features: ['100 kWh battery pack', 'NIO Pilot ADAS', 'NOMI AI assistant', '610 km range (CLTC)', 'Air suspension', 'Battery swap capable', 'Panoramic glass roof', 'Nappa leather interior'],
  },
  {
    id: 'nio-es7', brand: 'NIO', model: 'ES7', year: 2025,
    category: 'Electric SUV', fuel: 'electric', transmission: 'Automatic',
    seats: 5, colour: 'White', monthlyAed: 11500, dailyAed: 530, mileageLimit: 3000,
    available: true, priceAed: 318000, downPaymentAed: 63600, leaseMonthlyAed: 9187,
    stock: 1, colours: ['White'],
    imageUrl: placeholder('NIO', 'ES7'),
    features: ['100 kWh battery pack', 'NIO Pilot ADAS', 'NOMI AI assistant', '620 km range (CLTC)', 'Air suspension', 'Battery swap capable', 'Premium Dolby Atmos audio', 'PanoCinema AR/VR'],
  },
  {
    id: 'nio-es8', brand: 'NIO', model: 'ES8', year: 2025,
    category: 'Electric SUV', fuel: 'electric', transmission: 'Automatic',
    seats: 7, colour: 'White / Black', monthlyAed: 11800, dailyAed: 540, mileageLimit: 3000,
    available: true, priceAed: 325000, downPaymentAed: 65000, leaseMonthlyAed: 9389,
    stock: 2, colours: ['White', 'Black'],
    imageUrl: placeholder('NIO', 'ES8'),
    features: ['100 kWh battery pack', '7-seat three-row layout', 'NIO Pilot ADAS', 'NOMI AI assistant', '580 km range (CLTC)', 'Air suspension', 'Battery swap capable', 'Executive rear seats'],
  },
  {
    id: 'nio-et7', brand: 'NIO', model: 'ET7', year: 2025,
    category: 'Electric Sedan', fuel: 'electric', transmission: 'Automatic',
    seats: 5, colour: 'White', monthlyAed: 10700, dailyAed: 490, mileageLimit: 3000,
    available: true, priceAed: 295000, downPaymentAed: 59000, leaseMonthlyAed: 8522,
    stock: 1, colours: ['White'],
    imageUrl: placeholder('NIO', 'ET7'),
    features: ['150 kWh ultra-long range battery', 'NIO Pilot ADAS with LiDAR', 'NOMI AI assistant', '1000 km range (CLTC)', 'Air suspension', 'Battery swap capable', 'Premium Dolby Atmos 7.1.4 audio', 'Nappa leather interior'],
  },

  // ── Voyah (岚图) ──────────────────────────────────────────────────────────
  {
    id: 'voyah-free', brand: 'Voyah', model: 'Free', year: 2025,
    category: 'Electric SUV', fuel: 'electric', transmission: 'Automatic',
    seats: 5, colour: 'Multiple', monthlyAed: 6300, dailyAed: 290, mileageLimit: 3000,
    available: true, priceAed: 173000, downPaymentAed: 34600, leaseMonthlyAed: 4998,
    stock: 4, colours: ['White', 'Grey', 'Black', 'Blue'],
    imageUrl: placeholder('Voyah', 'Free'),
    features: ['Dual motor AWD', '106 kWh battery', '505 km range (CLTC)', 'Air suspension', 'Panoramic sunroof', '12.3" + 12.3" dual screens', 'Face recognition', 'Level 2+ ADAS'],
  },
  {
    id: 'voyah-dreamer', brand: 'Voyah', model: 'Dreamer', year: 2025,
    category: 'Electric MPV', fuel: 'electric', transmission: 'Automatic',
    seats: 7, colour: 'Multiple', monthlyAed: 8200, dailyAed: 380, mileageLimit: 3000,
    available: true, priceAed: 226000, downPaymentAed: 45200, leaseMonthlyAed: 6529,
    stock: 3, colours: ['White', 'Black', 'Grey'],
    imageUrl: placeholder('Voyah', 'Dreamer'),
    features: ['Premium electric MPV', 'Dual motor AWD', '108 kWh battery', '475 km range (CLTC)', 'Second-row captain seats with massage', 'Rear entertainment screens', 'Air suspension', 'Tri-zone climate control'],
  },

  // ── Zeekr (极氪) ──────────────────────────────────────────────────────────
  {
    id: 'zeekr-x', brand: 'Zeekr', model: 'X', year: 2025,
    category: 'Electric Crossover', fuel: 'electric', transmission: 'Automatic',
    seats: 5, colour: 'White', monthlyAed: 5600, dailyAed: 260, mileageLimit: 3000,
    available: true, priceAed: 155000, downPaymentAed: 31000, leaseMonthlyAed: 4478,
    stock: 1, colours: ['White'],
    imageUrl: placeholder('Zeekr', 'X'),
    features: ['Compact electric crossover', 'SEA platform (Geely)', '66 kWh battery', '560 km range (CLTC)', '14.6" AMOLED display', 'Yamaha premium audio', 'Level 2+ ADAS', 'Vehicle-to-load (V2L)'],
  },

  // ── BYD ────────────────────────────────────────────────────────────────────
  {
    id: 'byd-coming-soon', brand: 'BYD', model: 'Fleet Coming Soon', year: 2025,
    category: 'Electric', fuel: 'electric', transmission: 'Automatic',
    seats: 5, colour: 'Various', monthlyAed: 5500, dailyAed: 250, mileageLimit: 3000,
    available: false, priceAed: 135000, downPaymentAed: 27000, leaseMonthlyAed: 4500,
    imageUrl: placeholder('BYD', 'Coming Soon'),
    features: ['BYD Blade Battery', 'Multiple models available soon', 'Price range: AED 120,000–150,000', 'Electric and hybrid options', 'Advanced ADAS', 'OTA software updates'],
  },
];

/** Lookup a single vehicle by ID from static data */
export function getStaticVehicle(id: string): StaticVehicle | undefined {
  return STATIC_VEHICLES.find((v) => v.id === id);
}
