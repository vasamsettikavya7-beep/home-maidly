import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { authorizeRoles, generateApiResponse } from '@/lib/auth-helper';
import { sendSmsNotification } from '@/lib/sms/fast2sms';

// POST: Admin manually assigns a helper to a booking
export async function POST(req: NextRequest) {
  return authorizeRoles(['ADMIN'])(req, async (adminUser) => {
    try {
      const { bookingId, providerId } = await req.json();

      if (!bookingId || !providerId) {
        return generateApiResponse(false, null, 'Booking ID and Provider ID are required.', 400, 'BAD_REQUEST');
      }

      // Check if booking exists
      const booking = await db.booking.findUnique({
        where: { id: bookingId },
        include: { customer: { include: { user: true } } }
      });

      if (!booking) {
        return generateApiResponse(false, null, 'Booking not found.', 404, 'NOT_FOUND');
      }

      // Check if helper exists
      const provider = await db.providerProfile.findUnique({
        where: { id: providerId },
        include: { user: true }
      });

      if (!provider) {
        return generateApiResponse(false, null, 'Helper not found.', 404, 'NOT_FOUND');
      }

      // Perform updates inside a transaction
      const updatedBooking = await db.$transaction(async (tx) => {
        const b = await tx.booking.update({
          where: { id: bookingId },
          data: {
            providerId,
            status: 'PROVIDER_ASSIGNED'
          },
          include: { provider: { include: { user: true } } }
        });

        await tx.bookingStatusHistory.create({
          data: {
            bookingId,
            status: 'PROVIDER_ASSIGNED',
            remarks: `Manually assigned helper ${provider.user.name} by administrator.`
          }
        });

        // Write Admin Audit Log
        await tx.auditLog.create({
          data: {
            actorId: adminUser.userId,
            action: 'MANUAL_ASSIGN_PROVIDER',
            oldValue: booking.providerId || 'NONE',
            newValue: providerId,
            ipAddress: req.headers.get('x-forwarded-for') || 'local'
          }
        });

        return b;
      });

      // Send Fast2SMS assignment SMS to helper
      sendSmsNotification(
        provider.user.phone,
        `You have a new work assignment! Booking ${booking.bookingNumber} has been manually assigned to you by admin. Open Pro Panel to check details.`
      );

      // Send Fast2SMS assignment SMS to customer
      sendSmsNotification(
        booking.customer.user.phone,
        `Your booking ${booking.bookingNumber} has been manually assigned to helper ${provider.user.name} (${provider.user.phone}).`
      );

      return generateApiResponse(
        true,
        { booking: updatedBooking },
        `Successfully assigned ${provider.user.name} to booking ${booking.bookingNumber}.`
      );
    } catch (error: any) {
      console.error('[Admin Manual Assignment Error]', error);
      return generateApiResponse(false, null, 'Failed to assign helper.', 500, 'SERVER_ERROR');
    }
  });
}
