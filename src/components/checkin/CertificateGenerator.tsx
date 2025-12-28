'use client';

import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Share2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import html2canvas from 'html2canvas';
import { saveAs } from 'file-saver';
import { PhotoSessionSlot } from '@/types/photo-session';
import { PhotoSession } from '@/types/database';
import { formatDateTimeLocalized } from '@/lib/utils/date';
import { QRCodeSVG } from 'qrcode.react';

interface CertificateGeneratorProps {
  slot: PhotoSessionSlot & {
    photo_session: PhotoSession;
  };
  checkedInAt: string;
  locale: string;
  baseUrl?: string;
}

export function CertificateGenerator({
  slot,
  checkedInAt,
  locale,
  baseUrl = typeof window !== 'undefined' ? window.location.origin : '',
}: CertificateGeneratorProps) {
  const t = useTranslations('checkin');
  const certificateRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const certificateId = `SH-${slot.id.slice(0, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
  const certificateUrl = `${baseUrl}/${locale}/checkin/${slot.id}/certificate/${certificateId}`;

  const handleDownload = async () => {
    if (!certificateRef.current) return;

    setIsGenerating(true);
    try {
      const canvas = await html2canvas(certificateRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
      });

      canvas.toBlob(blob => {
        if (blob) {
          saveAs(blob, `shutter-hub-certificate-${slot.slot_number}.png`);
        }
      });
    } catch {
      // エラーハンドリング: 証明書生成失敗
    } finally {
      setIsGenerating(false);
    }
  };

  const handleShare = async () => {
    if (!certificateRef.current) return;

    setIsGenerating(true);
    try {
      const canvas = await html2canvas(certificateRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
      });

      canvas.toBlob(async blob => {
        if (blob && navigator.share) {
          const file = new File(
            [blob],
            `shutter-hub-certificate-${slot.slot_number}.png`,
            {
              type: 'image/png',
            }
          );
          await navigator.share({
            title: `${slot.photo_session.title} - 入場証明書`,
            text: `#ShutterHub で撮影会に参加しました！`,
            files: [file],
          });
        } else {
          // フォールバック: ダウンロード
          handleDownload();
        }
      });
    } catch {
      // エラー時はダウンロードにフォールバック
      handleDownload();
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* 証明書プレビュー（非表示、画像生成用） */}
      <div
        ref={certificateRef}
        className="hidden print:block bg-gradient-to-br from-purple-50 to-pink-50 p-8 rounded-lg"
        style={{
          width: '1080px',
          height: '1920px',
          position: 'relative',
        }}
      >
        {/* 背景デザイン */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-100/50 to-pink-100/50 rounded-lg" />

        {/* コンテンツ */}
        <div className="relative z-10 h-full flex flex-col items-center justify-center text-center space-y-6">
          {/* ロゴ・タイトル */}
          <div className="space-y-2">
            <h1 className="text-4xl font-bold text-purple-900">ShutterHub</h1>
            <div className="w-24 h-1 bg-purple-500 mx-auto" />
          </div>

          {/* 証明書タイトル */}
          <div className="space-y-2">
            <h2 className="text-3xl font-bold text-gray-900">入場証明書</h2>
            <p className="text-lg text-gray-600">Certificate of Attendance</p>
          </div>

          {/* 撮影会情報 */}
          <div className="space-y-4 bg-white/80 p-6 rounded-lg max-w-md">
            <h3 className="text-2xl font-semibold text-gray-900">
              {slot.photo_session.title}
            </h3>
            <div className="space-y-2 text-sm text-gray-600">
              <p>
                {formatDateTimeLocalized(new Date(slot.start_time), locale)}
              </p>
              <p>{slot.photo_session.location}</p>
            </div>
          </div>

          {/* QRコード */}
          <div className="bg-white p-4 rounded-lg">
            <QRCodeSVG
              value={certificateUrl}
              size={120}
              level="M"
              includeMargin={true}
            />
          </div>

          {/* 証明書ID */}
          <div className="space-y-2">
            <p className="text-sm text-gray-500">Certificate ID</p>
            <p className="text-xs font-mono text-gray-400">{certificateId}</p>
          </div>

          {/* 入場時刻 */}
          <div className="space-y-2">
            <p className="text-sm text-gray-500">入場時刻</p>
            <p className="text-lg font-semibold text-gray-900">
              {formatDateTimeLocalized(new Date(checkedInAt), locale)}
            </p>
          </div>

          {/* ハッシュタグ */}
          <div className="mt-auto pt-8">
            <p className="text-xl font-bold text-purple-600">#ShutterHub</p>
          </div>
        </div>
      </div>

      {/* アクションボタン */}
      <div className="flex gap-2 print:hidden">
        <Button
          onClick={handleDownload}
          disabled={isGenerating}
          variant="default"
          className="flex-1"
        >
          <Download className="h-4 w-4 mr-2" />
          {isGenerating ? t('generating') : t('downloadCertificate')}
        </Button>
        {typeof navigator.share === 'function' && (
          <Button
            onClick={handleShare}
            disabled={isGenerating}
            variant="outline"
            className="flex-1"
          >
            <Share2 className="h-4 w-4 mr-2" />
            {t('share')}
          </Button>
        )}
      </div>
    </div>
  );
}
