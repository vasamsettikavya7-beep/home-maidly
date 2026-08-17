import { NextRequest } from 'next/server';
import { generateOTP, sendOTP } from '@/lib/auth';
import { generateApiResponse } from '@/lib/auth-helper';

export async function POST(req: NextRequest) {
  try {
    let { phone } = await req.json();

    if (!phone || typeof phone !== 'string') {
      return generateApiResponse(false, null, 'Valid phone number is required.', 400, 'INVALID_PHONE');
    }

    phone = phone.trim().replace(/[\s-]/g, '');
    if (phone.length === 10 && /^\d+$/.test(phone)) {
      phone = `+91${phone}`;
    }

    // Generate random 6-digit OTP
    const otp = generateOTP();

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
