import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
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

    // Check if the user is already registered in the database
    const existingUser = await db.user.findUnique({
      where: { phone }
    });

    return generateApiResponse(true, { phone, exists: !!existingUser }, 'User check completed.');
  } catch (error: any) {
    console.error('[OTP Send Route Error]', error);
    return generateApiResponse(false, null, 'Failed to complete user check.', 500, 'USER_CHECK_FAILED');
  }
}
