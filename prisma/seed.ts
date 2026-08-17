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
