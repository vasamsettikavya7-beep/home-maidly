import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { authorizeRoles, generateApiResponse } from '@/lib/auth-helper';

export async function GET(req: NextRequest) {
  return authorizeRoles(['ADMIN'])(req, async (user) => {
    try {
      // 1. Core counters
      const totalCustomers = await db.customerProfile.count();
      const activeCustomers = await db.user.count({ where: { role: 'CUSTOMER', isActive: true } });

      const totalProviders = await db.providerProfile.count();
      const activeProviders = await db.providerProfile.count({ where: { kycStatus: 'ACTIVE' } });

      // Today's dates bounding
      const todayStr = new Date().toISOString().split('T')[0];
      const todayBookingsCount = await db.booking.count({
        where: { bookingDate: todayStr },
      });

      const completedBookingsCount = await db.booking.count({
        where: { status: 'SERVICE_COMPLETED' },
      });

      const cancelledBookingsCount = await db.booking.count({
        where: { status: 'CANCELLED' },
      });

      // 2. Financial Aggregates
      const totalPayments = await db.payment.findMany({
        where: { status: 'CAPTURED' },
        select: { amount: true },
      });
      const revenue = totalPayments.reduce((acc, p) => acc + p.amount, 0);

      const totalPayouts = await db.payout.findMany({
        select: { amount: true, commissionAmount: true },
      });
      const providerPayouts = totalPayouts.reduce((acc, p) => acc + p.amount, 0);
      const commission = totalPayouts.reduce((acc, p) => acc + p.commissionAmount, 0);

      const totalRefunds = await db.refund.findMany({
        where: { status: 'SUCCESS' },
        select: { amount: true },
      });
      const refunds = totalRefunds.reduce((acc, r) => acc + r.amount, 0);

      // 3. Average Rating
      const ratingsAgg = await db.review.aggregate({
        _avg: { rating: true },
      });
      const averageRating = Math.round((ratingsAgg._avg.rating || 0.0) * 10) / 10;

      // 4. KYC Status counts
      const pendingKycCount = await db.providerProfile.count({
        where: { kycStatus: 'PENDING_VERIFICATION' },
      });

      const openTicketsCount = await db.supportTicket.count({
        where: { status: 'OPEN' },
      });

      // 5. Popular Services (Top 5)
      const popularServices = await db.bookingItem.groupBy({
        by: ['serviceId'],
        _count: { serviceId: true },
        orderBy: {
          _count: { serviceId: 'desc' },
        },
        take: 5,
      });

      const popularServicesDetailed = [];
      for (const group of popularServices) {
        const service = await db.service.findUnique({
          where: { id: group.serviceId },
          select: { name: true },
        });
        if (service) {
          popularServicesDetailed.push({
            name: service.name,
            count: group._count.serviceId,
          });
        }
      }

      // 6. Peak Booking Times
      const bookingSlotsAgg = await db.booking.groupBy({
        by: ['timeSlot'],
        _count: { timeSlot: true },
        orderBy: {
          _count: { timeSlot: 'desc' },
        },
      });

      const peakBookingTimes = bookingSlotsAgg.map((group) => ({
        slot: group.timeSlot,
        count: group._count.timeSlot,
      }));

      // Mock Location Demand
      const locationDemand = [
        { city: 'Gachibowli', count: 42 },
        { city: 'Madhapur', count: 35 },
        { city: 'Jubilee Hills', count: 28 },
        { city: 'Kondapur', count: 19 },
      ];

      // Trends over time (Mocked for dashboard charts representation)
      const revenueTrend = [
        { label: 'Mon', revenue: revenue * 0.1 },
        { label: 'Tue', revenue: revenue * 0.15 },
        { label: 'Wed', revenue: revenue * 0.12 },
        { label: 'Thu', revenue: revenue * 0.2 },
        { label: 'Fri', revenue: revenue * 0.25 },
        { label: 'Sat', revenue: revenue * 0.18 },
      ];

      return generateApiResponse(true, {
        summary: {
          totalCustomers,
          activeCustomers,
          totalProviders,
          activeProviders,
          todayBookingsCount,
          completedBookingsCount,
          cancelledBookingsCount,
          revenue,
          commission,
          providerPayouts,
          refunds,
          averageRating,
          pendingKycCount,
          openTicketsCount,
        },
        popularServices: popularServicesDetailed,
        peakBookingTimes,
        locationDemand,
        revenueTrend,
      });
    } catch (error: any) {
      console.error('[Admin Analytics Error]', error);
      return generateApiResponse(false, null, 'Failed to fetch analytics.', 500, 'ANALYTICS_FAILED');
    }
  });
}
