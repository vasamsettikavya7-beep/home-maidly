import { PaymentGateway } from './PaymentGateway';
import { MockPaymentGateway } from './MockPaymentGateway';
import { StripePaymentGateway } from './StripePaymentGateway';
import { RazorpayPaymentGateway } from './RazorpayPaymentGateway';

class PaymentService {
  private gateways: Map<string, PaymentGateway> = new Map();
  private activeGatewayName: string;

  constructor() {
    // Register adapters
    const mockGateway = new MockPaymentGateway();
    const stripeGateway = new StripePaymentGateway();
    const razorpayGateway = new RazorpayPaymentGateway();

    this.gateways.set(mockGateway.name, mockGateway);
    this.gateways.set(stripeGateway.name, stripeGateway);
    this.gateways.set(razorpayGateway.name, razorpayGateway);

    // Read default from environment, fallback to MOCK for development safety
    this.activeGatewayName = (process.env.PAYMENT_PROVIDER || 'MOCK').toUpperCase();
  }

  public getGateway(name?: string): PaymentGateway {
    const targetName = (name || this.activeGatewayName).toUpperCase();
    const gateway = this.gateways.get(targetName);
    if (!gateway) {
      throw new Error(`Payment Gateway '${targetName}' is not registered or supported.`);
    }
    return gateway;
  }

  public getActiveGatewayName(): string {
    return this.activeGatewayName;
  }
}

export const paymentService = new PaymentService();
export type { PaymentGateway };
