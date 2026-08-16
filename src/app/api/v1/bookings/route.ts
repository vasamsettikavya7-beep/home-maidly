import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getAuthenticatedUser, generateApiResponse, authorizeRoles } from '@/lib/auth-helper';

// GET bookings list based on user role
export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return generateApiResponse(false, null, 'Unauthorized', 401, 'UNAUTHORIZED');
  }

  try {
    let bookings: any[] = [];

    if (user.role === 'CUSTOMER') {
      bookings = await db.booking.findMany({
        where: { customerId: user.dbUser.customerProfile.id },
        include: {
          items: { include: { service: true } },
          address: true,
          provider: { include: { user: true } },
          payment: true,
          review: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    } else if (user.role === 'PROVIDER') {
      bookings = await db.booking.findMany({
        where: { providerId: user.dbUser.providerProfile.id },
        include: {
          items: { include: { service: true } },
          address: true,
          customer: { include: { user: true } },
          payment: true,
          review: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    } else if (user.role === 'ADMIN') {
      bookings = await db.booking.findMany({
        include: {
          items: { include: { service: true } },
          address: true,
          customer: { include: { user: true } },
          provider: { include: { user: true } },
          payment: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    return generateApiResponse(true, { bookings });
  } catch (error: any) {
    console.error('[Get Bookings API Error]', error);
    return generateApiResponse(false, null, 'Failed to retrieve bookings.', 500, 'FETCH_FAILED');
  }
}

// POST: Create a new booking
export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user || user.role !== 'CUSTOMER') {
    return generateApiResponse(false, null, 'Only customers can create bookings.', 401, 'UNAUTHORIZED');
  }

  try {
    const { addressId, bookingDate, timeSlot, items, couponCode, specialInstructions } = await req.json();

    if (!addressId || !bookingDate || !timeSlot || !items || !Array.isArray(items) || items.length === 0) {
      return generateApiResponse(false, null, 'Required booking details are missing.', 400, 'BAD_REQUEST');
    }

    // 1. Verify address belongs to customer
    const address = await db.address.findFirst({
      where: { id: addressId, customerId: user.dbUser.customerProfile.id },
    });

    if (!address) {
      return generateApiResponse(false, null, 'Selected address was not found.', 400, 'ADDRESS_NOT_FOUND');
    }

    // 2. Load system configurations
    const settings = await db.systemSettings.findMany();
    const configMap = new Map(settings.map((s) => [s.key, s.value]));
    const taxRate = parseFloat(configMap.get('tax_rate_percent') || '18') / 100;

    // 3. Load services and calculate prices
    let subtotal = 0;
    const bookingItemsToCreate: any[] = [];

    for (const item of items) {
      const service = await db.service.findUnique({
        where: { id: item.serviceId },
      });

      if (!service) {
        return generateApiResponse(false, null, `Service ID ${item.serviceId} not found.`, 400, 'SERVICE_NOT_FOUND');
      }

      const quantity = item.quantity || 1;
      const price = service.price * quantity;
      subtotal += price;

      bookingItemsToCreate.push({
        serviceId: service.id,
        quantity,
        price: service.price,
      });
    }

    // 4. Validate Coupon and calculate discount
    let discount = 0;
    if (couponCode) {
      const coupon = await db.coupon.findUnique({
        where: { code: couponCode, isActive: true },
      });

      if (!coupon) {
        return generateApiResponse(false, null, 'Invalid or inactive coupon code.', 400, 'INVALID_COUPON');
      }

      const now = new Date();
      if (now < coupon.startDate || now > coupon.endDate) {
        return generateApiResponse(false, null, 'Coupon code has expired.', 400, 'EXPIRED_COUPON');
      }

      if (subtotal < coupon.minOrderAmount) {
        return generateApiResponse(
          false,
          null,
          `Minimum order value for this coupon is ₹${coupon.minOrderAmount}.`,
          400,
          `COUPON_MIN_ORDER_NOT_MET`
        );
      }

      if (coupon.usedCount >= coupon.usageLimit) {
        return generateApiResponse(false, null, 'Coupon usage limit reached.', 400, 'COUPON_LIMIT_EXCEEDED');
      }

      // Check per user usage limit
      const usageCount = await db.booking.count({
        where: { customerId: user.dbUser.customerProfile.id, couponCode: coupon.code, status: { not: 'CANCELLED' } },
      });

      if (usageCount >= coupon.perUserLimit) {
        return generateApiResponse(false, null, 'You have already used this coupon code.', 400, 'COUPON_USER_LIMIT');
      }

      if (coupon.discountType === 'PERCENT') {
        discount = (subtotal * coupon.discountValue) / 100;
        if (coupon.maxDiscountAmount && discount > coupon.maxDiscountAmount) {
          discount = coupon.maxDiscountAmount;
        }
      } else if (coupon.discountType === 'FIXED') {
        discount = coupon.discountValue;
      }

      // Ensure discount doesn't exceed subtotal
      discount = Math.min(discount, subtotal);
    }

    // Calculate final billing amounts
    const tax = Math.round((subtotal - discount) * taxRate * 100) / 100;
    const totalAmount = subtotal - discount + tax;

    // 5. Create Booking within atomic Transaction
    const newBooking = await db.$transaction(async (tx) => {
      // Increment coupon count if applicable
      if (couponCode) {
        await tx.coupon.update({
          where: { code: couponCode },
          data: { usedCount: { increment: 1 } },
        });
      }

      // Create human readable booking number
      const count = await tx.booking.count();
      const bookingNumber = `HM-${10000 + count + 1}`;

      // Create booking record
      const booking = await tx.booking.create({
        data: {
          bookingNumber,
          customerId: user.dbUser.customerProfile.id,
          addressId,
          bookingDate,
          timeSlot,
          subtotal,
          discount,
          tax,
          totalAmount,
          specialInstructions,
          couponCode: couponCode || null,
          status: 'BOOKING_CREATED',
          items: {
            create: bookingItemsToCreate,
          },
          statusHistory: {
            create: {
              status: 'BOOKING_CREATED',
              remarks: 'Booking created. Awaiting payment initialization.',
            },
          },
        },
        include: {
          items: { include: { service: true } },
          address: true,
        },
      });

      return booking;
    });

    return generateApiResponse(true, { booking: newBooking }, 'Booking created successfully. Proceed to payment.');
  } catch (error: any) {
    console.error('[Create Booking API Error]', error);
    return generateApiResponse(false, null, 'Failed to create booking.', 500, 'BOOKING_CREATION_FAILED');
  }
}
