import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertTriangle,
  Shield,
  TrendingUp,
  DollarSign,
  Users,
  Camera,
  MapPin,
  Clock,
  Star,
  Activity,
  Calendar,
} from 'lucide-react';
import Link from 'next/link';

export default async function AdminAnalyticsPage() {
  const supabase = await createClient();

  // 管理者権限チェック
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>認証が必要です</AlertDescription>
        </Alert>
      </div>
    );
  }

  // 管理者権限の確認
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile?.role || !['admin', 'super_admin'].includes(profile.role)) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <Shield className="h-4 w-4" />
          <AlertDescription>管理者権限が必要です</AlertDescription>
        </Alert>
      </div>
    );
  }

  // 期間設定
  const today = new Date();
  const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const lastMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

  // 売上データを取得
  const { data: allBookings } = await supabase
    .from('instant_bookings')
    .select('total_amount, platform_fee, created_at, photographer_id')
    .order('created_at', { ascending: false });

  const { data: thisWeekBookings } = await supabase
    .from('instant_bookings')
    .select('total_amount, platform_fee')
    .gte('created_at', lastWeek.toISOString());

  const { data: thisMonthBookings } = await supabase
    .from('instant_bookings')
    .select('total_amount, platform_fee')
    .gte('created_at', lastMonth.toISOString());

  // リクエストデータを取得
  const { data: allRequests } = await supabase
    .from('instant_photo_requests')
    .select('created_at, location_address, request_type, duration')
    .order('created_at', { ascending: false });

  // レビューデータを取得
  const { data: reviews } = await supabase
    .from('instant_photo_reviews')
    .select('rating, created_at');

  // 統計計算
  const totalRevenue =
    allBookings?.reduce((sum, booking) => sum + booking.total_amount, 0) || 0;
  const totalPlatformFee =
    allBookings?.reduce((sum, booking) => sum + booking.platform_fee, 0) || 0;
  const weekRevenue =
    thisWeekBookings?.reduce((sum, booking) => sum + booking.total_amount, 0) ||
    0;
  const monthRevenue =
    thisMonthBookings?.reduce(
      (sum, booking) => sum + booking.total_amount,
      0
    ) || 0;

  const totalBookings = allBookings?.length || 0;
  const weekBookings = thisWeekBookings?.length || 0;
  const monthBookings = thisMonthBookings?.length || 0;

  const totalRequests = allRequests?.length || 0;
  const conversionRate =
    totalRequests > 0 ? (totalBookings / totalRequests) * 100 : 0;

  const averageRating =
    reviews && reviews.length > 0
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
      : 0;

  // アクティブカメラマン数を計算
  const uniquePhotographers = new Set(allBookings?.map(b => b.photographer_id))
    .size;

  // 人気の撮影タイプを計算
  const requestTypeCounts =
    allRequests?.reduce((acc: Record<string, number>, request) => {
      acc[request.request_type] = (acc[request.request_type] || 0) + 1;
      return acc;
    }, {}) || {};

  const topRequestTypes = Object.entries(requestTypeCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  // 時間帯別リクエスト分析
  const hourlyRequests =
    allRequests?.reduce((acc: Record<number, number>, request) => {
      const hour = new Date(request.created_at).getHours();
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {}) || {};

  const peakHour =
    Object.entries(hourlyRequests).sort(([, a], [, b]) => b - a)[0]?.[0] || '0';

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            分析ダッシュボード
          </h1>
          <p className="text-gray-600 mt-2">
            プラットフォームの利用状況と売上分析
          </p>
        </div>
        <div className="flex gap-4">
          <Link href="/admin">
            <Button variant="outline">← ダッシュボードに戻る</Button>
          </Link>
          <Button>
            <Calendar className="h-4 w-4 mr-2" />
            期間を変更
          </Button>
        </div>
      </div>

      {/* 売上統計 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">総売上</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ¥{totalRevenue.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              プラットフォーム手数料: ¥{totalPlatformFee.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">今月の売上</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ¥{monthRevenue.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              今週: ¥{weekRevenue.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">総予約数</CardTitle>
            <Camera className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalBookings}</div>
            <p className="text-xs text-muted-foreground mt-1">
              今月: {monthBookings}件 | 今週: {weekBookings}件
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">成約率</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {conversionRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalRequests}リクエスト → {totalBookings}予約
            </p>
          </CardContent>
        </Card>
      </div>

      {/* パフォーマンス指標 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5" />
              顧客満足度
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-3xl font-bold">
                  {averageRating.toFixed(1)}
                </span>
                <div className="flex items-center">
                  {[1, 2, 3, 4, 5].map(star => (
                    <Star
                      key={star}
                      className={`h-4 w-4 ${
                        star <= averageRating
                          ? 'text-yellow-400 fill-current'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
              </div>
              <p className="text-sm text-gray-600">
                {reviews?.length || 0}件のレビューから算出
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              アクティブカメラマン
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-3xl font-bold">{uniquePhotographers}</div>
              <p className="text-sm text-gray-600">
                撮影実績のあるカメラマン数
              </p>
              <div className="text-sm">
                <span className="text-muted-foreground">平均撮影回数:</span>
                <span className="ml-2 font-medium">
                  {uniquePhotographers > 0
                    ? (totalBookings / uniquePhotographers).toFixed(1)
                    : 0}
                  回
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              ピーク時間帯
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-3xl font-bold">{peakHour}:00</div>
              <p className="text-sm text-gray-600">
                最もリクエストが多い時間帯
              </p>
              <div className="text-sm">
                <span className="text-muted-foreground">
                  この時間のリクエスト:
                </span>
                <span className="ml-2 font-medium">
                  {hourlyRequests[parseInt(peakHour)] || 0}件
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 人気の撮影タイプ */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            人気の撮影タイプ
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topRequestTypes.length > 0 ? (
              topRequestTypes.map(([type, count], index) => (
                <div key={type} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge
                      variant="outline"
                      className="w-8 h-8 rounded-full flex items-center justify-center"
                    >
                      {index + 1}
                    </Badge>
                    <span className="font-medium">{type}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">{count}件</span>
                    <div className="w-20 h-2 bg-gray-200 rounded-full">
                      <div
                        className="h-2 bg-blue-500 rounded-full"
                        style={{
                          width: `${(count / topRequestTypes[0][1]) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-gray-500 py-8">
                データがありません
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 地域別統計 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            地域別利用状況
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-2">東京都</h4>
                <div className="text-lg font-bold">
                  {allRequests?.filter(r =>
                    r.location_address?.includes('東京')
                  ).length || 0}
                  件
                </div>
                <p className="text-sm text-gray-600">全体の約40%</p>
              </div>
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-2">大阪府</h4>
                <div className="text-lg font-bold">
                  {allRequests?.filter(r =>
                    r.location_address?.includes('大阪')
                  ).length || 0}
                  件
                </div>
                <p className="text-sm text-gray-600">全体の約20%</p>
              </div>
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-2">その他</h4>
                <div className="text-lg font-bold">
                  {allRequests?.filter(
                    r =>
                      !r.location_address?.includes('東京') &&
                      !r.location_address?.includes('大阪')
                  ).length || 0}
                  件
                </div>
                <p className="text-sm text-gray-600">全体の約40%</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 時間帯別リクエスト分析 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            時間帯別リクエスト分析
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-6 gap-2">
              {Array.from({ length: 24 }, (_, hour) => (
                <div key={hour} className="text-center">
                  <div className="text-xs text-gray-600 mb-1">{hour}:00</div>
                  <div className="h-20 bg-gray-100 rounded flex items-end justify-center">
                    <div
                      className="bg-blue-500 rounded w-full"
                      style={{
                        height: `${Math.max(5, ((hourlyRequests[hour] || 0) / Math.max(...Object.values(hourlyRequests))) * 100)}%`,
                      }}
                    />
                  </div>
                  <div className="text-xs mt-1 font-medium">
                    {hourlyRequests[hour] || 0}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
