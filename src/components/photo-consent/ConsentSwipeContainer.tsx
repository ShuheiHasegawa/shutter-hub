'use client';

import React, { useState, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { RefreshCw, Settings, Filter, Search } from 'lucide-react';
import { ConsentSwipeCard } from './ConsentSwipeCard';
import { ConsentPhotoPreview } from './ConsentPhotoPreview';
import { ConsentBatchActions } from './ConsentBatchActions';
import { SwipeablePhotoConsent, ConsentStatus } from '@/types/photo-consent';

interface ConsentSwipeContainerProps {
  consents: SwipeablePhotoConsent[];
  onConsentUpdate: (
    consentId: string,
    status: ConsentStatus,
    message?: string
  ) => Promise<void>;
  onRefresh: () => Promise<void>;
  isLoading?: boolean;
  showBatchMode?: boolean;
}

export const ConsentSwipeContainer: React.FC<ConsentSwipeContainerProps> = ({
  consents,
  onConsentUpdate,
  onRefresh,
  isLoading = false,
  showBatchMode = false,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [previewConsent, setPreviewConsent] =
    useState<SwipeablePhotoConsent | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedConsents, setSelectedConsents] = useState<Set<string>>(
    new Set()
  );
  const [swipeHistory, setSwipeHistory] = useState<
    Array<{
      id: string;
      action: 'left' | 'right' | 'up';
      timestamp: number;
    }>
  >([]);

  // 表示可能な合意リストをフィルタリング
  const visibleConsents = consents.filter(
    consent => consent.consentStatus === 'pending'
  );

  // スワイプアクション処理
  const handleSwipe = useCallback(
    async (consentId: string, direction: 'left' | 'right' | 'up') => {
      let newStatus: ConsentStatus;

      switch (direction) {
        case 'left':
          newStatus = 'rejected';
          break;
        case 'right':
          newStatus = 'approved';
          break;
        case 'up':
          newStatus = 'requires_discussion';
          break;
      }

      try {
        await onConsentUpdate(consentId, newStatus);

        // スワイプ履歴に追加
        setSwipeHistory(prev => [
          ...prev,
          {
            id: consentId,
            action: direction,
            timestamp: Date.now(),
          },
        ]);

        // 次のカードに移動
        setCurrentIndex(prev => prev + 1);
      } catch (error) {
        console.error('Failed to update consent:', error);
        // エラーハンドリング - 必要に応じてトースト表示など
      }
    },
    [onConsentUpdate]
  );

  // 元に戻す機能
  const handleUndo = useCallback(() => {
    if (swipeHistory.length === 0) return;

    const lastAction = swipeHistory[swipeHistory.length - 1];
    const timeSinceAction = Date.now() - lastAction.timestamp;

    // 5秒以内のアクションのみ元に戻し可能
    if (timeSinceAction <= 5000) {
      setCurrentIndex(prev => Math.max(0, prev - 1));
      setSwipeHistory(prev => prev.slice(0, -1));
      // 実際のDBの状態を戻すAPIコールも必要
    }
  }, [swipeHistory]);

  // プレビューモード
  const handlePreview = useCallback((consent: SwipeablePhotoConsent) => {
    setPreviewConsent(consent);
  }, []);

  const closePreview = useCallback(() => {
    setPreviewConsent(null);
  }, []);

  // バッチ選択
  const toggleSelection = useCallback((consentId: string) => {
    setSelectedConsents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(consentId)) {
        newSet.delete(consentId);
      } else {
        newSet.add(consentId);
      }
      return newSet;
    });
  }, []);

  // バッチアクション
  const handleBatchAction = useCallback(
    async (action: 'approve' | 'reject', message?: string) => {
      const promises = Array.from(selectedConsents).map(consentId => {
        const status: ConsentStatus =
          action === 'approve' ? 'approved' : 'rejected';
        return onConsentUpdate(consentId, status, message);
      });

      try {
        await Promise.all(promises);
        setSelectedConsents(new Set());
      } catch (error) {
        console.error('Failed to process batch actions:', error);
      }
    },
    [selectedConsents, onConsentUpdate]
  );

  // スワイプ完了チェック
  const isCompleted = currentIndex >= visibleConsents.length;

  return (
    <div className="relative w-full h-full flex flex-col">
      {/* ヘッダー */}
      <div className="flex items-center justify-between p-4 bg-white border-b border-gray-200">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-bold text-gray-900">写真公開合意</h1>
          <div className="text-sm text-gray-500">
            {isCompleted
              ? '完了'
              : `${currentIndex + 1} / ${visibleConsents.length}`}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* アンドゥボタン */}
          {swipeHistory.length > 0 && (
            <button
              onClick={handleUndo}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="元に戻す"
            >
              <RefreshCw size={20} />
            </button>
          )}

          {/* フィルターボタン */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Filter size={20} />
          </button>

          {/* 設定ボタン */}
          <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <Settings size={20} />
          </button>
        </div>
      </div>

      {/* メインエリア */}
      <div className="flex-1 relative overflow-hidden">
        {isCompleted ? (
          // 完了画面
          <div className="flex flex-col items-center justify-center h-full space-y-6 p-8">
            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center">
              <Search size={48} className="text-green-600" />
            </div>
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                すべて完了しました！
              </h2>
              <p className="text-gray-600">
                新しい合意リクエストをチェックしますか？
              </p>
            </div>
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {isLoading ? '読み込み中...' : '更新する'}
            </button>
          </div>
        ) : (
          // スワイプカードスタック
          <div className="relative w-full h-full p-4">
            <div className="relative w-full max-w-sm mx-auto h-full">
              <AnimatePresence>
                {visibleConsents
                  .slice(currentIndex, currentIndex + 3)
                  .map((consent, index) => (
                    <ConsentSwipeCard
                      key={consent.id}
                      consent={consent}
                      onSwipe={handleSwipe}
                      onPreview={handlePreview}
                      isActive={index === 0}
                      stackIndex={index}
                    />
                  ))}
              </AnimatePresence>
            </div>

            {/* スワイプヒント */}
            {currentIndex === 0 && (
              <div className="absolute bottom-8 left-0 right-0 px-4">
                <div className="bg-black/80 text-white text-sm rounded-lg p-4 max-w-sm mx-auto">
                  <div className="flex items-center justify-between text-xs">
                    <span>← 拒否</span>
                    <span>↑ 要相談</span>
                    <span>承認 →</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* バッチモード */}
        {showBatchMode && (
          <ConsentBatchActions
            consents={visibleConsents}
            selectedConsents={selectedConsents}
            onToggleSelection={toggleSelection}
            onBatchAction={handleBatchAction}
            isLoading={isLoading}
          />
        )}
      </div>

      {/* 写真プレビューモーダル */}
      {previewConsent && (
        <ConsentPhotoPreview
          consent={previewConsent}
          onClose={closePreview}
          onUpdate={onConsentUpdate}
        />
      )}
    </div>
  );
};
