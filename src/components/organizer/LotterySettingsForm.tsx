'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { createClient } from '@/lib/supabase/client';
import { logger } from '@/lib/utils/logger';
import type {
  LotterySessionWithSettings,
  WeightCalculationMethod,
  ModelSelectionScope,
  ChekiSelectionScope,
} from '@/types/multi-slot-lottery';
import { Settings, Save } from 'lucide-react';

interface LotterySettingsFormProps {
  lotterySessionId: string;
  lotteryStatus?: string; // 'accepting' | 'completed'
  onSave?: () => void;
}

export function LotterySettingsForm({
  lotterySessionId,
  lotteryStatus,
  onSave,
}: LotterySettingsFormProps) {
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState<Partial<LotterySessionWithSettings>>(
    {
      enable_lottery_weight: false,
      weight_calculation_method: 'linear',
      weight_multiplier: 1.0,
      enable_model_selection: false,
      model_selection_scope: 'per_slot',
      enable_cheki_selection: false,
      cheki_selection_scope: 'total_only',
    }
  );

  // 設定を取得
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setIsLoading(true);
        const supabase = createClient();

        const { data, error } = await supabase
          .from('lottery_sessions')
          .select('*')
          .eq('id', lotterySessionId)
          .single();

        if (error) {
          toast({
            title: 'エラー',
            description: '設定の取得に失敗しました',
            variant: 'destructive',
          });
          return;
        }

        if (data) {
          setSettings({
            enable_lottery_weight: data.enable_lottery_weight || false,
            weight_calculation_method:
              (data.weight_calculation_method as WeightCalculationMethod) ||
              'linear',
            weight_multiplier: data.weight_multiplier || 1.0,
            enable_model_selection: data.enable_model_selection || false,
            model_selection_scope:
              (data.model_selection_scope as ModelSelectionScope) || 'per_slot',
            enable_cheki_selection: data.enable_cheki_selection || false,
            cheki_selection_scope:
              (data.cheki_selection_scope as ChekiSelectionScope) ||
              'total_only',
          });
        }
      } catch (error) {
        logger.error('設定取得エラー:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, [lotterySessionId, toast]);

  // 設定を保存
  const handleSave = async () => {
    // 抽選完了後は設定を変更できない
    if (lotteryStatus === 'completed') {
      toast({
        title: 'エラー',
        description: '抽選完了後は設定を変更できません',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSaving(true);
      const supabase = createClient();

      const { error } = await supabase
        .from('lottery_sessions')
        .update({
          enable_lottery_weight: settings.enable_lottery_weight,
          weight_calculation_method: settings.weight_calculation_method,
          weight_multiplier: settings.weight_multiplier,
          enable_model_selection: settings.enable_model_selection,
          model_selection_scope: settings.model_selection_scope,
          enable_cheki_selection: settings.enable_cheki_selection,
          cheki_selection_scope: settings.cheki_selection_scope,
          updated_at: new Date().toISOString(),
        })
        .eq('id', lotterySessionId);

      if (error) {
        toast({
          title: 'エラー',
          description: '設定の保存に失敗しました',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: '成功',
        description: '設定を保存しました',
      });

      onSave?.();
    } catch (error) {
      logger.error('設定保存エラー:', error);
      toast({
        title: 'エラー',
        description: '設定の保存中にエラーが発生しました',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">読み込み中...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          複数スロット抽選設定
        </CardTitle>
        <CardDescription>複数スロット抽選の詳細設定を行います</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 重み付き抽選設定 */}
        <div className="space-y-4 p-4 border rounded-lg">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base font-medium">
                応募数による当選確率調整
              </Label>
              <p className="text-sm text-muted-foreground">
                応募枠が多いユーザーほど当選確率が高くなります
              </p>
            </div>
            <Switch
              checked={settings.enable_lottery_weight || false}
              onCheckedChange={checked =>
                setSettings({ ...settings, enable_lottery_weight: checked })
              }
              disabled={lotteryStatus === 'completed'}
            />
          </div>

          {settings.enable_lottery_weight && (
            <div className="space-y-4 pt-4 border-t">
              <div className="space-y-2">
                <Label>重み計算方法</Label>
                <Select
                  value={settings.weight_calculation_method || 'linear'}
                  onValueChange={value =>
                    setSettings({
                      ...settings,
                      weight_calculation_method:
                        value as WeightCalculationMethod,
                    })
                  }
                  disabled={lotteryStatus === 'completed'}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="linear">
                      線形（応募数 = 重み）
                    </SelectItem>
                    <SelectItem value="bonus">
                      ボーナス（基本重み + ボーナス）
                    </SelectItem>
                    <SelectItem value="custom">カスタム</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {settings.weight_calculation_method === 'linear' &&
                    '4枠応募 = 4倍の確率'}
                  {settings.weight_calculation_method === 'bonus' &&
                    '4枠応募 = 基本確率 + ボーナス'}
                  {settings.weight_calculation_method === 'custom' &&
                    'カスタム計算式を使用'}
                </p>
              </div>

              <div className="space-y-2">
                <Label>重み倍率</Label>
                <Input
                  type="number"
                  min="0.1"
                  max="10"
                  step="0.1"
                  value={settings.weight_multiplier || 1.0}
                  onChange={e =>
                    setSettings({
                      ...settings,
                      weight_multiplier: parseFloat(e.target.value) || 1.0,
                    })
                  }
                  disabled={lotteryStatus === 'completed'}
                />
                <p className="text-xs text-muted-foreground">
                  重みに掛ける倍率（デフォルト: 1.0）
                </p>
              </div>
            </div>
          )}
        </div>

        {/* 推しモデル選択設定 */}
        <div className="space-y-4 p-4 border rounded-lg">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base font-medium">
                推しモデル選択機能
              </Label>
              <p className="text-sm text-muted-foreground">
                ユーザーが推しモデルを選択できるようにします
              </p>
            </div>
            <Switch
              checked={settings.enable_model_selection || false}
              onCheckedChange={checked =>
                setSettings({ ...settings, enable_model_selection: checked })
              }
              disabled={lotteryStatus === 'completed'}
            />
          </div>

          {settings.enable_model_selection && (
            <div className="space-y-2 pt-4 border-t">
              <Label>モデル選択範囲</Label>
              <Select
                value={settings.model_selection_scope || 'per_slot'}
                onValueChange={value =>
                  setSettings({
                    ...settings,
                    model_selection_scope: value as ModelSelectionScope,
                  })
                }
                disabled={lotteryStatus === 'completed'}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="per_slot">スロットごとに選択</SelectItem>
                  <SelectItem value="session_wide">
                    撮影会全体で1名のみ
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {settings.model_selection_scope === 'per_slot' &&
                  '各スロットで異なるモデルを選択可能'}
                {settings.model_selection_scope === 'session_wide' &&
                  '撮影会全体で1名のモデルを選択'}
              </p>
            </div>
          )}
        </div>

        {/* チェキ選択設定 */}
        <div className="space-y-4 p-4 border rounded-lg">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base font-medium">チェキ選択機能</Label>
              <p className="text-sm text-muted-foreground">
                ユーザーがチェキ枚数を選択できるようにします
              </p>
            </div>
            <Switch
              checked={settings.enable_cheki_selection || false}
              onCheckedChange={checked =>
                setSettings({ ...settings, enable_cheki_selection: checked })
              }
              disabled={lotteryStatus === 'completed'}
            />
          </div>

          {settings.enable_cheki_selection && (
            <div className="space-y-2 pt-4 border-t">
              <Label>チェキ選択範囲</Label>
              <Select
                value={settings.cheki_selection_scope || 'total_only'}
                onValueChange={value =>
                  setSettings({
                    ...settings,
                    cheki_selection_scope: value as ChekiSelectionScope,
                  })
                }
                disabled={lotteryStatus === 'completed'}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="per_slot">スロットごとに選択</SelectItem>
                  <SelectItem value="total_only">
                    全スロット合計で選択
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {settings.cheki_selection_scope === 'per_slot' &&
                  '各スロットで異なる枚数を選択可能'}
                {settings.cheki_selection_scope === 'total_only' &&
                  '全スロットの合計枚数を選択'}
              </p>
            </div>
          )}
        </div>

        {/* 保存ボタン */}
        {lotteryStatus === 'completed' && (
          <div className="p-4 bg-muted/50 rounded-lg text-sm text-muted-foreground">
            抽選完了後は設定を変更できません
          </div>
        )}
        <Button
          onClick={handleSave}
          disabled={isSaving || lotteryStatus === 'completed'}
          className="w-full"
          variant="cta"
        >
          {isSaving ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              保存中...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              設定を保存
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
