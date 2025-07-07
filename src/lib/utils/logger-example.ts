/**
 * Logger機能の実際の使用例
 * 既存のphoto-session.tsの一部をLoggerで改善した例
 */

'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { logger } from '@/lib/utils/logger';

export interface PhotoSessionData {
  title: string;
  description?: string;
  location: string;
  address?: string;
  start_time: string;
  end_time: string;
  max_participants: number;
  price_per_person: number;
  booking_type?: string;
  allow_multiple_bookings?: boolean;
  is_published: boolean;
  image_urls?: string[];
  booking_settings?: Record<string, unknown>;
}

export async function createPhotoSessionActionWithLogger(
  data: PhotoSessionData
) {
  // 処理全体の時間測定開始
  logger.time('createPhotoSessionAction');
  logger.group('撮影会作成処理');

  try {
    logger.debug('撮影会作成開始', {
      title: data.title,
      location: data.location,
    });

    const supabase = await createClient();

    logger.debug('Supabaseクライアント取得完了');

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      logger.warn('未認証ユーザーによる撮影会作成試行');
      return { success: false, error: '認証が必要です' };
    }

    logger.debug('ユーザー認証確認完了', { userId: user.id });

    // データベース挿入処理の時間測定
    logger.time('database-insert');

    const { data: session, error } = await supabase
      .from('photo_sessions')
      .insert({
        ...data,
        organizer_id: user.id,
        current_participants: 0,
      })
      .select()
      .single();

    logger.timeEnd('database-insert');

    if (error) {
      logger.error('撮影会作成データベースエラー', {
        error,
        userId: user.id,
        data,
      });
      return { success: false, error: '撮影会の作成に失敗しました' };
    }

    logger.info('撮影会作成成功', {
      sessionId: session.id,
      title: session.title,
      userId: user.id,
    });

    // キャッシュ無効化処理
    logger.debug('キャッシュ無効化開始');
    revalidatePath('/photo-sessions');
    revalidatePath('/dashboard');
    logger.debug('キャッシュ無効化完了');

    logger.groupEnd();
    logger.timeEnd('createPhotoSessionAction');

    return { success: true, data: session };
  } catch (error) {
    logger.error('撮影会作成で予期しないエラー', { error, data });
    logger.groupEnd();
    logger.timeEnd('createPhotoSessionAction');
    return { success: false, error: '予期しないエラーが発生しました' };
  }
}

export async function canJoinPhotoSessionActionWithLogger(
  sessionId: string,
  userId: string
) {
  logger.group('参加可能性チェック');
  logger.debug('参加可能性チェック開始', { sessionId, userId });

  try {
    const supabase = await createClient();

    // 撮影会情報を取得
    logger.time('fetch-photo-session');
    const { data: session } = await supabase
      .from('photo_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();
    logger.timeEnd('fetch-photo-session');

    if (!session) {
      logger.warn('存在しない撮影会への参加試行', { sessionId, userId });
      logger.groupEnd();
      return { canJoin: false, reason: '撮影会が見つかりません' };
    }

    logger.debug('撮影会情報取得完了', {
      sessionId: session.id,
      title: session.title,
      currentParticipants: session.current_participants,
      maxParticipants: session.max_participants,
    });

    // 既に予約済みかチェック
    logger.time('check-existing-booking');
    const { data: existingBooking } = await supabase
      .from('bookings')
      .select('*')
      .eq('photo_session_id', sessionId)
      .eq('user_id', userId)
      .eq('status', 'confirmed')
      .single();
    logger.timeEnd('check-existing-booking');

    if (existingBooking) {
      logger.info('既に予約済みのユーザーによる参加試行', {
        sessionId,
        userId,
        bookingId: existingBooking.id,
      });
      logger.groupEnd();
      return { canJoin: false, reason: '既に予約済みです' };
    }

    // 各種チェック処理をログ付きで実行
    logger.debug('各種チェック開始');

    // 満席チェック
    if (session.current_participants >= session.max_participants) {
      logger.info('満席の撮影会への参加試行', {
        sessionId,
        currentParticipants: session.current_participants,
        maxParticipants: session.max_participants,
      });
      logger.groupEnd();
      return { canJoin: false, reason: 'この撮影会は満席です' };
    }

    // 開始時刻チェック
    const startTime = new Date(session.start_time);
    const now = new Date();
    if (startTime <= now) {
      logger.info('過去の撮影会への参加試行', {
        sessionId,
        startTime: startTime.toISOString(),
        currentTime: now.toISOString(),
      });
      logger.groupEnd();
      return {
        canJoin: false,
        reason: 'この撮影会は既に開始または終了しています',
      };
    }

    // 公開チェック
    if (!session.is_published) {
      logger.info('非公開撮影会への参加試行', { sessionId, userId });
      logger.groupEnd();
      return { canJoin: false, reason: 'この撮影会は公開されていません' };
    }

    logger.info('参加可能性チェック完了 - 参加可能', { sessionId, userId });
    logger.groupEnd();
    return { canJoin: true, reason: null };
  } catch (error) {
    logger.error('参加可能性チェックで予期しないエラー', {
      error,
      sessionId,
      userId,
    });
    logger.groupEnd();
    return { canJoin: false, reason: '予期しないエラーが発生しました' };
  }
}

/*
使用パターンの説明:

1. 処理全体のグループ化
   - logger.group() / logger.groupEnd() で関連処理をグループ化
   - コンソールで見やすい階層構造を作成

2. 実行時間の測定
   - logger.time() / logger.timeEnd() でパフォーマンス計測
   - データベースクエリや重い処理の測定に便利

3. 段階的なログレベル
   - debug: 詳細な処理状況
   - info: 重要な処理完了や状態変化
   - warn: 注意が必要な状況
   - error: エラー情報と詳細なコンテキスト

4. 構造化されたデータ
   - 単純な文字列だけでなく、オブジェクトでコンテキスト情報を付与
   - トラブルシューティング時に有用な情報を記録

5. 環境変数での制御
   - NEXT_PUBLIC_ENABLE_DEBUG_LOGGING=false で本番環境では無効化
   - NEXT_PUBLIC_LOG_LEVEL で出力レベルを制御
*/
