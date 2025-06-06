const config = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat', // 新機能
        'fix', // バグ修正
        'docs', // ドキュメント
        'style', // フォーマット
        'refactor', // リファクタリング
        'test', // テスト
        'chore', // その他
        'perf', // パフォーマンス改善
        'ci', // CI/CD
        'build', // ビルド
        'revert', // リバート
      ],
    ],
    // 日本語コミットメッセージを許可するための設定
    'subject-max-length': [2, 'always', 100],
    'subject-case': [0], // ケースチェックを無効化（日本語対応）
    'header-max-length': [2, 'always', 100],
    'body-max-line-length': [0], // 本文の行長制限を無効化
    'footer-max-line-length': [0], // フッターの行長制限を無効化
  },
};

export default config;
