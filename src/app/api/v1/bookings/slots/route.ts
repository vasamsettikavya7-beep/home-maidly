import { NextRequest } from 'next/server';
import { generateApiResponse } from '@/lib/auth-helper';
import { db } from '@/lib/db';
import { getDayOfWeekNumber } from '@/lib/assignment/scoring';

const STANDARD_SLOTS = [
  '09:00 AM - 11:00 AM',
  '11:30 AM - 01:30 PM',
  '02:00 PM - 04:00 PM',
  '04:30 PM - 06:30 PM',
];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date'); // YYYY-MM-DD
    const providerId = searchParams.get('providerId');

    if (!date) {
      return generateApiResponse(false, null, 'Booking date parameter is required.', 400, 'BAD_REQUEST');
    }

    const dayOfWeek = getDayOfWeekNumber(date);

    // 1. If providerId is specified, fetch their availability and filter standard slots
    if (providerId) {
      const provider = await db.providerProfile.findUnique({
        where: { id: providerId },
        include: {
          availabilities: {
            where: { dayOfWeek, isAvailable: true },
          },
        },
      });

      if (!provider || provider.availabilities.length === 0) {
        // Not working this day
        return generateApiResponse(true, { slots: STANDARD_SLOTS.map(s => ({ slot: s, available: false })) });
      }

      // Check current bookings for this provider on this date
      const activeBookings = await db.booking.findMany({
        where: {
          providerId,
          bookingDate: date,
          status: {
            in: [
              'CONFIRMED',
              'PROVIDER_ASSIGNED',
              'PROVIDER_ACCEPTED',
              'PROVIDER_ON_THE_WAY',
              'SERVICE_STARTED',
            ],
          },
        },
        select: { timeSlot: true },
      });

      const bookedSlots = activeBookings.map((b) => b.timeSlot);

      const slots = STANDARD_SLOTS.map((slot) => ({
        slot,
        available: !bookedSlots.includes(slot),
      }));

      return generateApiResponse(true, { slots });
    }

    // 2. If providerId is not specified, check if there is at least one active provider available for each slot
    const slots = [];
    for (const slot of STANDARD_SLOTS) {
      // Find any provider who can work this slot
      const availableProviders = await db.providerProfile.findMany({
        where: {
          kycStatus: 'ACTIVE',
          availabilities: {
            some: { dayOfWeek, isAvailable: true },
          },
        },
      });

      let slotAvailable = false;

      for (const p of availableProviders) {
        const doubleBooked = await db.booking.findFirst({
          where: {
            providerId: p.id,
            bookingDate: date,
            timeSlot: slot,
            status: {
              in: [
                'CONFIRMED',
                'PROVIDER_ASSIGNED',
                'PROVIDER_ACCEPTED',
                'PROVIDER_ON_THE_WAY',
                'SERVICE_STARTED',
              ],
            },
          },
        });

        if (!doubleBooked) {
          slotAvailable = true;
          break; // Found at least one provider
        }
      }

      slots.push({ slot, available: slotAvailable });
    }

    return generateApiResponse(true, { slots });
  } catch (error: any) {
    console.error('[Slots API Error]', error);
    return generateApiResponse(false, null, 'Failed to fetch slots.', 500, 'SLOTS_FETCH_FAILED');
  }
}
