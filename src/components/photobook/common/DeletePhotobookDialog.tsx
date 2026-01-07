'use client';

import { useState, useTransition } from 'react';
import { Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { deletePhotobook } from '@/app/actions/quick-photobook';
import { logger } from '@/lib/utils/logger';

interface DeletePhotobookDialogProps {
  photobookId: string;
  photobookTitle: string;
  userId: string;
  onSuccess?: () => void;
}

/**
 * フォトブック削除確認ダイアログコンポーネント
 */
export function DeletePhotobookDialog({
  photobookId,
  photobookTitle,
  userId,
  onSuccess,
}: DeletePhotobookDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    startTransition(async () => {
      try {
        const result = await deletePhotobook(photobookId, userId);

        if (result.success) {
          toast.success('フォトブックを削除しました');
          setOpen(false);
          onSuccess?.();
        } else {
          throw new Error(result.error?.message || '削除に失敗しました');
        }
      } catch (error) {
        logger.error('Delete photobook error:', error);
        toast.error('フォトブックの削除に失敗しました');
      }
    });
  };

  return (
    <>
      <DropdownMenuItem
        onSelect={e => {
          e.preventDefault();
          setOpen(true);
        }}
        className="text-error focus:text-error cursor-pointer"
      >
        <Trash2 className="mr-2 h-4 w-4" />
        削除
      </DropdownMenuItem>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>フォトブックを削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              「{photobookTitle}
              」を削除します。この操作は取り消すことができません。
              フォトブックに含まれる全ての画像も同時に削除されます。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>
              キャンセル
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isPending}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isPending ? '削除中...' : '削除する'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
