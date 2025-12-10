'use client';

import React, { createContext, useContext, useRef, useState } from 'react';
import { debugLogger } from '@/lib/utils/debug-logger';

// ============================================
// ネイティブDnD実装（React DnDの代替）
// ============================================

export interface DragItem {
  type: string;
  id?: string;
  data?: unknown;
}

interface DragState {
  isDragging: boolean;
  draggedItem: DragItem | null;
  dragOffset: { x: number; y: number } | null;
}

interface NativeDndContextType {
  dragState: DragState;
  startDrag: (item: DragItem, event: React.MouseEvent) => void;
  endDrag: () => void;
  handleDrop: (
    event: React.MouseEvent,
    onDrop?: (item: DragItem) => void
  ) => boolean;
}

const NativeDndContext = createContext<NativeDndContextType | null>(null);

// ============================================
// プロバイダーコンポーネント
// ============================================

interface NativeDndProviderProps {
  children: React.ReactNode;
}

export const NativeDndProvider: React.FC<NativeDndProviderProps> = ({
  children,
}) => {
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    draggedItem: null,
    dragOffset: null,
  });

  const dragImageRef = useRef<HTMLDivElement>(null);

  const startDrag = (item: DragItem, event: React.MouseEvent) => {
    debugLogger.dnd.dragStart(item);

    const rect = event.currentTarget.getBoundingClientRect();
    const offset = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };

    setDragState({
      isDragging: true,
      draggedItem: item,
      dragOffset: offset,
    });

    // マウスムーブとマウスアップリスナーを追加
    const handleMouseMove = (e: MouseEvent) => {
      // ドラッグプレビューの更新
      if (dragImageRef.current) {
        dragImageRef.current.style.left = `${e.clientX - offset.x}px`;
        dragImageRef.current.style.top = `${e.clientY - offset.y}px`;
      }
    };

    const handleMouseUp = () => {
      endDrag();
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const endDrag = () => {
    debugLogger.dnd.drop(dragState.draggedItem || { type: 'unknown' });
    setDragState({
      isDragging: false,
      draggedItem: null,
      dragOffset: null,
    });
  };

  const handleDrop = (
    event: React.MouseEvent,
    onDrop?: (item: DragItem, dropEvent?: React.MouseEvent) => void
  ): boolean => {
    event.preventDefault();

    if (dragState.isDragging && dragState.draggedItem && onDrop) {
      try {
        onDrop(dragState.draggedItem, event);
        debugLogger.dnd.drop(dragState.draggedItem, {
          position: { x: event.clientX, y: event.clientY },
        });
        return true;
      } catch (error) {
        debugLogger.dnd.dropError(error as Error, dragState.draggedItem);
        return false;
      }
    }

    return false;
  };

  return (
    <NativeDndContext.Provider
      value={{ dragState, startDrag, endDrag, handleDrop }}
    >
      {children}

      {/* ドラッグプレビュー */}
      {dragState.isDragging && dragState.draggedItem && (
        <div
          ref={dragImageRef}
          className="fixed z-50 pointer-events-none bg-blue-100 border border-blue-300 rounded px-2 py-1 text-sm shadow-lg"
          style={{
            left: 0,
            top: 0,
          }}
        >
          ドラッグ中: {dragState.draggedItem.type}
        </div>
      )}
    </NativeDndContext.Provider>
  );
};

// ============================================
// カスタムフック
// ============================================

export const useNativeDrag = (item: DragItem) => {
  const context = useContext(NativeDndContext);
  if (!context) {
    throw new Error('useNativeDrag must be used within NativeDndProvider');
  }

  const { startDrag, dragState } = context;

  const handleMouseDown = (event: React.MouseEvent) => {
    startDrag(item, event);
  };

  return {
    isDragging:
      dragState.isDragging && dragState.draggedItem?.type === item.type,
    dragProps: {
      onMouseDown: handleMouseDown,
      style: { cursor: 'grab' },
    },
  };
};

export const useNativeDrop = (
  acceptTypes: string[],
  onDrop: (item: DragItem, dropEvent?: React.MouseEvent) => void
) => {
  const context = useContext(NativeDndContext);
  if (!context) {
    throw new Error('useNativeDrop must be used within NativeDndProvider');
  }

  const { handleDrop, dragState } = context;

  const canDrop =
    dragState.isDragging &&
    dragState.draggedItem &&
    acceptTypes.includes(dragState.draggedItem.type);

  const handleMouseUp = (event: React.MouseEvent) => {
    handleDrop(event, onDrop);
  };

  return {
    isOver: canDrop,
    canDrop,
    dropProps: {
      onMouseUp: handleMouseUp,
      style: canDrop ? { backgroundColor: 'rgba(59, 130, 246, 0.1)' } : {},
    },
  };
};

export default NativeDndProvider;
