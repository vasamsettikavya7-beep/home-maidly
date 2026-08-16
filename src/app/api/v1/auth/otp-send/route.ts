import { NextRequest } from 'next/server';
import { generateOTP, sendOTP } from '@/lib/auth';
import { generateApiResponse } from '@/lib/auth-helper';

export async function POST(req: NextRequest) {
  try {
    const { phone } = await req.json();

    if (!phone || typeof phone !== 'string') {
      return generateApiResponse(false, null, 'Valid phone number is required.', 400, 'INVALID_PHONE');
    }

    // Generate random 6-digit OTP
    // For local convenience, we send '123456' for test phone numbers
    const otp = phone.endsWith('0000') || phone === '+919876543210' || phone === '+919999999999' || phone === '+918888888888' || phone === '+917777777777' || phone === '+916666666666'
      ? '123456'
      : generateOTP();

    const dispatch = sendOTP(phone, otp);

    if (!dispatch.success) {
      return generateApiResponse(false, null, dispatch.message, 429, 'RATE_LIMIT_EXCEEDED');
    }

    return generateApiResponse(true, { phone }, 'OTP sent successfully.');
  } catch (error: any) {
    console.error('[OTP Send Route Error]', error);
    return generateApiResponse(false, null, 'Failed to send OTP. Please try again.', 500, 'OTP_SEND_FAILED');
  }
}
