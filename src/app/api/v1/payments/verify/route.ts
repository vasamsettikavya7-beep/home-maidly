import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getAuthenticatedUser, generateApiResponse } from '@/lib/auth-helper';
import { paymentService } from '@/lib/payments/PaymentService';
import { autoAssignProvider } from '@/lib/assignment/scoring';
import { notificationService } from '@/lib/notifications/service';
import { sendSmsNotification } from '@/lib/sms/fast2sms';

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user || user.role !== 'CUSTOMER') {
    return generateApiResponse(false, null, 'Unauthorized', 401, 'UNAUTHORIZED');
  }

  try {
    const { gatewayOrderId, gatewayPaymentId, gatewaySignature, gatewayName } = await req.json();

    if (!gatewayOrderId || !gatewayPaymentId) {
      return generateApiResponse(false, null, 'Payment order verification fields are required.', 400, 'BAD_REQUEST');
    }

    // 1. Fetch payment by order ID
    const payment = await db.payment.findFirst({
      where: { gatewayOrderId },
      include: { booking: { include: { customer: true } } },
    });

    if (!payment) {
      return generateApiResponse(false, null, 'Payment order records not found.', 404, 'NOT_FOUND');
    }

    if (payment.booking.customerId !== user.dbUser.customerProfile.id) {
      return generateApiResponse(false, null, 'Forbidden.', 403, 'FORBIDDEN');
    }

    // If payment is already captured, simply return success (idempotency check)
    if (payment.status === 'CAPTURED') {
      return generateApiResponse(true, { bookingId: payment.bookingId }, 'Payment verified already.');
    }

    // 2. Query gateway adapter to verify payment
    const activeGatewayName = gatewayName || payment.paymentGateway;
    const gateway = paymentService.getGateway(activeGatewayName);
    const verification = await gateway.verifyPayment(gatewayPaymentId, gatewayOrderId, gatewaySignature);

    if (!verification.success) {
      await db.$transaction(async (tx) => {
        await tx.payment.update({
          where: { id: payment.id },
          data: { status: 'FAILED' },
        });
        await tx.booking.update({
          where: { id: payment.bookingId },
          data: { status: 'FAILED' },
        });
        await tx.bookingStatusHistory.create({
          data: {
            bookingId: payment.bookingId,
            status: 'FAILED',
            remarks: `Payment verification failed. Signature validation rejected.`,
          },
        });
      });

      notificationService.notifyPaymentFailed(payment.booking.bookingNumber, payment.booking.customerId, 'Payment signature verification failed.');
      return generateApiResponse(false, null, 'Payment verification failed.', 400, 'PAYMENT_FAILED');
    }

    // 3. Confirm payment and trigger assignment within transaction
    const finalBooking = await db.$transaction(async (tx) => {
      // Update payment
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: 'CAPTURED',
          paymentMethod: verification.paymentMethod || 'UPI',
          gatewayPaymentId,
          gatewaySignature,
        },
      });

      // Update Booking
      const b = await tx.booking.update({
        where: { id: payment.bookingId },
        data: { status: 'PAYMENT_SUCCESS' },
        include: { customer: { include: { user: true } }, provider: { include: { user: true } } },
      });

      // Log status change
      await tx.bookingStatusHistory.create({
        data: {
          bookingId: payment.bookingId,
          status: 'PAYMENT_SUCCESS',
          remarks: `Payment verified successfully via ${activeGatewayName}.`,
        },
      });

      return b;
    });

    // Notify customer booking is paid
    notificationService.notifyBookingConfirmed(
      finalBooking.bookingNumber,
      finalBooking.customerId,
      finalBooking.customer.user.phone,
      finalBooking.totalAmount
    );

    // Send Fast2SMS verification notification
    sendSmsNotification(
      finalBooking.customer.user.phone,
      `Your booking ${finalBooking.bookingNumber} has been created successfully! We are matching a professional helper for you shortly. Amount paid: INR ${finalBooking.totalAmount}.`
    );

    // 4. SMART ASSIGNMENT EXECUTION
    const assignResult = await autoAssignProvider(finalBooking.id);

    if (assignResult.success) {
      // Fetch fresh booking info to get matched provider name
      const freshBooking = await db.booking.findUnique({
        where: { id: finalBooking.id },
        include: { provider: { include: { user: true } }, customer: { include: { user: true } } },
      });
      if (freshBooking?.provider) {
        notificationService.notifyProviderAssigned(
          freshBooking.bookingNumber,
          freshBooking.customerId,
          freshBooking.provider.user.name
        );

        // Send Fast2SMS helper assignment SMS to helper
        sendSmsNotification(
          freshBooking.provider.user.phone,
          `You have a new work assignment! Booking ${freshBooking.bookingNumber} has been assigned to you. Open Pro Panel to check details.`
        );

        // Send Fast2SMS helper assignment SMS to customer
        sendSmsNotification(
          freshBooking.customer.user.phone,
          `Your booking ${freshBooking.bookingNumber} has been assigned to helper ${freshBooking.provider.user.name} (${freshBooking.provider.user.phone}).`
        );
      }
    }

    return generateApiResponse(true, { bookingId: finalBooking.id, assigned: assignResult.success }, 'Payment verified and booking confirmed!');
  } catch (error: any) {
    console.error('[Verify Payment API Error]', error);
    return generateApiResponse(false, null, 'Payment verification failed.', 500, 'VERIFY_FAILED');
  }
}
