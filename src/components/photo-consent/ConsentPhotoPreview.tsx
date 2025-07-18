'use client';

import React, { useState } from 'react';
import { logger } from '@/lib/utils/logger';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ZoomIn,
  ZoomOut,
  Heart,
  MessageCircle,
  AlertTriangle,
  User,
  Calendar,
  Camera,
  MapPin,
} from 'lucide-react';
import { SwipeablePhotoConsent, ConsentStatus } from '@/types/photo-consent';

interface ConsentPhotoPreviewProps {
  consent: SwipeablePhotoConsent;
  onClose: () => void;
  onUpdate: (
    consentId: string,
    status: ConsentStatus,
    message?: string
  ) => Promise<void>;
}

export const ConsentPhotoPreview: React.FC<ConsentPhotoPreviewProps> = ({
  consent,
  onClose,
  onUpdate,
}) => {
  const [zoom, setZoom] = useState(1);
  const [message, setMessage] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const handleAction = async (status: ConsentStatus) => {
    setIsUpdating(true);
    try {
      await onUpdate(consent.id, status, message || undefined);
      onClose();
    } catch (error) {
      logger.error('Failed to update consent:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.5, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.5, 0.5));

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          className="relative w-full max-w-4xl max-h-full bg-white rounded-2xl overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* ヘッダー */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                  <User size={16} className="text-gray-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {consent.photographer.displayName}
                  </h3>
                  <p className="text-sm text-gray-500">写真撮影者</p>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={handleZoomOut}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                disabled={zoom <= 0.5}
              >
                <ZoomOut size={20} />
              </button>
              <span className="text-sm text-gray-600 min-w-12 text-center">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={handleZoomIn}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                disabled={zoom >= 3}
              >
                <ZoomIn size={20} />
              </button>
              <div className="w-px h-6 bg-gray-300 mx-2" />
              <button
                onClick={onClose}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* 写真とサイドバー */}
          <div className="flex h-[70vh]">
            {/* 写真表示エリア */}
            <div className="flex-1 flex items-center justify-center bg-gray-50 overflow-hidden">
              <div
                className="relative transition-transform duration-200"
                style={{ transform: `scale(${zoom})` }}
              >
                <Image
                  src={consent.photoUrl}
                  alt="Preview photo"
                  width={600}
                  height={400}
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            </div>

            {/* サイドバー */}
            <div className="w-80 border-l border-gray-200 flex flex-col">
              {/* 詳細情報 */}
              <div className="p-4 space-y-4 flex-1 overflow-y-auto">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">撮影詳細</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center text-gray-600">
                      <Calendar size={14} className="mr-2" />
                      <span>
                        {new Date(consent.createdAt).toLocaleDateString(
                          'ja-JP'
                        )}
                      </span>
                    </div>
                    <div className="flex items-center text-gray-600">
                      <Camera size={14} className="mr-2" />
                      <span>
                        {consent.usageScope.join(', ') || '使用範囲未指定'}
                      </span>
                    </div>
                    {consent.photoSessionId && (
                      <div className="flex items-center text-gray-600">
                        <MapPin size={14} className="mr-2" />
                        <span>撮影会での撮影</span>
                      </div>
                    )}
                  </div>
                </div>

                {consent.requestMessage && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">利用目的</h4>
                    <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
                      {consent.requestMessage}
                    </p>
                  </div>
                )}

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">ステータス</h4>
                  <div
                    className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                      consent.consentStatus === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : consent.consentStatus === 'approved'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {consent.consentStatus === 'pending'
                      ? '保留中'
                      : consent.consentStatus === 'approved'
                        ? '承認済'
                        : '拒否'}
                  </div>
                </div>

                {/* レスポンスメッセージ入力 */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">
                    メッセージ（任意）
                  </h4>
                  <textarea
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    placeholder="承認/拒否の理由やコメントを入力..."
                    className="w-full h-20 p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* アクションボタン */}
              <div className="p-4 border-t border-gray-200 space-y-3">
                <button
                  onClick={() => handleAction('approved')}
                  disabled={isUpdating}
                  className="w-full flex items-center justify-center space-x-2 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  <Heart size={18} />
                  <span>承認する</span>
                </button>

                <button
                  onClick={() => handleAction('requires_discussion')}
                  disabled={isUpdating}
                  className="w-full flex items-center justify-center space-x-2 py-3 bg-yellow-600 text-white font-medium rounded-lg hover:bg-yellow-700 disabled:opacity-50 transition-colors"
                >
                  <MessageCircle size={18} />
                  <span>要相談</span>
                </button>

                <button
                  onClick={() => handleAction('rejected')}
                  disabled={isUpdating}
                  className="w-full flex items-center justify-center space-x-2 py-3 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  <AlertTriangle size={18} />
                  <span>拒否する</span>
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
