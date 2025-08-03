'use client';

// Konvaコンポーネントを安全にラップして動的インポート問題を解決

/* eslint-disable @typescript-eslint/no-explicit-any */

import React from 'react';
import dynamic from 'next/dynamic';
import { debugLogger } from '@/lib/utils/debug-logger';

// Konvaコンポーネントの型定義
interface StageProps {
  width: number;
  height: number;
  scaleX?: number;
  scaleY?: number;
  onClick?: (e: any) => void;
  onContentLoad?: () => void;
  onError?: (error: Error) => void;
  children: React.ReactNode;
}

interface LayerProps {
  children: React.ReactNode;
}

interface RectProps {
  x: number;
  y: number;
  width: number;
  height: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
}

interface KonvaImageProps {
  x: number;
  y: number;
  width: number;
  height: number;
  image?: HTMLImageElement;
  opacity?: number;
  onClick?: (e: any) => void;
  onDragEnd?: (e: any) => void;
  onTransformEnd?: (e: any) => void;
  draggable?: boolean;
}

interface KonvaTextProps {
  x: number;
  y: number;
  text: string;
  fontSize?: number;
  fontFamily?: string;
  fill?: string;
  align?: string;
  opacity?: number;
  onClick?: (e: any) => void;
  onDragEnd?: (e: any) => void;
  onTransformEnd?: (e: any) => void;
  draggable?: boolean;
}

// ローディングコンポーネント
const KonvaLoading: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div
    className={`w-full h-full bg-gray-100 animate-pulse flex items-center justify-center ${className}`}
  >
    <div className="text-gray-500 text-sm">キャンバス読み込み中...</div>
  </div>
);

// エラーフォールバックコンポーネント
const KonvaErrorFallback: React.FC<{ error?: string }> = ({ error }) => (
  <div className="w-full h-full bg-red-50 border border-red-300 flex items-center justify-center">
    <div className="text-center">
      <div className="text-red-600 text-sm font-medium">
        Konva読み込みエラー
      </div>
      {error && <div className="text-red-500 text-xs mt-1">{error}</div>}
    </div>
  </div>
);

// Konvaモジュールの安全なインポート関数
const createKonvaComponent = <T,>(
  componentName: string,
  fallbackComponent?: React.ComponentType<T>
) => {
  return dynamic(
    () => {
      debugLogger.konva.stageInit();
      return import('react-konva')
        .then(konvaModule => {
          // デバッグ: モジュール構造を確認
          debugLogger.konva.layerCreated({
            componentName,
            moduleKeys: Object.keys(konvaModule),
            hasDefault: 'default' in konvaModule,
            hasComponent: componentName in konvaModule,
          });

          const Component =
            konvaModule[componentName as keyof typeof konvaModule];

          if (!Component) {
            throw new Error(
              `Component ${componentName} not found in react-konva`
            );
          }

          // コンポーネントをラップ
          const WrappedComponent = React.forwardRef<any, T>((props, ref) => {
            return React.createElement(Component as any, { ...props, ref });
          });

          WrappedComponent.displayName = `Dynamic${componentName}`;
          return WrappedComponent;
        })
        .catch(error => {
          debugLogger.konva.importError(error as Error, componentName);

          // フォールバックコンポーネントまたはエラー表示
          return (
            fallbackComponent ||
            (() => <KonvaErrorFallback error={error.message} />)
          );
        });
    },
    {
      ssr: false,
      loading: () => <KonvaLoading />,
    }
  );
};

// 各Konvaコンポーネントの生成
const Stage = createKonvaComponent<StageProps>('Stage');
const Layer = createKonvaComponent<LayerProps>('Layer');
const Rect = createKonvaComponent<RectProps>('Rect');
const KonvaImage = createKonvaComponent<KonvaImageProps>('Image');
const KonvaText = createKonvaComponent<KonvaTextProps>('Text');

export { Stage, Layer, Rect, KonvaImage, KonvaText };
export type {
  StageProps,
  LayerProps,
  RectProps,
  KonvaImageProps,
  KonvaTextProps,
};
