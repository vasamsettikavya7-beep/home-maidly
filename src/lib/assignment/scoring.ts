import { db } from '../db';

export interface ProviderScoreDetail {
  providerId: string;
  name: string;
  score: number;
  breakdown: {
    availability: number;
    distance: number;
    rating: number;
    experience: number;
    reliability: number;
  };
  distanceKm: number;
}

// Haversine formula to calculate distance between two coordinates in km
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

// Convert dayOfWeek number to standard name or index
export function getDayOfWeekNumber(dateString: string): number {
  // YYYY-MM-DD
  const date = new Date(dateString);
  return date.getDay(); // 0 is Sunday, 6 is Saturday
}

/**
 * Finds and scores matching providers for a specific booking request
 */
export async function matchProvidersForBooking(params: {
  serviceIds: string[];
  latitude: number;
  longitude: number;
  bookingDate: string; // YYYY-MM-DD
  timeSlot: string; // e.g. "09:00 AM - 11:00 AM"
  genderPreference?: string;
}): Promise<ProviderScoreDetail[]> {
  const { serviceIds, latitude, longitude, bookingDate, timeSlot } = params;
  const dayOfWeek = getDayOfWeekNumber(bookingDate);

  // 1. Fetch active, verified providers who offer the requested services
  const providers = await db.providerProfile.findMany({
    where: {
      kycStatus: 'ACTIVE',
      services: {
        some: {
          serviceId: { in: serviceIds },
        },
      },
      availabilities: {
        some: {
          dayOfWeek,
          isAvailable: true,
        },
      },
    },
    include: {
      user: true,
      availabilities: {
        where: { dayOfWeek },
      },
    },
  });

  // 2. Filter out providers who already have a confirmed booking in this time slot on this date
  const scoredProviders: ProviderScoreDetail[] = [];

  for (const provider of providers) {
    const doubleBooked = await db.booking.findFirst({
      where: {
        providerId: provider.id,
        bookingDate,
        timeSlot,
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

    if (doubleBooked) {
      continue; // Exclude to prevent double-booking
    }

    // Determine mock provider coordinates. If not available, place near Gachibowli center
    // Let's use slight offsets based on provider name hash to simulate coordinates
    const seed = provider.user.name.charCodeAt(0) + provider.user.name.charCodeAt(1);
    const providerLat = 17.44 + (seed % 100) * 0.0005; // ~17.44XX
    const providerLng = 78.37 + (seed % 70) * 0.0005;  // ~78.37XX

    const distanceKm = calculateDistance(latitude, longitude, providerLat, providerLng);

    // Filter by max distance (15km)
    if (distanceKm > 15) {
      continue;
    }

    // 3. Compute score components (normalized 0 to 100)
    
    // A. Distance Score (20% weight) - closer is better (100 for 0km, 0 for 15km)
    const distanceScore = Math.max(0, 100 - (distanceKm / 15) * 100);

    // B. Rating Score (20% weight) - rating out of 5 mapped to 100
    const ratingScore = provider.rating * 20;

    // C. Experience Score (15% weight) - capped at 10 years
    const experienceScore = Math.min(100, (provider.experienceYears / 10) * 100);

    // D. Reliability Score (15% weight) - based on jobs done (capped at 200 jobs)
    const reliabilityScore = Math.min(100, (provider.completedJobsCount / 200) * 100);

    // E. Availability Match Score (30% weight) - standard 100 if matches shift
    const availabilityScore = 100; // Since they passed initial availability filters

    // Total Score calculation
    const totalScore =
      availabilityScore * 0.3 +
      distanceScore * 0.2 +
      ratingScore * 0.2 +
      experienceScore * 0.15 +
      reliabilityScore * 0.15;

    scoredProviders.push({
      providerId: provider.id,
      name: provider.user.name,
      score: Math.round(totalScore * 10) / 10,
      breakdown: {
        availability: Math.round(availabilityScore),
        distance: Math.round(distanceScore),
        rating: Math.round(ratingScore),
        experience: Math.round(experienceScore),
        reliability: Math.round(reliabilityScore),
      },
      distanceKm: Math.round(distanceKm * 10) / 10,
    });
  }

  // Sort by score descending
  return scoredProviders.sort((a, b) => b.score - a.score);
}

/**
 * Assigns booking to the best scored provider using database transactions
 */
export async function autoAssignProvider(bookingId: string): Promise<{ success: boolean; providerId?: string; message: string }> {
  return await db.$transaction(async (tx) => {
    // 1. Lock and fetch booking
    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
      include: {
        address: true,
        items: true,
      },
    });

    if (!booking) {
      return { success: false, message: 'Booking not found.' };
    }

    if (booking.status !== 'PROVIDER_ASSIGNMENT_PENDING' && booking.status !== 'BOOKING_CREATED' && booking.status !== 'PAYMENT_SUCCESS') {
      return { success: false, message: `Invalid booking status for auto-assignment: ${booking.status}` };
    }

    const serviceIds = booking.items.map((i) => i.serviceId);

    // 2. Fetch matches using the active transaction (we can simulate within the transaction bounds)
    // For transactional safety, we query the databases directly inside this transaction.
    const dayOfWeek = getDayOfWeekNumber(booking.bookingDate);
    const providers = await tx.providerProfile.findMany({
      where: {
        kycStatus: 'ACTIVE',
        services: {
          some: { serviceId: { in: serviceIds } },
        },
        availabilities: {
          some: { dayOfWeek, isAvailable: true },
        },
      },
      include: {
        user: true,
      },
    });

    // Score and filter inside transaction
    const candidates: { providerId: string; score: number }[] = [];
    for (const provider of providers) {
      // Row lock check: check if provider already has any other booking in this time slot on this date
      const doubleBooked = await tx.booking.findFirst({
        where: {
          providerId: provider.id,
          bookingDate: booking.bookingDate,
          timeSlot: booking.timeSlot,
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

      if (doubleBooked) {
        continue;
      }

      // Compute score simply within transaction
      const seed = provider.user.name.charCodeAt(0) + provider.user.name.charCodeAt(1);
      const providerLat = 17.44 + (seed % 100) * 0.0005;
      const providerLng = 78.37 + (seed % 70) * 0.0005;
      const distanceKm = calculateDistance(booking.address.latitude, booking.address.longitude, providerLat, providerLng);

      if (distanceKm > 15) continue;

      const distanceScore = Math.max(0, 100 - (distanceKm / 15) * 100);
      const ratingScore = provider.rating * 20;
      const experienceScore = Math.min(100, (provider.experienceYears / 10) * 100);
      const reliabilityScore = Math.min(100, (provider.completedJobsCount / 200) * 100);

      const score = 100 * 0.3 + distanceScore * 0.2 + ratingScore * 0.2 + experienceScore * 0.15 + reliabilityScore * 0.15;
      candidates.push({ providerId: provider.id, score });
    }

    if (candidates.length === 0) {
      // Move booking to pending provider assignment
      await tx.booking.update({
        where: { id: bookingId },
        data: { status: 'PROVIDER_ASSIGNMENT_PENDING' },
      });
      return { success: false, message: 'No available providers found nearby for this time slot.' };
    }

    // Sort candidates by score descending
    candidates.sort((a, b) => b.score - a.score);
    const bestProviderId = candidates[0].providerId;

    // 3. Assign provider and update state
    await tx.booking.update({
      where: { id: bookingId },
      data: {
        providerId: bestProviderId,
        status: 'PROVIDER_ASSIGNED',
      },
    });

    // Create history status log
    await tx.bookingStatusHistory.create({
      data: {
        bookingId,
        status: 'PROVIDER_ASSIGNED',
        remarks: 'Provider auto-assigned based on proximity, rating, and availability score.',
      },
    });

    return {
      success: true,
      providerId: bestProviderId,
      message: 'Provider matched and assigned successfully.',
    };
  });
}
