import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { generateApiResponse } from '@/lib/auth-helper';
import { autoAssignProvider } from '@/lib/assignment/scoring';
import { notificationService } from '@/lib/notifications/service';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-razorpay-signature') || req.headers.get('stripe-signature');
    const gatewayHeader = req.headers.get('x-payment-gateway') || 'MOCK';

    console.log(`[Payment Webhook] Received webhook from gateway ${gatewayHeader}`);

    // Parse event payload
    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return generateApiResponse(false, null, 'Invalid JSON body.', 400, 'BAD_REQUEST');
    }

    const { event, orderId, paymentId, status } = payload;

    if (!orderId) {
      return generateApiResponse(false, null, 'Order ID is missing in webhook payload.', 400, 'BAD_REQUEST');
    }

    // 1. SIGNATURE VERIFICATION (Example implementation)
    if (gatewayHeader === 'RAZORPAY') {
      const razorpaySecret = process.env.RAZORPAY_KEY_SECRET;
      if (razorpaySecret && signature) {
        const expectedSig = crypto
          .createHmac('sha256', razorpaySecret)
          .update(rawBody)
          .digest('hex');
        
        if (expectedSig !== signature) {
          return generateApiResponse(false, null, 'Invalid signature.', 400, 'INVALID_SIGNATURE');
        }
      }
    }

    // 2. IDEMPOTENCY / LEDGER CHECK
    const payment = await db.payment.findFirst({
      where: { gatewayOrderId: orderId },
      include: { booking: { include: { customer: true } } },
    });

    if (!payment) {
      return generateApiResponse(false, null, `Payment order ${orderId} not found.`, 404, 'NOT_FOUND');
    }

    if (payment.status === 'CAPTURED') {
      console.log(`[Payment Webhook Idempotency] Webhook event already processed for order: ${orderId}. Skipping.`);
      return generateApiResponse(true, { processed: true }, 'Webhook already processed (idempotent).');
    }

    // 3. Process payment status updates
    if (event === 'payment.captured' || status === 'SUCCESS') {
      const finalBooking = await db.$transaction(async (tx) => {
        // Update payment status
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: 'CAPTURED',
            gatewayPaymentId: paymentId || `web_pm_${Date.now()}`,
          },
        });

        // Update booking status
        const b = await tx.booking.update({
          where: { id: payment.bookingId },
          data: { status: 'PAYMENT_SUCCESS' },
          include: { customer: { include: { user: true } } },
        });

        // Log status change
        await tx.bookingStatusHistory.create({
          data: {
            bookingId: payment.bookingId,
            status: 'PAYMENT_SUCCESS',
            remarks: `Payment captured via asynchronous Webhook event from ${gatewayHeader}.`,
          },
        });

        return b;
      });

      // Notify customer
      notificationService.notifyBookingConfirmed(
        finalBooking.bookingNumber,
        finalBooking.customerId,
        finalBooking.customer.user.phone,
        finalBooking.totalAmount
      );

      // Trigger Smart Assignment
      const assignResult = await autoAssignProvider(finalBooking.id);
      
      if (assignResult.success) {
        const freshBooking = await db.booking.findUnique({
          where: { id: finalBooking.id },
          include: { provider: { include: { user: true } } },
        });
        if (freshBooking?.provider) {
          notificationService.notifyProviderAssigned(
            freshBooking.bookingNumber,
            freshBooking.customerId,
            freshBooking.provider.user.name
          );
        }
      }

      // Log webhook audits
      await db.auditLog.create({
        data: {
          action: 'PAYMENT_WEBHOOK_CAPTURED',
          actorId: 'system',
          newValue: `Payment captured for booking ID ${payment.bookingId}. Webhook processed.`,
        },
      });

    } else if (event === 'payment.failed' || status === 'FAILED') {
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
            remarks: `Payment failed webhook received from ${gatewayHeader}.`,
          },
        });
      });

      notificationService.notifyPaymentFailed(payment.booking.bookingNumber, payment.booking.customerId, 'Payment failed webhook received.');
    }

    return generateApiResponse(true, { processed: true }, 'Webhook processed successfully.');
  } catch (error: any) {
    console.error('[Webhook API Route Error]', error);
    return generateApiResponse(false, null, 'Webhook processing failed.', 500, 'WEBHOOK_FAILED');
  }
}
