'use client';

import React, { useState } from 'react';
import { logger } from '@/lib/utils/logger';
import Image from 'next/image';
import { motion } from 'framer-motion';
import {
  Check,
  X,
  MessageCircle,
  User,
  Calendar,
  ChevronRight,
} from 'lucide-react';
import { SwipeablePhotoConsent } from '@/types/photo-consent';

interface ConsentBatchActionsProps {
  consents: SwipeablePhotoConsent[];
  selectedConsents: Set<string>;
  onToggleSelection: (consentId: string) => void;
  onBatchAction: (
    action: 'approve' | 'reject',
    message?: string
  ) => Promise<void>;
  isLoading: boolean;
}

export const ConsentBatchActions: React.FC<ConsentBatchActionsProps> = ({
  consents,
  selectedConsents,
  onToggleSelection,
  onBatchAction,
  isLoading,
}) => {
  const [message, setMessage] = useState('');
  const [showMessageInput, setShowMessageInput] = useState(false);
  const [batchAction, setBatchAction] = useState<'approve' | 'reject' | null>(
    null
  );

  const handleBatchAction = async (action: 'approve' | 'reject') => {
    if (selectedConsents.size === 0) return;

    setBatchAction(action);
    setShowMessageInput(true);
  };

  const executeBatchAction = async () => {
    if (!batchAction || selectedConsents.size === 0) return;

    try {
      await onBatchAction(batchAction, message || undefined);
      setMessage('');
      setShowMessageInput(false);
      setBatchAction(null);
    } catch (error) {
      logger.error('Failed to execute batch action:', error);
    }
  };

  const cancelBatchAction = () => {
    setMessage('');
    setShowMessageInput(false);
    setBatchAction(null);
  };

  const selectAll = () => {
    consents.forEach(consent => {
      if (!selectedConsents.has(consent.id)) {
        onToggleSelection(consent.id);
      }
    });
  };

  const clearSelection = () => {
    selectedConsents.forEach(consentId => {
      onToggleSelection(consentId);
    });
  };

  return (
    <div className="bg-white border-l border-gray-200">
      {/* ヘッダー */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">バッチ操作</h2>
          <div className="text-sm text-gray-600">
            {selectedConsents.size} / {consents.length} 選択中
          </div>
        </div>

        <div className="flex space-x-2">
          <button
            onClick={selectAll}
            className="px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
            disabled={selectedConsents.size === consents.length}
          >
            すべて選択
          </button>
          <button
            onClick={clearSelection}
            className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
            disabled={selectedConsents.size === 0}
          >
            選択解除
          </button>
        </div>
      </div>

      {/* 合意リスト */}
      <div className="flex-1 overflow-y-auto max-h-96">
        {consents.map(consent => (
          <motion.div
            key={consent.id}
            className={`p-3 border-b border-gray-100 cursor-pointer transition-colors ${
              selectedConsents.has(consent.id)
                ? 'bg-blue-50 border-blue-200'
                : 'hover:bg-gray-50'
            }`}
            onClick={() => onToggleSelection(consent.id)}
            whileHover={{ x: 2 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="flex items-center space-x-3">
              {/* 選択チェックボックス */}
              <div
                className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                  selectedConsents.has(consent.id)
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'border-gray-300 hover:border-blue-400'
                }`}
              >
                {selectedConsents.has(consent.id) && <Check size={12} />}
              </div>

              {/* 写真サムネイル */}
              <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-100">
                <Image
                  src={consent.photoUrl}
                  alt="Photo thumbnail"
                  fill
                  className="object-cover"
                />
              </div>

              {/* 情報 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-sm font-medium text-gray-900 truncate">
                    {consent.photographer.displayName}
                  </h4>
                  <ChevronRight size={14} className="text-gray-400" />
                </div>
                <div className="flex items-center text-xs text-gray-500 space-x-2">
                  <User size={10} />
                  <span className="truncate">モデル: {consent.modelId}</span>
                  <Calendar size={10} />
                  <span>
                    {new Date(consent.createdAt).toLocaleDateString('ja-JP')}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* アクションエリア */}
      <div className="p-4 border-t border-gray-200 space-y-3">
        {showMessageInput ? (
          // メッセージ入力モード
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {batchAction === 'approve' ? '承認' : '拒否'}メッセージ（任意）
              </label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="一括操作の理由やコメントを入力..."
                className="w-full h-20 p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="flex space-x-2">
              <button
                onClick={executeBatchAction}
                disabled={isLoading || selectedConsents.size === 0}
                className={`flex-1 py-2 px-4 font-medium rounded-lg transition-colors disabled:opacity-50 ${
                  batchAction === 'approve'
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-red-600 text-white hover:bg-red-700'
                }`}
              >
                {isLoading
                  ? '処理中...'
                  : `${selectedConsents.size}件${batchAction === 'approve' ? '承認' : '拒否'}`}
              </button>
              <button
                onClick={cancelBatchAction}
                disabled={isLoading}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                キャンセル
              </button>
            </div>
          </div>
        ) : (
          // アクションボタン
          <div className="space-y-2">
            <button
              onClick={() => handleBatchAction('approve')}
              disabled={selectedConsents.size === 0}
              className="w-full flex items-center justify-center space-x-2 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              <Check size={18} />
              <span>選択した{selectedConsents.size}件を承認</span>
            </button>

            <button
              onClick={() => handleBatchAction('reject')}
              disabled={selectedConsents.size === 0}
              className="w-full flex items-center justify-center space-x-2 py-3 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              <X size={18} />
              <span>選択した{selectedConsents.size}件を拒否</span>
            </button>

            <div className="pt-2 border-t border-gray-200">
              <button
                disabled
                className="w-full flex items-center justify-center space-x-2 py-3 bg-gray-100 text-gray-400 font-medium rounded-lg cursor-not-allowed"
              >
                <MessageCircle size={18} />
                <span>要相談（個別対応が必要）</span>
              </button>
              <p className="text-xs text-gray-500 mt-1 text-center">
                要相談は個別にスワイプで選択してください
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
