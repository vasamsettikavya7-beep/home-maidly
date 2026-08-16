export interface CreateOrderResult {
  gatewayOrderId: string;
  transactionId: string;
  paymentGateway: string;
}

export interface VerifyPaymentResult {
  success: boolean;
  status: string; // "CAPTURED", "FAILED", "PENDING"
  transactionId: string;
  paymentMethod?: string;
  gatewayPaymentId?: string;
}

export interface RefundResult {
  success: boolean;
  status: string; // "SUCCESS", "FAILED", "PENDING"
  refundTransactionId: string;
  amount: number;
}

export interface PayoutResult {
  success: boolean;
  status: string; // "PAID", "FAILED", "PROCESSING"
  transactionId: string;
}

export interface PaymentGateway {
  name: string;
  createOrder(amount: number, currency: string, bookingId: string): Promise<CreateOrderResult>;
  verifyPayment(gatewayPaymentId: string, gatewayOrderId: string, gatewaySignature: string): Promise<VerifyPaymentResult>;
  processRefund(transactionId: string, amount: number, reason: string): Promise<RefundResult>;
  payoutProvider(providerId: string, amount: number, bankDetails: { bankName: string; accountNum: string; ifsc: string }): Promise<PayoutResult>;
}
