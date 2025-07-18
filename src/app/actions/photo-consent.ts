'use server';

import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/utils/logger';
import { ConsentStatus } from '@/types/photo-consent';
import { revalidatePath } from 'next/cache';

export async function updateConsentStatus(
  consentId: string,
  status: ConsentStatus,
  message?: string
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('認証が必要です');
    }

    const updateData: Record<string, unknown> = {
      consent_status: status,
      response_message: message,
      updated_at: new Date().toISOString(),
    };

    if (status === 'approved' || status === 'rejected') {
      updateData.consent_given_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('photo_consent_requests')
      .update(updateData)
      .eq('id', consentId)
      .eq('model_id', user.id); // 本人のみ更新可能

    if (error) throw error;

    // TODO: 通知送信、監査ログ作成

    revalidatePath('/photo-consent');
    return { success: true };
  } catch (error) {
    logger.error('Error updating consent status:', error);
    return { success: false, error: '更新に失敗しました' };
  }
}

export async function batchUpdateConsent(
  consentIds: string[],
  status: ConsentStatus,
  message?: string
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('認証が必要です');
    }

    const results = await Promise.all(
      consentIds.map(id => updateConsentStatus(id, status, message))
    );

    const successCount = results.filter(r => r.success).length;

    revalidatePath('/photo-consent');
    return {
      success: true,
      message: `${successCount}/${consentIds.length}件の更新が完了しました`,
    };
  } catch (error) {
    logger.error('Error batch updating consents:', error);
    return { success: false, error: '一括更新に失敗しました' };
  }
}

export async function refreshConsentRequests() {
  try {
    revalidatePath('/photo-consent');
    return { success: true };
  } catch (error) {
    logger.error('Error refreshing consents:', error);
    return { success: false, error: 'リフレッシュに失敗しました' };
  }
}
