'use client';

// Konvaコンポーネントを直接エクスポート（SSRは上位でdynamic importで制御）

/* eslint-disable @typescript-eslint/no-explicit-any */

import React from 'react';
import {
  Stage as KonvaStage,
  Layer as KonvaLayer,
  Rect as KonvaRect,
  Image as KonvaImageComponent,
  Text as KonvaTextComponent,
} from 'react-konva';

// Konvaコンポーネントの型定義
interface StageProps {
  ref?: React.RefObject<any>;
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
  listening?: boolean;
  draggable?: boolean;
  onClick?: (e: any) => void;
  onDragEnd?: (e: any) => void;
}

interface KonvaImageProps {
  ref?: React.RefObject<any>;
  id?: string;
  name?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  image?: HTMLImageElement;
  rotation?: number;
  scaleX?: number;
  scaleY?: number;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
  onClick?: (e: any) => void;
  onDragEnd?: (e: any) => void;
  onTransformEnd?: (e: any) => void;
  draggable?: boolean;
  listening?: boolean;
  // クロップ設定
  crop?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

interface KonvaTextProps {
  ref?: React.RefObject<any>;
  id?: string;
  name?: string;
  x: number;
  y: number;
  text: string;
  fontSize?: number;
  fontFamily?: string;
  fill?: string;
  align?: string;
  rotation?: number;
  scaleX?: number;
  scaleY?: number;
  stroke?: string;
  strokeWidth?: number;
  height?: number;
  width?: number;
  opacity?: number;
  onClick?: (e: any) => void;
  onDragEnd?: (e: any) => void;
  onTransformEnd?: (e: any) => void;
  draggable?: boolean;
  listening?: boolean;
}

// Konvaコンポーネントを直接エクスポート
// Note: これらを使うコンポーネントは必ず dynamic(() => import(...), { ssr: false }) でラップすること
const Stage = KonvaStage as React.ComponentType<StageProps>;
const Layer = KonvaLayer as React.ComponentType<LayerProps>;
const Rect = KonvaRect as React.ComponentType<RectProps>;
const KonvaImage = KonvaImageComponent as React.ComponentType<KonvaImageProps>;
const KonvaText = KonvaTextComponent as React.ComponentType<KonvaTextProps>;

export { Stage, Layer, Rect, KonvaImage, KonvaText };
export type {
  StageProps,
  LayerProps,
  RectProps,
  KonvaImageProps,
  KonvaTextProps,
};
