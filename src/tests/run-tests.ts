import { generateOTP, sendOTP, verifyOTP, generateToken, verifyToken } from '../lib/auth';
import { paymentService } from '../lib/payments/PaymentService';
import { matchProvidersForBooking, autoAssignProvider } from '../lib/assignment/scoring';
import { db } from '../lib/db';

async function runTests() {
  console.log('🧪 Starting Automated Unit & Integration Tests...\n');
  let passedCount = 0;
  let failedCount = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`✅ [PASS] ${message}`);
      passedCount++;
    } else {
      console.error(`❌ [FAIL] ${message}`);
      failedCount++;
    }
  }

  // --- TEST CASE 1: Authentication Logic ---
  console.log('--- Test Suite 1: Authentication & OTP ---');
  const otp = generateOTP();
  assert(otp.length === 6, 'OTP generation length is 6 digits');

  const testPhone = '+919999888899';
  const dispatch = sendOTP(testPhone, otp);
  assert(dispatch.success === true, 'OTP send is successful');

  const verifySuccess = verifyOTP(testPhone, otp);
  assert(verifySuccess.success === true, 'Valid OTP verifies successfully');

  const verifyFail = verifyOTP(testPhone, '000000');
  assert(verifyFail.success === false, 'Invalid OTP verification fails');

  const tokenPayload = { userId: 'usr_123', phone: testPhone, name: 'Test User', role: 'CUSTOMER' };
  const token = generateToken(tokenPayload);
  const decoded = verifyToken(token);
  assert(decoded !== null && decoded.userId === 'usr_123', 'JWT session token signs and decodes correctly');

  // --- TEST CASE 2: Payment Subsystem Abstraction ---
  console.log('\n--- Test Suite 2: Payment Subsystem Routing ---');
  const gateway = paymentService.getGateway('MOCK');
  assert(gateway.name === 'MOCK', 'PaymentService resolves active Mock adapter');

  const order = await gateway.createOrder(1500, 'INR', 'booking_101');
  assert(order.gatewayOrderId.startsWith('mock_order_'), 'MockGateway initializes order parameters');

  const verifyPay = await gateway.verifyPayment('pay_123', order.gatewayOrderId, 'success');
  assert(verifyPay.success === true && verifyPay.status === 'CAPTURED', 'MockGateway verifies capture status successfully');

  const verifyPayFail = await gateway.verifyPayment('pay_123', order.gatewayOrderId, 'fail');
  assert(verifyPayFail.success === false && verifyPayFail.status === 'FAILED', 'MockGateway simulates transaction failure');

  const refund = await gateway.processRefund(order.transactionId, 1000, 'Customer cancelled');
  assert(refund.success === true && refund.status === 'SUCCESS', 'MockGateway processes refunds successfully');

  // --- TEST CASE 3: Smart Provider Assignment ---
  console.log('\n--- Test Suite 3: Provider Assignment Scoring ---');
  // Load ramesh's customer location coordinates
  // Gachibowli center coordinates: 17.44, 78.37
  const matches = await matchProvidersForBooking({
    serviceIds: ['hc_1'],
    latitude: 17.448,
    longitude: 78.374,
    bookingDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Tomorrow
    timeSlot: '09:00 AM - 11:00 AM',
  });

  assert(Array.isArray(matches), 'Scoring engine matching completes search and returns candidates list');
  if (matches.length > 0) {
    assert(matches[0].score >= 0, 'Matched provider has scoring attributes computed');
  }

  // Summary results
  console.log(`\n========================================`);
  console.log(`📊 Test Execution Summary:`);
  console.log(`   Passed: ${passedCount}`);
  console.log(`   Failed: ${failedCount}`);
  console.log(`========================================`);

  if (failedCount > 0) {
    console.error('❌ Some unit tests failed. Check implementation logic.');
    process.exit(1);
  } else {
    console.log('🎉 All automated tests passed successfully!');
    process.exit(0);
  }
}

runTests().catch((e) => {
  console.error('[Runner Error]', e);
  process.exit(1);
});
