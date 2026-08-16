import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { authorizeRoles, generateApiResponse } from '@/lib/auth-helper';

// GET all provider profiles for verification (with filter support)
export async function GET(req: NextRequest) {
  return authorizeRoles(['ADMIN'])(req, async () => {
    try {
      const { searchParams } = new URL(req.url);
      const status = searchParams.get('status') || undefined;

      const providers = await db.providerProfile.findMany({
        where: status ? { kycStatus: status } : {},
        include: {
          user: true,
        },
        orderBy: { user: { createdAt: 'desc' } },
      });

      return generateApiResponse(true, { providers });
    } catch (error: any) {
      console.error('[Admin KYC List Error]', error);
      return generateApiResponse(false, null, 'Failed to fetch KYC profiles.', 500, 'KYC_FETCH_FAILED');
    }
  });
}

// POST/PATCH: Update provider KYC status (Verify or reject)
export async function POST(req: NextRequest) {
  return authorizeRoles(['ADMIN'])(req, async (adminUser) => {
    try {
      const { providerId, status, remarks } = await req.json();

      if (!providerId || !status) {
        return generateApiResponse(false, null, 'Provider ID and verification status are required.', 400, 'BAD_REQUEST');
      }

      const allowedStatuses = ['PENDING_VERIFICATION', 'VERIFIED', 'ACTIVE', 'TEMPORARILY_SUSPENDED', 'REJECTED', 'BLOCKED'];
      if (!allowedStatuses.includes(status)) {
        return generateApiResponse(false, null, 'Invalid KYC verification status.', 400, 'INVALID_STATUS');
      }

      // Check if provider exists
      const provider = await db.providerProfile.findUnique({
        where: { id: providerId },
        include: { user: true },
      });

      if (!provider) {
        return generateApiResponse(false, null, 'Provider profile not found.', 404, 'NOT_FOUND');
      }

      // Update provider profile status
      const updatedProvider = await db.providerProfile.update({
        where: { id: providerId },
        data: {
          kycStatus: status,
        },
        include: { user: true },
      });

      // Write Admin Audit Log
      await db.auditLog.create({
        data: {
          actorId: adminUser.userId,
          action: 'UPDATE_PROVIDER_KYC',
          oldValue: provider.kycStatus,
          newValue: status,
          ipAddress: req.headers.get('x-forwarded-for') || 'local',
        },
      });

      return generateApiResponse(
        true,
        { provider: updatedProvider },
        `Professional profile status successfully updated to ${status}.`
      );
    } catch (error: any) {
      console.error('[Admin KYC Update Error]', error);
      return generateApiResponse(false, null, 'Failed to update KYC status.', 500, 'KYC_UPDATE_FAILED');
    }
  });
}
