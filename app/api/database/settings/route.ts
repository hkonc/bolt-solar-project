import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const settings = await prisma.setting.findMany({
      orderBy: {
        key: 'asc',
      },
    });

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    // データの検証
    if (!data.key || data.value === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // 既存の設定を確認
    const existingSetting = await prisma.setting.findUnique({
      where: {
        key: data.key,
      },
    });
    
    let setting;
    
    if (existingSetting) {
      // 既存の設定を更新
      setting = await prisma.setting.update({
        where: {
          key: data.key,
        },
        data: {
          value: data.value,
          description: data.description || existingSetting.description,
        },
      });
    } else {
      // 新しい設定を作成
      setting = await prisma.setting.create({
        data: {
          key: data.key,
          value: data.value,
          description: data.description || null,
        },
      });
    }
    
    return NextResponse.json(setting);
  } catch (error) {
    console.error('Error saving setting:', error);
    return NextResponse.json(
      { error: 'Failed to save setting' },
      { status: 500 }
    );
  }
}