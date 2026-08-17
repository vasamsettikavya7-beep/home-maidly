import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getAuthenticatedUser, generateApiResponse } from '@/lib/auth-helper';

// GET: Retrieve all services and highlight which ones this provider currently offers
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user || user.role !== 'PROVIDER') {
      return generateApiResponse(false, null, 'Unauthorized', 401, 'UNAUTHORIZED');
    }

    const providerProfile = await db.providerProfile.findUnique({
      where: { userId: user.dbUser.id },
      include: { services: true }
    });

    if (!providerProfile) {
      return generateApiResponse(false, null, 'Provider profile not found.', 404, 'NOT_FOUND');
    }

    // Fetch all active categories and services
    const services = await db.service.findMany({
      include: { category: true }
    });

    const offeredServiceIds = providerProfile.services.map(ps => ps.serviceId);

    const formattedServices = services.map(s => ({
      id: s.id,
      name: s.name,
      price: s.price,
      categoryName: s.category.name,
      isOffered: offeredServiceIds.includes(s.id)
    }));

    return generateApiResponse(true, {
      services: formattedServices,
      profile: {
        experienceYears: providerProfile.experienceYears,
        languages: providerProfile.languages,
        serviceAreas: providerProfile.serviceAreas,
        bankName: providerProfile.bankName,
        bankAccountNumber: providerProfile.bankAccountNumber,
        bankIfscCode: providerProfile.bankIfscCode
      }
    });
  } catch (error: any) {
    console.error('[Get Provider Services Error]', error);
    return generateApiResponse(false, null, 'Failed to fetch services.', 500, 'SERVER_ERROR');
  }
}

// POST: Save the list of services this provider offers
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user || user.role !== 'PROVIDER') {
      return generateApiResponse(false, null, 'Unauthorized', 401, 'UNAUTHORIZED');
    }

    const providerProfile = await db.providerProfile.findUnique({
      where: { userId: user.dbUser.id }
    });

    if (!providerProfile) {
      return generateApiResponse(false, null, 'Provider profile not found.', 404, 'NOT_FOUND');
    }

    const {
      serviceIds,
      experienceYears,
      languages,
      serviceAreas,
      bankName,
      bankAccountNumber,
      bankIfscCode
    } = await req.json();

    if (!Array.isArray(serviceIds)) {
      return generateApiResponse(false, null, 'Invalid service selection.', 400, 'BAD_REQUEST');
    }

    // Perform inside transaction to ensure atomicity
    await db.$transaction(async (tx) => {
      // Update helper profile details
      await tx.providerProfile.update({
        where: { id: providerProfile.id },
        data: {
          experienceYears: experienceYears !== undefined ? (typeof experienceYears === 'number' ? experienceYears : parseInt(experienceYears) || 0) : providerProfile.experienceYears,
          languages: languages !== undefined ? languages : providerProfile.languages,
          serviceAreas: serviceAreas !== undefined ? serviceAreas : providerProfile.serviceAreas,
          bankName: bankName !== undefined ? bankName : providerProfile.bankName,
          bankAccountNumber: bankAccountNumber !== undefined ? bankAccountNumber : providerProfile.bankAccountNumber,
          bankIfscCode: bankIfscCode !== undefined ? bankIfscCode : providerProfile.bankIfscCode
        }
      });

      // Delete all existing service offerings for this provider
      await tx.providerService.deleteMany({
        where: { providerId: providerProfile.id }
      });

      // Create new offerings
      if (serviceIds.length > 0) {
        await tx.providerService.createMany({
          data: serviceIds.map(sId => ({
            providerId: providerProfile.id,
            serviceId: sId
          }))
        });
      }
    });

    return generateApiResponse(true, null, 'Services and profile updated successfully!');
  } catch (error: any) {
    console.error('[Save Provider Services Error]', error);
    return generateApiResponse(false, null, 'Failed to update services.', 500, 'SERVER_ERROR');
  }
}
