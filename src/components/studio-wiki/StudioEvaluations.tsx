'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
// import { StudioEvaluationForm } from './StudioEvaluationForm';
// import { StudioEvaluation as StudioEvaluationType } from '@/types/database';

// 一時的な型定義（StudioWiki実装時に正式な型に置き換え）
interface StudioEvaluationType {
  id: string;
  studio_id: string;
  user_id: string;
  photo_session_id?: string;
  evaluation_photos?: string[];
  user_role: 'model' | 'photographer' | 'organizer';
  overall_rating: number;
  location_rating: number;
  equipment_rating: number;
  staff_rating: number;
  cleanliness_rating: number;
  value_rating: number;
  comment?: string;
  created_at: string;
  updated_at: string;
}
import {
  UserIcon,
  CameraIcon,
  BuildingOfficeIcon,
  PlusIcon,
  PhotoIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import Image from 'next/image';

interface StudioEvaluationsProps {
  studioId: string;
  evaluations: StudioEvaluationType[];
  averageRatings: {
    overall: number;
    accessibility: number;
    cleanliness: number;
    staff_support: number;
    cost_performance: number;
    byRole: {
      model: number;
      photographer: number;
      organizer: number;
    };
  };
  userCanEvaluate?: boolean;
  userEvaluation?: StudioEvaluationType;
}

export function StudioEvaluations({
  studioId: _studioId,
  evaluations,
  averageRatings,
  userCanEvaluate,
  userEvaluation,
}: StudioEvaluationsProps) {
  const [showEvaluationForm, setShowEvaluationForm] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>('all');

  // 役割別フィルタリング
  const filteredEvaluations = evaluations.filter(evaluation =>
    selectedRole === 'all' ? true : evaluation.user_role === selectedRole
  );

  // 評価分布計算
  const ratingDistribution = [5, 4, 3, 2, 1].map(rating => {
    const count = evaluations.filter(
      e => Math.floor(e.overall_rating) === rating
    ).length;
    const percentage =
      evaluations.length > 0 ? (count / evaluations.length) * 100 : 0;
    return { rating, count, percentage };
  });

  // 役割別カウント
  const roleCounts = {
    model: evaluations.filter(e => e.user_role === 'model').length,
    photographer: evaluations.filter(e => e.user_role === 'photographer')
      .length,
    organizer: evaluations.filter(e => e.user_role === 'organizer').length,
  };

  return (
    <div className="space-y-6">
      {/* 評価サマリー */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 総合評価 */}
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-lg">総合評価</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <div className="space-y-2">
              <div className="text-4xl font-bold text-blue-600">
                {averageRatings.overall.toFixed(1)}
              </div>
              <div className="flex justify-center">
                <StarRating rating={averageRatings.overall} />
              </div>
              <div className="text-sm text-gray-500">
                {evaluations.length}件の評価
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 評価分布 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">評価分布</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {ratingDistribution.map(({ rating, count, percentage }) => (
              <div key={rating} className="flex items-center gap-2">
                <span className="w-6 text-sm">{rating}★</span>
                <Progress value={percentage} className="flex-1 h-2" />
                <span className="w-8 text-sm text-gray-500">{count}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* 役割別評価 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">役割別評価</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserIcon className="w-4 h-4 text-pink-500" />
                  <span className="text-sm">モデル</span>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-pink-600">
                    {averageRatings.byRole.model.toFixed(1)}
                  </div>
                  <div className="text-xs text-gray-500">
                    ({roleCounts.model}件)
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CameraIcon className="w-4 h-4 text-blue-500" />
                  <span className="text-sm">カメラマン</span>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-blue-600">
                    {averageRatings.byRole.photographer.toFixed(1)}
                  </div>
                  <div className="text-xs text-gray-500">
                    ({roleCounts.photographer}件)
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BuildingOfficeIcon className="w-4 h-4 text-green-500" />
                  <span className="text-sm">運営者</span>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-green-600">
                    {averageRatings.byRole.organizer.toFixed(1)}
                  </div>
                  <div className="text-xs text-gray-500">
                    ({roleCounts.organizer}件)
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 詳細評価 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">詳細評価</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-lg font-semibold">
                {averageRatings.accessibility.toFixed(1)}
              </div>
              <div className="text-sm text-gray-600">アクセス</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-lg font-semibold">
                {averageRatings.cleanliness.toFixed(1)}
              </div>
              <div className="text-sm text-gray-600">清潔感</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-lg font-semibold">
                {averageRatings.staff_support.toFixed(1)}
              </div>
              <div className="text-sm text-gray-600">サポート</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-lg font-semibold">
                {averageRatings.cost_performance.toFixed(1)}
              </div>
              <div className="text-sm text-gray-600">コスパ</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 評価投稿ボタン */}
      {userCanEvaluate && !userEvaluation && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-blue-900">
                  このスタジオを評価しませんか？
                </h3>
                <p className="text-sm text-blue-700 mt-1">
                  撮影会にご参加いただいた方は、スタジオの評価・レビューを投稿できます
                </p>
              </div>
              <Button
                onClick={() => setShowEvaluationForm(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <PlusIcon className="w-4 h-4 mr-2" />
                評価を投稿
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 評価投稿フォーム */}
      {showEvaluationForm && (
        <div className="p-4 text-center text-muted-foreground">
          評価フォームは準備中です
        </div>
      )}

      {/* 評価一覧 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">ユーザー評価</CardTitle>
            <Tabs
              value={selectedRole}
              onValueChange={setSelectedRole}
              className="w-auto"
            >
              <TabsList className="grid grid-cols-4 w-fit">
                <TabsTrigger value="all" className="text-xs">
                  すべて
                </TabsTrigger>
                <TabsTrigger value="model" className="text-xs">
                  モデル
                </TabsTrigger>
                <TabsTrigger value="photographer" className="text-xs">
                  カメラマン
                </TabsTrigger>
                <TabsTrigger value="organizer" className="text-xs">
                  運営者
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          {filteredEvaluations.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {selectedRole === 'all'
                ? '評価がまだありません'
                : `${getRoleLabel(selectedRole)}による評価がありません`}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredEvaluations.map(evaluation => (
                <EvaluationCard key={evaluation.id} evaluation={evaluation} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// 個別評価カード
function EvaluationCard({ evaluation }: { evaluation: StudioEvaluationType }) {
  const roleIcon = {
    model: <UserIcon className="w-4 h-4 text-pink-500" />,
    photographer: <CameraIcon className="w-4 h-4 text-blue-500" />,
    organizer: <BuildingOfficeIcon className="w-4 h-4 text-green-500" />,
  }[evaluation.user_role];

  const roleColor = {
    model: 'bg-pink-50 text-pink-700 border-pink-200',
    photographer: 'bg-blue-50 text-blue-700 border-blue-200',
    organizer: 'bg-green-50 text-green-700 border-green-200',
  }[evaluation.user_role];

  return (
    <Card className="border-l-4 border-l-blue-200">
      <CardContent className="pt-4">
        <div className="space-y-3">
          {/* ヘッダー */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Avatar className="w-8 h-8">
                <AvatarImage src="" />
                <AvatarFallback>
                  {evaluation.user_role === 'model'
                    ? 'M'
                    : evaluation.user_role === 'photographer'
                      ? 'P'
                      : 'O'}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-2">
                  <Badge className={`text-xs ${roleColor}`}>
                    {roleIcon}
                    {getRoleLabel(evaluation.user_role)}
                  </Badge>
                  {/* TODO: is_verified プロパティを追加後に有効化
                  {evaluation.is_verified && (
                    <Badge variant="outline" className="text-xs">
                      ✓ 参加確認済み
                    </Badge>
                  )}
                  */}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {new Date(evaluation.created_at).toLocaleDateString('ja-JP')}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1">
                <StarRating rating={evaluation.overall_rating} size="sm" />
                <span className="text-sm font-medium ml-1">
                  {evaluation.overall_rating.toFixed(1)}
                </span>
              </div>
            </div>
          </div>

          {/* 詳細評価 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            {evaluation.location_rating && (
              <div className="flex justify-between">
                <span className="text-gray-600">アクセス</span>
                <span className="font-medium">
                  {evaluation.location_rating.toFixed(1)}
                </span>
              </div>
            )}
            {evaluation.cleanliness_rating && (
              <div className="flex justify-between">
                <span className="text-gray-600">清潔感</span>
                <span className="font-medium">
                  {evaluation.cleanliness_rating.toFixed(1)}
                </span>
              </div>
            )}
            {evaluation.staff_rating && (
              <div className="flex justify-between">
                <span className="text-gray-600">サポート</span>
                <span className="font-medium">
                  {evaluation.staff_rating.toFixed(1)}
                </span>
              </div>
            )}
            {evaluation.value_rating && (
              <div className="flex justify-between">
                <span className="text-gray-600">コスパ</span>
                <span className="font-medium">
                  {evaluation.value_rating.toFixed(1)}
                </span>
              </div>
            )}
          </div>

          {/* コメント */}
          {evaluation.comment && (
            <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
              {evaluation.comment}
            </div>
          )}

          {/* 評価写真 */}
          {evaluation.evaluation_photos &&
            evaluation.evaluation_photos.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-1 text-sm text-gray-600">
                  <PhotoIcon className="w-4 h-4" />
                  評価写真
                </div>
                <div className="flex gap-2 overflow-x-auto">
                  {evaluation.evaluation_photos.map(
                    (photo: string, index: number) => (
                      <div
                        key={index}
                        className="relative w-20 h-20 flex-shrink-0"
                      >
                        <Image
                          src={photo}
                          alt={`評価写真${index + 1}`}
                          fill
                          className="object-cover rounded-lg"
                        />
                      </div>
                    )
                  )}
                </div>
              </div>
            )}
        </div>
      </CardContent>
    </Card>
  );
}

// 星評価コンポーネント
function StarRating({
  rating,
  size = 'default',
}: {
  rating: number;
  size?: 'sm' | 'default';
}) {
  const sizeClass = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';

  return (
    <div className="flex">
      {[1, 2, 3, 4, 5].map(star => (
        <StarIconSolid
          key={star}
          className={`${sizeClass} ${
            star <= rating ? 'text-yellow-400' : 'text-gray-200'
          }`}
        />
      ))}
    </div>
  );
}

// ヘルパー関数
function getRoleLabel(role: string): string {
  const roleLabels: Record<string, string> = {
    model: 'モデル',
    photographer: 'カメラマン',
    organizer: '運営者',
  };
  return roleLabels[role] || role;
}
