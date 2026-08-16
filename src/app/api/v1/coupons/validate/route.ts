import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getAuthenticatedUser, generateApiResponse } from '@/lib/auth-helper';

export async function POST(req: NextRequest) {
  try {
    const { code, orderAmount } = await req.json();

    if (!code || orderAmount === undefined) {
      return generateApiResponse(false, null, 'Coupon code and order amount are required.', 400, 'BAD_REQUEST');
    }

    const user = await getAuthenticatedUser(req);
    const customerProfileId = user?.dbUser?.customerProfile?.id;

    // Fetch Coupon
    const coupon = await db.coupon.findUnique({
      where: { code, isActive: true },
    });

    if (!coupon) {
      return generateApiResponse(false, null, 'Coupon code is invalid or inactive.', 400, 'INVALID_COUPON');
    }

    const now = new Date();
    if (now < coupon.startDate || now > coupon.endDate) {
      return generateApiResponse(false, null, 'Coupon code has expired.', 400, 'EXPIRED_COUPON');
    }

    if (orderAmount < coupon.minOrderAmount) {
      return generateApiResponse(
        false,
        null,
        `Minimum order amount to apply this coupon is ₹${coupon.minOrderAmount}.`,
        400,
        'COUPON_MIN_ORDER_NOT_MET'
      );
    }

    if (coupon.usedCount >= coupon.usageLimit) {
      return generateApiResponse(false, null, 'Coupon usage limit has been reached.', 400, 'COUPON_LIMIT_EXCEEDED');
    }

    // If user is authenticated, check their individual usage limit
    if (customerProfileId) {
      const usageCount = await db.booking.count({
        where: { customerId: customerProfileId, couponCode: coupon.code, status: { not: 'CANCELLED' } },
      });

      if (usageCount >= coupon.perUserLimit) {
        return generateApiResponse(false, null, 'You have already used this coupon code.', 400, 'COUPON_USER_LIMIT');
      }
    }

    // Calculate discount amount
    let discount = 0;
    if (coupon.discountType === 'PERCENT') {
      discount = (orderAmount * coupon.discountValue) / 100;
      if (coupon.maxDiscountAmount && discount > coupon.maxDiscountAmount) {
        discount = coupon.maxDiscountAmount;
      }
    } else if (coupon.discountType === 'FIXED') {
      discount = coupon.discountValue;
    }

    // Discount cannot exceed order value
    discount = Math.min(discount, orderAmount);

    return generateApiResponse(
      true,
      {
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        discountAmount: Math.round(discount * 100) / 100,
      },
      'Coupon code applied successfully!'
    );
  } catch (error: any) {
    console.error('[Validate Coupon Error]', error);
    return generateApiResponse(false, null, 'Failed to validate coupon code.', 500, 'VALIDATE_FAILED');
  }
}
