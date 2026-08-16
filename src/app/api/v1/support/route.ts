import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getAuthenticatedUser, generateApiResponse } from '@/lib/auth-helper';

export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return generateApiResponse(false, null, 'Unauthorized', 401, 'UNAUTHORIZED');
  }

  try {
    let tickets = [];

    if (user.role === 'CUSTOMER') {
      tickets = await db.supportTicket.findMany({
        where: { customerId: user.dbUser.customerProfile.id },
        orderBy: { createdAt: 'desc' },
      });
    } else if (user.role === 'ADMIN') {
      tickets = await db.supportTicket.findMany({
        include: { customer: { include: { user: true } } },
        orderBy: { createdAt: 'desc' },
      });
    } else {
      return generateApiResponse(false, null, 'Forbidden.', 403, 'FORBIDDEN');
    }

    return generateApiResponse(true, { tickets });
  } catch (error: any) {
    console.error('[Get Tickets Error]', error);
    return generateApiResponse(false, null, 'Failed to retrieve tickets.', 500, 'FETCH_FAILED');
  }
}

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user || user.role !== 'CUSTOMER') {
    return generateApiResponse(false, null, 'Only customers can create support tickets.', 401, 'UNAUTHORIZED');
  }

  try {
    const { category, subject, description, bookingId } = await req.json();

    if (!category || !subject || !description) {
      return generateApiResponse(false, null, 'Required ticket fields are missing.', 400, 'BAD_REQUEST');
    }

    const ticketNumber = await db.$transaction(async (tx) => {
      const count = await tx.supportTicket.count();
      return `TIC-${10000 + count + 1}`;
    });

    const ticket = await db.supportTicket.create({
      data: {
        ticketNumber,
        customerId: user.dbUser.customerProfile.id,
        bookingId: bookingId || null,
        category,
        subject,
        description,
        status: 'OPEN',
      },
    });

    return generateApiResponse(true, { ticket }, 'Support ticket created successfully. Our team will reach out shortly.');
  } catch (error: any) {
    console.error('[Create Ticket Error]', error);
    return generateApiResponse(false, null, 'Failed to create support ticket.', 500, 'TICKET_CREATE_FAILED');
  }
}
