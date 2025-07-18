import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    ignores: [
      '.next/**',
      'out/**',
      'dist/**',
      'build/**',
      'node_modules/**',
      'public/**',
      'playwright-report/**',
      'test-results/**',
      '.auth/**',
      'scripts/**',
      '**/*.min.js',
      '**/sw.bundle.js',
      '**/*.bundle.js',
    ],
  },
  {
    rules: {
      // Logger使用必須ルール
      'no-console': 'error', // console.log, console.error, console.warn等を全て禁止

      // 開発品質向上ルール
      'prefer-const': 'error',
      'no-var': 'error',
      'no-unused-vars': 'off', // TypeScriptで処理
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'error', // any型禁止

      // React/Next.js品質ルール
      'react-hooks/exhaustive-deps': 'warn', // 依存配列警告のみ
      'react-hooks/rules-of-hooks': 'error',

      // セキュリティルール
      'no-eval': 'error',
      'no-implied-eval': 'error',
    },
  },
  {
    // Logger実装ファイルのみconsole使用を許可
    files: ['src/lib/utils/logger.ts', 'src/lib/utils/logger-*.ts'],
    rules: {
      'no-console': 'off',
    },
  },
];

export default eslintConfig;
