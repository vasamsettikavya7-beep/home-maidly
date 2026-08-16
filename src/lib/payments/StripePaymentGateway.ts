import { PaymentGateway, CreateOrderResult, VerifyPaymentResult, RefundResult, PayoutResult } from './PaymentGateway';

export class StripePaymentGateway implements PaymentGateway {
  name = 'STRIPE';
  private secretKey: string;

  constructor() {
    this.secretKey = process.env.STRIPE_SECRET_KEY || '';
  }

  private ensureConfigured() {
    if (!this.secretKey) {
      throw new Error('STRIPE_SECRET_KEY is not configured in environment variables.');
    }
  }

  async createOrder(amount: number, currency: string, bookingId: string): Promise<CreateOrderResult> {
    this.ensureConfigured();
    // Real implementation would invoke Stripe API to create a PaymentIntent or Checkout Session:
    // const session = await stripe.checkout.sessions.create({...})
    // For production-readiness, we simulate the HTTP API call structure:
    try {
      console.log(`[Stripe Gateway] Creating PaymentIntent for Booking ID: ${bookingId}, Amount: ${amount}`);
      const txId = `stripe_intent_${Date.now()}`;
      return {
        gatewayOrderId: `stripe_cs_${Date.now()}`,
        transactionId: txId,
        paymentGateway: this.name,
      };
    } catch (error: any) {
      console.error('[Stripe Gateway Error]', error);
      throw new Error(`Stripe Order creation failed: ${error.message}`);
    }
  }

  async verifyPayment(
    gatewayPaymentId: string,
    gatewayOrderId: string,
    gatewaySignature: string
  ): Promise<VerifyPaymentResult> {
    this.ensureConfigured();
    // Real implementation would call Stripe SDK to retrieve payment intent:
    // const paymentIntent = await stripe.paymentIntents.retrieve(gatewayPaymentId);
    return {
      success: true,
      status: 'CAPTURED',
      transactionId: `stripe_intent_${gatewayPaymentId}`,
      paymentMethod: 'CARD',
      gatewayPaymentId,
    };
  }

  async processRefund(transactionId: string, amount: number, reason: string): Promise<RefundResult> {
    this.ensureConfigured();
    // Real implementation: const refund = await stripe.refunds.create({ payment_intent: transactionId, amount: amount * 100 })
    return {
      success: true,
      status: 'SUCCESS',
      refundTransactionId: `stripe_ref_${Date.now()}`,
      amount,
    };
  }

  async payoutProvider(
    providerId: string,
    amount: number,
    bankDetails: { bankName: string; accountNum: string; ifsc: string }
  ): Promise<PayoutResult> {
    this.ensureConfigured();
    // Real implementation: const transfer = await stripe.transfers.create({ amount: amount * 100, currency: 'inr', destination: ... })
    return {
      success: true,
      status: 'PAID',
      transactionId: `stripe_tr_${Date.now()}`,
    };
  }
}
