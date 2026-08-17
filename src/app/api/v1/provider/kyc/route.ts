import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getAuthenticatedUser, generateApiResponse } from '@/lib/auth-helper';

// POST: Provider submits their KYC details
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user || user.role !== 'PROVIDER') {
      return generateApiResponse(false, null, 'Unauthorized. Helper access required.', 401, 'UNAUTHORIZED');
    }

    const { documentType, documentUrl, bankName, bankAccountNumber, bankIfscCode } = await req.json();
    if (!documentType) {
      return generateApiResponse(false, null, 'Document type is required.', 400, 'BAD_REQUEST');
    }

    // Update the provider profile
    const updatedProfile = await db.providerProfile.update({
      where: { userId: user.dbUser.id },
      data: {
        kycStatus: 'PENDING_VERIFICATION',
        kycDocumentType: documentType,
        kycDocumentUrl: documentUrl || 'uploaded_file.pdf',
        bankName: bankName || null,
        bankAccountNumber: bankAccountNumber || null,
        bankIfscCode: bankIfscCode || null
      }
    });

    return generateApiResponse(
      true,
      { profile: updatedProfile },
      'KYC documents submitted successfully. Verification is pending.'
    );
  } catch (error: any) {
    console.error('[Provider KYC Submission Error]', error);
    return generateApiResponse(false, null, 'Failed to submit KYC documents.', 500, 'KYC_SUBMISSION_FAILED');
  }
}
