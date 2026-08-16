import { PaymentGateway, CreateOrderResult, VerifyPaymentResult, RefundResult, PayoutResult } from './PaymentGateway';

export class MockPaymentGateway implements PaymentGateway {
  name = 'MOCK';

  async createOrder(amount: number, currency: string, bookingId: string): Promise<CreateOrderResult> {
    const randomId = Math.floor(100000 + Math.random() * 900000).toString();
    return {
      gatewayOrderId: `mock_order_${bookingId}_${randomId}`,
      transactionId: `mock_tx_${Date.now()}_${randomId}`,
      paymentGateway: this.name,
    };
  }

  async verifyPayment(
    gatewayPaymentId: string,
    gatewayOrderId: string,
    gatewaySignature: string
  ): Promise<VerifyPaymentResult> {
    // In Mock mode, we look at the inputs or simulate based on signature
    // If the signature is "fail", simulate payment failure.
    const isFailure = gatewaySignature.toLowerCase() === 'fail';
    const isTimeout = gatewaySignature.toLowerCase() === 'timeout';
    
    if (isFailure) {
      return {
        success: false,
        status: 'FAILED',
        transactionId: `mock_tx_${Date.now()}`,
        gatewayPaymentId,
      };
    }

    if (isTimeout) {
      return {
        success: false,
        status: 'PENDING', // Remains pending to let it timeout/retry
        transactionId: `mock_tx_${Date.now()}`,
        gatewayPaymentId,
      };
    }

    return {
      success: true,
      status: 'CAPTURED',
      transactionId: `mock_tx_${Date.now()}`,
      paymentMethod: 'UPI',
      gatewayPaymentId,
    };
  }

  async processRefund(transactionId: string, amount: number, reason: string): Promise<RefundResult> {
    const refundId = `mock_ref_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    return {
      success: true,
      status: 'SUCCESS',
      refundTransactionId: refundId,
      amount,
    };
  }

  async payoutProvider(
    providerId: string,
    amount: number,
    bankDetails: { bankName: string; accountNum: string; ifsc: string }
  ): Promise<PayoutResult> {
    const payoutTxId = `mock_payout_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    return {
      success: true,
      status: 'PAID',
      transactionId: payoutTxId,
    };
  }
}
