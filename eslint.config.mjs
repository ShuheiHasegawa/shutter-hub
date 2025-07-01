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
      '**/*.min.js',
      '**/sw.bundle.js',
      '**/*.bundle.js',
    ],
  },
];

export default eslintConfig;
