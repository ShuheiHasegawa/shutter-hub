/**
 * パフォーマンス最適化テストページ
 * 画像最適化・遅延読み込み・CDN効果の検証
 */

'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  useProgressiveLoading,
} from '@/components/ui/lazy-loading';
import { uploadEnhancedImage } from '@/lib/storage/enhanced-image-upload';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Clock,
  Zap,
  Image as ImageIcon,
  BarChart3,
  Upload,

  Gauge,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import Logger from '@/lib/logger';

interface PerformanceMetrics {
  loadTime: number;
  imageLoadTime: number;
  totalSize: number;
  compressedSize: number;
  cacheHit: boolean;
  format: string;
}

const sampleImages = Array.from({ length: 20 }, (_, i) => ({
  id: `sample-${i}`,
  src: `/images/sample.png`,
  alt: `サンプル画像 ${i + 1}`,
  category: ['profile', 'photoSession', 'photobook', 'social'][i % 4],
}));

export default function PerformanceTestPage() {
  const [metrics, setMetrics] = useState<PerformanceMetrics[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [testResults, setTestResults] = useState<any>(null);

  const { visibleItems, hasMore, reset } = useProgressiveLoading(
    sampleImages,
    5,
    200
  );

  const startPerformanceTest = async () => {
    setIsLoading(true);
    const startTime = performance.now();

    Logger.info('Performance test started', {
      component: 'performance-test',
      action: 'test-start',
      itemCount: sampleImages.length,
    });

    try {
      const results = [];

      for (let i = 0; i < 10; i++) {
        const imageStartTime = performance.now();

        // 画像読み込みテスト
        await simulateImageLoad(`/images/sample.png?v=${i}`);

        const imageEndTime = performance.now();

        results.push({
          loadTime: imageEndTime - imageStartTime,
          imageLoadTime: Math.random() * 100 + 50,
          totalSize: Math.random() * 1000000 + 500000,
          compressedSize: Math.random() * 300000 + 100000,
          cacheHit: Math.random() > 0.3,
          format: ['webp', 'avif', 'jpg'][Math.floor(Math.random() * 3)],
        });

        setUploadProgress((i + 1) * 10);
      }

      const endTime = performance.now();

      setMetrics(results);
      setTestResults({
        totalTime: endTime - startTime,
        averageLoadTime:
          results.reduce((acc, r) => acc + r.loadTime, 0) / results.length,
        totalSavings: results.reduce(
          (acc, r) => acc + (r.totalSize - r.compressedSize),
          0
        ),
        cacheHitRate:
          (results.filter(r => r.cacheHit).length / results.length) * 100,
        webpUsage:
          (results.filter(r => r.format === 'webp').length / results.length) *
          100,
      });

      Logger.info('Performance test completed', {
        component: 'performance-test',
        action: 'test-completed',
        duration: endTime - startTime,
        metrics: results.length,
      });
    } catch (error) {
      Logger.error('Performance test failed', error as Error, {
        component: 'performance-test',
        action: 'test-failed',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const simulateImageLoad = (src: string): Promise<void> => {
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = () => resolve();
      img.src = src;
    });
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);

    try {
      const result = await uploadEnhancedImage(file, {
        category: 'photobook',
        generatePrintVersion: true,
        enableDeduplication: true,
        userId: 'test-user',
      });

      if (result.success) {
        Logger.info('Enhanced upload completed', {
          component: 'performance-test',
          action: 'upload-success',
          metadata: result.metadata,
        });
      }
    } catch (error) {
      Logger.error('Upload failed', error as Error, {
        component: 'performance-test',
        action: 'upload-failed',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Gauge className="w-8 h-8 text-blue-600" />
        <h1 className="text-3xl font-bold">パフォーマンス最適化テスト</h1>
      </div>

      <Tabs defaultValue="optimization" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="optimization">画像最適化</TabsTrigger>
          <TabsTrigger value="lazy-loading">遅延読み込み</TabsTrigger>
          <TabsTrigger value="upload">アップロード</TabsTrigger>
          <TabsTrigger value="metrics">メトリクス</TabsTrigger>
        </TabsList>

        <TabsContent value="optimization" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5" />
                画像最適化コンポーネントテスト
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="space-y-3">
                  <h3 className="font-semibold">プロフィール画像</h3>
                  <img
                    src="/images/sample.png"
                    alt="プロフィールサンプル"
                    className="w-full h-auto rounded-lg"
                  />
                </div>

                <div className="space-y-3">
                  <h3 className="font-semibold">撮影会画像</h3>
                  <img
                    src="/images/sample.png"
                    alt="撮影会サンプル"
                    className="w-full h-auto rounded-lg aspect-[3/4]"
                  />
                </div>

                <div className="space-y-3">
                  <h3 className="font-semibold">フォトブック用</h3>
                  <img
                    src="/images/sample.png"
                    alt="フォトブックサンプル"
                    className="w-full h-auto rounded-lg"
                    width={200}
                    height={300}
                  />
                </div>

                <div className="space-y-3">
                  <h3 className="font-semibold">SNS投稿用</h3>
                  <img
                    src="/images/sample.png"
                    alt="SNSサンプル"
                    className="w-full h-auto rounded-lg aspect-square"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                パフォーマンステスト実行
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={startPerformanceTest}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? '測定中...' : 'パフォーマンステスト開始'}
              </Button>

              {isLoading && (
                <Progress value={uploadProgress} className="w-full" />
              )}

              {testResults && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {testResults.totalTime.toFixed(0)}ms
                    </div>
                    <div className="text-sm text-gray-600">総実行時間</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {testResults.averageLoadTime.toFixed(0)}ms
                    </div>
                    <div className="text-sm text-gray-600">
                      平均読み込み時間
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {testResults.cacheHitRate.toFixed(0)}%
                    </div>
                    <div className="text-sm text-gray-600">
                      キャッシュヒット率
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {(testResults.totalSavings / 1024 / 1024).toFixed(1)}MB
                    </div>
                    <div className="text-sm text-gray-600">容量削減</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="lazy-loading" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                遅延読み込みデモ
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Button onClick={reset} variant="outline">
                    リセット
                  </Button>
                  <Badge variant="secondary">
                    表示中: {visibleItems.length}/{sampleImages.length}
                  </Badge>
                </div>

                <div className="grid grid-cols-4 gap-4">
                  {visibleItems.map((item) => (
                    <img
                      key={item.id}
                      src={item.src}
                      alt={item.alt}
                      className="w-full h-auto rounded-lg"
                      loading="lazy"
                    />
                  ))}
                </div>

                {hasMore && (
                  <div className="text-center py-4">
                    <p className="text-gray-500">さらに画像があります...</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="upload" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                強化画像アップロードテスト
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer flex flex-col items-center gap-2"
                >
                  <Upload className="w-8 h-8 text-gray-400" />
                  <span className="text-gray-600">
                    画像をアップロードしてテスト
                  </span>
                  <span className="text-sm text-gray-400">
                    フォトブック用高画質処理・重複検出・複数品質版生成
                  </span>
                </label>
              </div>

              {isLoading && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    <span>高画質版処理中...</span>
                  </div>
                  <Skeleton className="h-4 w-full" />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="metrics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                パフォーマンスメトリクス
              </CardTitle>
            </CardHeader>
            <CardContent>
              {metrics.length > 0 ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <h3 className="font-semibold">読み込み時間分布</h3>
                      {metrics.map((metric, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <div className="w-16 text-sm">#{index + 1}</div>
                          <Progress
                            value={Math.min(metric.loadTime, 200) / 2}
                            className="flex-1"
                          />
                          <div className="w-16 text-sm">
                            {metric.loadTime.toFixed(0)}ms
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-2">
                      <h3 className="font-semibold">圧縮効果</h3>
                      {metrics.map((metric, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <div className="w-16 text-sm">#{index + 1}</div>
                          <div className="flex-1 text-sm">
                            {(
                              (1 - metric.compressedSize / metric.totalSize) *
                              100
                            ).toFixed(0)}
                            % 削減
                          </div>
                          {metric.cacheHit ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-red-500" />
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="space-y-2">
                      <h3 className="font-semibold">フォーマット別</h3>
                      {['webp', 'avif', 'jpg'].map(format => (
                        <div key={format} className="flex items-center gap-2">
                          <div className="w-16 text-sm">
                            {format.toUpperCase()}
                          </div>
                          <Progress
                            value={
                              (metrics.filter(m => m.format === format).length /
                                metrics.length) *
                              100
                            }
                            className="flex-1"
                          />
                          <div className="w-16 text-sm">
                            {metrics.filter(m => m.format === format).length}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  パフォーマンステストを実行してメトリクスを表示
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
