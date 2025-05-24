export default {
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
    'subject-max-length': [2, 'always', 100],
    'subject-case': [2, 'always', 'lower-case'],
  },
};
