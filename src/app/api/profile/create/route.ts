import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const { userId, profileData } = await request.json();
    console.log('=== プロフィール作成API 開始 ===');
    console.log('Request data:', { userId, profileData });

    // 入力検証
    if (!userId || !profileData) {
      console.error('入力検証エラー:', {
        userId: !!userId,
        profileData: !!profileData,
      });
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // サーバーサイドでサービスロールキーを使用
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('Supabase設定エラー:', {
        hasUrl: !!supabaseUrl,
        hasKey: !!serviceRoleKey,
      });
      return NextResponse.json(
        { error: 'Supabase configuration missing' },
        { status: 500 }
      );
    }

    // サービスロールクライアントを作成（RLSを回避）
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    console.log('✓ Supabase Admin クライアント作成完了');
    console.log('プロフィール作成開始:', { userId, profileData });

    // まず既存のプロフィールをチェック
    const { data: existingProfile, error: checkError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (checkError) {
      console.error('既存プロフィールチェックエラー:', checkError);
    }

    if (existingProfile) {
      console.log('既存のプロフィールが見つかりました。更新します。');

      // 既存プロフィールを更新
      const { data: updatedProfile, error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({
          display_name: profileData.display_name,
          user_type: profileData.user_type,
          bio: profileData.bio,
          location: profileData.location,
          website: profileData.website,
          instagram_handle: profileData.instagram_handle,
          twitter_handle: profileData.twitter_handle,
          phone: profileData.phone,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
        .select()
        .single();

      if (updateError) {
        console.error('プロフィール更新エラー:', updateError);
        return NextResponse.json(
          { error: 'Failed to update profile' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        data: updatedProfile,
        message: 'Profile updated successfully',
      });
    }

    // 新規プロフィールを作成（最小限のデータ）
    console.log('新規プロフィールを作成します...');

    const { data: newProfile, error: createError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: userId,
        email: profileData.email,
        display_name: profileData.display_name,
        user_type: profileData.user_type,
        bio: profileData.bio,
        location: profileData.location,
        website: profileData.website,
        instagram_handle: profileData.instagram_handle,
        twitter_handle: profileData.twitter_handle,
        phone: profileData.phone,
        is_verified: false,
      })
      .select()
      .single();

    if (createError) {
      console.error('プロフィール作成エラー:', createError);
      console.log('エラーコード:', createError.code);
      console.log('エラー詳細:', createError.details);

      // トリガーエラーの場合は手動で関連データを作成
      if (createError.code === '42702') {
        console.log('🔧 トリガーエラーを検出。手動で関連データを作成します...');

        // まずプロフィールが部分的に作成されたかチェック
        const { data: partialProfile, error: partialCheckError } =
          await supabaseAdmin
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .maybeSingle();

        if (partialCheckError) {
          console.error('部分プロフィールチェックエラー:', partialCheckError);
        }

        if (partialProfile) {
          console.log('✓ 部分プロフィールが見つかりました:', partialProfile);
        } else {
          console.log(
            '❌ プロフィールが見つかりません。強制作成を試行します...'
          );
        }

        // 基本プロフィールを強制作成（upsertを使用してトリガーを回避）
        console.log('🚀 強制プロフィール作成を開始...');
        const { data: forcedProfile, error: forcedError } = await supabaseAdmin
          .from('profiles')
          .upsert(
            {
              id: userId,
              email: profileData.email,
              display_name: profileData.display_name,
              user_type: profileData.user_type,
              bio: profileData.bio,
              location: profileData.location,
              website: profileData.website,
              instagram_handle: profileData.instagram_handle,
              twitter_handle: profileData.twitter_handle,
              phone: profileData.phone,
              is_verified: false,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            {
              onConflict: 'id',
            }
          )
          .select()
          .single();

        if (forcedError) {
          console.error('❌ 強制プロフィール作成エラー:', forcedError);
          return NextResponse.json(
            { error: 'Failed to create profile', details: forcedError },
            { status: 500 }
          );
        }

        console.log('✅ 強制プロフィール作成成功:', forcedProfile);

        // 関連テーブルを手動で作成
        console.log('🔧 関連テーブルを手動で作成中...');

        const socialTables = [
          { table: 'user_preferences', data: { user_id: userId } },
          { table: 'user_follow_stats', data: { user_id: userId } },
          { table: 'timeline_preferences', data: { user_id: userId } },
          { table: 'user_rating_stats', data: { user_id: userId } },
        ];

        const creationResults = [];
        for (const { table, data } of socialTables) {
          try {
            const { error: tableError } = await supabaseAdmin
              .from(table)
              .upsert(data, {
                onConflict: 'user_id',
              });

            if (tableError) {
              console.warn(`⚠️ ${table} creation failed:`, tableError);
              creationResults.push({
                table,
                success: false,
                error: tableError,
              });
            } else {
              console.log(`✅ ${table} created successfully`);
              creationResults.push({ table, success: true });
            }
          } catch (err) {
            console.warn(`❌ ${table} creation exception:`, err);
            creationResults.push({ table, success: false, error: err });
          }
        }

        console.log('📊 関連テーブル作成結果:', creationResults);

        return NextResponse.json({
          success: true,
          data: forcedProfile,
          message: 'Profile created successfully with manual initialization',
          socialTablesResults: creationResults,
        });
      }

      return NextResponse.json(
        { error: 'Failed to create profile', details: createError },
        { status: 500 }
      );
    }

    console.log('プロフィール作成成功:', newProfile);

    return NextResponse.json({
      success: true,
      data: newProfile,
      message: 'Profile created successfully',
    });
  } catch (error) {
    console.error('プロフィール作成API エラー:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
