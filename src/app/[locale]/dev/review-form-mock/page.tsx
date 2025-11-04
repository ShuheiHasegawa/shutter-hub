'use client';

import { useState } from 'react';
import { PublicHeader } from '@/components/layout/public-header';
import { Footer } from '@/components/layout/footer';
import { DevToolsNavigation } from '@/components/dev/DevToolsNavigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import {
  ThreeLevelRating,
  type RatingLevel,
} from '@/components/reviews/ThreeLevelRating';
import { Star, User } from 'lucide-react';
import { logger } from '@/lib/utils/logger';

export default function ReviewFormMockPage() {
  // 撮影会レビューフォームの状態
  const [sessionOverallRating, setSessionOverallRating] =
    useState<RatingLevel>(null);
  const [sessionOrganizationRating, setSessionOrganizationRating] =
    useState<RatingLevel>(null);
  const [sessionCommunicationRating, setSessionCommunicationRating] =
    useState<RatingLevel>(null);
  const [sessionValueRating, setSessionValueRating] =
    useState<RatingLevel>(null);
  const [sessionVenueRating, setSessionVenueRating] =
    useState<RatingLevel>(null);
  const [sessionContent, setSessionContent] = useState('');
  const [sessionPros, setSessionPros] = useState('');
  const [sessionCons, setSessionCons] = useState('');
  const [sessionIsAnonymous, setSessionIsAnonymous] = useState(false);

  // ユーザーレビューフォームの状態
  const [userOverallRating, setUserOverallRating] = useState<RatingLevel>(null);
  const [userPunctualityRating, setUserPunctualityRating] =
    useState<RatingLevel>(null);
  const [userCommunicationRating, setUserCommunicationRating] =
    useState<RatingLevel>(null);
  const [userProfessionalismRating, setUserProfessionalismRating] =
    useState<RatingLevel>(null);
  const [userCooperationRating, setUserCooperationRating] =
    useState<RatingLevel>(null);
  const [userContent, setUserContent] = useState('');
  const [userIsAnonymous, setUserIsAnonymous] = useState(false);

  const handleSessionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    logger.debug('撮影会レビュー送信:', {
      overall_rating: sessionOverallRating,
      organization_rating: sessionOrganizationRating,
      communication_rating: sessionCommunicationRating,
      value_rating: sessionValueRating,
      venue_rating: sessionVenueRating,
      content: sessionContent,
      pros: sessionPros,
      cons: sessionCons,
      is_anonymous: sessionIsAnonymous,
    });
    alert('モック: レビュー送信（実際の送信は行いません）');
  };

  const handleUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    logger.debug('ユーザーレビュー送信:', {
      overall_rating: userOverallRating,
      punctuality_rating: userPunctualityRating,
      communication_rating: userCommunicationRating,
      professionalism_rating: userProfessionalismRating,
      cooperation_rating: userCooperationRating,
      content: userContent,
      is_anonymous: userIsAnonymous,
    });
    alert('モック: レビュー送信（実際の送信は行いません）');
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <DevToolsNavigation />
      <div className="flex-1 min-h-0 overflow-hidden">
        <div className="h-full overflow-y-auto">
          <PublicHeader />
          <main>
            {/* ヘッダーセクション */}
            <section className="py-24 surface-primary">
              <div className="container">
                <div className="text-center space-y-4">
                  <div className="flex items-center justify-center gap-3 mb-6">
                    <Star className="h-8 w-8" />
                    <h1 className="text-4xl md:text-5xl font-bold">
                      レビューフォームモック
                    </h1>
                  </div>
                  <p className="text-xl opacity-80 max-w-2xl mx-auto">
                    3段階評価UI（良い、普通、悪い）の動作確認とデザイン検証
                  </p>
                </div>
              </div>
            </section>

            {/* 説明セクション */}
            <section className="py-8 bg-blue-50 dark:bg-blue-900/20 border-y border-blue-200 dark:border-blue-800">
              <div className="container">
                <div className="max-w-4xl mx-auto">
                  <div className="flex items-start gap-3">
                    <Star className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-1">
                        レビューフォームモックについて
                      </h3>
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        メルカリ風の3段階評価UI（良い👍、普通➖、悪い👎）の動作確認とデザイン検証を行います。
                        総合評価は必須、詳細評価は任意として実装されています。
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* モックフォーム */}
            <section className="py-16 bg-background">
              <div className="container max-w-4xl space-y-12">
                {/* 撮影会レビューフォーム */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Star className="h-5 w-5" />
                      撮影会レビューフォーム
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSessionSubmit} className="space-y-6">
                      {/* 総合評価（必須） */}
                      <div>
                        <ThreeLevelRating
                          value={sessionOverallRating}
                          onChange={setSessionOverallRating}
                          label="総合評価"
                          required
                          size="md"
                        />
                      </div>

                      <Separator />

                      {/* 詳細評価（任意） */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-medium">
                          詳細評価（任意）
                        </h3>
                        <div className="space-y-4">
                          <ThreeLevelRating
                            value={sessionOrganizationRating}
                            onChange={setSessionOrganizationRating}
                            label="運営"
                            size="sm"
                          />
                          <ThreeLevelRating
                            value={sessionCommunicationRating}
                            onChange={setSessionCommunicationRating}
                            label="コミュニケーション"
                            size="sm"
                          />
                          <ThreeLevelRating
                            value={sessionValueRating}
                            onChange={setSessionValueRating}
                            label="コストパフォーマンス"
                            size="sm"
                          />
                          <ThreeLevelRating
                            value={sessionVenueRating}
                            onChange={setSessionVenueRating}
                            label="会場"
                            size="sm"
                          />
                        </div>
                      </div>

                      <Separator />

                      {/* レビュー内容 */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-medium">レビュー内容</h3>
                        <div>
                          <label className="block text-sm font-medium mb-2">
                            レビュー本文
                          </label>
                          <Textarea
                            value={sessionContent}
                            onChange={e => setSessionContent(e.target.value)}
                            placeholder="撮影会の感想を入力してください..."
                            rows={4}
                          />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium mb-2">
                              良い点
                            </label>
                            <Textarea
                              value={sessionPros}
                              onChange={e => setSessionPros(e.target.value)}
                              placeholder="良かった点を入力してください..."
                              rows={3}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-2">
                              改善点
                            </label>
                            <Textarea
                              value={sessionCons}
                              onChange={e => setSessionCons(e.target.value)}
                              placeholder="改善してほしい点を入力してください..."
                              rows={3}
                            />
                          </div>
                        </div>
                      </div>

                      <Separator />

                      {/* 匿名設定 */}
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="session-anonymous"
                          checked={sessionIsAnonymous}
                          onCheckedChange={checked =>
                            setSessionIsAnonymous(checked === true)
                          }
                        />
                        <label
                          htmlFor="session-anonymous"
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          匿名でレビューを投稿する
                        </label>
                      </div>

                      {/* 送信ボタン */}
                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline">
                          キャンセル
                        </Button>
                        <Button
                          type="submit"
                          disabled={!sessionOverallRating}
                          variant="accent"
                        >
                          レビューを送信
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>

                {/* ユーザーレビューフォーム */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      ユーザーレビューフォーム
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleUserSubmit} className="space-y-6">
                      {/* 総合評価（必須） */}
                      <div>
                        <ThreeLevelRating
                          value={userOverallRating}
                          onChange={setUserOverallRating}
                          label="総合評価"
                          required
                          size="md"
                        />
                      </div>

                      <Separator />

                      {/* 詳細評価（任意） */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-medium">
                          詳細評価（任意）
                        </h3>
                        <div className="space-y-4">
                          <ThreeLevelRating
                            value={userPunctualityRating}
                            onChange={setUserPunctualityRating}
                            label="時間厳守"
                            size="sm"
                          />
                          <ThreeLevelRating
                            value={userCommunicationRating}
                            onChange={setUserCommunicationRating}
                            label="コミュニケーション"
                            size="sm"
                          />
                          <ThreeLevelRating
                            value={userProfessionalismRating}
                            onChange={setUserProfessionalismRating}
                            label="プロフェッショナル性"
                            size="sm"
                          />
                          <ThreeLevelRating
                            value={userCooperationRating}
                            onChange={setUserCooperationRating}
                            label="協調性"
                            size="sm"
                          />
                        </div>
                      </div>

                      <Separator />

                      {/* レビュー内容 */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-medium">レビュー内容</h3>
                        <div>
                          <label className="block text-sm font-medium mb-2">
                            レビュー本文
                          </label>
                          <Textarea
                            value={userContent}
                            onChange={e => setUserContent(e.target.value)}
                            placeholder="ユーザーについての感想を入力してください..."
                            rows={4}
                          />
                        </div>
                      </div>

                      <Separator />

                      {/* 匿名設定 */}
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="user-anonymous"
                          checked={userIsAnonymous}
                          onCheckedChange={checked =>
                            setUserIsAnonymous(checked === true)
                          }
                        />
                        <label
                          htmlFor="user-anonymous"
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          匿名でレビューを投稿する
                        </label>
                      </div>

                      {/* 送信ボタン */}
                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline">
                          キャンセル
                        </Button>
                        <Button
                          type="submit"
                          disabled={!userOverallRating}
                          variant="accent"
                        >
                          レビューを送信
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>

                {/* 状態パターン表示 */}
                <Card>
                  <CardHeader>
                    <CardTitle>状態パターン表示</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <h3 className="text-sm font-medium mb-3">未選択状態</h3>
                      <ThreeLevelRating
                        value={null}
                        onChange={() => {}}
                        label="評価（未選択）"
                        size="md"
                      />
                    </div>

                    <Separator />

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <h3 className="text-sm font-medium mb-3">良い選択</h3>
                        <ThreeLevelRating
                          value="good"
                          onChange={() => {}}
                          label="評価"
                          size="md"
                        />
                      </div>
                      <div>
                        <h3 className="text-sm font-medium mb-3">普通選択</h3>
                        <ThreeLevelRating
                          value="normal"
                          onChange={() => {}}
                          label="評価"
                          size="md"
                        />
                      </div>
                      <div>
                        <h3 className="text-sm font-medium mb-3">悪い選択</h3>
                        <ThreeLevelRating
                          value="bad"
                          onChange={() => {}}
                          label="評価"
                          size="md"
                        />
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h3 className="text-sm font-medium mb-3">
                        サイズバリエーション
                      </h3>
                      <div className="space-y-4">
                        <ThreeLevelRating
                          value="good"
                          onChange={() => {}}
                          label="小サイズ"
                          size="sm"
                        />
                        <ThreeLevelRating
                          value="normal"
                          onChange={() => {}}
                          label="中サイズ（デフォルト）"
                          size="md"
                        />
                        <ThreeLevelRating
                          value="bad"
                          onChange={() => {}}
                          label="大サイズ"
                          size="lg"
                        />
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h3 className="text-sm font-medium mb-3">無効化状態</h3>
                      <ThreeLevelRating
                        value="good"
                        onChange={() => {}}
                        label="評価（無効化）"
                        disabled
                        size="md"
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </section>
          </main>
          <Footer />
        </div>
      </div>
    </div>
  );
}
