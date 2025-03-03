import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const solarData = await prisma.solarData.findMany({
      orderBy: {
        roundTime: 'desc',
      },
      take: 100, // 最新の100件のみ取得
    });

    return NextResponse.json(solarData);
  } catch (error) {
    console.error('Error fetching solar data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch solar data' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    // データの検証
    if (!data.deviceUuid || !data.generatedTime || !data.roundTime || !data.formatedTime || data.cumulative === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    const solarData = await prisma.solarData.create({
      data: {
        deviceUuid: data.deviceUuid,
        generatedTime: BigInt(data.generatedTime),
        roundTime: BigInt(data.roundTime),
        formatedTime: data.formatedTime,
        cumulative: data.cumulative,
        difference: data.difference || 0,
      },
    });
    
    return NextResponse.json(solarData);
  } catch (error) {
    console.error('Error creating solar data:', error);
    return NextResponse.json(
      { error: 'Failed to create solar data' },
      { status: 500 }
    );
  }
}