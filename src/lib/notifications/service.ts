import { db } from '../db';
import { queueSystem } from '../workers/queue';

export type NotificationType = 'BOOKING' | 'PAYMENT' | 'SECURITY' | 'OTHER';

export class NotificationService {
  /**
   * Dispatches notifications to the database and queue systems
   */
  async notifyUser(params: {
    userId: string;
    title: string;
    body: string;
    type: NotificationType;
    phone?: string;
  }) {
    const { userId, title, body, type, phone } = params;

    try {
      // 1. Create In-App Notification record
      await db.notification.create({
        data: {
          userId,
          title,
          body,
          type,
          isRead: false,
        },
      });

      // 2. Queue Email & SMS dispatch jobs in background workers
      // This ensures main request loop is completely unblocked
      queueSystem.addJob({
        name: 'send-sms',
        payload: { phone: phone || 'system', message: `${title}: ${body}` },
      });

      queueSystem.addJob({
        name: 'send-email',
        payload: { userId, title, body },
      });

      console.log(`[Notification Service] Dispatched notification to User: ${userId} (${title})`);
    } catch (error) {
      console.error('[Notification Service Error]', error);
    }
  }

  // Specialized triggers to keep notifications DRY
  async notifyBookingConfirmed(bookingNumber: string, customerId: string, phone: string, total: number) {
    await this.notifyUser({
      userId: customerId,
      title: 'Booking Confirmed 🎉',
      body: `Your booking ${bookingNumber} has been received. Total paid: ₹${total}. We are matching a provider.`,
      type: 'BOOKING',
      phone,
    });
  }

  async notifyProviderAssigned(bookingNumber: string, customerId: string, providerName: string) {
    await this.notifyUser({
      userId: customerId,
      title: 'Provider Assigned 🏠',
      body: `${providerName} has been assigned to your booking ${bookingNumber}.`,
      type: 'BOOKING',
    });
  }

  async notifyProviderAccepted(bookingNumber: string, customerId: string, providerName: string) {
    await this.notifyUser({
      userId: customerId,
      title: 'Booking Accepted 👍',
      body: `${providerName} has accepted your booking ${bookingNumber} and is scheduled to visit.`,
      type: 'BOOKING',
    });
  }

  async notifyProviderOnTheWay(bookingNumber: string, customerId: string, providerName: string) {
    await this.notifyUser({
      userId: customerId,
      title: 'Provider On the Way 🚗',
      body: `${providerName} is on their way to your location for booking ${bookingNumber}.`,
      type: 'BOOKING',
    });
  }

  async notifyServiceStarted(bookingNumber: string, customerId: string) {
    await this.notifyUser({
      userId: customerId,
      title: 'Service Started 🧼',
      body: `The cleaning service for booking ${bookingNumber} has officially started.`,
      type: 'BOOKING',
    });
  }

  async notifyServiceCompleted(bookingNumber: string, customerId: string, providerUserId: string) {
    // Notify customer
    await this.notifyUser({
      userId: customerId,
      title: 'Service Completed 🌟',
      body: `Your service for booking ${bookingNumber} is complete. Please rate your experience!`,
      type: 'BOOKING',
    });

    // Notify provider
    await this.notifyUser({
      userId: providerUserId,
      title: 'Job Completed 💼',
      body: `Booking ${bookingNumber} marked as completed. Earnings added to your wallet/dashboard.`,
      type: 'BOOKING',
    });
  }

  async notifyPaymentFailed(bookingNumber: string, customerId: string, errorMsg: string) {
    await this.notifyUser({
      userId: customerId,
      title: 'Payment Failed ❌',
      body: `Payment for booking ${bookingNumber} failed: ${errorMsg}. You can retry checkout from your dashboard.`,
      type: 'PAYMENT',
    });
  }
}

export const notificationService = new NotificationService();
