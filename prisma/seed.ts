import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Clear existing data in correct dependency order
  await prisma.auditLog.deleteMany({});
  await prisma.systemSettings.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.supportTicket.deleteMany({});
  await prisma.review.deleteMany({});
  await prisma.payout.deleteMany({});
  await prisma.refund.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.bookingItem.deleteMany({});
  await prisma.bookingStatusHistory.deleteMany({});
  await prisma.booking.deleteMany({});
  await prisma.favoriteProvider.deleteMany({});
  await prisma.providerAvailability.deleteMany({});
  await prisma.providerService.deleteMany({});
  await prisma.address.deleteMany({});
  await prisma.coupon.deleteMany({});
  await prisma.service.deleteMany({});
  await prisma.serviceCategory.deleteMany({});
  await prisma.providerProfile.deleteMany({});
  await prisma.customerProfile.deleteMany({});
  await prisma.user.deleteMany({});

  // 2. System Settings
  await prisma.systemSettings.createMany({
    data: [
      { key: 'platform_commission_percent', value: '20' },
      { key: 'tax_rate_percent', value: '18' },
      { key: 'cancellation_free_hours', value: '24' },
      { key: 'cancellation_fee_6to24_hours', value: '100' },
      { key: 'cancellation_fee_under6_hours', value: '250' },
      { key: 'max_booking_distance_km', value: '15' },
    ],
  });

  // 3. Service Categories & Services
  const houseCleaning = await prisma.serviceCategory.create({
    data: {
      name: 'House Cleaning',
      description: 'Full home dusting, vacuuming, mopping and deep cleaning services.',
      icon: '🧹',
      services: {
        create: [
          { name: 'Full Home Cleaning', description: 'Complete deep cleaning of all rooms, balconies and bathrooms.', price: 1999, durationMinutes: 240 },
          { name: 'Regular Home Cleaning', description: 'Standard dusting, sweeping and mopping.', price: 999, durationMinutes: 120 },
          { name: 'Deep Cleaning', description: 'Intense scrubbing and sanitization of surfaces.', price: 2999, durationMinutes: 300 },
          { name: 'Sofa Cleaning', description: 'Vacuuming and shampooing of fabric/leather sofas.', price: 699, durationMinutes: 90 },
          { name: 'Carpet Cleaning', description: 'Deep carpet shampooing and stain removal.', price: 599, durationMinutes: 60 },
        ],
      },
    },
  });

  const bathroomCleaning = await prisma.serviceCategory.create({
    data: {
      name: 'Bathroom Cleaning',
      description: 'Scrubbing and sanitizing toilets, showers, tiles, and fittings.',
      icon: '🚿',
      services: {
        create: [
          { name: 'Basic Bathroom Cleaning', description: 'Standard cleaning of toilet bowl, sink and floor.', price: 299, durationMinutes: 45 },
          { name: 'Deep Bathroom Cleaning', description: 'Acid wash, stain removal, mirror polishing and sanitization.', price: 499, durationMinutes: 90 },
          { name: 'Multiple Bathroom Package', description: 'Deep cleaning package for 3+ bathrooms.', price: 1199, durationMinutes: 180 },
        ],
      },
    },
  });

  const kitchenCleaning = await prisma.serviceCategory.create({
    data: {
      name: 'Kitchen Cleaning',
      description: 'Oil degreasing, chimney and stove cleaning, cabinet scrubbing.',
      icon: '🍳',
      services: {
        create: [
          { name: 'Basic Kitchen Cleaning', description: 'Slab cleaning, sink scrub, and floor mopping.', price: 399, durationMinutes: 60 },
          { name: 'Deep Kitchen Cleaning', description: 'Tile degreasing, cabinet cleaning, stove and sink deep scrub.', price: 999, durationMinutes: 180 },
          { name: 'Chimney Cleaning', description: 'Internal filter cleaning and outer body degreasing.', price: 799, durationMinutes: 90 },
          { name: 'Refrigerator Cleaning', description: 'Internal and external cleaning of fridge.', price: 499, durationMinutes: 60 },
        ],
      },
    },
  });

  const cooking = await prisma.serviceCategory.create({
    data: {
      name: 'Cooking Services',
      description: 'Professional home cooks for delicious meals of your preference.',
      icon: '👩‍🍳',
      services: {
        create: [
          { name: 'Breakfast Cooking', description: 'Preparing fresh breakfast for up to 4 people.', price: 349, durationMinutes: 90 },
          { name: 'Lunch Cooking', description: 'Preparing full lunch meals (North/South Indian style).', price: 449, durationMinutes: 120 },
          { name: 'Dinner Cooking', description: 'Preparing full dinner meals.', price: 449, durationMinutes: 120 },
          { name: 'Full-Day Cook', description: 'Breakfast, Lunch and Dinner cooking service.', price: 1199, durationMinutes: 360 },
        ],
      },
    },
  });

  const babyCare = await prisma.serviceCategory.create({
    data: {
      name: 'Baby Care',
      description: 'Experienced, identity-verified babysitters and caretaker services.',
      icon: '👶',
      services: {
        create: [
          { name: 'Babysitter (Part-Time)', description: 'Child care for 4 hours.', price: 799, durationMinutes: 240 },
          { name: 'Baby Caretaker (Full-Day)', description: 'Full-day dedicated child monitoring and assistance (8 hrs).', price: 1499, durationMinutes: 480 },
        ],
      },
    },
  });

  const elderCare = await prisma.serviceCategory.create({
    data: {
      name: 'Elder Care',
      description: 'Non-medical home assistance, companionship, and daily support.',
      icon: '👴',
      services: {
        create: [
          { name: 'Companion Care (Part-Time)', description: 'Companionship, reading, walking assistance (4 hrs).', price: 699, durationMinutes: 240 },
          { name: 'Elderly Daily Assistance (Full-Day)', description: 'Full day support with meals, hygiene, walking and exercises (8 hrs).', price: 1299, durationMinutes: 480 },
        ],
      },
    },
  });

  console.log('Categories and services seeded.');

  // 4. Create Users
  // Admin
  const adminUser = await prisma.user.create({
    data: {
      phone: '+919999999999',
      name: 'Home Maidly Admin',
      role: 'ADMIN',
    },
  });

  // Customers
  const customer1 = await prisma.user.create({
    data: {
      phone: '+919876543210',
      name: 'Arjun Kumar',
      role: 'CUSTOMER',
      customerProfile: {
        create: {},
      },
    },
    include: { customerProfile: true },
  });

  const customer2 = await prisma.user.create({
    data: {
      phone: '+919123456789',
      name: 'Sneha Reddy',
      role: 'CUSTOMER',
      customerProfile: {
        create: {},
      },
    },
    include: { customerProfile: true },
  });

  // Providers
  // Provider 1: House Cleaning Specialist
  const provider1 = await prisma.user.create({
    data: {
      phone: '+918888888888',
      name: 'Ramesh Kumar',
      role: 'PROVIDER',
      providerProfile: {
        create: {
          kycStatus: 'ACTIVE',
          experienceYears: 5,
          rating: 4.8,
          completedJobsCount: 142,
          languages: 'English, Hindi',
          serviceAreas: 'Gachibowli, Jubilee Hills, Madhapur',
          bankName: 'HDFC Bank',
          bankAccountNumber: '50100234567890',
          bankIfscCode: 'HDFC0000021',
          kycDocumentType: 'Aadhaar Card',
          kycDocumentUrl: 'https://homemaidly.com/kyc/ramesh.pdf',
        },
      },
    },
    include: { providerProfile: true },
  });

  // Provider 2: Cooking Expert
  const provider2 = await prisma.user.create({
    data: {
      phone: '+917777777777',
      name: 'Lakshmi Devi',
      role: 'PROVIDER',
      providerProfile: {
        create: {
          kycStatus: 'ACTIVE',
          experienceYears: 8,
          rating: 4.9,
          completedJobsCount: 215,
          languages: 'Telugu, Hindi',
          serviceAreas: 'Kondapur, Kukatpally, Madhapur',
          bankName: 'State Bank of India',
          bankAccountNumber: '30245678901',
          bankIfscCode: 'SBIN0004561',
          kycDocumentType: 'PAN Card',
          kycDocumentUrl: 'https://homemaidly.com/kyc/lakshmi.pdf',
        },
      },
    },
    include: { providerProfile: true },
  });

  // Provider 3: Certified Caretaker (Baby / Elder)
  const provider3 = await prisma.user.create({
    data: {
      phone: '+916666666666',
      name: 'Priya Sharma',
      role: 'PROVIDER',
      providerProfile: {
        create: {
          kycStatus: 'ACTIVE',
          experienceYears: 6,
          rating: 4.7,
          completedJobsCount: 89,
          languages: 'English, Hindi, Punjabi',
          serviceAreas: 'Banjara Hills, Jubilee Hills',
          bankName: 'ICICI Bank',
          bankAccountNumber: '000401567890',
          bankIfscCode: 'ICIC0000004',
          kycDocumentType: 'Passport',
          kycDocumentUrl: 'https://homemaidly.com/kyc/priya.pdf',
        },
      },
    },
    include: { providerProfile: true },
  });

  // Provider 4: Pending Verification
  const provider4 = await prisma.user.create({
    data: {
      phone: '+915555555555',
      name: 'Vikram Singh',
      role: 'PROVIDER',
      providerProfile: {
        create: {
          kycStatus: 'PENDING_VERIFICATION',
          experienceYears: 3,
          rating: 0.0,
          completedJobsCount: 0,
          languages: 'Hindi, Punjabi',
          serviceAreas: 'Secunderabad',
          bankName: 'Axis Bank',
          bankAccountNumber: '915010045678901',
          bankIfscCode: 'UTIB0000082',
          kycDocumentType: 'Aadhaar Card',
          kycDocumentUrl: 'https://homemaidly.com/kyc/vikram.pdf',
        },
      },
    },
    include: { providerProfile: true },
  });

  console.log('Users and profiles seeded.');

  // 5. Link Providers to Services
  const allServices = await prisma.service.findMany();
  
  // Ramesh: Cleaning services
  const houseCleanSvs = allServices.filter(s => s.categoryId === houseCleaning.id || s.categoryId === bathroomCleaning.id || s.categoryId === kitchenCleaning.id);
  for (const s of houseCleanSvs) {
    await prisma.providerService.create({
      data: {
        providerId: provider1.providerProfile!.id,
        serviceId: s.id,
      },
    });
  }

  // Lakshmi: Cooking + Kitchen Cleaning
  const cookAndKitchenSvs = allServices.filter(s => s.categoryId === cooking.id || s.categoryId === kitchenCleaning.id);
  for (const s of cookAndKitchenSvs) {
    await prisma.providerService.create({
      data: {
        providerId: provider2.providerProfile!.id,
        serviceId: s.id,
      },
    });
  }

  // Priya: Baby Care + Elder Care
  const careSvs = allServices.filter(s => s.categoryId === babyCare.id || s.categoryId === elderCare.id);
  for (const s of careSvs) {
    await prisma.providerService.create({
      data: {
        providerId: provider3.providerProfile!.id,
        serviceId: s.id,
      },
    });
  }

  // Vikram: House Cleaning
  for (const s of houseCleanSvs) {
    await prisma.providerService.create({
      data: {
        providerId: provider4.providerProfile!.id,
        serviceId: s.id,
      },
    });
  }

  console.log('Provider services linked.');

  // 6. Provider Availabilities (Day 0 to 6)
  const providerProfiles = [
    provider1.providerProfile!,
    provider2.providerProfile!,
    provider3.providerProfile!,
    provider4.providerProfile!,
  ];

  for (const p of providerProfiles) {
    for (let day = 0; day <= 6; day++) {
      await prisma.providerAvailability.create({
        data: {
          providerId: p.id,
          dayOfWeek: day,
          startTime: '09:00',
          endTime: '18:00',
          isAvailable: day !== 0, // Available Monday-Saturday, Sunday holiday
        },
      });
    }
  }

  console.log('Provider availabilities initialized.');

  // 7. Saved Addresses
  await prisma.address.create({
    data: {
      customerId: customer1.customerProfile!.id,
      title: 'Home',
      addressLine: 'Flat 402, Green Meadows, Gachibowli',
      city: 'Hyderabad',
      state: 'Telangana',
      pincode: '500032',
      latitude: 17.4483,
      longitude: 78.3741,
    },
  });

  await prisma.address.create({
    data: {
      customerId: customer1.customerProfile!.id,
      title: 'Work',
      addressLine: 'Building 12, Mindspace IT Park, Madhapur',
      city: 'Hyderabad',
      state: 'Telangana',
      pincode: '500081',
      latitude: 17.4416,
      longitude: 78.3826,
    },
  });

  await prisma.address.create({
    data: {
      customerId: customer2.customerProfile!.id,
      title: 'Home',
      addressLine: 'Villa 18, Royal Enclave, Jubilee Hills',
      city: 'Hyderabad',
      state: 'Telangana',
      pincode: '500033',
      latitude: 17.4278,
      longitude: 78.4069,
    },
  });

  console.log('Addresses seeded.');

  // 8. Coupons
  await prisma.coupon.createMany({
    data: [
      {
        code: 'MAIDLY20',
        discountType: 'PERCENT',
        discountValue: 20.0,
        minOrderAmount: 499.0,
        maxDiscountAmount: 200.0,
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        usageLimit: 500,
        isActive: true,
      },
      {
        code: 'WELCOME100',
        discountType: 'FIXED',
        discountValue: 100.0,
        minOrderAmount: 299.0,
        startDate: new Date(),
        endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
        usageLimit: 1000,
        isActive: true,
      },
    ],
  });

  console.log('Coupons seeded.');
  console.log('Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
