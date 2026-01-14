'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Flag, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { reportStudioAction } from '@/app/actions/studio';
import { logger } from '@/lib/utils/logger';

interface StudioReportDialogProps {
  studioId: string;
  studioName: string;
  trigger?: React.ReactNode;
}

export function StudioReportDialog({
  studioId,
  studioName,
  trigger,
}: StudioReportDialogProps) {
  const t = useTranslations('studio.report');
  const tCommon = useTranslations('common');
  const [isOpen, setIsOpen] = useState(false);
  const [reportReason, setReportReason] = useState<
    'spam' | 'inappropriate' | 'false_info' | 'other' | ''
  >('');
  const [reportDetails, setReportDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleReport = async () => {
    if (!reportReason) {
      toast.error(t('selectReason'));
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await reportStudioAction(
        studioId,
        reportReason as 'spam' | 'inappropriate' | 'false_info' | 'other',
        reportDetails || undefined
      );

      if (result.success) {
        toast.success(t('success'));
        if (result.autoHidden) {
          toast.info(t('autoHiddenMessage'));
        }
        setIsOpen(false);
        setReportReason('');
        setReportDetails('');
      } else {
        toast.error(result.error || t('error'));
      }
    } catch (error) {
      logger.error('スタジオ報告エラー:', error);
      toast.error(t('error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button
            variant="outline"
            size="sm"
            data-testid="studio-report-trigger"
          >
            <Flag className="w-4 h-4 mr-2" />
            {t('button')}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>
            {t('description', { studioName })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium">{t('reason')}</Label>
            <RadioGroup
              data-testid="studio-report-reason"
              value={reportReason}
              onValueChange={value =>
                setReportReason(
                  value as 'spam' | 'inappropriate' | 'false_info' | 'other'
                )
              }
              className="mt-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem
                  data-testid="report-reason-spam"
                  value="spam"
                  id="spam"
                />
                <label htmlFor="spam" className="text-sm cursor-pointer">
                  {t('reasons.spam')}
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem
                  data-testid="report-reason-inappropriate"
                  value="inappropriate"
                  id="inappropriate"
                />
                <label
                  htmlFor="inappropriate"
                  className="text-sm cursor-pointer"
                >
                  {t('reasons.inappropriate')}
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem
                  data-testid="report-reason-false_info"
                  value="false_info"
                  id="false_info"
                />
                <label htmlFor="false_info" className="text-sm cursor-pointer">
                  {t('reasons.falseInfo')}
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem
                  data-testid="report-reason-other"
                  value="other"
                  id="other"
                />
                <label htmlFor="other" className="text-sm cursor-pointer">
                  {t('reasons.other')}
                </label>
              </div>
            </RadioGroup>
          </div>

          <div>
            <Label className="text-sm font-medium">{t('details')}</Label>
            <Textarea
              value={reportDetails}
              onChange={e => setReportDetails(e.target.value)}
              placeholder={t('detailsPlaceholder')}
              rows={3}
              maxLength={500}
              className="mt-2"
            />
            <div className="text-xs text-muted-foreground mt-1">
              {reportDetails.length}/500
            </div>
          </div>

          <div className="bg-muted p-3 rounded-md">
            <p className="text-xs text-muted-foreground">{t('warning')}</p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            disabled={isSubmitting}
          >
            {tCommon('cancel')}
          </Button>
          <Button
            data-testid="studio-report-submit"
            onClick={handleReport}
            disabled={isSubmitting || !reportReason}
            variant="destructive"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t('submitting')}
              </>
            ) : (
              <>
                <Flag className="w-4 h-4 mr-2" />
                {t('submit')}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
