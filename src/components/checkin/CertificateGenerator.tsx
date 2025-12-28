'use client';

import { useRef, useState, useMemo } from 'react';
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

  // チェックイン時刻をベースに決定論的なIDを生成
  const certificateId = useMemo(() => {
    const checkInTime = new Date(checkedInAt).getTime();
    return `SH-${slot.id.slice(0, 8).toUpperCase()}-${checkInTime.toString(36).toUpperCase()}`;
  }, [slot.id, checkedInAt]);

  const certificateUrl = `${baseUrl}/${locale}/checkin/${slot.id}/certificate/${certificateId}`;

  const handleDownload = async () => {
    if (!certificateRef.current) return;

    setIsGenerating(true);
    try {
      // 一時的に要素を表示可能にする
      const originalDisplay = certificateRef.current.style.display;
      const originalVisibility = certificateRef.current.style.visibility;
      const originalPosition = certificateRef.current.style.position;
      const originalLeft = certificateRef.current.style.left;

      certificateRef.current.style.display = 'block';
      certificateRef.current.style.visibility = 'visible';
      certificateRef.current.style.position = 'absolute';
      certificateRef.current.style.left = '-9999px';

      const canvas = await html2canvas(certificateRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        onclone: clonedDoc => {
          const clonedElement = clonedDoc.querySelector('[data-certificate]');
          if (clonedElement instanceof HTMLElement) {
            clonedElement.style.display = 'block';
            clonedElement.style.visibility = 'visible';
          }
        },
      });

      // 元に戻す
      certificateRef.current.style.display = originalDisplay;
      certificateRef.current.style.visibility = originalVisibility;
      certificateRef.current.style.position = originalPosition;
      certificateRef.current.style.left = originalLeft;

      // toBlobはコールバックベースなので、コールバック内でローディング状態を解除
      canvas.toBlob(blob => {
        if (blob) {
          saveAs(blob, `shutter-hub-certificate-${slot.slot_number}.png`);
        }
        setIsGenerating(false);
      });
    } catch {
      // エラーハンドリング: 証明書生成失敗
      // トースト通知は親コンポーネントで実装されている場合に使用
      setIsGenerating(false);
    }
  };

  const handleShare = async () => {
    if (!certificateRef.current) return;

    setIsGenerating(true);
    try {
      // 一時的に要素を表示可能にする
      const originalDisplay = certificateRef.current.style.display;
      const originalVisibility = certificateRef.current.style.visibility;
      const originalPosition = certificateRef.current.style.position;
      const originalLeft = certificateRef.current.style.left;

      certificateRef.current.style.display = 'block';
      certificateRef.current.style.visibility = 'visible';
      certificateRef.current.style.position = 'absolute';
      certificateRef.current.style.left = '-9999px';

      const canvas = await html2canvas(certificateRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        onclone: clonedDoc => {
          const clonedElement = clonedDoc.querySelector('[data-certificate]');
          if (clonedElement instanceof HTMLElement) {
            clonedElement.style.display = 'block';
            clonedElement.style.visibility = 'visible';
          }
        },
      });

      // 元に戻す
      certificateRef.current.style.display = originalDisplay;
      certificateRef.current.style.visibility = originalVisibility;
      certificateRef.current.style.position = originalPosition;
      certificateRef.current.style.left = originalLeft;

      // toBlobはコールバックベースなので、コールバック内でローディング状態を解除
      canvas.toBlob(async blob => {
        try {
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
            if (blob) {
              saveAs(blob, `shutter-hub-certificate-${slot.slot_number}.png`);
            }
          }
        } catch {
          // エラー時はダウンロードにフォールバック
          if (blob) {
            saveAs(blob, `shutter-hub-certificate-${slot.slot_number}.png`);
          }
        } finally {
          setIsGenerating(false);
        }
      });
    } catch {
      // エラー時はローディング状態を解除
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* 証明書プレビュー（非表示、画像生成用） */}
      <div
        ref={certificateRef}
        data-certificate
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
