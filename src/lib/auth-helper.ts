import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, TokenPayload } from './auth';
import { db } from './db';

export interface AuthenticatedRequest extends NextRequest {
  user?: TokenPayload & { dbUser: any };
}

export async function getAuthenticatedUser(req: NextRequest): Promise<(TokenPayload & { dbUser: any }) | null> {
  try {
    // 1. Extract token from Authorization header or Cookie
    let token = '';
    const authHeader = req.headers.get('Authorization');
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else {
      const cookieToken = req.cookies.get('authToken')?.value;
      if (cookieToken) {
        token = cookieToken;
      }
    }

    if (!token) return null;

    // 2. Verify token
    const decoded = verifyToken(token);
    if (!decoded) return null;

    // 3. Fetch user and check active status
    const dbUser = await db.user.findUnique({
      where: { id: decoded.userId },
      include: {
        customerProfile: true,
        providerProfile: true,
      },
    });

    if (!dbUser || !dbUser.isActive) {
      return null;
    }

    return {
      ...decoded,
      dbUser,
    };
  } catch (error) {
    console.error('[Auth Helper Error]', error);
    return null;
  }
}

export function authorizeRoles(allowedRoles: string[]) {
  return async (req: NextRequest, handler: (user: TokenPayload & { dbUser: any }) => Promise<NextResponse>) => {
    const user = await getAuthenticatedUser(req);
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'You must be logged in to access this resource.' } },
        { status: 401 }
      );
    }

    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'You do not have permission to perform this action.' } },
        { status: 403 }
      );
    }

    return handler(user);
  };
}

export function generateApiResponse(success: boolean, data: any, message = '', status = 200, errorCode?: string) {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  
  if (success) {
    return NextResponse.json(
      {
        success: true,
        data,
        message,
        requestId,
      },
      { status }
    );
  } else {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: errorCode || 'INTERNAL_ERROR',
          message: message || 'Something went wrong.',
        },
        requestId,
      },
      { status: status === 200 ? 500 : status }
    );
  }
}
