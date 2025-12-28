'use client';

import { useEffect, useState } from 'react';
import { SlotQRCode } from '@/components/qr-code/SlotQRCode';
import { PhotoSessionSlot } from '@/types/photo-session';
import { getSessionCheckInStatus } from '@/app/actions/checkin';
import type { CheckInStatus } from '@/app/actions/checkin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Printer,
  RefreshCw,
  Users,
  CheckCircle2,
  Clock,
  CalendarIcon,
  MapPinIcon,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { PhotoSessionWithOrganizer } from '@/types/database';
import { FormattedDateTime } from '@/components/ui/formatted-display';
import { formatDateLocalized, formatTimeLocalized } from '@/lib/utils/date';
import { escapeHtml } from '@/lib/utils/html-utils';

interface CheckInManagementProps {
  sessionId: string;
  slots: PhotoSessionSlot[];
  locale: string;
  session: PhotoSessionWithOrganizer;
}

export function CheckInManagement({
  sessionId,
  slots,
  locale,
  session,
}: CheckInManagementProps) {
  const t = useTranslations('checkin');
  const [checkInStatuses, setCheckInStatuses] = useState<CheckInStatus[]>([]);
  const [loading, setLoading] = useState(true);

  const loadCheckInStatuses = async () => {
    setLoading(true);
    try {
      const statuses = await getSessionCheckInStatus(sessionId);
      setCheckInStatuses(statuses);
    } catch {
      // エラーハンドリング: チェックイン状態の読み込み失敗
      setCheckInStatuses([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCheckInStatuses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const handlePrintAll = () => {
    // 印刷用のHTMLを生成
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const sessionStartTime = new Date(session.start_time);
    const sessionEndTime = new Date(session.end_time);
    const sessionTitle = escapeHtml(session.title);
    const sessionLocation = escapeHtml(session.location || '');

    // すべてのQRコードのHTMLを生成
    const qrCodesHtml = slots
      .map(slot => {
        const qrElement = document.querySelector(
          `[data-slot-id="${slot.id}"] svg`
        );

        return `
        <div class="qr-item">
          <div class="qr-card">
            <div class="qr-title">スロット QRコード #${slot.slot_number}</div>
            <div class="qr-code">
              ${qrElement?.outerHTML || ''}
            </div>
            <div class="slot-info">
              <div class="slot-info-item">
                <span class="info-label">枠番号:</span> ${slot.slot_number}
              </div>
              <div class="slot-info-item">
                <span class="info-label">時間:</span> ${formatTimeLocalized(new Date(slot.start_time), locale)} - ${formatTimeLocalized(new Date(slot.end_time), locale)}
              </div>
            </div>
          </div>
        </div>
      `;
      })
      .join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>チェックイン管理 - ${sessionTitle}</title>
          <style>
            @page {
              margin: 0.8cm;
              size: A4;
            }
            body {
              font-family: system-ui, -apple-system, sans-serif;
              padding: 0;
              background: white;
            }
            .header {
              margin-bottom: 20px;
              padding-bottom: 15px;
              border-bottom: 2px solid #e5e7eb;
            }
            .header h1 {
              font-size: 20px;
              font-weight: bold;
              margin-bottom: 12px;
            }
            .info-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 12px;
              font-size: 12px;
            }
            .info-item {
              display: flex;
              gap: 6px;
            }
            .info-label {
              font-weight: 600;
            }
            .qr-grid {
              display: grid;
              grid-template-columns: repeat(${slots.length <= 2 ? 2 : slots.length <= 6 ? 3 : 4}, 1fr);
              gap: 10px;
            }
            .qr-item {
              break-inside: avoid;
              page-break-inside: avoid;
            }
            .qr-card {
              border: 1px solid #e5e7eb;
              border-radius: 6px;
              padding: 8px;
              background: white;
            }
            .qr-title {
              font-size: 14px;
              font-weight: 600;
              margin-bottom: 8px;
              text-align: center;
            }
            .qr-code {
              text-align: center;
              padding: 8px;
              background: white;
            }
            .qr-code svg {
              width: 120px !important;
              height: 120px !important;
              margin: 0 auto;
            }
            .slot-info {
              margin-top: 8px;
              font-size: 11px;
              padding: 8px;
              background: #f9fafb;
              border-radius: 4px;
            }
            .slot-info-item {
              margin-bottom: 4px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${sessionTitle}</h1>
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">開催日時:</span>
                <span>${formatDateLocalized(sessionStartTime, locale, 'short')} ${formatTimeLocalized(sessionStartTime, locale)} - ${formatTimeLocalized(sessionEndTime, locale)}</span>
              </div>
              <div class="info-item">
                <span class="info-label">場所:</span>
                <span>${sessionLocation}</span>
              </div>
            </div>
          </div>
          
          <div class="qr-grid">
            ${qrCodesHtml}
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

  const getStatusForSlot = (slotId: string): CheckInStatus | undefined => {
    return checkInStatuses.find(s => s.slot_id === slotId);
  };

  // QRコードの数に応じて列数を決定（印刷時）
  const getPrintGridCols = () => {
    if (slots.length <= 2) return 'print:grid-cols-2';
    if (slots.length <= 6) return 'print:grid-cols-3';
    return 'print:grid-cols-4';
  };

  return (
    <div className="space-y-6" data-print-area="checkin-management">
      {/* ヘッダー */}
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h2 className="text-2xl font-bold">{t('checkInManagement')}</h2>
          <p className="text-muted-foreground mt-1">
            {t('checkInManagementDescription')}
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handlePrintAll} variant="outline" size="sm">
            <Printer className="h-4 w-4 mr-2" />
            {t('printAll')}
          </Button>
        </div>
      </div>

      {/* 開催情報（印刷時のみ表示） */}
      <div className="hidden print:block print:mb-6 print:border-b print:pb-4">
        <h1 className="text-2xl font-bold mb-4">{session.title}</h1>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4" />
            <div>
              <div className="font-semibold">開催日時</div>
              <div>
                <FormattedDateTime
                  value={new Date(session.start_time)}
                  format="date-long"
                />{' '}
                <FormattedDateTime
                  value={new Date(session.start_time)}
                  format="time-range"
                  endValue={new Date(session.end_time)}
                />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <MapPinIcon className="h-4 w-4" />
            <div>
              <div className="font-semibold">場所</div>
              <div>{session.location}</div>
            </div>
          </div>
        </div>
      </div>

      {/* スロットごとのQRコードと統計（横スクロール対応） */}
      <div className="overflow-x-auto -mx-4 px-4 pb-4 scrollbar-thin print:!overflow-visible print:!overflow-x-visible print:!mx-0 print:!px-0 print:!pb-0 print:!w-full print:!block">
        <div
          className={`flex gap-6 min-w-max print:!grid print:!flex-none ${getPrintGridCols()} print:!gap-3 print:!min-w-0 print:!w-full print:!max-w-full`}
        >
          {slots.map(slot => {
            const status = getStatusForSlot(slot.id);
            return (
              <div
                key={slot.id}
                className="space-y-4 flex-shrink-0 w-[320px] md:w-[360px] print:!w-auto print:!flex-shrink print:!flex-none print:break-inside-avoid print:space-y-2 print:!max-w-full"
                data-slot-id={slot.id}
              >
                {/* QRコード */}
                <SlotQRCode slot={slot} locale={locale} session={session} />

                {/* チェックイン統計（印刷時は非表示） */}
                {status && (
                  <Card className="print:hidden">
                    <CardHeader>
                      <CardTitle className="text-base">
                        {t('checkInStatistics')} #{slot.slot_number}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{t('totalBookings')}</span>
                        </div>
                        <Badge variant="secondary">
                          {status.total_bookings}
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                          <span className="text-sm">{t('checkedInCount')}</span>
                        </div>
                        <Badge variant="default" className="bg-green-500">
                          {status.checked_in_count}
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-blue-500" />
                          <span className="text-sm">{t('checkedOut')}</span>
                        </div>
                        <Badge variant="default" className="bg-blue-500">
                          {status.checked_out_count}
                        </Badge>
                      </div>

                      {/* 進捗バー */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{t('checkInProgress')}</span>
                          <span>
                            {status.total_bookings > 0
                              ? Math.round(
                                  (status.checked_in_count /
                                    status.total_bookings) *
                                    100
                                )
                              : 0}
                            %
                          </span>
                        </div>
                        <div className="w-full bg-secondary rounded-full h-2">
                          <div
                            className="bg-green-500 h-2 rounded-full transition-all"
                            style={{
                              width: `${
                                status.total_bookings > 0
                                  ? (status.checked_in_count /
                                      status.total_bookings) *
                                    100
                                  : 0
                              }%`,
                            }}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ローディング状態 */}
      {loading && (
        <div className="text-center py-8 print:hidden">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          <p className="text-muted-foreground mt-2">{t('loading')}</p>
        </div>
      )}

      {/* スロットがない場合 */}
      {!loading && slots.length === 0 && (
        <Card className="print:hidden">
          <CardContent className="py-8 text-center text-muted-foreground">
            {t('noSlotsAvailable')}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
