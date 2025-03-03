import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const requestLogs = await prisma.requestLog.findMany({
      orderBy: {
        timestamp: 'desc',
      },
      take: 50, // 最新の50件のみ取得
    });

    return NextResponse.json(requestLogs);
  } catch (error) {
    console.error('Error fetching request logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch request logs' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    // データの検証
    if (!data.timestamp || !data.url || !data.method || !data.headers || !data.body) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    const requestLog = await prisma.requestLog.create({
      data: {
        timestamp: BigInt(data.timestamp),
        url: data.url,
        method: data.method,
        headers: JSON.stringify(data.headers),
        body: JSON.stringify(data.body),
        response: data.response ? JSON.stringify(data.response) : null,
        status: data.status || null,
        error: data.error || null,
      },
    });
    
    return NextResponse.json(requestLog);
  } catch (error) {
    console.error('Error creating request log:', error);
    return NextResponse.json(
      { error: 'Failed to create request log' },
      { status: 500 }
    );
  }
}