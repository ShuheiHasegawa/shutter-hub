'use client';

import React, { useState } from 'react';
import { LayoutTemplate, PhotobookUserPermission } from '@/types/photobook';
import { layoutCategories } from '@/constants/layoutTemplates';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

interface LayoutSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelect: (template: LayoutTemplate) => void;
  userPermission?: PhotobookUserPermission;
}

const LayoutSelector: React.FC<LayoutSelectorProps> = ({
  open,
  onClose,
  onSelect,
  userPermission = PhotobookUserPermission.FREE,
}) => {
  const t = useTranslations('photobook');
  const [selectedCategory, setSelectedCategory] = useState<string>(
    layoutCategories[0]?.id || ''
  );

  // 選択したレイアウトをハンドル
  const handleSelectLayout = (template: LayoutTemplate) => {
    // プレミアムテンプレートかつ無料ユーザーの場合はアップグレード案内
    if (template.isPremium && userPermission === PhotobookUserPermission.FREE) {
      toast.error(t('premiumTemplateRequired'), {
        description: t('upgradeToAccessPremium'),
      });
      return;
    }

    onSelect(template);
    onClose();
  };

  // テンプレートのサムネイル表示
  const renderTemplateCard = (template: LayoutTemplate) => {
    const isPremiumLocked =
      template.isPremium && userPermission === PhotobookUserPermission.FREE;

    return (
      <Card
        key={template.id}
        className={cn(
          'w-48 cursor-pointer hover:shadow-lg transition-shadow duration-200',
          isPremiumLocked && 'opacity-70'
        )}
        onClick={() => handleSelectLayout(template)}
      >
        <CardHeader className="p-0">
          <div className="h-32 bg-gray-100 flex justify-center items-center relative rounded-t-lg overflow-hidden">
            {/* テンプレートのサムネイル画像 */}
            <div className="flex flex-wrap w-4/5 h-4/5 gap-1 justify-center items-center">
              {template.photoPositions.map((pos, index) => (
                <div
                  key={index}
                  className="bg-gray-300 rounded-sm"
                  style={{
                    width: `${Math.min(pos.width, 30)}%`,
                    height: `${Math.min(pos.height, 30)}%`,
                  }}
                />
              ))}
            </div>

            {/* プレミアムバッジ */}
            {template.isPremium && (
              <Badge className="absolute top-0 right-0 bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-tl-none rounded-br-none">
                Premium
              </Badge>
            )}

            {/* ロックアイコン */}
            {isPremiumLocked && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Lock className="w-6 h-6 text-gray-600" />
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <CardTitle className="text-sm">{template.name}</CardTitle>
          <CardDescription className="text-xs mt-1">
            {template.description}
          </CardDescription>
          <div className="flex gap-2 mt-2">
            <Badge variant="secondary" className="text-xs">
              {template.photoPositions.length}
              {t('photos')}
            </Badge>
            {template.isPremium && (
              <Badge className="text-xs bg-gradient-to-r from-yellow-400 to-orange-500">
                Premium
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>{t('selectLayout')}</DialogTitle>
        </DialogHeader>

        <Tabs
          value={selectedCategory}
          onValueChange={setSelectedCategory}
          className="flex-1"
        >
          <TabsList className="grid w-full grid-cols-3">
            {layoutCategories.map(category => (
              <TabsTrigger
                key={category.id}
                value={category.id}
                className="text-sm"
              >
                {category.name}
                {category.id === 'premium' &&
                  userPermission !== PhotobookUserPermission.FREE && (
                    <Badge variant="secondary" className="ml-2 text-xs">
                      Pro
                    </Badge>
                  )}
              </TabsTrigger>
            ))}
          </TabsList>

          {layoutCategories.map(category => (
            <TabsContent key={category.id} value={category.id} className="mt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto p-2">
                {category.templates.map(template =>
                  renderTemplateCard(template)
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>

        <div className="flex justify-end pt-4">
          <Button variant="outline" onClick={onClose}>
            {t('cancel')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LayoutSelector;
