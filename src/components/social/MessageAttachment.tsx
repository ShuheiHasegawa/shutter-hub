'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Download,
  FileText,
  Music,
  Video,
  Image as ImageIcon,
  File,
  ExternalLink,
} from 'lucide-react';
// 仮の実装（後でmessage-files.tsから移行）
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const getFileIcon = (fileName: string): string => {
  const ext = fileName.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'pdf':
      return 'file-text';
    case 'doc':
    case 'docx':
      return 'file-text';
    case 'mp3':
    case 'wav':
      return 'music';
    case 'mp4':
    case 'webm':
      return 'video';
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
      return 'image';
    default:
      return 'file';
  }
};
import { cn } from '@/lib/utils';

export interface MessageAttachmentData {
  id: string;
  url: string;
  thumbnailUrl?: string;
  fileName: string;
  fileSize: number;
  fileType: 'image' | 'video' | 'document' | 'audio';
  mimeType: string;
}

interface MessageAttachmentProps {
  attachment: MessageAttachmentData;
  className?: string;
}

export function MessageAttachment({
  attachment,
  className,
}: MessageAttachmentProps) {
  const t = useTranslations('messages');
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = attachment.url;
    link.download = attachment.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 画像プレビュー
  if (attachment.fileType === 'image') {
    return (
      <Dialog>
        <DialogTrigger asChild>
          <Card
            className={cn(
              'cursor-pointer hover:shadow-md transition-shadow max-w-sm',
              className
            )}
          >
            <CardContent className="p-2">
              <div className="relative aspect-video rounded overflow-hidden bg-muted">
                <img
                  src={attachment.url}
                  alt={attachment.fileName}
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-2 right-2">
                  <Badge variant="secondary" className="text-xs">
                    <ImageIcon className="h-3 w-3 mr-1" />
                    {formatFileSize(attachment.fileSize)}
                  </Badge>
                </div>
              </div>
              <div className="mt-2">
                <p className="text-sm font-medium truncate">
                  {attachment.fileName}
                </p>
              </div>
            </CardContent>
          </Card>
        </DialogTrigger>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{attachment.fileName}</DialogTitle>
            <DialogDescription>
              {formatFileSize(attachment.fileSize)}
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center max-h-[70vh] overflow-hidden">
            <img
              src={attachment.url}
              alt={attachment.fileName}
              className="max-w-full max-h-full object-contain"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => window.open(attachment.url, '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              {t('attachment.openInNewTab')}
            </Button>
            <Button onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              {t('attachment.download')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // 動画プレビュー
  if (attachment.fileType === 'video') {
    return (
      <Card className={cn('max-w-sm', className)}>
        <CardContent className="p-2">
          <div className="relative aspect-video rounded overflow-hidden bg-black">
            <video
              src={attachment.url}
              poster={attachment.thumbnailUrl}
              controls
              className="w-full h-full"
              preload="metadata"
            >
              {t('attachment.videoNotSupported')}
            </video>
            <div className="absolute bottom-2 right-2">
              <Badge variant="secondary" className="text-xs">
                <Video className="h-3 w-3 mr-1" />
                {formatFileSize(attachment.fileSize)}
              </Badge>
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <p className="text-sm font-medium truncate flex-1">
              {attachment.fileName}
            </p>
            <Button variant="ghost" size="sm" onClick={handleDownload}>
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // 音声プレビュー
  if (attachment.fileType === 'audio') {
    return (
      <Card className={cn('max-w-xs', className)}>
        <CardContent className="p-3">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <Music className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {attachment.fileName}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatFileSize(attachment.fileSize)}
              </p>
            </div>
          </div>
          <div className="mt-3">
            <audio
              src={attachment.url}
              controls
              className="w-full h-8"
              preload="metadata"
            >
              {t('attachment.audioNotSupported')}
            </audio>
          </div>
          <div className="mt-2 flex justify-end">
            <Button variant="ghost" size="sm" onClick={handleDownload}>
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ドキュメントプレビュー
  const iconName = getFileIcon(attachment.fileName);
  const IconComponent =
    {
      'file-text': FileText,
      music: Music,
      video: Video,
      image: ImageIcon,
      file: File,
    }[iconName] || File;

  return (
    <Card
      className={cn('max-w-xs hover:shadow-md transition-shadow', className)}
    >
      <CardContent className="p-3">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
            <IconComponent className="h-6 w-6 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p
              className="text-sm font-medium truncate"
              title={attachment.fileName}
            >
              {attachment.fileName}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatFileSize(attachment.fileSize)}
            </p>
            <Badge variant="outline" className="text-xs mt-1">
              {attachment.fileName.split('.').pop()?.toUpperCase()}
            </Badge>
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(attachment.url, '_blank')}
            className="flex-1"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            {t('attachment.preview')}
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ファイル添付リスト表示用コンポーネント
interface MessageAttachmentListProps {
  attachments: MessageAttachmentData[];
  className?: string;
}

export function MessageAttachmentList({
  attachments,
  className,
}: MessageAttachmentListProps) {
  if (attachments.length === 0) return null;

  return (
    <div className={cn('space-y-2', className)}>
      {attachments.map(attachment => (
        <MessageAttachment key={attachment.id} attachment={attachment} />
      ))}
    </div>
  );
}

// ファイル添付プレビュー（送信前）
interface AttachmentPreviewProps {
  file: File;
  onRemove: () => void;
  className?: string;
}

export function AttachmentPreview({
  file,
  onRemove,
  className,
}: AttachmentPreviewProps) {
  const [preview, setPreview] = useState<string | null>(null);

  // プレビュー生成
  React.useEffect(() => {
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setPreview(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [file]);

  const iconName = getFileIcon(file.name);
  const IconComponent =
    {
      'file-text': FileText,
      music: Music,
      video: Video,
      image: ImageIcon,
      file: File,
    }[iconName] || File;

  return (
    <Card className={cn('max-w-xs', className)}>
      <CardContent className="p-2">
        {file.type.startsWith('image/') && preview ? (
          <div className="relative aspect-video rounded overflow-hidden bg-muted">
            <img
              src={preview}
              alt={file.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute top-2 right-2">
              <Button
                variant="destructive"
                size="sm"
                onClick={onRemove}
                className="h-6 w-6 p-0"
              >
                ×
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 p-2">
            <div className="flex-shrink-0 w-8 h-8 bg-muted rounded flex items-center justify-center">
              <IconComponent className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{file.name}</p>
              <p className="text-xs text-muted-foreground">
                {formatFileSize(file.size)}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onRemove}
              className="h-6 w-6 p-0 flex-shrink-0"
            >
              ×
            </Button>
          </div>
        )}
        <div className="mt-1">
          <p className="text-xs text-center truncate">{file.name}</p>
        </div>
      </CardContent>
    </Card>
  );
}
