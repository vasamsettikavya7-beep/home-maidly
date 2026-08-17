import { NextRequest, NextResponse } from 'next/server';
import { verifyOTP, generateToken } from '@/lib/auth';
import { generateApiResponse } from '@/lib/auth-helper';
import { db } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { phone, otp, name, role, action } = await req.json();

    if (!phone || !otp) {
      return generateApiResponse(false, null, 'Phone number and OTP code are required.', 400, 'BAD_REQUEST');
    }

    // 1. Verify OTP
    const verification = verifyOTP(phone, otp);
    if (!verification.success) {
      return generateApiResponse(false, null, verification.message, 400, 'INVALID_OTP');
    }

    // 2. Fetch or create User
    let user = await db.user.findUnique({
      where: { phone },
      include: {
        customerProfile: true,
        providerProfile: true,
      },
    });

    if (action === 'login' && !user) {
      return generateApiResponse(false, null, 'Phone number is not registered. Please register first.', 404, 'USER_NOT_FOUND');
    }

    if (action === 'register' && user) {
      return generateApiResponse(false, null, 'Phone number is already registered. Please log in instead.', 400, 'USER_ALREADY_EXISTS');
    }

    let isNewUser = false;

    if (!user) {
      isNewUser = true;
      const targetRole = (role || 'CUSTOMER').toUpperCase();
      const targetName = name || (targetRole === 'PROVIDER' ? 'New Professional' : 'New Customer');

      if (!['CUSTOMER', 'PROVIDER', 'ADMIN'].includes(targetRole)) {
        return generateApiResponse(false, null, 'Invalid role selected.', 400, 'INVALID_ROLE');
      }

      user = await db.user.create({
        data: {
          phone,
          name: targetName,
          role: targetRole,
          ...(targetRole === 'CUSTOMER'
            ? { customerProfile: { create: {} } }
            : targetRole === 'PROVIDER'
            ? { providerProfile: { create: { kycStatus: 'PENDING_VERIFICATION' } } }
            : {}),
        },
        include: {
          customerProfile: true,
          providerProfile: true,
        },
      });
    }

    // 3. Generate Session Token
    const payload = {
      userId: user.id,
      phone: user.phone,
      name: user.name,
      role: user.role,
    };

    const token = generateToken(payload);

    // 4. Set secure Cookie and respond
    const response = NextResponse.json({
      success: true,
      data: {
        token,
        isNewUser,
        user: {
          id: user.id,
          phone: user.phone,
          name: user.name,
          role: user.role,
          customerProfileId: user.customerProfile?.id || null,
          providerProfileId: user.providerProfile?.id || null,
          kycStatus: user.providerProfile?.kycStatus || null,
        },
      },
      message: 'Logged in successfully.',
    });

    // Set HTTPOnly cookie for production session management
    response.cookies.set('authToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    });

    return response;
  } catch (error: any) {
    console.error('[OTP Verify Route Error]', error);
    return generateApiResponse(false, null, 'Authentication failed.', 500, 'AUTH_FAILED');
  }
}
