#!/usr/bin/env node

/**
 * Supabase Auto Migration Script (MCP Integration)
 * Usage: node scripts/migrate-auto.js [migration-name]
 *
 * This script uses MCP Supabase integration to automatically execute migrations
 * Requires SUPABASE_ACCESS_TOKEN environment variable
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

// .env.local ファイルを読み込み
config({ path: '.env.local' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 環境変数チェック
function checkEnvironment() {
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_ACCESS_TOKEN',
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.error('❌ Missing environment variables:');
    missing.forEach(key => console.error(`   - ${key}`));
    console.error('\nPlease set these in your .env.local file');
    console.error('\nTo get SUPABASE_ACCESS_TOKEN:');
    console.error('1. Go to Supabase Dashboard');
    console.error('2. Click your avatar > Account Settings');
    console.error('3. Go to Access Tokens');
    console.error('4. Generate new token');
    process.exit(1);
  }
}

// プロジェクトID抽出
function extractProjectId(supabaseUrl) {
  const match = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
  return match ? match[1] : null;
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

// マイグレーション実行（MCP統合版）
async function runMigrationMCP(filename, projectId) {
  const filePath = path.join(
    __dirname,
    '../src/lib/database/migrations',
    filename
  );
  const sql = fs.readFileSync(filePath, 'utf8');

  console.log(`🔄 Running migration: ${filename}`);
  console.log(`📡 Project ID: ${projectId}`);

  // MCP Supabase integration would be used here
  // For now, we'll output the commands that should be run
  console.log('\n📋 MCP Commands to execute:');
  console.log('─'.repeat(60));
  console.log(`# Apply migration: ${filename}`);
  console.log(`mcp_supabase_apply_migration:`);
  console.log(`  project_id: "${projectId}"`);
  console.log(`  name: "${filename.replace('.sql', '')}"`);
  console.log(`  query: |`);

  // SQLを適切にインデントして表示
  const indentedSql = sql
    .split('\n')
    .map(line => `    ${line}`)
    .join('\n');
  console.log(indentedSql);
  console.log('─'.repeat(60));

  return true;
}

// メイン処理
async function main() {
  console.log('🚀 Supabase Auto Migration Tool (MCP Integration)');
  console.log('');

  checkEnvironment();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const projectId = extractProjectId(supabaseUrl);

  if (!projectId) {
    console.error('❌ Could not extract project ID from SUPABASE_URL');
    console.error(`   URL: ${supabaseUrl}`);
    process.exit(1);
  }

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
      await runMigrationMCP(filename, projectId);
    } else {
      console.error(`❌ Migration file not found: ${filename}`);
      process.exit(1);
    }
  } else {
    // 全マイグレーション実行
    console.log('🔄 Preparing all migrations for execution...');
    console.log('');

    for (const filename of migrationFiles) {
      await runMigrationMCP(filename, projectId);
      console.log('');
    }
  }

  console.log('🎉 Migration commands generated!');
  console.log('');
  console.log('📌 Next steps:');
  console.log('   1. Copy the MCP commands above');
  console.log('   2. Execute them using your MCP client');
  console.log('   3. Verify the migrations were successful');
  console.log('   4. Check Supabase Dashboard for applied changes');
}

// エラーハンドリング
process.on('unhandledRejection', error => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});

// 実行
main().catch(console.error);
