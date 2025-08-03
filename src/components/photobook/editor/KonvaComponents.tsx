'use client';

// Konvaコンポーネントを安全にラップして動的インポート問題を解決

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react/display-name */

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
const KonvaLoading: React.FC<{ className?: string }> = ({ className }) => (
  <div
    className={`w-full h-full bg-gray-100 animate-pulse flex items-center justify-center ${className}`}
  >
    <div className="text-gray-500 text-sm">キャンバス読み込み中...</div>
  </div>
);

// Stage コンポーネント
const Stage = dynamic(
  () =>
    import('react-konva')
      .then(mod => {
        debugLogger.konva.stageInit();
        const StageComponent = React.forwardRef<any, StageProps>(
          (props, ref) => {
            const KonvaStage = mod.Stage;
            return <KonvaStage ref={ref} {...props} />;
          }
        );
        StageComponent.displayName = 'DynamicStage';
        return StageComponent;
      })
      .catch(error => {
        debugLogger.konva.importError(error as Error, 'Stage');
        // フォールバックコンポーネントを返す
        return () => <KonvaLoading className="border border-red-300" />;
      }),
  {
    ssr: false,
    loading: () => <KonvaLoading />,
  }
);

// Layer コンポーネント
const Layer = dynamic(
  () =>
    import('react-konva')
      .then(mod => {
        const LayerComponent = React.forwardRef<any, LayerProps>(
          (props, ref) => {
            debugLogger.konva.layerCreated({ hasChildren: !!props.children });
            const KonvaLayer = mod.Layer;
            return <KonvaLayer ref={ref} {...props} />;
          }
        );
        LayerComponent.displayName = 'DynamicLayer';
        return LayerComponent;
      })
      .catch(error => {
        debugLogger.konva.importError(error as Error, 'Layer');
        // フォールバックコンポーネントを返す
        return () => null;
      }),
  {
    ssr: false,
    loading: () => null,
  }
);

// Rect コンポーネント
const Rect = dynamic(
  () =>
    import('react-konva')
      .then(mod => {
        const RectComponent = React.forwardRef<any, RectProps>((props, ref) => {
          const KonvaRect = mod.Rect;
          return <KonvaRect ref={ref} {...props} />;
        });
        RectComponent.displayName = 'DynamicRect';
        return RectComponent;
      })
      .catch(error => {
        debugLogger.konva.importError(error as Error, 'Rect');
        return () => null;
      }),
  {
    ssr: false,
    loading: () => null,
  }
);

// Image コンポーネント
const KonvaImage = dynamic(
  () =>
    import('react-konva')
      .then(mod => {
        const ImageComponent = React.forwardRef<any, KonvaImageProps>(
          (props, ref) => {
            const KonvaImageEl = mod.Image;
            return <KonvaImageEl ref={ref} {...props} />;
          }
        );
        ImageComponent.displayName = 'DynamicKonvaImage';
        return ImageComponent;
      })
      .catch(error => {
        debugLogger.konva.importError(error as Error, 'Image');
        return () => null;
      }),
  {
    ssr: false,
    loading: () => null,
  }
);

// Text コンポーネント
const KonvaText = dynamic(
  () =>
    import('react-konva')
      .then(mod => {
        const TextComponent = React.forwardRef<any, KonvaTextProps>(
          (props, ref) => {
            const KonvaTextEl = mod.Text;
            return <KonvaTextEl ref={ref} {...props} />;
          }
        );
        TextComponent.displayName = 'DynamicKonvaText';
        return TextComponent;
      })
      .catch(error => {
        debugLogger.konva.importError(error as Error, 'Text');
        return () => null;
      }),
  {
    ssr: false,
    loading: () => null,
  }
);

export { Stage, Layer, Rect, KonvaImage, KonvaText };
export type {
  StageProps,
  LayerProps,
  RectProps,
  KonvaImageProps,
  KonvaTextProps,
};
