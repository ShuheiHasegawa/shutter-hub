'use client';

import { useState } from 'react';
import { logger } from '@/lib/utils/logger';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertTriangle,
  Clock,
  CheckCircle,
  MessageSquare,
  FileText,
  Phone,
  Calendar,
  MapPin,
  Camera,
  Loader2,
  Search,
  RefreshCw,
} from 'lucide-react';
import { resolveDispute } from '@/app/actions/admin-dispute';

// 争議データの型定義
interface AdminDispute {
  id: string;
  booking_id: string;
  created_at: string;
  status: 'pending' | 'investigating' | 'resolved' | 'escalated';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  guest_name: string;
  guest_phone: string;
  photographer_name: string;
  photographer_phone: string;
  amount: number;
  issues: string[];
  description: string;
  evidence_urls?: string[];
  resolution?:
    | 'full_refund'
    | 'partial_refund'
    | 'photographer_favor'
    | 'mediation';
  resolution_amount?: number;
  admin_notes?: string;
  resolved_at?: string;

  // 関連情報
  booking?: {
    request_type: string;
    location_address: string;
    duration: number;
    photo_count?: number;
    shooting_date: string;
  };
  payment?: {
    total_amount: number;
    platform_fee: number;
    photographer_earnings: number;
  };
  delivery?: {
    external_url?: string;
    photo_count: number;
    delivered_at: string;
  };
}

interface AdminDisputeManagementProps {
  initialDisputes?: AdminDispute[];
}

export function AdminDisputeManagement({
  initialDisputes = [],
}: AdminDisputeManagementProps) {
  const [disputes, setDisputes] = useState<AdminDispute[]>(initialDisputes);
  const [selectedDispute, setSelectedDispute] = useState<AdminDispute | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  // 争議解決フォームの状態
  const [resolutionForm, setResolutionForm] = useState({
    resolution: '',
    refundAmount: 0,
    adminNotes: '',
    notifyGuest: true,
    notifyPhotographer: true,
  });

  // フィルタリングされた争議リスト
  const filteredDisputes = disputes.filter(dispute => {
    const matchesSearch =
      dispute.guest_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dispute.photographer_name
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      dispute.booking_id.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' || dispute.status === statusFilter;
    const matchesPriority =
      priorityFilter === 'all' || dispute.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  // 争議の優先度を計算
  const calculatePriority = (
    dispute: AdminDispute
  ): 'low' | 'medium' | 'high' | 'urgent' => {
    const hoursAgo =
      (new Date().getTime() - new Date(dispute.created_at).getTime()) /
      (1000 * 60 * 60);
    const amount = dispute.amount;

    if (hoursAgo > 48 || amount > 50000) return 'urgent';
    if (hoursAgo > 24 || amount > 20000) return 'high';
    if (hoursAgo > 12 || amount > 10000) return 'medium';
    return 'low';
  };

  // 争議解決の処理
  const handleResolveDispute = async () => {
    if (!selectedDispute) return;

    setIsLoading(true);
    try {
      const result = await resolveDispute({
        dispute_id: selectedDispute.id,
        resolution: resolutionForm.resolution as
          | 'full_refund'
          | 'partial_refund'
          | 'photographer_favor'
          | 'mediation',
        refund_amount: resolutionForm.refundAmount,
        admin_notes: resolutionForm.adminNotes,
        notify_guest: resolutionForm.notifyGuest,
        notify_photographer: resolutionForm.notifyPhotographer,
      });

      if (result.success) {
        // 成功時は状態を更新
        setDisputes(prev =>
          prev.map(d =>
            d.id === selectedDispute.id
              ? {
                  ...d,
                  status: 'resolved' as const,
                  resolution: resolutionForm.resolution as
                    | 'full_refund'
                    | 'partial_refund'
                    | 'photographer_favor'
                    | 'mediation',
                  resolution_amount: resolutionForm.refundAmount,
                  admin_notes: resolutionForm.adminNotes,
                  resolved_at: new Date().toISOString(),
                }
              : d
          )
        );

        setSelectedDispute(null);
        setResolutionForm({
          resolution: '',
          refundAmount: 0,
          adminNotes: '',
          notifyGuest: true,
          notifyPhotographer: true,
        });
      } else {
        logger.error('争議解決エラー:', result.error);
      }
    } catch (error) {
      logger.error('争議解決エラー:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 優先度のバッジ色
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-500 text-white';
      case 'high':
        return 'bg-orange-500 text-white';
      case 'medium':
        return 'bg-yellow-500 text-white';
      case 'low':
        return 'bg-gray-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  // ステータスのバッジ色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'investigating':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'resolved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'escalated':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* 検索・フィルター */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            争議検索・フィルター
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>検索</Label>
              <Input
                placeholder="ゲスト名、カメラマン名、予約ID..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>ステータス</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全て</SelectItem>
                  <SelectItem value="pending">未対応</SelectItem>
                  <SelectItem value="investigating">調査中</SelectItem>
                  <SelectItem value="resolved">解決済み</SelectItem>
                  <SelectItem value="escalated">エスカレーション</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>優先度</Label>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全て</SelectItem>
                  <SelectItem value="urgent">緊急</SelectItem>
                  <SelectItem value="high">高</SelectItem>
                  <SelectItem value="medium">中</SelectItem>
                  <SelectItem value="low">低</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>&nbsp;</Label>
              <Button variant="outline" className="w-full">
                <RefreshCw className="h-4 w-4 mr-2" />
                更新
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 争議一覧 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                争議案件一覧 ({filteredDisputes.length})
              </span>
              <Badge variant="outline">
                未解決:{' '}
                {filteredDisputes.filter(d => d.status !== 'resolved').length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-96 overflow-y-auto">
              {filteredDisputes.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>該当する争議案件はありません</p>
                </div>
              ) : (
                <div className="space-y-0">
                  {filteredDisputes.map(dispute => (
                    <div
                      key={dispute.id}
                      className={`p-4 border-b hover:bg-gray-50 cursor-pointer transition-colors ${
                        selectedDispute?.id === dispute.id
                          ? 'bg-blue-50 border-blue-200'
                          : ''
                      }`}
                      onClick={() => setSelectedDispute(dispute)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge
                            className={getPriorityColor(
                              calculatePriority(dispute)
                            )}
                          >
                            {calculatePriority(dispute).toUpperCase()}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={getStatusColor(dispute.status)}
                          >
                            {dispute.status}
                          </Badge>
                        </div>
                        <span className="text-sm text-gray-500">
                          {new Date(dispute.created_at).toLocaleDateString(
                            'ja-JP'
                          )}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">
                            {dispute.guest_name} vs {dispute.photographer_name}
                          </span>
                          <span className="text-sm font-medium text-green-600">
                            ¥{dispute.amount.toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {dispute.description}
                        </p>
                        <div className="flex gap-1 mt-2">
                          {dispute.issues.slice(0, 2).map((issue, idx) => (
                            <Badge
                              key={idx}
                              variant="secondary"
                              className="text-xs"
                            >
                              {issue}
                            </Badge>
                          ))}
                          {dispute.issues.length > 2 && (
                            <Badge variant="secondary" className="text-xs">
                              +{dispute.issues.length - 2}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 争議詳細・解決フォーム */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              争議詳細・解決
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedDispute ? (
              <Tabs defaultValue="details" className="space-y-4">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="details">詳細</TabsTrigger>
                  <TabsTrigger value="evidence">証拠</TabsTrigger>
                  <TabsTrigger value="resolution">解決</TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="space-y-4">
                  {/* 基本情報 */}
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">争議ID:</span>
                        <span className="ml-2 font-mono">
                          {selectedDispute.id}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">予約ID:</span>
                        <span className="ml-2 font-mono">
                          {selectedDispute.booking_id}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">申請日時:</span>
                        <span className="ml-2">
                          {new Date(selectedDispute.created_at).toLocaleString(
                            'ja-JP'
                          )}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">金額:</span>
                        <span className="ml-2 font-medium text-green-600">
                          ¥{selectedDispute.amount.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <Separator />

                    {/* 関係者情報 */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <h4 className="font-medium text-gray-900">
                          ゲスト情報
                        </h4>
                        <div className="space-y-1 text-sm">
                          <div className="flex items-center gap-2">
                            <span>{selectedDispute.guest_name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Phone className="h-3 w-3 text-gray-400" />
                            <span>{selectedDispute.guest_phone}</span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h4 className="font-medium text-gray-900">
                          カメラマン情報
                        </h4>
                        <div className="space-y-1 text-sm">
                          <div className="flex items-center gap-2">
                            <span>{selectedDispute.photographer_name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Phone className="h-3 w-3 text-gray-400" />
                            <span>{selectedDispute.photographer_phone}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* 争議内容 */}
                    <div className="space-y-3">
                      <h4 className="font-medium text-gray-900">争議内容</h4>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium">
                          問題の種類
                        </Label>
                        <div className="flex flex-wrap gap-1">
                          {selectedDispute.issues.map((issue, idx) => (
                            <Badge
                              key={idx}
                              variant="destructive"
                              className="text-xs"
                            >
                              {issue}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium">詳細説明</Label>
                        <div className="p-3 bg-gray-50 rounded-lg text-sm">
                          {selectedDispute.description}
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="evidence" className="space-y-4">
                  <div className="space-y-4">
                    <h4 className="font-medium">証拠資料</h4>

                    {selectedDispute.evidence_urls &&
                    selectedDispute.evidence_urls.length > 0 ? (
                      <div className="grid grid-cols-2 gap-2">
                        {selectedDispute.evidence_urls.map((url, idx) => (
                          <div key={idx} className="border rounded-lg p-2">
                            <img
                              src={url}
                              alt={`証拠画像 ${idx + 1}`}
                              className="w-full h-32 object-cover rounded"
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center text-gray-500 py-8">
                        <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>証拠資料はアップロードされていません</p>
                      </div>
                    )}

                    {/* 撮影詳細情報 */}
                    {selectedDispute.booking && (
                      <div className="space-y-3">
                        <h4 className="font-medium">撮影詳細</h4>
                        <div className="bg-gray-50 p-3 rounded-lg space-y-2 text-sm">
                          <div className="flex items-center gap-2">
                            <Camera className="h-4 w-4 text-gray-500" />
                            <span>
                              撮影タイプ: {selectedDispute.booking.request_type}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-gray-500" />
                            <span>
                              場所: {selectedDispute.booking.location_address}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-gray-500" />
                            <span>
                              撮影時間: {selectedDispute.booking.duration}分
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-gray-500" />
                            <span>
                              撮影日:{' '}
                              {new Date(
                                selectedDispute.booking.shooting_date
                              ).toLocaleDateString('ja-JP')}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="resolution" className="space-y-4">
                  {selectedDispute.status === 'resolved' ? (
                    <div className="space-y-4">
                      <Alert className="border-green-200 bg-green-50">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <AlertDescription className="text-green-800">
                          この争議は解決済みです (
                          {selectedDispute.resolved_at
                            ? new Date(
                                selectedDispute.resolved_at
                              ).toLocaleDateString('ja-JP')
                            : ''}
                          )
                        </AlertDescription>
                      </Alert>

                      {selectedDispute.resolution && (
                        <div className="space-y-2">
                          <Label>解決方法</Label>
                          <Badge variant="outline">
                            {selectedDispute.resolution}
                          </Badge>
                        </div>
                      )}

                      {selectedDispute.resolution_amount && (
                        <div className="space-y-2">
                          <Label>返金額</Label>
                          <div className="text-lg font-medium text-green-600">
                            ¥
                            {selectedDispute.resolution_amount.toLocaleString()}
                          </div>
                        </div>
                      )}

                      {selectedDispute.admin_notes && (
                        <div className="space-y-2">
                          <Label>管理者メモ</Label>
                          <div className="p-3 bg-gray-50 rounded-lg text-sm">
                            {selectedDispute.admin_notes}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>解決方法</Label>
                        <Select
                          value={resolutionForm.resolution}
                          onValueChange={value =>
                            setResolutionForm(prev => ({
                              ...prev,
                              resolution: value,
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="解決方法を選択..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="full_refund">
                              全額返金
                            </SelectItem>
                            <SelectItem value="partial_refund">
                              部分返金
                            </SelectItem>
                            <SelectItem value="photographer_favor">
                              カメラマン有利
                            </SelectItem>
                            <SelectItem value="mediation">両者協議</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {(resolutionForm.resolution === 'full_refund' ||
                        resolutionForm.resolution === 'partial_refund') && (
                        <div className="space-y-2">
                          <Label>返金額</Label>
                          <Input
                            type="number"
                            placeholder="返金額を入力..."
                            value={resolutionForm.refundAmount || ''}
                            onChange={e =>
                              setResolutionForm(prev => ({
                                ...prev,
                                refundAmount: parseInt(e.target.value) || 0,
                              }))
                            }
                            max={selectedDispute.amount}
                          />
                          <div className="text-xs text-gray-500">
                            最大: ¥{selectedDispute.amount.toLocaleString()}
                          </div>
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label>管理者メモ</Label>
                        <Textarea
                          placeholder="解決理由や今後の対応について記録..."
                          value={resolutionForm.adminNotes}
                          onChange={e =>
                            setResolutionForm(prev => ({
                              ...prev,
                              adminNotes: e.target.value,
                            }))
                          }
                          rows={4}
                        />
                      </div>

                      <div className="flex gap-4">
                        <Button
                          onClick={handleResolveDispute}
                          disabled={!resolutionForm.resolution || isLoading}
                          className="flex-1"
                        >
                          {isLoading ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              解決処理中...
                            </>
                          ) : (
                            <>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              争議を解決
                            </>
                          )}
                        </Button>

                        <Button variant="outline" className="flex-1">
                          <MessageSquare className="h-4 w-4 mr-2" />
                          両者に連絡
                        </Button>
                      </div>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            ) : (
              <div className="text-center text-gray-500 py-12">
                <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>左側から争議案件を選択してください</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
