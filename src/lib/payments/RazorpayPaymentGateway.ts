import { PaymentGateway, CreateOrderResult, VerifyPaymentResult, RefundResult, PayoutResult } from './PaymentGateway';
import crypto from 'crypto';

export class RazorpayPaymentGateway implements PaymentGateway {
  name = 'RAZORPAY';
  private keyId: string;
  private keySecret: string;

  constructor() {
    this.keyId = process.env.RAZORPAY_KEY_ID || '';
    this.keySecret = process.env.RAZORPAY_KEY_SECRET || '';
  }

  private ensureConfigured() {
    if (!this.keyId || !this.keySecret) {
      throw new Error('Razorpay credentials keyId/keySecret are not configured in environment variables.');
    }
  }

  async createOrder(amount: number, currency: string, bookingId: string): Promise<CreateOrderResult> {
    this.ensureConfigured();
    // Real implementation: const order = await razorpay.orders.create({ amount: amount * 100, currency, receipt: bookingId })
    try {
      console.log(`[Razorpay Gateway] Creating Order for Booking ID: ${bookingId}, Amount: ${amount}`);
      const orderId = `rzp_order_${Date.now()}`;
      return {
        gatewayOrderId: orderId,
        transactionId: `rzp_tx_${Date.now()}`,
        paymentGateway: this.name,
      };
    } catch (error: any) {
      console.error('[Razorpay Gateway Error]', error);
      throw new Error(`Razorpay Order creation failed: ${error.message}`);
    }
  }

  async verifyPayment(
    gatewayPaymentId: string,
    gatewayOrderId: string,
    gatewaySignature: string
  ): Promise<VerifyPaymentResult> {
    this.ensureConfigured();
    
    // Verify signature cryptographically:
    // HmacSHA256(orderId + "|" + paymentId, keySecret) === signature
    const generatedSig = crypto
      .createHmac('sha256', this.keySecret)
      .update(gatewayOrderId + '|' + gatewayPaymentId)
      .digest('hex');

    const isValid = generatedSig === gatewaySignature;

    if (!isValid) {
      return {
        success: false,
        status: 'FAILED',
        transactionId: `rzp_tx_failed_${Date.now()}`,
        gatewayPaymentId,
      };
    }

    return {
      success: true,
      status: 'CAPTURED',
      transactionId: `rzp_tx_captured_${gatewayPaymentId}`,
      paymentMethod: 'UPI',
      gatewayPaymentId,
    };
  }

  async processRefund(transactionId: string, amount: number, reason: string): Promise<RefundResult> {
    this.ensureConfigured();
    // Real implementation: const refund = await razorpay.refunds.create({ payment_id: transactionId, amount: amount * 100 })
    return {
      success: true,
      status: 'SUCCESS',
      refundTransactionId: `rzp_ref_${Date.now()}`,
      amount,
    };
  }

  async payoutProvider(
    providerId: string,
    amount: number,
    bankDetails: { bankName: string; accountNum: string; ifsc: string }
  ): Promise<PayoutResult> {
    this.ensureConfigured();
    // Real implementation: RazorpayX payouts API
    return {
      success: true,
      status: 'PAID',
      transactionId: `rzp_payout_${Date.now()}`,
    };
  }
}
