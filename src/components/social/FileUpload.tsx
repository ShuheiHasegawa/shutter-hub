'use client';

import React, { useState, useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Upload,
  FileText,
  Music,
  Video,
  Image as ImageIcon,
  File,
  AlertCircle,
} from 'lucide-react';
import { AttachmentPreview } from './MessageAttachment';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface FileUploadProps {
  onFilesSelected: (files: File[]) => void;
  maxFiles?: number;
  maxFileSize?: number; // MB
  acceptedTypes?: string[];
  disabled?: boolean;
  className?: string;
}

interface UploadingFile {
  file: File;
  progress: number;
  error?: string;
}

export function FileUpload({
  onFilesSelected,
  maxFiles = 5,
  maxFileSize = 50, // 50MB
  acceptedTypes = [
    'image/*',
    'video/*',
    'audio/*',
    'application/pdf',
    'application/msword',
    'text/*',
  ],
  disabled = false,
  className,
}: FileUploadProps) {
  const t = useTranslations('messages');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadingFiles] = useState<UploadingFile[]>([]);
  // setUploadingFiles is prepared for future upload progress feature

  const validateFile = useCallback(
    (file: File): { valid: boolean; error?: string } => {
      // ファイルサイズチェック
      if (file.size > maxFileSize * 1024 * 1024) {
        return {
          valid: false,
          error: t('fileUpload.error.fileTooLarge', { size: maxFileSize }),
        };
      }

      // ファイルタイプチェック
      const isAccepted = acceptedTypes.some(type => {
        if (type.endsWith('/*')) {
          return file.type.startsWith(type.slice(0, -2));
        }
        return file.type === type;
      });

      if (!isAccepted) {
        return {
          valid: false,
          error: t('fileUpload.error.invalidFileType'),
        };
      }

      return { valid: true };
    },
    [maxFileSize, acceptedTypes, t]
  );

  const handleFileSelect = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;

      const fileArray = Array.from(files);
      const remainingSlots = maxFiles - selectedFiles.length;

      if (fileArray.length > remainingSlots) {
        toast.error(t('fileUpload.error.tooManyFiles', { max: maxFiles }));
        return;
      }

      // ファイルバリデーション
      const validFiles: File[] = [];
      const invalidFiles: string[] = [];

      for (const file of fileArray) {
        const validation = validateFile(file);
        if (validation.valid) {
          validFiles.push(file);
        } else {
          invalidFiles.push(`${file.name}: ${validation.error}`);
        }
      }

      if (invalidFiles.length > 0) {
        toast.error(
          t('fileUpload.error.someFilesInvalid') +
            '\n' +
            invalidFiles.join('\n')
        );
      }

      if (validFiles.length > 0) {
        const newSelectedFiles = [...selectedFiles, ...validFiles];
        setSelectedFiles(newSelectedFiles);
        onFilesSelected(newSelectedFiles);
        toast.success(
          t('fileUpload.success.filesSelected', { count: validFiles.length })
        );
      }
    },
    [selectedFiles, maxFiles, validateFile, onFilesSelected, t]
  );

  const handleRemoveFile = useCallback(
    (index: number) => {
      const newSelectedFiles = selectedFiles.filter((_, i) => i !== index);
      setSelectedFiles(newSelectedFiles);
      onFilesSelected(newSelectedFiles);
    },
    [selectedFiles, onFilesSelected]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled) {
        setIsDragOver(true);
      }
    },
    [disabled]
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      if (disabled) return;

      const files = e.dataTransfer.files;
      handleFileSelect(files);
    },
    [disabled, handleFileSelect]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleFileSelect(e.target.files);
      // Reset input value to allow selecting the same file again
      e.target.value = '';
    },
    [handleFileSelect]
  );

  const getFileTypeIcon = (file: File) => {
    if (file.type.startsWith('image/')) return ImageIcon;
    if (file.type.startsWith('video/')) return Video;
    if (file.type.startsWith('audio/')) return Music;
    if (file.type === 'application/pdf' || file.type.includes('document'))
      return FileText;
    return File;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* ドラッグ&ドロップエリア */}
      <Card
        className={cn(
          'border-2 border-dashed transition-all duration-200 cursor-pointer',
          isDragOver && 'border-primary bg-primary/5',
          disabled && 'opacity-50 cursor-not-allowed',
          selectedFiles.length >= maxFiles && 'opacity-50'
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() =>
          !disabled &&
          selectedFiles.length < maxFiles &&
          fileInputRef.current?.click()
        }
      >
        <CardContent className="p-6">
          <div className="text-center">
            <div className="mx-auto w-12 h-12 bg-muted rounded-lg flex items-center justify-center mb-4">
              <Upload className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">
              {selectedFiles.length >= maxFiles
                ? t('fileUpload.maxFilesReached')
                : t('fileUpload.title')}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {t('fileUpload.description')}
            </p>
            <Button
              type="button"
              variant="outline"
              disabled={disabled || selectedFiles.length >= maxFiles}
              onClick={e => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
            >
              <Upload className="h-4 w-4 mr-2" />
              {t('fileUpload.selectFiles')}
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              {t('fileUpload.orDragAndDrop')}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 隠しファイル入力 */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={acceptedTypes.join(',')}
        className="hidden"
        onChange={handleInputChange}
        disabled={disabled}
      />

      {/* ファイル制限表示 */}
      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
        <Badge variant="outline">
          {t('fileUpload.maxFiles')}: {selectedFiles.length}/{maxFiles}
        </Badge>
        <Badge variant="outline">
          {t('fileUpload.maxSize')}: {maxFileSize}MB
        </Badge>
        <Badge variant="outline">
          {t('fileUpload.acceptedTypes')}: {t('fileUpload.allTypes')}
        </Badge>
      </div>

      {/* 選択されたファイル一覧 */}
      {selectedFiles.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium">
            {t('fileUpload.selectedFiles')} ({selectedFiles.length})
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {selectedFiles.map((file, index) => (
              <AttachmentPreview
                key={`${file.name}-${index}`}
                file={file}
                onRemove={() => handleRemoveFile(index)}
              />
            ))}
          </div>
        </div>
      )}

      {/* アップロード中のファイル */}
      {uploadingFiles.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium">
            {t('fileUpload.uploading')} ({uploadingFiles.length})
          </h4>
          <div className="space-y-2">
            {uploadingFiles.map((uploadingFile, index) => {
              const IconComponent = getFileTypeIcon(uploadingFile.file);
              return (
                <Card key={index}>
                  <CardContent className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                        <IconComponent className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {uploadingFile.file.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(uploadingFile.file.size)}
                        </p>
                        <div className="mt-1">
                          <Progress
                            value={uploadingFile.progress}
                            className="h-2"
                          />
                        </div>
                        {uploadingFile.error && (
                          <div className="flex items-center gap-1 mt-1">
                            <AlertCircle className="h-3 w-3 text-destructive" />
                            <p className="text-xs text-destructive">
                              {uploadingFile.error}
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {uploadingFile.progress}%
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* 使用方法のヒント */}
      <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
        <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
        <div className="text-sm text-muted-foreground">
          <p className="font-medium mb-1">{t('fileUpload.tips.title')}</p>
          <ul className="space-y-1 text-xs">
            <li>• {t('fileUpload.tips.dragAndDrop')}</li>
            <li>• {t('fileUpload.tips.multipleFiles')}</li>
            <li>• {t('fileUpload.tips.supportedFormats')}</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
