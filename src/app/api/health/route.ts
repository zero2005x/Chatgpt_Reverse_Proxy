import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
      env: process.env.NODE_ENV || 'development',
      services: {
        portal: {
          baseUrl: process.env.AI_BASE_URL ? 'configured' : 'not configured',
          tenantUuid: process.env.TENANT_UUID ? 'configured' : 'not configured'
        }
      }
    };

    return NextResponse.json(health, { status: 200 });
  } catch (error) {
    const errorHealth = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0'
    };

    return NextResponse.json(errorHealth, { status: 500 });
  }
}

export async function HEAD() {
  // 快速健康檢查，不返回詳細資訊
  return new Response(null, { status: 200 });
}
