import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getAuthenticatedUser, generateApiResponse } from '@/lib/auth-helper';
import { autoAssignProvider } from '@/lib/assignment/scoring';
import { notificationService } from '@/lib/notifications/service';

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  BOOKING_CREATED: ['PAYMENT_PENDING', 'CANCELLED'],
  PAYMENT_PENDING: ['PAYMENT_SUCCESS', 'FAILED', 'CANCELLED'],
  PAYMENT_SUCCESS: ['PROVIDER_ASSIGNMENT_PENDING', 'PROVIDER_ASSIGNED', 'CANCELLED'],
  PROVIDER_ASSIGNMENT_PENDING: ['PROVIDER_ASSIGNED', 'CANCELLED'],
  PROVIDER_ASSIGNED: ['PROVIDER_ACCEPTED', 'PROVIDER_ASSIGNMENT_PENDING', 'CANCELLED'],
  PROVIDER_ACCEPTED: ['PROVIDER_ON_THE_WAY', 'CANCELLED'],
  PROVIDER_ON_THE_WAY: ['SERVICE_STARTED', 'CANCELLED'],
  SERVICE_STARTED: ['SERVICE_COMPLETED'],
  SERVICE_COMPLETED: ['PAYMENT_SETTLED', 'DISPUTED'],
  PAYMENT_SETTLED: ['REVIEW_COMPLETED'],
  REVIEW_COMPLETED: [],
  CANCELLED: ['REFUND_PENDING', 'REFUNDED'],
  REFUND_PENDING: ['REFUNDED'],
  REFUNDED: [],
  DISPUTED: ['RESOLVED', 'REFUND_PENDING'],
};

export function isValidTransition(current: string, next: string): boolean {
  const allowed = ALLOWED_TRANSITIONS[current];
  return allowed ? allowed.includes(next) : false;
}

// GET booking by ID
export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return generateApiResponse(false, null, 'Unauthorized', 401, 'UNAUTHORIZED');
  }

  try {
    const booking = await db.booking.findUnique({
      where: { id: params.id },
      include: {
        items: { include: { service: true } },
        address: true,
        customer: { include: { user: true } },
        provider: { include: { user: true } },
        payment: { include: { refunds: true } },
        review: true,
        statusHistory: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!booking) {
      return generateApiResponse(false, null, 'Booking not found.', 404, 'NOT_FOUND');
    }

    // Role security check
    if (
      user.role === 'CUSTOMER' &&
      booking.customerId !== user.dbUser.customerProfile.id
    ) {
      return generateApiResponse(false, null, 'Forbidden.', 403, 'FORBIDDEN');
    }

    if (
      user.role === 'PROVIDER' &&
      booking.providerId !== user.dbUser.providerProfile.id
    ) {
      return generateApiResponse(false, null, 'Forbidden.', 403, 'FORBIDDEN');
    }

    return generateApiResponse(true, { booking });
  } catch (error: any) {
    console.error('[Get Booking Detail API Error]', error);
    return generateApiResponse(false, null, 'Failed to fetch booking details.', 500, 'FETCH_FAILED');
  }
}

// PATCH: Update booking status (State Machine)
export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return generateApiResponse(false, null, 'Unauthorized', 401, 'UNAUTHORIZED');
  }

  try {
    const { status: newStatus, remarks } = await req.json();

    if (!newStatus) {
      return generateApiResponse(false, null, 'New status is required.', 400, 'BAD_REQUEST');
    }

    const booking = await db.booking.findUnique({
      where: { id: params.id },
      include: {
        customer: { include: { user: true } },
        provider: { include: { user: true } },
        items: true,
      },
    });

    if (!booking) {
      return generateApiResponse(false, null, 'Booking not found.', 404, 'NOT_FOUND');
    }

    // 1. Validate status transition rules
    if (!isValidTransition(booking.status, newStatus)) {
      return generateApiResponse(
        false,
        null,
        `Invalid status transition from ${booking.status} to ${newStatus}`,
        400,
        'INVALID_STATUS_TRANSITION'
      );
    }

    // 2. Role validation for transitions
    if (user.role === 'CUSTOMER') {
      if (booking.customerId !== user.dbUser.customerProfile.id) {
        return generateApiResponse(false, null, 'Forbidden.', 403, 'FORBIDDEN');
      }
      // Customers can only cancel bookings
      if (newStatus !== 'CANCELLED') {
        return generateApiResponse(false, null, 'Customers can only cancel bookings.', 403, 'FORBIDDEN');
      }
    }

    if (user.role === 'PROVIDER') {
      if (booking.providerId !== user.dbUser.providerProfile.id) {
        return generateApiResponse(false, null, 'Forbidden.', 403, 'FORBIDDEN');
      }
      // Providers can accept/reject or change job tracking state
      const allowedProviderStatuses = [
        'PROVIDER_ACCEPTED',
        'PROVIDER_ASSIGNMENT_PENDING', // If rejecting
        'PROVIDER_ON_THE_WAY',
        'SERVICE_STARTED',
        'SERVICE_COMPLETED',
        'CANCELLED',
      ];
      if (!allowedProviderStatuses.includes(newStatus)) {
        return generateApiResponse(false, null, 'Provider cannot set this status.', 403, 'FORBIDDEN');
      }
    }

    // 3. Execution transitions logic
    const updatedBooking = await db.$transaction(async (tx) => {
      // Handle cancellations and calculate refunds
      let updatedStatus = newStatus;
      let finalRemarks = remarks;

      if (newStatus === 'CANCELLED') {
        const settings = await tx.systemSettings.findMany();
        const configMap = new Map(settings.map((s) => [s.key, s.value]));
        
        // Cancellation logic: Check booking date/time
        // For simplicity: calculate hours remaining to booking date
        const bookingDate = new Date(booking.bookingDate);
        const hoursRemaining = (bookingDate.getTime() - Date.now()) / (1000 * 60 * 60);

        const freeHours = parseFloat(configMap.get('cancellation_free_hours') || '24');
        const partialFee = parseFloat(configMap.get('cancellation_fee_6to24_hours') || '100');
        const heavyFee = parseFloat(configMap.get('cancellation_fee_under6_hours') || '250');

        let refundAmount = booking.totalAmount;
        let feeApplied = 0;

        if (user.role === 'CUSTOMER') {
          if (hoursRemaining < 6) {
            feeApplied = Math.min(heavyFee, booking.totalAmount);
            refundAmount = booking.totalAmount - feeApplied;
            finalRemarks = `Cancelled by Customer. Heavy cancellation fee applied: ₹${feeApplied}.`;
          } else if (hoursRemaining < freeHours) {
            feeApplied = Math.min(partialFee, booking.totalAmount);
            refundAmount = booking.totalAmount - feeApplied;
            finalRemarks = `Cancelled by Customer. Partial cancellation fee applied: ₹${feeApplied}.`;
          } else {
            finalRemarks = `Cancelled by Customer. Fully refunded.`;
          }
        } else if (user.role === 'PROVIDER') {
          // Provider cancellation doesn't charge customer fee, full refund
          finalRemarks = `Cancelled by Professional: ${booking.provider?.user.name || 'Provider'}. Refund processed.`;
        }

        // Trigger refund process if already paid
        if (booking.status !== 'BOOKING_CREATED' && booking.status !== 'PAYMENT_PENDING' && booking.status !== 'FAILED') {
          updatedStatus = 'REFUNDED'; // Direct move to refunded in local mock mode
          
          // Fetch associated payment
          const payment = await tx.payment.findUnique({
            where: { bookingId: booking.id },
          });

          if (payment && payment.status === 'CAPTURED') {
            await tx.payment.update({
              where: { id: payment.id },
              data: { status: 'REFUNDED' },
            });

            await tx.refund.create({
              data: {
                paymentId: payment.id,
                refundTransactionId: `ref_tx_${Date.now()}`,
                amount: refundAmount,
                reason: finalRemarks,
                status: 'SUCCESS',
              },
            });
          }
        }
      }

      // If provider rejects, trigger re-assignment
      if (newStatus === 'PROVIDER_ASSIGNMENT_PENDING' && booking.status === 'PROVIDER_ASSIGNED') {
        // Clear provider field
        await tx.booking.update({
          where: { id: booking.id },
          data: { providerId: null },
        });
        finalRemarks = remarks || 'Provider rejected assignment. Re-matching.';
      }

      // Update Booking
      const b = await tx.booking.update({
        where: { id: booking.id },
        data: {
          status: updatedStatus,
        },
      });

      // Write status history log
      await tx.bookingStatusHistory.create({
        data: {
          bookingId: booking.id,
          status: updatedStatus,
          remarks: finalRemarks || `Status changed to ${updatedStatus}.`,
        },
      });

      return b;
    });

    // 4. Notifications & Async handlers (Post-commit triggers)
    if (newStatus === 'PROVIDER_ACCEPTED') {
      notificationService.notifyProviderAccepted(booking.bookingNumber, booking.customerId, booking.provider!.user.name);
    } else if (newStatus === 'PROVIDER_ON_THE_WAY') {
      notificationService.notifyProviderOnTheWay(booking.bookingNumber, booking.customerId, booking.provider!.user.name);
    } else if (newStatus === 'SERVICE_STARTED') {
      notificationService.notifyServiceStarted(booking.bookingNumber, booking.customerId);
    } else if (newStatus === 'SERVICE_COMPLETED') {
      notificationService.notifyServiceCompleted(booking.bookingNumber, booking.customerId, booking.provider!.user.id);
      
      // Calculate provider payout and platform commission
      const settings = await db.systemSettings.findMany();
      const configMap = new Map(settings.map((s) => [s.key, s.value]));
      const commissionPercent = parseFloat(configMap.get('platform_commission_percent') || '20') / 100;
      
      const commissionAmount = booking.subtotal * commissionPercent;
      const providerEarnings = booking.totalAmount - commissionAmount;

      await db.payout.create({
        data: {
          providerId: booking.providerId!,
          amount: providerEarnings,
          commissionAmount,
          payoutStatus: 'PENDING',
        },
      });

      // Auto update status to settled in development sandbox
      await db.booking.update({
        where: { id: booking.id },
        data: { status: 'PAYMENT_SETTLED' },
      });
      await db.bookingStatusHistory.create({
        data: {
          bookingId: booking.id,
          status: 'PAYMENT_SETTLED',
          remarks: 'Earnings calculated and settled to provider dashboard.',
        },
      });
    } else if (newStatus === 'PROVIDER_ASSIGNMENT_PENDING' && booking.status === 'PROVIDER_ASSIGNED') {
      // Trigger background auto re-assignment
      autoAssignProvider(booking.id).then((res) => {
        if (res.success) {
          db.booking.findUnique({ where: { id: booking.id }, include: { provider: { include: { user: true } } } }).then((bVal) => {
            notificationService.notifyProviderAssigned(bVal!.bookingNumber, bVal!.customerId, bVal!.provider!.user.name);
          });
        }
      });
    }

    return generateApiResponse(true, { booking: updatedBooking }, 'Status updated successfully.');
  } catch (error: any) {
    console.error('[Patch Booking API Error]', error);
    return generateApiResponse(false, null, 'Failed to update booking.', 500, 'UPDATE_FAILED');
  }
}
