import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/utils/logger';
// import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  // 開発環境でのみ動作
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'This endpoint is only available in development' },
      { status: 403 }
    );
  }

  try {
    const { email, password, name, userType } = await request.json();

    // 入力検証
    if (!email || !password || !name || !userType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // MCPを使ってユーザーを作成
    // ここでは簡単な実装として、環境変数から管理者キーを使用
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: 'Supabase configuration not found' },
        { status: 500 }
      );
    }

    // Supabase Admin APIを使ってユーザーを作成
    const response = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
        apikey: serviceRoleKey,
      },
      body: JSON.stringify({
        email,
        password,
        email_confirm: true, // メール確認をスキップ
        user_metadata: {
          full_name: name,
          user_type: userType,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      logger.error('Supabase Admin API Error:', errorData);
      return NextResponse.json(
        { error: errorData.msg || 'Failed to create user' },
        { status: response.status }
      );
    }

    const userData = await response.json();

    // プロフィール作成はクライアント側で処理する
    // （トリガーエラー回避のため）

    return NextResponse.json({
      success: true,
      user: userData,
      note: 'Profile creation will be handled on client side',
    });
  } catch (error) {
    logger.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
