import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getAuthenticatedUser, generateApiResponse } from '@/lib/auth-helper';
import { paymentService } from '@/lib/payments/PaymentService';

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user || user.role !== 'CUSTOMER') {
    return generateApiResponse(false, null, 'Unauthorized', 401, 'UNAUTHORIZED');
  }

  try {
    const { bookingId, gateway } = await req.json();

    if (!bookingId) {
      return generateApiResponse(false, null, 'Booking ID is required.', 400, 'BAD_REQUEST');
    }

    const targetGateway = gateway || paymentService.getActiveGatewayName();

    // 1. Fetch booking and verify customer
    const booking = await db.booking.findUnique({
      where: { id: bookingId },
      include: { customer: true, payment: true },
    });

    if (!booking) {
      return generateApiResponse(false, null, 'Booking not found.', 404, 'NOT_FOUND');
    }

    if (booking.customerId !== user.dbUser.customerProfile.id) {
      return generateApiResponse(false, null, 'Forbidden.', 403, 'FORBIDDEN');
    }

    // Allow retry if payment failed or is pending
    const ALLOWED_INITIAL_STATES = ['BOOKING_CREATED', 'PAYMENT_PENDING', 'FAILED'];
    if (!ALLOWED_INITIAL_STATES.includes(booking.status)) {
      return generateApiResponse(
        false,
        null,
        `Cannot pay for booking in status: ${booking.status}`,
        400,
        'INVALID_BOOKING_STATUS'
      );
    }

    // 2. Initialize order at selected payment gateway
    const paymentGateway = paymentService.getGateway(targetGateway);
    const order = await paymentGateway.createOrder(booking.totalAmount, 'INR', booking.id);

    // 3. Upsert Payment log and update booking status to PAYMENT_PENDING inside transaction
    const updatedBooking = await db.$transaction(async (tx) => {
      // Upsert payment entry
      const paymentData = {
        bookingId: booking.id,
        transactionId: order.transactionId,
        paymentGateway: order.paymentGateway,
        status: 'INITIATED',
        amount: booking.totalAmount,
        currency: 'INR',
        gatewayOrderId: order.gatewayOrderId,
      };

      await tx.payment.upsert({
        where: { bookingId: booking.id },
        update: {
          transactionId: order.transactionId,
          paymentGateway: order.paymentGateway,
          status: 'INITIATED',
          gatewayOrderId: order.gatewayOrderId,
        },
        create: paymentData,
      });

      // Update booking status
      const b = await tx.booking.update({
        where: { id: booking.id },
        data: { status: 'PAYMENT_PENDING' },
        include: { payment: true },
      });

      // Log status history if changed
      if (booking.status !== 'PAYMENT_PENDING') {
        await tx.bookingStatusHistory.create({
          data: {
            bookingId: booking.id,
            status: 'PAYMENT_PENDING',
            remarks: `Payment checkout initialized using ${order.paymentGateway} gateway.`,
          },
        });
      }

      return b;
    });

    return generateApiResponse(
      true,
      {
        bookingId: updatedBooking.id,
        gatewayOrderId: order.gatewayOrderId,
        transactionId: order.transactionId,
        gatewayName: order.paymentGateway,
        amount: updatedBooking.totalAmount,
      },
      'Payment initialized successfully.'
    );
  } catch (error: any) {
    console.error('[Initialize Payment API Error]', error);
    return generateApiResponse(false, null, 'Failed to initialize payment.', 500, 'PAYMENT_INIT_FAILED');
  }
}
