'use client';

import { Component, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { logger } from '@/lib/utils/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * プロフィールページ用Error Boundary
 * React 18のベストプラクティスに準拠
 */
export class ProfileErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.error('ProfileErrorBoundary: エラーをキャッチ', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              エラーが発生しました
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              プロフィールデータの読み込み中にエラーが発生しました。
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  this.setState({ hasError: false, error: undefined });
                }}
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                再試行
              </Button>
              <Button variant="ghost" onClick={() => window.location.reload()}>
                ページをリロード
              </Button>
            </div>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-4">
                <summary className="cursor-pointer text-sm text-muted-foreground">
                  エラー詳細（開発環境のみ）
                </summary>
                <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto">
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

/**
 * 軽量なError Boundary（Suspense用）
 */
export function ProfileErrorFallback({
  error: _error,
  resetError,
}: {
  error: Error;
  resetError: () => void;
}) {
  return (
    <div className="flex items-center justify-center p-6">
      <div className="text-center space-y-4">
        <AlertCircle className="h-8 w-8 text-destructive mx-auto" />
        <div>
          <h3 className="font-medium">読み込みエラー</h3>
          <p className="text-sm text-muted-foreground">
            データの取得に失敗しました
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={resetError}>
          <RefreshCw className="h-3 w-3 mr-2" />
          再試行
        </Button>
      </div>
    </div>
  );
}
