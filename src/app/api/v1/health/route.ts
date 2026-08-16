import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    // Check DB readiness
    await db.$queryRaw`SELECT 1`;

    return NextResponse.json({
      status: 'UP',
      database: 'CONNECTED',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[Health Check Failed]', error);
    return NextResponse.json(
      {
        status: 'DOWN',
        database: 'DISCONNECTED',
        error: error.message || String(error),
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
