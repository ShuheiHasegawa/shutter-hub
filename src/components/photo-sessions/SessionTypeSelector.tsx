'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Users, User, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PhotoSessionType } from '@/types/photo-session';
import { ActionBarButton } from '@/components/ui/action-bar';
import { ActionBar } from '@/components/ui/action-bar';

interface SessionTypeSelectorProps {
  onSelect: (type: PhotoSessionType) => void;
}

export function SessionTypeSelector({ onSelect }: SessionTypeSelectorProps) {
  const [selectedType, setSelectedType] = useState<PhotoSessionType | null>(
    null
  );

  const handleContinue = () => {
    if (selectedType) {
      onSelect(selectedType);
    }
  };

  const actionBarButtons: ActionBarButton[] = [
    {
      id: 'next',
      label: '次へ進む',
      variant: 'cta' as const,
      onClick: handleContinue,
      disabled: !selectedType,
    },
  ];

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8 px-4 py-8">
      {/* ヘッダーセクション */}
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold tracking-tight">撮影会を作成</h1>
        <p className="text-lg text-muted-foreground">
          撮影会のタイプを選択してください
        </p>
      </div>

      {/* カードグリッド */}
      <RadioGroup
        value={selectedType || undefined}
        onValueChange={value => setSelectedType(value as PhotoSessionType)}
        className="grid gap-6 md:grid-cols-2"
      >
        {/* 個別撮影会 */}
        <Card
          className={cn(
            'group relative cursor-pointer transition-all duration-200',
            'hover:shadow-lg hover:scale-[1.02]',
            selectedType === 'individual'
              ? 'border-primary shadow-md ring-2 ring-primary/20 bg-primary/5'
              : 'border-border hover:border-primary/50'
          )}
          onClick={() => setSelectedType('individual')}
        >
          {/* 選択インジケーター */}
          {selectedType === 'individual' && (
            <div className="absolute top-4 right-4">
              <CheckCircle2 className="h-6 w-6 text-primary fill-primary/20" />
            </div>
          )}

          <CardHeader className="pb-4">
            <div className="flex items-start gap-4">
              <div className="mt-1">
                <RadioGroupItem
                  value="individual"
                  id="individual"
                  className="h-5 w-5"
                />
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <Label
                    htmlFor="individual"
                    className="text-xl font-semibold cursor-pointer"
                  >
                    個別撮影会
                  </Label>
                </div>
                <CardDescription className="text-base leading-relaxed">
                  モデルごとに別々の撮影会を作成します
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-0">
            <div className="space-y-4 pl-9">
              <div className="space-y-2.5">
                <div className="flex items-start gap-2.5">
                  <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                  <span className="text-sm text-muted-foreground leading-relaxed">
                    各モデルごとに料金を設定可能
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                  <span className="text-sm text-muted-foreground leading-relaxed">
                    モデルごとに独立した撮影会として管理
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                  <span className="text-sm text-muted-foreground leading-relaxed">
                    一括で複数モデルの撮影会を作成可能
                  </span>
                </div>
              </div>

              <div className="pt-3 mt-3 border-t">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted/50">
                  <span className="text-xs font-medium text-muted-foreground">
                    例：
                  </span>
                  <span className="text-xs text-muted-foreground">
                    モデルA（7,000円）×4枠、モデルB（12,000円）×4枠
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 合同撮影会 */}
        <Card
          className={cn(
            'group relative cursor-pointer transition-all duration-200',
            'hover:shadow-lg hover:scale-[1.02]',
            selectedType === 'joint'
              ? 'border-primary shadow-md ring-2 ring-primary/20 bg-primary/5'
              : 'border-border hover:border-primary/50'
          )}
          onClick={() => setSelectedType('joint')}
        >
          {/* 選択インジケーター */}
          {selectedType === 'joint' && (
            <div className="absolute top-4 right-4">
              <CheckCircle2 className="h-6 w-6 text-primary fill-primary/20" />
            </div>
          )}

          <CardHeader className="pb-4">
            <div className="flex items-start gap-4">
              <div className="mt-1">
                <RadioGroupItem value="joint" id="joint" className="h-5 w-5" />
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <Label
                    htmlFor="joint"
                    className="text-xl font-semibold cursor-pointer"
                  >
                    合同撮影会
                  </Label>
                </div>
                <CardDescription className="text-base leading-relaxed">
                  複数モデルが出演する1つの撮影会を作成します
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-0">
            <div className="space-y-4 pl-9">
              <div className="space-y-2.5">
                <div className="flex items-start gap-2.5">
                  <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                  <span className="text-sm text-muted-foreground leading-relaxed">
                    複数モデルを紐づけ（料金設定なし）
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                  <span className="text-sm text-muted-foreground leading-relaxed">
                    枠ごとに料金を設定
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                  <span className="text-sm text-muted-foreground leading-relaxed">
                    参加者は推しモデルを選択可能
                  </span>
                </div>
              </div>

              <div className="pt-3 mt-3 border-t">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted/50">
                  <span className="text-xs font-medium text-muted-foreground">
                    例：
                  </span>
                  <span className="text-xs text-muted-foreground">
                    枠1（8,000円・50名）、枠2（8,000円・50名）
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </RadioGroup>

      <ActionBar actions={actionBarButtons} maxColumns={1} background="blur" />
    </div>
  );
}
