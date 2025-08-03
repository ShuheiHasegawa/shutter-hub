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
  async () => {
    try {
      debugLogger.konva.stageInit();
      const mod = await import('react-konva');
      return {
        default: React.forwardRef<any, StageProps>((props, ref) => {
          const StageComponent = mod.Stage;
          return <StageComponent ref={ref} {...props} />;
        }),
      };
    } catch (error) {
      debugLogger.konva.importError(error as Error, 'Stage');
      throw error;
    }
  },
  {
    ssr: false,
    loading: () => <KonvaLoading />,
  }
);

// Layer コンポーネント
const Layer = dynamic(
  async () => {
    try {
      const mod = await import('react-konva');
      return {
        default: React.forwardRef<any, LayerProps>((props, ref) => {
          const LayerComponent = mod.Layer;
          debugLogger.konva.layerCreated({ hasChildren: !!props.children });
          return <LayerComponent ref={ref} {...props} />;
        }),
      };
    } catch (error) {
      debugLogger.konva.importError(error as Error, 'Layer');
      throw error;
    }
  },
  {
    ssr: false,
    loading: () => null,
  }
);

// Rect コンポーネント
const Rect = dynamic(
  async () => {
    try {
      const mod = await import('react-konva');
      return {
        default: React.forwardRef<any, RectProps>((props, ref) => {
          const RectComponent = mod.Rect;
          return <RectComponent ref={ref} {...props} />;
        }),
      };
    } catch (error) {
      debugLogger.konva.importError(error as Error, 'Rect');
      throw error;
    }
  },
  {
    ssr: false,
    loading: () => null,
  }
);

// Image コンポーネント
const KonvaImage = dynamic(
  async () => {
    try {
      const mod = await import('react-konva');
      return {
        default: React.forwardRef<any, KonvaImageProps>((props, ref) => {
          const ImageComponent = mod.Image;
          return <ImageComponent ref={ref} {...props} />;
        }),
      };
    } catch (error) {
      debugLogger.konva.importError(error as Error, 'Image');
      throw error;
    }
  },
  {
    ssr: false,
    loading: () => null,
  }
);

// Text コンポーネント
const KonvaText = dynamic(
  async () => {
    try {
      const mod = await import('react-konva');
      return {
        default: React.forwardRef<any, KonvaTextProps>((props, ref) => {
          const TextComponent = mod.Text;
          return <TextComponent ref={ref} {...props} />;
        }),
      };
    } catch (error) {
      debugLogger.konva.importError(error as Error, 'Text');
      throw error;
    }
  },
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
