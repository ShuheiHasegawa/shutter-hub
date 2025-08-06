/**
 * 法的文書管理のServer Actions
 * 利用規約・プライバシーポリシー・GDPR対応
 */

'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Logger from '@/lib/logger';
import {
  ConsentUpdate,
  GdprRequestCreate,
  LegalDocumentForm,
  UserDataExport,
  DocumentType,
  GdprRequestType,
} from '@/types/legal-documents';

// =============================================================================
// 法的文書の取得・管理
// =============================================================================

/**
 * 公開されている法的文書を取得
 */
export async function getPublishedLegalDocuments(language = 'ja') {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('legal_documents')
      .select(
        `
        id, document_type, title, content, version, 
        language_code, effective_date, published_at
      `
      )
      .eq('status', 'published')
      .eq('language_code', language)
      .lte('effective_date', new Date().toISOString())
      .or('expiry_date.is.null,expiry_date.gt.' + new Date().toISOString())
      .order('document_type', { ascending: true })
      .order('version', { ascending: false });

    if (error) {
      Logger.error('Failed to fetch published legal documents', error, {
        component: 'legal-documents',
        action: 'getPublishedLegalDocuments',
        language,
      });
      throw error;
    }

    Logger.info('Retrieved published legal documents', {
      component: 'legal-documents',
      action: 'getPublishedLegalDocuments',
      count: data?.length || 0,
      language,
    });

    return { success: true, data: data || [] };
  } catch (error) {
    Logger.error('Error in getPublishedLegalDocuments', error as Error, {
      component: 'legal-documents',
      action: 'getPublishedLegalDocuments',
    });
    return { success: false, error: 'Failed to fetch legal documents' };
  }
}

/**
 * 特定の法的文書を取得
 */
export async function getLegalDocument(
  documentType: DocumentType,
  language = 'ja'
) {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('legal_documents')
      .select('*')
      .eq('document_type', documentType)
      .eq('language_code', language)
      .eq('status', 'published')
      .lte('effective_date', new Date().toISOString())
      .or('expiry_date.is.null,expiry_date.gt.' + new Date().toISOString())
      .order('version', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      Logger.error('Failed to fetch legal document', error, {
        component: 'legal-documents',
        action: 'getLegalDocument',
        documentType,
        language,
      });
      throw error;
    }

    Logger.info('Retrieved legal document', {
      component: 'legal-documents',
      action: 'getLegalDocument',
      documentType,
      version: data?.version,
      language,
    });

    return { success: true, data };
  } catch (error) {
    Logger.error('Error in getLegalDocument', error as Error, {
      component: 'legal-documents',
      action: 'getLegalDocument',
      documentType,
    });
    return { success: false, error: 'Failed to fetch legal document' };
  }
}

/**
 * 管理者用: 法的文書の作成・更新
 */
export async function createOrUpdateLegalDocument(formData: LegalDocumentForm) {
  try {
    const supabase = await createClient();

    // 認証確認
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      Logger.warning('Unauthorized access to legal document management', {
        component: 'legal-documents',
        action: 'createOrUpdateLegalDocument',
      });
      redirect('/login');
    }

    // 管理者権限確認
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_type, is_verified')
      .eq('id', user.id)
      .single();

    if (!profile || profile.user_type !== 'organizer' || !profile.is_verified) {
      Logger.error(
        'Insufficient permissions for legal document management',
        new Error('Access denied'),
        {
          component: 'legal-documents',
          action: 'createOrUpdateLegalDocument',
          userId: user.id,
        }
      );
      throw new Error('管理者権限が必要です');
    }

    const documentData = {
      ...formData,
      created_by: user.id,
      status: 'draft' as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('legal_documents')
      .insert([documentData])
      .select()
      .single();

    if (error) {
      Logger.error('Failed to create legal document', error, {
        component: 'legal-documents',
        action: 'createOrUpdateLegalDocument',
        documentType: formData.document_type,
      });
      throw error;
    }

    Logger.info('Legal document created successfully', {
      component: 'legal-documents',
      action: 'createOrUpdateLegalDocument',
      documentId: data.id,
      documentType: formData.document_type,
      version: formData.version,
    });

    return { success: true, data };
  } catch (error) {
    Logger.error('Error in createOrUpdateLegalDocument', error as Error, {
      component: 'legal-documents',
      action: 'createOrUpdateLegalDocument',
    });
    return { success: false, error: (error as Error).message };
  }
}

// =============================================================================
// ユーザー同意管理
// =============================================================================

/**
 * ユーザーの同意状況を取得
 */
export async function getUserConsentStatus(userId?: string) {
  try {
    const supabase = await createClient();

    // 認証確認
    let targetUserId = userId;
    if (!targetUserId) {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user) {
        redirect('/login');
      }
      targetUserId = user.id;
    }

    // 最新の公開文書を取得
    const { data: documents, error: docsError } = await supabase
      .from('legal_documents')
      .select('id, document_type, title, version, effective_date')
      .eq('status', 'published')
      .eq('language_code', 'ja')
      .lte('effective_date', new Date().toISOString())
      .or('expiry_date.is.null,expiry_date.gt.' + new Date().toISOString());

    if (docsError) throw docsError;

    // ユーザーの同意履歴を取得
    const { data: consents, error: consentsError } = await supabase
      .from('user_consents')
      .select('document_id, consent_given, consented_at')
      .eq('user_id', targetUserId);

    if (consentsError) throw consentsError;

    // 同意状況をマッピング
    const consentMap = new Map(
      consents?.map(
        (c: {
          document_id: string;
          consent_given: boolean;
          consented_at: string;
        }) => [c.document_id, c]
      ) || []
    );

    const consentStatus =
      documents?.map(
        (doc: {
          id: string;
          document_type: string;
          title: string;
          version: string;
        }) => {
          const consent = consentMap.get(doc.id);
          return {
            document_type: doc.document_type,
            document_id: doc.id,
            document_title: doc.title,
            document_version: doc.version,
            consent_given: consent?.consent_given || false,
            consented_at: consent?.consented_at,
            requires_update: !consent || !consent.consent_given,
          };
        }
      ) || [];

    Logger.info('Retrieved user consent status', {
      component: 'legal-documents',
      action: 'getUserConsentStatus',
      userId: targetUserId,
      documentsCount: documents?.length || 0,
      consentsCount: consents?.length || 0,
    });

    return { success: true, data: consentStatus };
  } catch (error) {
    Logger.error('Error in getUserConsentStatus', error as Error, {
      component: 'legal-documents',
      action: 'getUserConsentStatus',
    });
    return { success: false, error: 'Failed to fetch consent status' };
  }
}

/**
 * ユーザー同意の更新
 */
export async function updateUserConsent(consentData: ConsentUpdate) {
  try {
    const supabase = await createClient();

    // 認証確認
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      redirect('/login');
    }

    // IPアドレスとUser-Agentを取得（クライアント側で渡す必要がある）
    const consentRecord = {
      user_id: user.id,
      document_id: consentData.document_id,
      consent_given: consentData.consent_given,
      consent_method: 'explicit',
      granular_consents: consentData.granular_consents || {},
      withdrawal_reason: consentData.withdrawal_reason,
      consented_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('user_consents')
      .upsert([consentRecord], { onConflict: 'user_id,document_id' })
      .select()
      .single();

    if (error) {
      Logger.error('Failed to update user consent', error, {
        component: 'legal-documents',
        action: 'updateUserConsent',
        userId: user.id,
        documentId: consentData.document_id,
      });
      throw error;
    }

    Logger.info('User consent updated successfully', {
      component: 'legal-documents',
      action: 'updateUserConsent',
      userId: user.id,
      documentId: consentData.document_id,
      consentGiven: consentData.consent_given,
    });

    return { success: true, data };
  } catch (error) {
    Logger.error('Error in updateUserConsent', error as Error, {
      component: 'legal-documents',
      action: 'updateUserConsent',
    });
    return { success: false, error: 'Failed to update consent' };
  }
}

// =============================================================================
// GDPR要求処理
// =============================================================================

/**
 * GDPR要求の作成
 */
export async function createGdprRequest(requestData: GdprRequestCreate) {
  try {
    const supabase = await createClient();

    // 認証確認
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      redirect('/login');
    }

    const gdprRequest = {
      user_id: user.id,
      request_type: requestData.request_type,
      request_details: requestData.request_details,
      verification_method: requestData.verification_method,
      status: 'submitted' as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('gdpr_requests')
      .insert([gdprRequest])
      .select()
      .single();

    if (error) {
      Logger.error('Failed to create GDPR request', error, {
        component: 'legal-documents',
        action: 'createGdprRequest',
        userId: user.id,
        requestType: requestData.request_type,
      });
      throw error;
    }

    Logger.info('GDPR request created successfully', {
      component: 'legal-documents',
      action: 'createGdprRequest',
      requestId: data.id,
      userId: user.id,
      requestType: requestData.request_type,
    });

    return { success: true, data };
  } catch (error) {
    Logger.error('Error in createGdprRequest', error as Error, {
      component: 'legal-documents',
      action: 'createGdprRequest',
    });
    return { success: false, error: 'Failed to create GDPR request' };
  }
}

/**
 * ユーザーのGDPR要求履歴を取得
 */
export async function getUserGdprRequests() {
  try {
    const supabase = await createClient();

    // 認証確認
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      redirect('/login');
    }

    const { data, error } = await supabase
      .from('gdpr_requests')
      .select(
        `
        id, request_type, status, request_details, 
        created_at, response_due_date, completed_at,
        export_file_url, export_file_expires_at
      `
      )
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      Logger.error('Failed to fetch user GDPR requests', error, {
        component: 'legal-documents',
        action: 'getUserGdprRequests',
        userId: user.id,
      });
      throw error;
    }

    Logger.info('Retrieved user GDPR requests', {
      component: 'legal-documents',
      action: 'getUserGdprRequests',
      userId: user.id,
      requestsCount: data?.length || 0,
    });

    return { success: true, data: data || [] };
  } catch (error) {
    Logger.error('Error in getUserGdprRequests', error as Error, {
      component: 'legal-documents',
      action: 'getUserGdprRequests',
    });
    return { success: false, error: 'Failed to fetch GDPR requests' };
  }
}

/**
 * データエクスポート（GDPR Article 20対応）
 */
export async function exportUserData() {
  try {
    const supabase = await createClient();

    // 認証確認
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      redirect('/login');
    }

    // ユーザーの全データを収集
    const [profileData, bookingsData, messagesData, consentsData] =
      await Promise.all([
        // プロフィール情報
        supabase.from('profiles').select('*').eq('id', user.id).single(),

        // 予約情報
        supabase.from('bookings').select('*').eq('user_id', user.id),

        // メッセージ（簡略化）
        supabase
          .from('messages')
          .select('id, content, created_at')
          .eq('sender_id', user.id)
          .limit(100),

        // 同意履歴
        supabase.from('user_consents').select('*').eq('user_id', user.id),
      ]);

    const exportData: UserDataExport = {
      user_info: {
        id: user.id,
        email: user.email || '',
        display_name: profileData.data?.display_name,
        user_type: profileData.data?.user_type || '',
        created_at: user.created_at,
      },
      profile_data: profileData.data
        ? {
            bio: profileData.data.bio,
            location: profileData.data.location,
            website: profileData.data.website,
            social_handles: {
              instagram: profileData.data.instagram_handle,
              twitter: profileData.data.twitter_handle,
            },
          }
        : undefined,
      activity_data: {
        bookings: bookingsData.data || [],
        messages: messagesData.data || [],
      },
      consent_history: consentsData.data || [],
      processing_records: [], // 別途取得が必要
      export_metadata: {
        exported_at: new Date().toISOString(),
        export_format: 'json',
        data_categories: ['profile', 'activity', 'consents'],
        retention_info: {
          profile: '無期限（削除要求まで）',
          activity: '7年間',
          consents: '5年間',
        },
      },
    };

    Logger.info('User data export completed', {
      component: 'legal-documents',
      action: 'exportUserData',
      userId: user.id,
      dataCategories: exportData.export_metadata.data_categories,
    });

    return { success: true, data: exportData };
  } catch (error) {
    Logger.error('Error in exportUserData', error as Error, {
      component: 'legal-documents',
      action: 'exportUserData',
    });
    return { success: false, error: 'Failed to export user data' };
  }
}

/**
 * アカウント削除要求（GDPR Article 17対応）
 */
export async function requestAccountDeletion(reason?: string) {
  try {
    const supabase = await createClient();

    // 認証確認
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      redirect('/login');
    }

    // GDPR削除要求を作成
    const deletionRequest = {
      user_id: user.id,
      request_type: 'erasure' as GdprRequestType,
      request_details: reason || 'アカウント完全削除要求',
      verification_method: 'email',
      status: 'submitted' as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('gdpr_requests')
      .insert([deletionRequest])
      .select()
      .single();

    if (error) {
      Logger.error('Failed to create account deletion request', error, {
        component: 'legal-documents',
        action: 'requestAccountDeletion',
        userId: user.id,
      });
      throw error;
    }

    Logger.info('Account deletion request created', {
      component: 'legal-documents',
      action: 'requestAccountDeletion',
      requestId: data.id,
      userId: user.id,
    });

    return { success: true, data };
  } catch (error) {
    Logger.error('Error in requestAccountDeletion', error as Error, {
      component: 'legal-documents',
      action: 'requestAccountDeletion',
    });
    return { success: false, error: 'Failed to request account deletion' };
  }
}
