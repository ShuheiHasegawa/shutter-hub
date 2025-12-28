'use client';

import { QRCodeSVG } from 'qrcode.react';
import { PhotoSessionSlot } from '@/types/photo-session';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Printer } from 'lucide-react';
import { formatDateLocalized, formatTimeLocalized } from '@/lib/utils/date';
import { useRef } from 'react';
import { useTranslations } from 'next-intl';
import { PhotoSessionWithOrganizer } from '@/types/database';

interface SlotQRCodeProps {
  slot: PhotoSessionSlot;
  locale: string;
  baseUrl?: string;
  session?: PhotoSessionWithOrganizer;
}

export function SlotQRCode({
  slot,
  locale,
  baseUrl = typeof window !== 'undefined' ? window.location.origin : '',
  session,
}: SlotQRCodeProps) {
  const t = useTranslations('checkin');
  const qrRef = useRef<HTMLDivElement>(null);

  const checkInUrl = `${baseUrl}/${locale}/checkin/${slot.id}`;

  const handlePrint = () => {
    // 印刷用のHTMLを生成
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const sessionTitle = session?.title || 'チェックイン';
    const sessionStartTime = session?.start_time
      ? new Date(session.start_time)
      : new Date();
    const sessionEndTime = session?.end_time
      ? new Date(session.end_time)
      : new Date();
    const sessionLocation = session?.location || '';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QRコード - スロット #${slot.slot_number}</title>
          <style>
            @page {
              margin: 1cm;
              size: A4;
            }
            body {
              font-family: system-ui, -apple-system, sans-serif;
              padding: 20px;
              background: white;
            }
            .header {
              margin-bottom: 30px;
              padding-bottom: 20px;
              border-bottom: 2px solid #e5e7eb;
            }
            .header h1 {
              font-size: 24px;
              font-weight: bold;
              margin-bottom: 15px;
            }
            .info-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 15px;
              font-size: 14px;
            }
            .info-item {
              display: flex;
              gap: 8px;
            }
            .info-label {
              font-weight: 600;
            }
            .qr-container {
              text-align: center;
              padding: 20px;
              border: 1px solid #e5e7eb;
              border-radius: 8px;
              background: white;
            }
            .qr-title {
              font-size: 18px;
              font-weight: 600;
              margin-bottom: 15px;
            }
            .qr-code {
              margin: 20px auto;
            }
            .slot-info {
              margin-top: 15px;
              font-size: 14px;
              text-align: left;
              padding: 15px;
              background: #f9fafb;
              border-radius: 6px;
            }
            .slot-info-item {
              margin-bottom: 8px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${sessionTitle}</h1>
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">開催日時:</span>
                <span>${formatDateLocalized(sessionStartTime, locale, 'long')} ${formatTimeLocalized(sessionStartTime, locale)} - ${formatTimeLocalized(sessionEndTime, locale)}</span>
              </div>
              <div class="info-item">
                <span class="info-label">場所:</span>
                <span>${sessionLocation}</span>
              </div>
            </div>
          </div>
          
          <div class="qr-container">
            <div class="qr-title">スロット QRコード #${slot.slot_number}</div>
            <div class="qr-code">
              ${qrRef.current?.querySelector('svg')?.outerHTML || ''}
            </div>
            <div class="slot-info">
              <div class="slot-info-item">
                <span class="info-label">枠番号:</span> ${slot.slot_number}
              </div>
              <div class="slot-info-item">
                <span class="info-label">時間:</span> ${formatDateLocalized(new Date(slot.start_time), locale, 'short')} ${formatTimeLocalized(new Date(slot.start_time), locale)} - ${formatTimeLocalized(new Date(slot.end_time), locale)}
              </div>
            </div>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();

    // 印刷ダイアログを開く
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const handleDownloadQR = () => {
    if (!qrRef.current) return;

    // SVGを取得
    const svgElement = qrRef.current.querySelector('svg');
    if (!svgElement) return;

    // SVGをBlobに変換
    const svgData = new XMLSerializer().serializeToString(svgElement);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(svgBlob);

    // ダウンロード
    const link = document.createElement('a');
    link.href = url;
    link.download = `qr-code-slot-${slot.slot_number}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="slot-qr-card print:shadow-none print:p-2 print:border print:border-gray-300">
      <CardHeader className="print:p-2 print:pb-1">
        <CardTitle className="text-lg print:text-base print:font-semibold">
          {t('slotQRCode')} #{slot.slot_number}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 print:space-y-2 print:p-2 print:pt-1">
        {/* QRコード */}
        <div
          ref={qrRef}
          className="flex justify-center p-4 bg-white rounded-lg print:p-2 print:max-w-[140px] print:mx-auto"
        >
          <QRCodeSVG
            value={checkInUrl}
            size={200}
            level="M"
            includeMargin={true}
          />
        </div>

        {/* スロット情報 */}
        <div className="space-y-2 text-sm print:space-y-1 print:text-xs">
          <div>
            <span className="font-semibold print:font-medium">
              {t('slotNumber')}:
            </span>{' '}
            {slot.slot_number}
          </div>
          <div>
            <span className="font-semibold print:font-medium">
              {t('time')}:
            </span>{' '}
            <span className="print:hidden">
              {formatDateLocalized(
                new Date(slot.start_time),
                locale,
                'long'
              )}{' '}
            </span>
            <span className="hidden print:inline">
              {formatDateLocalized(
                new Date(slot.start_time),
                locale,
                'short'
              )}{' '}
            </span>
            {formatTimeLocalized(new Date(slot.start_time), locale)} -{' '}
            {formatTimeLocalized(new Date(slot.end_time), locale)}
          </div>
          <div className="text-xs text-muted-foreground break-all print:hidden">
            {checkInUrl}
          </div>
        </div>

        {/* アクションボタン（印刷時は非表示） */}
        <div className="flex gap-2 print:hidden">
          <Button onClick={handlePrint} variant="outline" className="flex-1">
            <Printer className="h-4 w-4 mr-2" />
            {t('print')}
          </Button>
          <Button
            onClick={handleDownloadQR}
            variant="outline"
            className="flex-1"
          >
            <Download className="h-4 w-4 mr-2" />
            {t('downloadQR')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
