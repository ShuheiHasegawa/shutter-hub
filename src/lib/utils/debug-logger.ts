// フォトブックエディター専用デバッグログシステム

interface LogLevel {
  ERROR: 'ERROR';
  WARN: 'WARN';
  INFO: 'INFO';
  DEBUG: 'DEBUG';
}

// const LOG_LEVELS: LogLevel = {
//   ERROR: 'ERROR',
//   WARN: 'WARN',
//   INFO: 'INFO',
//   DEBUG: 'DEBUG',
// } as const;

type LogLevelType = keyof LogLevel;

interface DebugLogEntry {
  timestamp: string;
  level: LogLevelType;
  component: string;
  action: string;
  data?: unknown;
  error?: Error;
}

class PhotobookDebugLogger {
  private logs: DebugLogEntry[] = [];
  private maxLogs = 1000;
  private isEnabled = true;

  constructor() {
    // 開発環境でのみ有効
    this.isEnabled = process.env.NODE_ENV === 'development';
  }

  private formatTimestamp(): string {
    return new Date().toISOString();
  }

  private addLog(entry: DebugLogEntry): void {
    if (!this.isEnabled) return;

    this.logs.push(entry);

    // ログ数制限
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // コンソール出力（開発環境のみ）
    if (this.isEnabled) {
      const prefix = `[PhotobookEditor][${entry.component}]`;
      const message = `${entry.action}`;

      switch (entry.level) {
        case 'ERROR':
          // eslint-disable-next-line no-console
          console.error(`🔴 ${prefix} ${message}`, entry.data, entry.error);
          break;
        case 'WARN':
          // eslint-disable-next-line no-console
          console.warn(`🟡 ${prefix} ${message}`, entry.data);
          break;
        case 'INFO':
          // eslint-disable-next-line no-console
          console.info(`🔵 ${prefix} ${message}`, entry.data);
          break;
        case 'DEBUG':
          // eslint-disable-next-line no-console
          console.log(`⚪ ${prefix} ${message}`, entry.data);
          break;
      }
    }
  }

  // Konva関連のログ
  konva = {
    stageInit: (data?: unknown) =>
      this.addLog({
        timestamp: this.formatTimestamp(),
        level: 'INFO',
        component: 'Konva',
        action: 'Stage初期化開始',
        data,
      }),

    stageReady: (stageData?: unknown) =>
      this.addLog({
        timestamp: this.formatTimestamp(),
        level: 'INFO',
        component: 'Konva',
        action: 'Stage初期化完了',
        data: stageData,
      }),

    layerCreated: (layerInfo?: unknown) =>
      this.addLog({
        timestamp: this.formatTimestamp(),
        level: 'DEBUG',
        component: 'Konva',
        action: 'Layer作成',
        data: layerInfo,
      }),

    elementAdded: (element?: unknown) =>
      this.addLog({
        timestamp: this.formatTimestamp(),
        level: 'DEBUG',
        component: 'Konva',
        action: '要素追加',
        data: element,
      }),

    renderError: (error: Error, context?: unknown) =>
      this.addLog({
        timestamp: this.formatTimestamp(),
        level: 'ERROR',
        component: 'Konva',
        action: 'レンダリングエラー',
        data: context,
        error,
      }),

    importError: (error: Error, componentName: string) =>
      this.addLog({
        timestamp: this.formatTimestamp(),
        level: 'ERROR',
        component: 'Konva',
        action: `${componentName}インポートエラー`,
        data: { componentName },
        error,
      }),
  };

  // React DnD関連のログ
  dnd = {
    dragStart: (item?: unknown) =>
      this.addLog({
        timestamp: this.formatTimestamp(),
        level: 'DEBUG',
        component: 'DnD',
        action: 'ドラッグ開始',
        data: item,
      }),

    dragOver: (monitor?: unknown) =>
      this.addLog({
        timestamp: this.formatTimestamp(),
        level: 'DEBUG',
        component: 'DnD',
        action: 'ドラッグオーバー',
        data: monitor,
      }),

    drop: (item?: unknown, result?: unknown) =>
      this.addLog({
        timestamp: this.formatTimestamp(),
        level: 'INFO',
        component: 'DnD',
        action: 'ドロップ実行',
        data: { item, result },
      }),

    dropError: (error: Error, context?: unknown) =>
      this.addLog({
        timestamp: this.formatTimestamp(),
        level: 'ERROR',
        component: 'DnD',
        action: 'ドロップエラー',
        data: context,
        error,
      }),

    providerInit: () =>
      this.addLog({
        timestamp: this.formatTimestamp(),
        level: 'INFO',
        component: 'DnD',
        action: 'プロバイダー初期化',
      }),

    backendError: (error: Error) =>
      this.addLog({
        timestamp: this.formatTimestamp(),
        level: 'ERROR',
        component: 'DnD',
        action: 'バックエンドエラー',
        error,
      }),
  };

  // エディター全般のログ
  editor = {
    mount: (componentName: string) =>
      this.addLog({
        timestamp: this.formatTimestamp(),
        level: 'INFO',
        component: 'Editor',
        action: `${componentName}マウント`,
      }),

    unmount: (componentName: string) =>
      this.addLog({
        timestamp: this.formatTimestamp(),
        level: 'INFO',
        component: 'Editor',
        action: `${componentName}アンマウント`,
      }),

    projectLoad: (projectId?: string) =>
      this.addLog({
        timestamp: this.formatTimestamp(),
        level: 'INFO',
        component: 'Editor',
        action: 'プロジェクト読み込み',
        data: { projectId },
      }),

    stateChange: (action: string, data?: unknown) =>
      this.addLog({
        timestamp: this.formatTimestamp(),
        level: 'DEBUG',
        component: 'Editor',
        action: `状態変更: ${action}`,
        data,
      }),

    error: (error: Error, context?: string) =>
      this.addLog({
        timestamp: this.formatTimestamp(),
        level: 'ERROR',
        component: 'Editor',
        action: `エラー: ${context || 'Unknown'}`,
        error,
      }),
  };

  // ログ取得メソッド
  getLogs(filter?: {
    component?: string;
    level?: LogLevelType;
    limit?: number;
  }): DebugLogEntry[] {
    let filteredLogs = [...this.logs];

    if (filter?.component) {
      filteredLogs = filteredLogs.filter(log =>
        log.component.toLowerCase().includes(filter.component!.toLowerCase())
      );
    }

    if (filter?.level) {
      filteredLogs = filteredLogs.filter(log => log.level === filter.level);
    }

    if (filter?.limit) {
      filteredLogs = filteredLogs.slice(-filter.limit);
    }

    return filteredLogs;
  }

  // デバッグ用：全ログをコンソール出力
  dumpLogs(filter?: Parameters<typeof this.getLogs>[0]): void {
    if (this.isEnabled) {
      // eslint-disable-next-line no-console
      console.group('📋 PhotobookEditor Debug Logs');
      const logs = this.getLogs(filter);
      logs.forEach(log => {
        // eslint-disable-next-line no-console
        console.log(
          `[${log.timestamp}] ${log.level} - ${log.component}: ${log.action}`,
          log.data || '',
          log.error || ''
        );
      });
      // eslint-disable-next-line no-console
      console.groupEnd();
    }
  }

  // ログクリア
  clearLogs(): void {
    this.logs = [];
    if (this.isEnabled) {
      // eslint-disable-next-line no-console
      console.log('🧹 PhotobookEditor: ログをクリアしました');
    }
  }
}

// シングルトンインスタンス
export const debugLogger = new PhotobookDebugLogger();

// グローバルアクセス用（開発環境のみ）
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).photobookDebugLogger = debugLogger;
}
