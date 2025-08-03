'use client';

import React, { useEffect } from 'react';
import { DndProvider as ReactDndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
// import { TouchBackend } from 'react-dnd-touch-backend';
// import { MultiBackend, createTransition } from 'react-dnd-multi-backend';
import { debugLogger } from '@/lib/utils/debug-logger';

// ============================================
// 安定したDnDバックエンド設定（HTML5Backend のみ）
// ============================================

// TODO: マルチバックエンド対応は安定性確保後に再実装
// const HTML5toTouch = {
//   backends: [
//     {
//       id: 'html5',
//       backend: HTML5Backend,
//       transition: createTransition('mouseenter', (event: MouseEvent) => {
//         return event.type === 'mouseenter';
//       }),
//     },
//     {
//       id: 'touch',
//       backend: TouchBackend,
//       options: { enableMouseEvents: true },
//       preview: true,
//       transition: createTransition('touchstart', (event: TouchEvent) => {
//         return event.type === 'touchstart';
//       }),
//     },
//   ],
// };

// ============================================
// DnDプロバイダーコンポーネント
// ============================================

interface DndProviderProps {
  children: React.ReactNode;
}

const DndProvider: React.FC<DndProviderProps> = ({ children }) => {
  useEffect(() => {
    debugLogger.dnd.providerInit();

    // バックエンドエラーの監視
    const handleDragError = (error: ErrorEvent) => {
      if (error.message?.includes('drop') || error.message?.includes('dnd')) {
        debugLogger.dnd.backendError(new Error(error.message));
      }
    };

    window.addEventListener('error', handleDragError);

    return () => {
      window.removeEventListener('error', handleDragError);
    };
  }, []);

  return <ReactDndProvider backend={HTML5Backend}>{children}</ReactDndProvider>;
};

export default DndProvider;
