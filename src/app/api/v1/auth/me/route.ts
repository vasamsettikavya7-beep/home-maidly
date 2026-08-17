import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getAuthenticatedUser, generateApiResponse } from '@/lib/auth-helper';

// GET: Fetch fresh logged-in user details
export async function GET(req: NextRequest) {
  try {
    const session = await getAuthenticatedUser(req);
    if (!session) {
      return generateApiResponse(false, null, 'Unauthorized', 401, 'UNAUTHORIZED');
    }

    const user = await db.user.findUnique({
      where: { id: session.userId },
      include: {
        customerProfile: true,
        providerProfile: true,
      },
    });

    if (!user) {
      return generateApiResponse(false, null, 'User not found', 404, 'NOT_FOUND');
    }

    return generateApiResponse(true, {
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        role: user.role,
        customerProfileId: user.customerProfile?.id || null,
        providerProfileId: user.providerProfile?.id || null,
        kycStatus: user.providerProfile?.kycStatus || null,
      }
    });
  } catch (error: any) {
    console.error('[Auth Me Route Error]', error);
    return generateApiResponse(false, null, 'Server error', 500, 'SERVER_ERROR');
  }
}
