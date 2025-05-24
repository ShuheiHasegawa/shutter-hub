#!/usr/bin/env node

/**
 * Supabase Migration Script
 * Usage: node scripts/migrate.js [migration-name]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

// .env.local ファイルを読み込み
config({ path: '.env.local' });

// ESMモジュール用の__dirname定義
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 環境変数チェック
function checkEnvironment() {
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.error('❌ Missing environment variables:');
    missing.forEach(key => console.error(`   - ${key}`));
    console.error('\nPlease set these in your .env.local file');
    process.exit(1);
  }
}

// マイグレーションファイル一覧取得
function getMigrationFiles() {
  const migrationsDir = path.join(__dirname, '../src/lib/database/migrations');

  if (!fs.existsSync(migrationsDir)) {
    console.error('❌ Migrations directory not found:', migrationsDir);
    process.exit(1);
  }

  return fs
    .readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort();
}

// マイグレーション実行
async function runMigration(filename) {
  const filePath = path.join(
    __dirname,
    '../src/lib/database/migrations',
    filename
  );
  const sql = fs.readFileSync(filePath, 'utf8');

  console.log(`🔄 Running migration: ${filename}`);

  // ここでSupabase MCP接続を使用してSQLを実行
  // 実際の実行は手動で行う必要があります
  console.log('📝 SQL Content:');
  console.log('─'.repeat(50));
  console.log(sql);
  console.log('─'.repeat(50));

  return true;
}

// メイン処理
async function main() {
  console.log('🚀 Supabase Migration Tool');
  console.log('');

  checkEnvironment();

  const migrationFiles = getMigrationFiles();

  if (migrationFiles.length === 0) {
    console.log('📭 No migration files found');
    return;
  }

  console.log('📋 Available migrations:');
  migrationFiles.forEach((file, index) => {
    console.log(`   ${index + 1}. ${file}`);
  });
  console.log('');

  // 特定のマイグレーションが指定された場合
  const targetMigration = process.argv[2];

  if (targetMigration) {
    const filename = targetMigration.endsWith('.sql')
      ? targetMigration
      : `${targetMigration}.sql`;

    if (migrationFiles.includes(filename)) {
      await runMigration(filename);
    } else {
      console.error(`❌ Migration file not found: ${filename}`);
      process.exit(1);
    }
  } else {
    // 全マイグレーション実行
    console.log('🔄 Running all migrations...');

    for (const filename of migrationFiles) {
      await runMigration(filename);
      console.log('✅ Completed:', filename);
      console.log('');
    }
  }

  console.log('🎉 Migration process completed!');
  console.log('');
  console.log('📌 Next steps:');
  console.log('   1. Copy the SQL content above');
  console.log('   2. Go to Supabase Dashboard > SQL Editor');
  console.log('   3. Paste and run the SQL');
  console.log('   4. Verify the migration was successful');
}

// エラーハンドリング
process.on('unhandledRejection', error => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});

// 実行
main().catch(console.error);
