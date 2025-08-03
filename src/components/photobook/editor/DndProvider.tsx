'use client';

import React from 'react';
import { DndProvider as ReactDndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { TouchBackend } from 'react-dnd-touch-backend';
import { MultiBackend, createTransition } from 'react-dnd-multi-backend';

// ============================================
// マルチバックエンド設定（PC・タッチデバイス対応）
// ============================================

const HTML5toTouch = {
  backends: [
    {
      id: 'html5',
      backend: HTML5Backend,
      transition: createTransition('pointer', (event: PointerEvent) => {
        return event.type === 'pointerdown' && event.pointerType !== 'touch';
      }),
    },
    {
      id: 'touch',
      backend: TouchBackend,
      options: {
        enableMouseEvents: true,
        // タッチ操作の設定
        delayTouchStart: 200, // 200msの遅延でドラッグ開始
        delayMouseStart: 0,
        touchSlop: 5, // 5px移動後にドラッグ認識
      },
      preview: true,
      transition: createTransition('pointer', (event: PointerEvent) => {
        return event.type === 'pointerdown' && event.pointerType === 'touch';
      }),
    },
  ],
};

// ============================================
// DnDプロバイダーコンポーネント
// ============================================

interface DndProviderProps {
  children: React.ReactNode;
}

const DndProvider: React.FC<DndProviderProps> = ({ children }) => {
  return (
    <ReactDndProvider backend={MultiBackend} options={HTML5toTouch}>
      {children}
    </ReactDndProvider>
  );
};

export default DndProvider;
