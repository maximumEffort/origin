import { PrismaClient, Brand, FuelType, Transmission, VehicleStatus, Language, KycStatus, LeaseType, BookingStatus, LeaseStatus, PaymentType, PaymentStatus, AdminRole, DocumentType, DocumentStatus, ServiceType, NotificationChannel, NotificationStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

// Mirror the pgBouncer patch from PrismaService so seeding works whether
// DATABASE_URL points to the direct Postgres (port 5432) or the Supabase
// pgBouncer pooler (port 6543).  The CLI and runtime both use this file.
function buildDatasourceUrl(): string {
  const url = process.env.DATABASE_URL ?? '';
  if (url.includes(':6543/') && !url.includes('pgbouncer=true')) {
    const sep = url.includes('?') ? '&' : '?';
    return `${url}${sep}pgbouncer=true&connection_limit=1`;
  }
  return url;
}

const prisma = new PrismaClient({ datasources: { db: { url: buildDatasourceUrl() } } });

async function main() {
  console.log('\n🏎️  Origin Car Leasing — Seeding database...\n');

  // ────────────────────────────────────────────────────────────────────────────
  // VEHICLE CATEGORIES
  // ────────────────────────────────────────────────────────────────────────────
  const categorySuv = await prisma.vehicleCategory.upsert({
    where: { id: 'cat-suv' },
    update: {},
    create: {
      id: 'cat-suv',
      nameEn: 'SUV',
      nameAr: 'سيارة دفع رباعي',
      nameZh: 'SUV 越野车',
      icon: 'truck',
    },
  });

  const categorySedan = await prisma.vehicleCategory.upsert({
    where: { id: 'cat-sedan' },
    update: {},
    create: {
      id: 'cat-sedan',
      nameEn: 'Sedan',
      nameAr: 'سيدان',
      nameZh: '轿车',
      icon: 'car',
    },
  });

  const categoryMpv = await prisma.vehicleCategory.upsert({
    where: { id: 'cat-mpv' },
    update: {},
    create: {
      id: 'cat-mpv',
      nameEn: 'MPV',
      nameAr: 'سيارة متعددة الأغراض',
      nameZh: 'MPV 多用途车',
      icon: 'van',
    },
  });

  const categoryCrossover = await prisma.vehicleCategory.upsert({
    where: { id: 'cat-crossover' },
    update: {},
    create: {
      id: 'cat-crossover',
      nameEn: 'Crossover',
      nameAr: 'كروس أوفر',
      nameZh: 'Crossover 跨界车',
      icon: 'suv',
    },
  });

  const categoryHatchback = await prisma.vehicleCategory.upsert({
    where: { id: 'cat-hatchback' },
    update: {},
    create: {
      id: 'cat-hatchback',
      nameEn: 'Hatchback',
      nameAr: 'هاتشباك',
      nameZh: 'Hatchback 掀背车',
      icon: 'car',
    },
  });

  console.log('✅ 5 vehicle categories created');

  // ────────────────────────────────────────────────────────────────────────────
  // VEHICLES (8 existing + 10 new = 18 total)
  // ────────────────────────────────────────────────────────────────────────────
  const now = new Date();
  const threeMonthsFromNow = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
  const twoMonthsFromNow = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
  const oneMonthFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const twoWeeksFromNow = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
  const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  const vehicleData = [
    // Existing vehicles (8)
    {
      vin: 'LGXCE6CB6R0000101', plateNumber: 'D-12345',
      brand: Brand.BYD, model: 'Atto 3', year: 2025,
      categoryId: categorySuv.id, fuelType: FuelType.ELECTRIC,
      colour: 'Pearl White', seats: 5,
      dailyRateAed: 150, monthlyRateAed: 3300, mileageLimitMonthly: 3000,
      status: VehicleStatus.AVAILABLE,
      rtaRegistrationExpiry: threeMonthsFromNow,
      insuranceExpiry: twoMonthsFromNow,
      lastServiceDate: threeMonthsAgo,
      nextServiceDue: oneMonthFromNow,
      imageUrl: 'https://imagecdnsa.zigwheels.ae/large/gallery/exterior/107/1953/byd-atto-3-front-angle-low-view-335461.jpg',
    },
    {
      vin: 'LGXCE6CB6R0000102', plateNumber: 'D-12346',
      brand: Brand.BYD, model: 'Seal', year: 2025,
      categoryId: categorySedan.id, fuelType: FuelType.ELECTRIC,
      colour: 'Atlantis Grey', seats: 5,
      dailyRateAed: 190, monthlyRateAed: 4180, mileageLimitMonthly: 3000,
      status: VehicleStatus.AVAILABLE,
      rtaRegistrationExpiry: twoMonthsFromNow,
      insuranceExpiry: threeMonthsFromNow,
      imageUrl: 'https://imagecdnsa.zigwheels.ae/large/gallery/exterior/107/1955/byd-seal-front-angle-low-view-719680.jpg',
    },
    {
      vin: 'LGXCE6CB6R0000103', plateNumber: 'D-12347',
      brand: Brand.BYD, model: 'Dolphin', year: 2025,
      categoryId: categoryHatchback.id, fuelType: FuelType.ELECTRIC,
      colour: 'Surf Blue', seats: 5,
      dailyRateAed: 100, monthlyRateAed: 2200, mileageLimitMonthly: 3000,
      status: VehicleStatus.AVAILABLE,
      rtaRegistrationExpiry: oneMonthFromNow,
      insuranceExpiry: twoMonthsFromNow,
      imageUrl: 'https://imgcdn.zigwheels.ph/large/gallery/exterior/64/3095/byd-dolphin-front-angle-low-view-503526.jpg',
    },
    {
      vin: 'LGWEF4A55RF000201', plateNumber: 'D-22345',
      brand: Brand.HAVAL, model: 'Jolion', year: 2025,
      categoryId: categorySuv.id, fuelType: FuelType.PETROL,
      colour: 'Polar White', seats: 5,
      dailyRateAed: 120, monthlyRateAed: 2640, mileageLimitMonthly: 3000,
      status: VehicleStatus.AVAILABLE,
      rtaRegistrationExpiry: threeMonthsFromNow,
      insuranceExpiry: twoMonthsFromNow,
      imageUrl: 'https://imagecdnsa.zigwheels.ae/large/gallery/exterior/83/1688/haval-jolion-front-angle-low-view-853906.jpg',
    },
    {
      vin: 'LGWEF4A55RF000202', plateNumber: 'D-22346',
      brand: Brand.HAVAL, model: 'H6', year: 2025,
      categoryId: categorySuv.id, fuelType: FuelType.HYBRID,
      colour: 'Obsidian Black', seats: 5,
      dailyRateAed: 140, monthlyRateAed: 3080, mileageLimitMonthly: 3000,
      status: VehicleStatus.LEASED,
      rtaRegistrationExpiry: twoMonthsFromNow,
      insuranceExpiry: threeMonthsFromNow,
      lastServiceDate: sixMonthsAgo,
      nextServiceDue: oneMonthFromNow,
      imageUrl: 'https://imagecdnsa.zigwheels.ae/large/gallery/exterior/83/2458/haval-h6-front-angle-low-view-157276.jpg',
    },
    {
      vin: 'LVVDB21B4RD000301', plateNumber: 'D-32345',
      brand: Brand.CHERY, model: 'Tiggo 8', year: 2025,
      categoryId: categorySuv.id, fuelType: FuelType.PETROL,
      colour: 'Crystal White', seats: 7,
      dailyRateAed: 135, monthlyRateAed: 2970, mileageLimitMonthly: 3000,
      status: VehicleStatus.AVAILABLE,
      rtaRegistrationExpiry: oneMonthFromNow,
      insuranceExpiry: twoWeeksFromNow,
      imageUrl: 'https://imagecdnsa.zigwheels.ae/large/gallery/exterior/90/2010/chery-tiggo-8-pro-max-full-front-view-630735.jpg',
    },
    {
      vin: 'L6T79Y2E0RN000401', plateNumber: 'D-42345',
      brand: Brand.GEELY, model: 'Coolray', year: 2025,
      categoryId: categorySuv.id, fuelType: FuelType.PETROL,
      colour: 'Ink Blue', seats: 5,
      dailyRateAed: 110, monthlyRateAed: 2420, mileageLimitMonthly: 3000,
      status: VehicleStatus.LEASED,
      rtaRegistrationExpiry: twoMonthsFromNow,
      insuranceExpiry: threeMonthsFromNow,
      imageUrl: 'https://imagecdnsa.zigwheels.ae/large/gallery/exterior/92/2442/geely-coolray-front-angle-low-view-551648.jpg',
    },
    {
      vin: 'L6T79Y2E0RN000402', plateNumber: 'D-42346',
      brand: Brand.GEELY, model: 'Emgrand', year: 2025,
      categoryId: categorySedan.id, fuelType: FuelType.PETROL,
      colour: 'Champagne Gold', seats: 5,
      dailyRateAed: 95, monthlyRateAed: 2090, mileageLimitMonthly: 3000,
      status: VehicleStatus.AVAILABLE,
      rtaRegistrationExpiry: threeMonthsFromNow,
      insuranceExpiry: twoMonthsFromNow,
      imageUrl: 'https://imagecdnsa.zigwheels.ae/large/gallery/exterior/92/1974/geely-emgrand-front-angle-low-view-662502.jpg',
    },
    // New vehicles (10)
    {
      vin: 'LSJWP20020123456', plateNumber: 'D-51001',
      brand: Brand.NIO, model: 'ES6', year: 2025,
      categoryId: categorySuv.id, fuelType: FuelType.ELECTRIC,
      colour: 'Pearl White', seats: 5,
      dailyRateAed: 250, monthlyRateAed: 5500, mileageLimitMonthly: 3000,
      status: VehicleStatus.AVAILABLE,
      rtaRegistrationExpiry: threeMonthsFromNow,
      insuranceExpiry: twoMonthsFromNow,
      lastServiceDate: sixMonthsAgo,
      nextServiceDue: twoWeeksFromNow,
      imageUrl: 'https://imagecdnsa.zigwheels.ae/assets/nio-es6-front.jpg',
    },
    {
      vin: 'LSJWP20020123457', plateNumber: 'D-51002',
      brand: Brand.NIO, model: 'ET7', year: 2025,
      categoryId: categorySedan.id, fuelType: FuelType.ELECTRIC,
      colour: 'Slate Black', seats: 5,
      dailyRateAed: 280, monthlyRateAed: 6160, mileageLimitMonthly: 4000,
      status: VehicleStatus.AVAILABLE,
      rtaRegistrationExpiry: twoMonthsFromNow,
      insuranceExpiry: threeMonthsFromNow,
      imageUrl: 'https://imagecdnsa.zigwheels.ae/assets/nio-et7-front.jpg',
    },
    {
      vin: 'LSJWP20020123458', plateNumber: 'D-51003',
      brand: Brand.NIO, model: 'ES8', year: 2025,
      categoryId: categorySuv.id, fuelType: FuelType.ELECTRIC,
      colour: 'Glacier White', seats: 7,
      dailyRateAed: 300, monthlyRateAed: 6600, mileageLimitMonthly: 4000,
      status: VehicleStatus.MAINTENANCE,
      rtaRegistrationExpiry: threeMonthsFromNow,
      insuranceExpiry: oneMonthFromNow,
      lastServiceDate: threeMonthsAgo,
      nextServiceDue: twoWeeksFromNow,
      notes: 'Currently in scheduled maintenance — battery system update',
      imageUrl: 'https://imagecdnsa.zigwheels.ae/assets/nio-es8-front.jpg',
    },
    {
      vin: 'LNBC0000020123456', plateNumber: 'D-52001',
      brand: Brand.VOYAH, model: 'Free', year: 2025,
      categoryId: categorySuv.id, fuelType: FuelType.ELECTRIC,
      colour: 'Silk Silver', seats: 5,
      dailyRateAed: 220, monthlyRateAed: 4840, mileageLimitMonthly: 3500,
      status: VehicleStatus.AVAILABLE,
      rtaRegistrationExpiry: twoMonthsFromNow,
      insuranceExpiry: threeMonthsFromNow,
      imageUrl: 'https://imagecdnsa.zigwheels.ae/assets/voyah-free-front.jpg',
    },
    {
      vin: 'LNBC0000020123457', plateNumber: 'D-52002',
      brand: Brand.VOYAH, model: 'Dreamer', year: 2025,
      categoryId: categoryMpv.id, fuelType: FuelType.ELECTRIC,
      colour: 'Obsidian Black', seats: 7,
      dailyRateAed: 260, monthlyRateAed: 5720, mileageLimitMonthly: 4000,
      status: VehicleStatus.AVAILABLE,
      rtaRegistrationExpiry: oneMonthFromNow,
      insuranceExpiry: twoMonthsFromNow,
      lastServiceDate: threeMonthsAgo,
      nextServiceDue: oneMonthFromNow,
      imageUrl: 'https://imagecdnsa.zigwheels.ae/assets/voyah-dreamer-front.jpg',
    },
    {
      vin: 'L0YA0000020123456', plateNumber: 'D-53001',
      brand: Brand.ZEEKR, model: 'X', year: 2025,
      categoryId: categoryCrossover.id, fuelType: FuelType.ELECTRIC,
      colour: 'Moonlight Silver', seats: 5,
      dailyRateAed: 200, monthlyRateAed: 4400, mileageLimitMonthly: 3000,
      status: VehicleStatus.AVAILABLE,
      rtaRegistrationExpiry: threeMonthsFromNow,
      insuranceExpiry: twoMonthsFromNow,
      imageUrl: 'https://imagecdnsa.zigwheels.ae/assets/zeekr-x-front.jpg',
    },
    {
      vin: 'LGXCE6CB6R0000104', plateNumber: 'D-12348',
      brand: Brand.BYD, model: 'Han', year: 2025,
      categoryId: categorySedan.id, fuelType: FuelType.ELECTRIC,
      colour: 'Titanium Grey', seats: 5,
      dailyRateAed: 210, monthlyRateAed: 4620, mileageLimitMonthly: 3500,
      status: VehicleStatus.AVAILABLE,
      rtaRegistrationExpiry: twoMonthsFromNow,
      insuranceExpiry: threeMonthsFromNow,
      imageUrl: 'https://imagecdnsa.zigwheels.ae/assets/byd-han-front.jpg',
    },
  ];

  const vehicles = [];
  for (const v of vehicleData) {
    const { imageUrl, ...vehicleFields } = v;
    const vehicle = await prisma.vehicle.upsert({
      where: { vin: v.vin },
      update: {},
      create: vehicleFields,
    });
    // Add primary image
    await prisma.vehicleImage.upsert({
      where: { id: `img-${vehicle.id}` },
      update: {},
      create: {
        id: `img-${vehicle.id}`,
        vehicleId: vehicle.id,
        url: imageUrl,
        isPrimary: true,
        sortOrder: 0,
      },
    });
    vehicles.push(vehicle);
  }

  console.log(`✅ ${vehicles.length} vehicles created with images`);

  // ────────────────────────────────────────────────────────────────────────────
  // CUSTOMERS (5 existing + 7 new = 12 total)
  // ────────────────────────────────────────────────────────────────────────────
  const customerData = [
    // Existing (5)
    { phone: '+971501234001', email: 'ahmed.hassan@example.com', fullName: 'Ahmed Hassan', nationality: 'AE', preferredLanguage: Language.ar, kycStatus: KycStatus.APPROVED, whatsappOptIn: true },
    { phone: '+971551234002', email: 'sarah.chen@example.com', fullName: 'Sarah Chen', nationality: 'CN', preferredLanguage: Language.zh, kycStatus: KycStatus.APPROVED, whatsappOptIn: true },
    { phone: '+971521234003', email: 'james.wilson@example.com', fullName: 'James Wilson', nationality: 'GB', preferredLanguage: Language.en, kycStatus: KycStatus.SUBMITTED, whatsappOptIn: false },
    { phone: '+971561234004', email: 'fatima.ali@example.com', fullName: 'Fatima Ali', nationality: 'AE', preferredLanguage: Language.ar, kycStatus: KycStatus.APPROVED, whatsappOptIn: true },
    { phone: '+971581234005', email: 'li.wei@example.com', fullName: 'Li Wei', nationality: 'CN', preferredLanguage: Language.zh, kycStatus: KycStatus.PENDING, whatsappOptIn: true },
    // New (7)
    { phone: '+971501234006', email: 'michael.brown@example.com', fullName: 'Michael Brown', nationality: 'US', preferredLanguage: Language.en, kycStatus: KycStatus.APPROVED, whatsappOptIn: true },
    { phone: '+971561234007', email: 'amira.rashid@example.com', fullName: 'Amira Rashid', nationality: 'AE', preferredLanguage: Language.ar, kycStatus: KycStatus.REJECTED, kycRejectionReason: 'Emirates ID expired', whatsappOptIn: false },
    { phone: '+971521234008', email: 'david.smith@example.com', fullName: 'David Smith', nationality: 'AU', preferredLanguage: Language.en, kycStatus: KycStatus.APPROVED, whatsappOptIn: true },
    { phone: '+971551234009', email: 'priya.sharma@example.com', fullName: 'Priya Sharma', nationality: 'IN', preferredLanguage: Language.en, kycStatus: KycStatus.APPROVED, whatsappOptIn: true },
    { phone: '+971581234010', email: 'wei.liu@example.com', fullName: 'Wei Liu', nationality: 'CN', preferredLanguage: Language.zh, kycStatus: KycStatus.SUBMITTED, whatsappOptIn: true },
    { phone: '+971501234011', email: 'yasmin.khan@example.com', fullName: 'Yasmin Khan', nationality: 'AE', preferredLanguage: Language.ar, kycStatus: KycStatus.PENDING, whatsappOptIn: true },
    { phone: '+971521234012', email: 'robert.johnson@example.com', fullName: 'Robert Johnson', nationality: 'GB', preferredLanguage: Language.en, kycStatus: KycStatus.APPROVED, whatsappOptIn: true },
  ];

  const customers = [];
  for (const c of customerData) {
    const customer = await prisma.customer.upsert({
      where: { phone: c.phone },
      update: {},
      create: c,
    });
    customers.push(customer);
  }

  console.log(`✅ ${customers.length} customers created`);

  // ────────────────────────────────────────────────────────────────────────────
  // DOCUMENTS (KYC) - 23+ records
  // ────────────────────────────────────────────────────────────────────────────
  const oneYearFromNow = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
  const sixMonthsFromNow = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000);
  const sixMonthsAgo2 = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);

  const documentData = [
    // Ahmed Hassan - APPROVED (complete set)
    { customerId: customers[0].id, type: DocumentType.EMIRATES_ID, status: DocumentStatus.APPROVED, expiryDate: oneYearFromNow, fileUrl: 'https://storage.originleasing.ae/kyc/ahmed-hassan/emirates-id.pdf' },
    { customerId: customers[0].id, type: DocumentType.DRIVING_LICENCE, status: DocumentStatus.APPROVED, expiryDate: oneYearFromNow, fileUrl: 'https://storage.originleasing.ae/kyc/ahmed-hassan/driving-licence.pdf' },
    { customerId: customers[0].id, type: DocumentType.PASSPORT, status: DocumentStatus.APPROVED, expiryDate: oneYearFromNow, fileUrl: 'https://storage.originleasing.ae/kyc/ahmed-hassan/passport.pdf' },
    // Sarah Chen - APPROVED (complete set)
    { customerId: customers[1].id, type: DocumentType.PASSPORT, status: DocumentStatus.APPROVED, expiryDate: oneYearFromNow, fileUrl: 'https://storage.originleasing.ae/kyc/sarah-chen/passport.pdf' },
    { customerId: customers[1].id, type: DocumentType.VISA, status: DocumentStatus.APPROVED, expiryDate: sixMonthsFromNow, fileUrl: 'https://storage.originleasing.ae/kyc/sarah-chen/visa.pdf' },
    { customerId: customers[1].id, type: DocumentType.DRIVING_LICENCE, status: DocumentStatus.APPROVED, expiryDate: oneYearFromNow, fileUrl: 'https://storage.originleasing.ae/kyc/sarah-chen/driving-licence.pdf' },
    // James Wilson - SUBMITTED (pending review)
    { customerId: customers[2].id, type: DocumentType.DRIVING_LICENCE, status: DocumentStatus.PENDING, expiryDate: oneYearFromNow, fileUrl: 'https://storage.originleasing.ae/kyc/james-wilson/driving-licence.pdf' },
    { customerId: customers[2].id, type: DocumentType.PASSPORT, status: DocumentStatus.PENDING, expiryDate: oneYearFromNow, fileUrl: 'https://storage.originleasing.ae/kyc/james-wilson/passport.pdf' },
    { customerId: customers[2].id, type: DocumentType.VISA, status: DocumentStatus.PENDING, expiryDate: sixMonthsFromNow, fileUrl: 'https://storage.originleasing.ae/kyc/james-wilson/visa.pdf' },
    // Fatima Ali - APPROVED (complete set)
    { customerId: customers[3].id, type: DocumentType.EMIRATES_ID, status: DocumentStatus.APPROVED, expiryDate: oneYearFromNow, fileUrl: 'https://storage.originleasing.ae/kyc/fatima-ali/emirates-id.pdf' },
    { customerId: customers[3].id, type: DocumentType.DRIVING_LICENCE, status: DocumentStatus.APPROVED, expiryDate: oneYearFromNow, fileUrl: 'https://storage.originleasing.ae/kyc/fatima-ali/driving-licence.pdf' },
    // Li Wei - PENDING (incomplete)
    { customerId: customers[4].id, type: DocumentType.PASSPORT, status: DocumentStatus.PENDING, expiryDate: oneYearFromNow, fileUrl: 'https://storage.originleasing.ae/kyc/li-wei/passport.pdf' },
    { customerId: customers[4].id, type: DocumentType.VISA, status: DocumentStatus.PENDING, expiryDate: sixMonthsFromNow, fileUrl: 'https://storage.originleasing.ae/kyc/li-wei/visa.pdf' },
    // Michael Brown - APPROVED (complete set)
    { customerId: customers[5].id, type: DocumentType.PASSPORT, status: DocumentStatus.APPROVED, expiryDate: oneYearFromNow, fileUrl: 'https://storage.originleasing.ae/kyc/michael-brown/passport.pdf' },
    { customerId: customers[5].id, type: DocumentType.VISA, status: DocumentStatus.APPROVED, expiryDate: sixMonthsFromNow, fileUrl: 'https://storage.originleasing.ae/kyc/michael-brown/visa.pdf' },
    { customerId: customers[5].id, type: DocumentType.DRIVING_LICENCE, status: DocumentStatus.APPROVED, expiryDate: oneYearFromNow, fileUrl: 'https://storage.originleasing.ae/kyc/michael-brown/driving-licence.pdf' },
    // Amira Rashid - REJECTED (expired ID)
    { customerId: customers[6].id, type: DocumentType.EMIRATES_ID, status: DocumentStatus.REJECTED, rejectionReason: 'Expired - valid until 2023', expiryDate: sixMonthsAgo2, fileUrl: 'https://storage.originleasing.ae/kyc/amira-rashid/emirates-id.pdf' },
    // David Smith - APPROVED (complete set)
    { customerId: customers[7].id, type: DocumentType.PASSPORT, status: DocumentStatus.APPROVED, expiryDate: oneYearFromNow, fileUrl: 'https://storage.originleasing.ae/kyc/david-smith/passport.pdf' },
    { customerId: customers[7].id, type: DocumentType.VISA, status: DocumentStatus.APPROVED, expiryDate: sixMonthsFromNow, fileUrl: 'https://storage.originleasing.ae/kyc/david-smith/visa.pdf' },
    { customerId: customers[7].id, type: DocumentType.DRIVING_LICENCE, status: DocumentStatus.APPROVED, expiryDate: oneYearFromNow, fileUrl: 'https://storage.originleasing.ae/kyc/david-smith/driving-licence.pdf' },
    // Priya Sharma - APPROVED (complete set)
    { customerId: customers[8].id, type: DocumentType.PASSPORT, status: DocumentStatus.APPROVED, expiryDate: oneYearFromNow, fileUrl: 'https://storage.originleasing.ae/kyc/priya-sharma/passport.pdf' },
    { customerId: customers[8].id, type: DocumentType.VISA, status: DocumentStatus.APPROVED, expiryDate: oneYearFromNow, fileUrl: 'https://storage.originleasing.ae/kyc/priya-sharma/visa.pdf' },
    { customerId: customers[8].id, type: DocumentType.DRIVING_LICENCE, status: DocumentStatus.APPROVED, expiryDate: oneYearFromNow, fileUrl: 'https://storage.originleasing.ae/kyc/priya-sharma/driving-licence.pdf' },
    // Wei Liu - SUBMITTED (pending review)
    { customerId: customers[9].id, type: DocumentType.PASSPORT, status: DocumentStatus.PENDING, expiryDate: oneYearFromNow, fileUrl: 'https://storage.originleasing.ae/kyc/wei-liu/passport.pdf' },
    { customerId: customers[9].id, type: DocumentType.VISA, status: DocumentStatus.PENDING, expiryDate: sixMonthsFromNow, fileUrl: 'https://storage.originleasing.ae/kyc/wei-liu/visa.pdf' },
  ];

  for (const doc of documentData) {
    await prisma.document.upsert({
      where: { id: `doc-${doc.customerId}-${doc.type}` },
      update: {},
      create: {
        id: `doc-${doc.customerId}-${doc.type}`,
        customerId: doc.customerId,
        type: doc.type,
        fileUrl: doc.fileUrl,
        status: doc.status,
        expiryDate: doc.expiryDate,
        rejectionReason: doc.rejectionReason || null,
        uploadedAt: now,
        reviewedAt: doc.status === DocumentStatus.APPROVED ? now : undefined,
      },
    });
  }

  console.log('✅ 23 KYC documents created');

  // ────────────────────────────────────────────────────────────────────────────
  // BOOKINGS (10 total)
  // ────────────────────────────────────────────────────────────────────────────
  const sixMonthsFromNow2 = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000);
  const oneMonthFromNow2 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const threeMonthsAgo2 = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const threeMonthsFromNow2 = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
  const twoWeeksFromNow2 = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  const fifteenDaysAgo = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);

  // Booking 1: DRAFT (incomplete booking)
  const booking1 = await prisma.booking.upsert({
    where: { reference: 'BK-2025-0001' },
    update: {},
    create: {
      reference: 'BK-2025-0001',
      customerId: customers[11].id,
      vehicleId: vehicles[8].id,
      leaseType: LeaseType.SHORT_TERM,
      startDate: twoWeeksFromNow2,
      endDate: sixMonthsFromNow2,
      durationDays: 150,
      mileagePackage: 3000,
      addOns: { additional_driver: false, cdw_waiver: true, gps_tracker: false },
      quotedTotalAed: 37500,
      vatAmountAed: 1875,
      grandTotalAed: 39375,
      depositAmountAed: 5000,
      depositPaid: false,
      status: BookingStatus.DRAFT,
      pickupLocation: 'Origin Office - Creek Harbour',
      dropoffLocation: 'Origin Office - Creek Harbour',
      notes: 'Customer still gathering documents',
    },
  });

  // Booking 2: SUBMITTED (awaiting approval)
  const booking2 = await prisma.booking.upsert({
    where: { reference: 'BK-2025-0002' },
    update: {},
    create: {
      reference: 'BK-2025-0002',
      customerId: customers[2].id,
      vehicleId: vehicles[0].id,
      leaseType: LeaseType.SHORT_TERM,
      startDate: oneMonthFromNow2,
      endDate: sixMonthsFromNow2,
      durationDays: 150,
      mileagePackage: 3000,
      addOns: { additional_driver: false, cdw_waiver: true, gps_tracker: false },
      quotedTotalAed: 19200,
      vatAmountAed: 960,
      grandTotalAed: 20160,
      depositAmountAed: 3200,
      depositPaid: false,
      status: BookingStatus.SUBMITTED,
      pickupLocation: 'Dubai Mall Valet Parking',
      dropoffLocation: 'Dubai Mall Valet Parking',
    },
  });

  // Booking 3: APPROVED (deposit pending)
  const booking3 = await prisma.booking.upsert({
    where: { reference: 'BK-2025-0003' },
    update: {},
    create: {
      reference: 'BK-2025-0003',
      customerId: customers[1].id,
      vehicleId: vehicles[5].id,
      assignedVehicleId: vehicles[5].id,
      leaseType: LeaseType.LONG_TERM,
      startDate: twoWeeksFromNow2,
      endDate: sixMonthsFromNow2,
      durationDays: 166,
      mileagePackage: 4000,
      addOns: { additional_driver: true, cdw_waiver: false, gps_tracker: true },
      quotedTotalAed: 17400,
      vatAmountAed: 870,
      grandTotalAed: 18270,
      depositAmountAed: 2900,
      depositPaid: false,
      status: BookingStatus.APPROVED,
      pickupLocation: 'Origin Office - Business Bay',
      dropoffLocation: 'Origin Office - Business Bay',
    },
  });

  // Booking 4: REJECTED
  const booking4 = await prisma.booking.upsert({
    where: { reference: 'BK-2025-0004' },
    update: {},
    create: {
      reference: 'BK-2025-0004',
      customerId: customers[6].id,
      vehicleId: vehicles[3].id,
      leaseType: LeaseType.LONG_TERM,
      startDate: oneMonthFromNow2,
      endDate: sixMonthsFromNow2,
      durationDays: 150,
      mileagePackage: 3000,
      addOns: {},
      quotedTotalAed: 12000,
      vatAmountAed: 600,
      grandTotalAed: 12600,
      depositAmountAed: 2000,
      depositPaid: false,
      status: BookingStatus.REJECTED,
      rejectionReason: 'KYC documents rejected — expired Emirates ID',
      pickupLocation: 'JBR Walk',
      dropoffLocation: 'JBR Walk',
    },
  });

  // Booking 5: CANCELLED
  const booking5 = await prisma.booking.upsert({
    where: { reference: 'BK-2025-0005' },
    update: {},
    create: {
      reference: 'BK-2025-0005',
      customerId: customers[5].id,
      vehicleId: vehicles[10].id,
      leaseType: LeaseType.SHORT_TERM,
      startDate: fifteenDaysAgo,
      endDate: oneMonthFromNow2,
      durationDays: 45,
      mileagePackage: 2000,
      addOns: { additional_driver: false, cdw_waiver: false, gps_tracker: true },
      quotedTotalAed: 11200,
      vatAmountAed: 560,
      grandTotalAed: 11760,
      depositAmountAed: 2500,
      depositPaid: true,
      status: BookingStatus.CANCELLED,
      notes: 'Customer cancelled due to travel plans change',
      pickupLocation: 'DIFC',
      dropoffLocation: 'DIFC',
    },
  });

  // Booking 6: CONVERTED (Ahmed Hassan - HAVAL H6)
  const booking6 = await prisma.booking.upsert({
    where: { reference: 'BK-2025-0006' },
    update: {},
    create: {
      reference: 'BK-2025-0006',
      customerId: customers[0].id,
      vehicleId: vehicles[4].id,
      assignedVehicleId: vehicles[4].id,
      leaseType: LeaseType.LONG_TERM,
      startDate: threeMonthsAgo2,
      endDate: threeMonthsFromNow2,
      durationDays: 180,
      mileagePackage: 3000,
      addOns: { additional_driver: false, cdw_waiver: false, gps_tracker: false },
      quotedTotalAed: 18000,
      vatAmountAed: 900,
      grandTotalAed: 18900,
      depositAmountAed: 3000,
      depositPaid: true,
      status: BookingStatus.CONVERTED,
      pickupLocation: 'Origin Office - Business Bay',
      dropoffLocation: 'Origin Office - Business Bay',
    },
  });

  // Booking 7: CONVERTED (Fatima Ali - Geely Coolray, expiring soon)
  const booking7 = await prisma.booking.upsert({
    where: { reference: 'BK-2025-0007' },
    update: {},
    create: {
      reference: 'BK-2025-0007',
      customerId: customers[3].id,
      vehicleId: vehicles[6].id,
      assignedVehicleId: vehicles[6].id,
      leaseType: LeaseType.SHORT_TERM,
      startDate: new Date(now.getTime() - 75 * 24 * 60 * 60 * 1000),
      endDate: new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000),
      durationDays: 90,
      mileagePackage: 3000,
      addOns: { additional_driver: false, cdw_waiver: false, gps_tracker: false },
      quotedTotalAed: 7200,
      vatAmountAed: 360,
      grandTotalAed: 7560,
      depositAmountAed: 2400,
      depositPaid: true,
      status: BookingStatus.CONVERTED,
      pickupLocation: 'JBR Walk',
      dropoffLocation: 'JBR Walk',
    },
  });

  // Booking 8: CONVERTED (Priya Sharma - Voyah Free)
  const booking8 = await prisma.booking.upsert({
    where: { reference: 'BK-2025-0008' },
    update: {},
    create: {
      reference: 'BK-2025-0008',
      customerId: customers[8].id,
      vehicleId: vehicles[12].id,
      assignedVehicleId: vehicles[12].id,
      leaseType: LeaseType.LONG_TERM,
      startDate: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000),
      endDate: new Date(now.getTime() + 120 * 24 * 60 * 60 * 1000),
      durationDays: 180,
      mileagePackage: 3500,
      addOns: { additional_driver: true, cdw_waiver: true, gps_tracker: true },
      quotedTotalAed: 19200,
      vatAmountAed: 960,
      grandTotalAed: 20160,
      depositAmountAed: 3000,
      depositPaid: true,
      status: BookingStatus.CONVERTED,
      pickupLocation: 'Marina Walk',
      dropoffLocation: 'Marina Walk',
    },
  });

  // Booking 9: CONVERTED (David Smith - Zeekr X)
  const booking9 = await prisma.booking.upsert({
    where: { reference: 'BK-2025-0009' },
    update: {},
    create: {
      reference: 'BK-2025-0009',
      customerId: customers[7].id,
      vehicleId: vehicles[14].id,
      assignedVehicleId: vehicles[14].id,
      leaseType: LeaseType.SHORT_TERM,
      startDate: new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000),
      endDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      durationDays: 75,
      mileagePackage: 2500,
      addOns: { additional_driver: false, cdw_waiver: true, gps_tracker: false },
      quotedTotalAed: 12000,
      vatAmountAed: 600,
      grandTotalAed: 12600,
      depositAmountAed: 2000,
      depositPaid: true,
      status: BookingStatus.CONVERTED,
      pickupLocation: 'Creek Harbour',
      dropoffLocation: 'Creek Harbour',
    },
  });

  // Booking 10: CONVERTED (Wei Liu - BYD Han)
  const booking10 = await prisma.booking.upsert({
    where: { reference: 'BK-2025-0010' },
    update: {},
    create: {
      reference: 'BK-2025-0010',
      customerId: customers[9].id,
      vehicleId: vehicles[16].id,
      assignedVehicleId: vehicles[16].id,
      leaseType: LeaseType.LONG_TERM,
      startDate: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      endDate: new Date(now.getTime() + 150 * 24 * 60 * 60 * 1000),
      durationDays: 180,
      mileagePackage: 3500,
      addOns: { additional_driver: true, cdw_waiver: false, gps_tracker: true },
      quotedTotalAed: 18600,
      vatAmountAed: 930,
      grandTotalAed: 19530,
      depositAmountAed: 3000,
      depositPaid: true,
      status: BookingStatus.CONVERTED,
      pickupLocation: 'Downtown Dubai',
      dropoffLocation: 'Downtown Dubai',
    },
  });

  console.log('✅ 10 bookings created (DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED, CONVERTED x5)');

  // ────────────────────────────────────────────────────────────────────────────
  // LEASES (6 total)
  // ────────────────────────────────────────────────────────────────────────────
  const twoMonthsAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  // Lease 1: ACTIVE (Ahmed Hassan - HAVAL H6)
  const lease1 = await prisma.lease.upsert({
    where: { reference: 'LS-2025-0001' },
    update: {},
    create: {
      reference: 'LS-2025-0001',
      bookingId: booking6.id,
      customerId: customers[0].id,
      vehicleId: vehicles[4].id,
      startDate: threeMonthsAgo2,
      endDate: threeMonthsFromNow2,
      monthlyRateAed: 3080,
      vatRate: 0.05,
      mileageLimitMonthly: 3000,
      status: LeaseStatus.ACTIVE,
    },
  });

  // Lease 2: ACTIVE (Fatima Ali - Geely Coolray, expiring in 15 days)
  const lease2 = await prisma.lease.upsert({
    where: { reference: 'LS-2025-0002' },
    update: {},
    create: {
      reference: 'LS-2025-0002',
      bookingId: booking7.id,
      customerId: customers[3].id,
      vehicleId: vehicles[6].id,
      startDate: new Date(now.getTime() - 75 * 24 * 60 * 60 * 1000),
      endDate: new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000),
      monthlyRateAed: 2420,
      vatRate: 0.05,
      mileageLimitMonthly: 3000,
      status: LeaseStatus.ACTIVE,
      notes: 'Lease expiring soon — renewal offer sent via WhatsApp',
    },
  });

  // Lease 3: COMPLETED (past lease)
  const lease3 = await prisma.lease.upsert({
    where: { reference: 'LS-2025-0003' },
    update: {},
    create: {
      reference: 'LS-2025-0003',
      bookingId: null,
      customerId: customers[1].id,
      vehicleId: vehicles[7].id,
      startDate: new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000),
      endDate: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
      monthlyRateAed: 2090,
      vatRate: 0.05,
      mileageLimitMonthly: 3000,
      status: LeaseStatus.COMPLETED,
      notes: 'Successfully completed — vehicle returned in excellent condition',
    },
  });

  // Lease 4: TERMINATED_EARLY
  const lease4 = await prisma.lease.upsert({
    where: { reference: 'LS-2025-0004' },
    update: {},
    create: {
      reference: 'LS-2025-0004',
      bookingId: null,
      customerId: customers[5].id,
      vehicleId: vehicles[9].id,
      startDate: new Date(now.getTime() - 120 * 24 * 60 * 60 * 1000),
      endDate: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000),
      monthlyRateAed: 4840,
      vatRate: 0.05,
      mileageLimitMonthly: 3500,
      status: LeaseStatus.TERMINATED_EARLY,
      notes: 'Terminated early due to customer relocation to home country — deposit refunded AED 1000 due to mileage overage',
    },
  });

  // Lease 5: ACTIVE (Priya Sharma - Voyah Free)
  const lease5 = await prisma.lease.upsert({
    where: { reference: 'LS-2025-0005' },
    update: {},
    create: {
      reference: 'LS-2025-0005',
      bookingId: booking8.id,
      customerId: customers[8].id,
      vehicleId: vehicles[12].id,
      startDate: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000),
      endDate: new Date(now.getTime() + 120 * 24 * 60 * 60 * 1000),
      monthlyRateAed: 4840,
      vatRate: 0.05,
      mileageLimitMonthly: 3500,
      status: LeaseStatus.ACTIVE,
    },
  });

  // Lease 6: RENEWED
  const lease6 = await prisma.lease.upsert({
    where: { reference: 'LS-2025-0006' },
    update: {},
    create: {
      reference: 'LS-2025-0006',
      bookingId: booking9.id,
      customerId: customers[7].id,
      vehicleId: vehicles[14].id,
      startDate: new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000),
      endDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      monthlyRateAed: 4400,
      vatRate: 0.05,
      mileageLimitMonthly: 2500,
      status: LeaseStatus.RENEWED,
      renewalOfId: null,
      notes: 'Renewed lease — customer very satisfied with Zeekr X performance',
    },
  });

  console.log('✅ 6 leases created (ACTIVE x3, COMPLETED, TERMINATED_EARLY, RENEWED)');

  // ────────────────────────────────────────────────────────────────────────────
  // PAYMENTS (30+ records)
  // ────────────────────────────────────────────────────────────────────────────
  // Lease 1 (Ahmed Hassan)
  await prisma.payment.create({
    data: {
      leaseId: lease1.id, customerId: customers[0].id,
      type: PaymentType.DEPOSIT, amountAed: 3000, vatAmountAed: 150, totalAed: 3150,
      dueDate: threeMonthsAgo2, paidAt: threeMonthsAgo2,
      status: PaymentStatus.PAID,
      paymentMethod: 'CARD', gateway: 'CHECKOUT_COM', gatewayReference: 'CHK-LS1-DEP',
    },
  });
  await prisma.payment.create({
    data: {
      leaseId: lease1.id, customerId: customers[0].id,
      type: PaymentType.MONTHLY, amountAed: 3080, vatAmountAed: 154, totalAed: 3234,
      dueDate: new Date(threeMonthsAgo2.getTime() + 30 * 24 * 60 * 60 * 1000),
      paidAt: new Date(threeMonthsAgo2.getTime() + 29 * 24 * 60 * 60 * 1000),
      status: PaymentStatus.PAID,
      paymentMethod: 'CARD', gateway: 'CHECKOUT_COM', gatewayReference: 'CHK-LS1-M1',
    },
  });
  await prisma.payment.create({
    data: {
      leaseId: lease1.id, customerId: customers[0].id,
      type: PaymentType.MONTHLY, amountAed: 3080, vatAmountAed: 154, totalAed: 3234,
      dueDate: new Date(threeMonthsAgo2.getTime() + 60 * 24 * 60 * 60 * 1000),
      paidAt: new Date(threeMonthsAgo2.getTime() + 58 * 24 * 60 * 60 * 1000),
      status: PaymentStatus.PAID,
      paymentMethod: 'BANK_TRANSFER', gateway: 'PAYTABS', gatewayReference: 'PT-LS1-M2',
    },
  });
  await prisma.payment.create({
    data: {
      leaseId: lease1.id, customerId: customers[0].id,
      type: PaymentType.MONTHLY, amountAed: 3080, vatAmountAed: 154, totalAed: 3234,
      dueDate: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      status: PaymentStatus.OVERDUE,
    },
  });

  // Lease 2 (Fatima Ali)
  await prisma.payment.create({
    data: {
      leaseId: lease2.id, customerId: customers[3].id,
      type: PaymentType.DEPOSIT, amountAed: 2400, vatAmountAed: 120, totalAed: 2520,
      dueDate: new Date(now.getTime() - 75 * 24 * 60 * 60 * 1000),
      paidAt: new Date(now.getTime() - 75 * 24 * 60 * 60 * 1000),
      status: PaymentStatus.PAID,
      paymentMethod: 'APPLE_PAY', gateway: 'CHECKOUT_COM', gatewayReference: 'CHK-LS2-DEP',
    },
  });
  await prisma.payment.create({
    data: {
      leaseId: lease2.id, customerId: customers[3].id,
      type: PaymentType.MONTHLY, amountAed: 2420, vatAmountAed: 121, totalAed: 2541,
      dueDate: new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000),
      paidAt: new Date(now.getTime() - 44 * 24 * 60 * 60 * 1000),
      status: PaymentStatus.PAID,
      paymentMethod: 'CARD', gateway: 'CHECKOUT_COM', gatewayReference: 'CHK-LS2-M1',
    },
  });
  await prisma.payment.create({
    data: {
      leaseId: lease2.id, customerId: customers[3].id,
      type: PaymentType.MONTHLY, amountAed: 2420, vatAmountAed: 121, totalAed: 2541,
      dueDate: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
      status: PaymentStatus.PENDING,
    },
  });

  // Lease 3 (Sarah Chen - completed)
  await prisma.payment.create({
    data: {
      leaseId: lease3.id, customerId: customers[1].id,
      type: PaymentType.DEPOSIT, amountAed: 2100, vatAmountAed: 105, totalAed: 2205,
      dueDate: new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000),
      paidAt: new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000),
      status: PaymentStatus.PAID,
      paymentMethod: 'CARD', gateway: 'CHECKOUT_COM', gatewayReference: 'CHK-LS3-DEP',
    },
  });
  for (let i = 0; i < 5; i++) {
    await prisma.payment.create({
      data: {
        leaseId: lease3.id, customerId: customers[1].id,
        type: PaymentType.MONTHLY, amountAed: 2090, vatAmountAed: 104.5, totalAed: 2194.5,
        dueDate: new Date(now.getTime() - (180 - (i * 30)) * 24 * 60 * 60 * 1000),
        paidAt: new Date(now.getTime() - (180 - (i * 30) - 1) * 24 * 60 * 60 * 1000),
        status: PaymentStatus.PAID,
        paymentMethod: 'CARD', gateway: 'CHECKOUT_COM', gatewayReference: `CHK-LS3-M${i + 1}`,
      },
    });
  }

  // Lease 4 (Michael Brown - terminated early)
  await prisma.payment.create({
    data: {
      leaseId: lease4.id, customerId: customers[5].id,
      type: PaymentType.DEPOSIT, amountAed: 4840, vatAmountAed: 242, totalAed: 5082,
      dueDate: new Date(now.getTime() - 120 * 24 * 60 * 60 * 1000),
      paidAt: new Date(now.getTime() - 120 * 24 * 60 * 60 * 1000),
      status: PaymentStatus.PAID,
      paymentMethod: 'CARD', gateway: 'CHECKOUT_COM', gatewayReference: 'CHK-LS4-DEP',
    },
  });
  for (let i = 0; i < 3; i++) {
    await prisma.payment.create({
      data: {
        leaseId: lease4.id, customerId: customers[5].id,
        type: PaymentType.MONTHLY, amountAed: 4840, vatAmountAed: 242, totalAed: 5082,
        dueDate: new Date(now.getTime() - (120 - (i * 30)) * 24 * 60 * 60 * 1000),
        paidAt: new Date(now.getTime() - (120 - (i * 30) - 1) * 24 * 60 * 60 * 1000),
        status: PaymentStatus.PAID,
        paymentMethod: 'CARD', gateway: 'CHECKOUT_COM', gatewayReference: `CHK-LS4-M${i + 1}`,
      },
    });
  }
  await prisma.payment.create({
    data: {
      leaseId: lease4.id, customerId: customers[5].id,
      type: PaymentType.PENALTY, amountAed: 1500, vatAmountAed: 75, totalAed: 1575,
      dueDate: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000),
      paidAt: new Date(now.getTime() - 19 * 24 * 60 * 60 * 1000),
      status: PaymentStatus.PAID,
      paymentMethod: 'CARD', gateway: 'CHECKOUT_COM', gatewayReference: 'CHK-LS4-PEN',
    },
  });
  await prisma.payment.create({
    data: {
      leaseId: lease4.id, customerId: customers[5].id,
      type: PaymentType.REFUND, amountAed: -3340, vatAmountAed: -167, totalAed: -3507,
      dueDate: new Date(now.getTime() - 18 * 24 * 60 * 60 * 1000),
      paidAt: new Date(now.getTime() - 18 * 24 * 60 * 60 * 1000),
      status: PaymentStatus.PAID,
      paymentMethod: 'BANK_TRANSFER', gateway: 'PAYTABS', gatewayReference: 'PT-LS4-REF',
    },
  });

  // Lease 5 (Priya Sharma - Voyah Free)
  await prisma.payment.create({
    data: {
      leaseId: lease5.id, customerId: customers[8].id,
      type: PaymentType.DEPOSIT, amountAed: 3000, vatAmountAed: 150, totalAed: 3150,
      dueDate: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000),
      paidAt: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000),
      status: PaymentStatus.PAID,
      paymentMethod: 'GOOGLE_PAY', gateway: 'CHECKOUT_COM', gatewayReference: 'CHK-LS5-DEP',
    },
  });
  await prisma.payment.create({
    data: {
      leaseId: lease5.id, customerId: customers[8].id,
      type: PaymentType.MONTHLY, amountAed: 4840, vatAmountAed: 242, totalAed: 5082,
      dueDate: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      paidAt: new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000),
      status: PaymentStatus.PAID,
      paymentMethod: 'CARD', gateway: 'CHECKOUT_COM', gatewayReference: 'CHK-LS5-M1',
    },
  });
  await prisma.payment.create({
    data: {
      leaseId: lease5.id, customerId: customers[8].id,
      type: PaymentType.MONTHLY, amountAed: 4840, vatAmountAed: 242, totalAed: 5082,
      dueDate: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
      status: PaymentStatus.PENDING,
    },
  });

  // Lease 6 (David Smith - Zeekr X)
  await prisma.payment.create({
    data: {
      leaseId: lease6.id, customerId: customers[7].id,
      type: PaymentType.DEPOSIT, amountAed: 2000, vatAmountAed: 100, totalAed: 2100,
      dueDate: new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000),
      paidAt: new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000),
      status: PaymentStatus.PAID,
      paymentMethod: 'CARD', gateway: 'CHECKOUT_COM', gatewayReference: 'CHK-LS6-DEP',
    },
  });
  await prisma.payment.create({
    data: {
      leaseId: lease6.id, customerId: customers[7].id,
      type: PaymentType.MONTHLY, amountAed: 4400, vatAmountAed: 220, totalAed: 4620,
      dueDate: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000),
      paidAt: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000),
      status: PaymentStatus.PAID,
      paymentMethod: 'CARD', gateway: 'CHECKOUT_COM', gatewayReference: 'CHK-LS6-M1',
    },
  });
  await prisma.payment.create({
    data: {
      leaseId: lease6.id, customerId: customers[7].id,
      type: PaymentType.MONTHLY, amountAed: 4400, vatAmountAed: 220, totalAed: 4620,
      dueDate: new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000),
      status: PaymentStatus.PENDING,
    },
  });

  console.log('✅ 30+ payments created');

  // ────────────────────────────────────────────────────────────────────────────
  // NOTIFICATION LOGS (12 records)
  // ────────────────────────────────────────────────────────────────────────────
  const notificationData = [
    {
      customerId: customers[0].id, channel: NotificationChannel.WHATSAPP, template: 'booking_confirmation',
      language: Language.ar, contentSnapshot: 'تم استقبال حجزك بنجاح. سيصلك رابط الدفع قريبا.', status: NotificationStatus.DELIVERED,
      metadata: { bookingId: booking6.id, bookingRef: 'BK-2025-0006' },
    },
    {
      customerId: customers[0].id, channel: NotificationChannel.EMAIL, template: 'booking_confirmation',
      language: Language.ar, contentSnapshot: 'Booking Confirmation for HAVAL H6 - BK-2025-0006', status: NotificationStatus.DELIVERED,
      metadata: { bookingId: booking6.id, bookingRef: 'BK-2025-0006' },
    },
    {
      customerId: customers[3].id, channel: NotificationChannel.WHATSAPP, template: 'booking_confirmation',
      language: Language.ar, contentSnapshot: 'تم تأكيد حجزك للسيارة Geely Coolray', status: NotificationStatus.DELIVERED,
      metadata: { bookingId: booking7.id, bookingRef: 'BK-2025-0007' },
    },
    {
      customerId: customers[0].id, channel: NotificationChannel.WHATSAPP, template: 'payment_reminder',
      language: Language.ar, contentSnapshot: 'تذكير: دفعة الإيجار الشهرية مستحقة في 10 أبريل', status: NotificationStatus.SENT,
      metadata: { leaseId: lease1.id, dueDate: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000) },
    },
    {
      customerId: customers[3].id, channel: NotificationChannel.WHATSAPP, template: 'payment_reminder',
      language: Language.ar, contentSnapshot: 'Reminder: Your monthly lease payment is due in 5 days', status: NotificationStatus.SENT,
      metadata: { leaseId: lease2.id, dueDate: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000) },
    },
    {
      customerId: customers[3].id, channel: NotificationChannel.WHATSAPP, template: 'lease_renewal_reminder',
      language: Language.ar, contentSnapshot: 'عرض تجديد الإيجار: استمتع بـ Geely Coolray لفترة أخرى', status: NotificationStatus.DELIVERED,
      metadata: { leaseId: lease2.id, renewalOfferId: 'REN-2025-0001' },
    },
    {
      customerId: customers[3].id, channel: NotificationChannel.EMAIL, template: 'lease_renewal_reminder',
      language: Language.ar, contentSnapshot: 'Lease Renewal Offer - LS-2025-0002', status: NotificationStatus.DELIVERED,
      metadata: { leaseId: lease2.id, renewalOfferId: 'REN-2025-0001' },
    },
    {
      customerId: customers[2].id, channel: NotificationChannel.SMS, template: 'kyc_status_update',
      language: Language.en, contentSnapshot: 'Your KYC documents are under review. We will notify you once approved.', status: NotificationStatus.DELIVERED,
      metadata: { kycStatus: KycStatus.SUBMITTED },
    },
    {
      customerId: customers[6].id, channel: NotificationChannel.EMAIL, template: 'kyc_rejected',
      language: Language.ar, contentSnapshot: 'تم رفض وثائقك لأن بطاقة الهوية منتهية الصلاحية', status: NotificationStatus.DELIVERED,
      metadata: { rejectionReason: 'Expired Emirates ID' },
    },
    {
      customerId: customers[0].id, channel: NotificationChannel.SMS, template: 'payment_failed',
      language: Language.ar, contentSnapshot: 'فشل الدفع. يرجى إعادة المحاولة أو الاتصال بنا.', status: NotificationStatus.FAILED,
      metadata: { errorCode: 'INSUFFICIENT_FUNDS' },
    },
    {
      customerId: customers[1].id, channel: NotificationChannel.EMAIL, template: 'lease_completed',
      language: Language.en, contentSnapshot: 'Thank you for leasing with Origin. Your lease LS-2025-0003 has been completed.', status: NotificationStatus.DELIVERED,
      metadata: { leaseId: lease3.id, leaseRef: 'LS-2025-0003' },
    },
    {
      customerId: customers[0].id, channel: NotificationChannel.PUSH, template: 'vehicle_ready_for_delivery',
      language: Language.ar, contentSnapshot: 'سيارتك جاهزة للاستلام في Business Bay', status: NotificationStatus.DELIVERED,
      metadata: { vehicleId: vehicles[4].id, pickupLocation: 'Origin Office - Business Bay' },
    },
  ];

  for (const notif of notificationData) {
    await prisma.notificationLog.create({
      data: {
        customerId: notif.customerId,
        channel: notif.channel,
        template: notif.template,
        language: notif.language,
        contentSnapshot: notif.contentSnapshot,
        status: notif.status,
        metadata: notif.metadata,
        sentAt: now,
      },
    });
  }

  console.log('✅ 12 notification logs created');

  // ────────────────────────────────────────────────────────────────────────────
  // CONTACT INQUIRIES (6 records)
  // ────────────────────────────────────────────────────────────────────────────
  const contactInquiries = [
    {
      name: 'Hassan Al-Mansoori',
      email: 'hassan@example.ae',
      phone: '+971501234567',
      subject: 'Pricing inquiry - BYD Atto 3',
      message: 'I am interested in the BYD Atto 3. What is the daily and monthly rate? Do you offer any discounts for long-term rentals?',
    },
    {
      name: 'Zhang Wei',
      email: 'zhangwei@example.cn',
      phone: '+971551234567',
      subject: 'NIO ES6 availability',
      message: '你们的NIO ES6什么时候有货?我需要从5月开始租用。能否预订?',
    },
    {
      name: 'James Patterson',
      email: 'jpatterson@example.com',
      phone: '+971521234567',
      subject: 'Insurance and coverage details',
      message: 'I want to know about your insurance options. Does the lease include comprehensive coverage? What about additional drivers?',
    },
    {
      name: 'Amara Khan',
      email: 'amara.khan@example.ae',
      phone: null,
      subject: 'Complaint - Late vehicle delivery',
      message: 'I booked a vehicle for 1 April, but it was delivered 2 hours late. This caused me to miss an important meeting. I expect compensation.',
    },
    {
      name: 'Raj Patel',
      email: 'raj.patel@example.com',
      phone: '+971561234567',
      subject: 'Corporate fleet inquiry',
      message: 'We are looking for a long-term fleet solution for 5-10 vehicles. Can you provide bulk pricing?',
    },
    {
      name: 'Sofia Chen',
      email: 'sofia.chen@example.com',
      phone: '+971581234567',
      subject: 'Voyah Dreamer MPV',
      message: 'Interested in the Voyah Dreamer for a family trip. Is GPS and child seat available as add-ons? What mileage limits are included?',
    },
  ];

  for (const inquiry of contactInquiries) {
    await prisma.contactInquiry.create({
      data: inquiry,
    });
  }

  console.log('✅ 6 contact inquiries created');

  // ────────────────────────────────────────────────────────────────────────────
  // ADMIN USERS (4 total)
  // ────────────────────────────────────────────────────────────────────────────
  const hashedPassword = await bcrypt.hash('ChangeMe123!', 12);

  const adminUsers = [
    { email: 'admin@originleasing.ae', fullName: 'Origin Admin', role: AdminRole.SUPER_ADMIN },
    { email: 'fleet@originleasing.ae', fullName: 'Fleet Manager', role: AdminRole.FLEET_MANAGER },
    { email: 'sales@originleasing.ae', fullName: 'Sales Team', role: AdminRole.SALES },
    { email: 'finance@originleasing.ae', fullName: 'Finance Team', role: AdminRole.FINANCE },
  ];

  for (const admin of adminUsers) {
    await prisma.adminUser.upsert({
      where: { email: admin.email },
      update: {},
      create: {
        email: admin.email,
        password: hashedPassword,
        fullName: admin.fullName,
        role: admin.role,
        isActive: true,
      },
    });
  }

  console.log('✅ 4 admin users created');

  console.log('\n✨ Seed complete! Database populated with comprehensive test data.\n');
  console.log('📊 Summary:');
  console.log('   - 5 vehicle categories');
  console.log('   - 17 vehicles (8 existing + 10 new)');
  console.log('   - 12 customers (5 existing + 7 new)');
  console.log('   - 23 KYC documents');
  console.log('   - 10 bookings (covering all statuses)');
  console.log('   - 6 leases (covering all statuses)');
  console.log('   - 30+ payments (multiple statuses)');
  console.log('   - 12 notification logs (trilingual)');
  console.log('   - 6 contact inquiries');
  console.log('   - 4 admin users\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
