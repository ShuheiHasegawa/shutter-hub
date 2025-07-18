#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Logger移行スクリプト
// console.log, console.error, console.warn を logger.debug, logger.error, logger.warn に置き換える

const srcDir = path.join(__dirname, '../src');
const excludeFiles = [
  'src/lib/utils/logger.ts',
  'src/lib/utils/logger-example.ts',
];

// 対象ファイル拡張子
const targetExtensions = ['.ts', '.tsx'];

function shouldProcessFile(filePath) {
  const relativePath = path.relative(path.join(__dirname, '..'), filePath);
  return !excludeFiles.includes(relativePath);
}

function processFile(filePath) {
  if (!shouldProcessFile(filePath)) {
    return { processed: false, reason: 'excluded' };
  }

  let content = fs.readFileSync(filePath, 'utf-8');
  let changes = 0;

  // Logger import の確認・追加
  const hasLoggerImport = content.includes(
    "import { logger } from '@/lib/utils/logger'"
  );

  // console.log, console.error, console.warn の検出
  const hasConsoleUsage = /console\.(log|error|warn|info|debug)\s*\(/.test(
    content
  );

  if (!hasConsoleUsage) {
    return { processed: false, reason: 'no_console_usage' };
  }

  // console.log → logger.debug 置き換え
  content = content.replace(/console\.log\s*\(/g, () => {
    changes++;
    return 'logger.debug(';
  });

  // console.error → logger.error 置き換え
  content = content.replace(/console\.error\s*\(/g, () => {
    changes++;
    return 'logger.error(';
  });

  // console.warn → logger.warn 置き換え
  content = content.replace(/console\.warn\s*\(/g, () => {
    changes++;
    return 'logger.warn(';
  });

  // console.info → logger.info 置き換え
  content = content.replace(/console\.info\s*\(/g, () => {
    changes++;
    return 'logger.info(';
  });

  // console.debug → logger.debug 置き換え
  content = content.replace(/console\.debug\s*\(/g, () => {
    changes++;
    return 'logger.debug(';
  });

  // Logger import の追加（必要な場合）
  if (!hasLoggerImport && changes > 0) {
    // 既存のimport文を検索
    const importMatch = content.match(/^(import .+?;?)$/m);
    if (importMatch) {
      // 最初のimport文の後に追加
      const importIndex =
        content.indexOf(importMatch[0]) + importMatch[0].length;
      content =
        content.slice(0, importIndex) +
        "\nimport { logger } from '@/lib/utils/logger';" +
        content.slice(importIndex);
    } else {
      // import文がない場合は先頭に追加
      content = "import { logger } from '@/lib/utils/logger';\n" + content;
    }
  }

  if (changes > 0) {
    fs.writeFileSync(filePath, content, 'utf-8');
    return {
      processed: true,
      changes,
      hadLoggerImport: hasLoggerImport,
      addedImport: !hasLoggerImport,
    };
  }

  return { processed: false, reason: 'no_changes_needed' };
}

function walkDirectory(dir) {
  const results = [];
  const items = fs.readdirSync(dir);

  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      // 特定ディレクトリをスキップ
      if (['node_modules', '.next', 'dist', 'build'].includes(item)) {
        continue;
      }
      results.push(...walkDirectory(fullPath));
    } else if (stat.isFile()) {
      const ext = path.extname(fullPath);
      if (targetExtensions.includes(ext)) {
        results.push(fullPath);
      }
    }
  }

  return results;
}

function main() {
  console.log('🚀 Logger移行スクリプト開始...\n');

  const allFiles = walkDirectory(srcDir);
  let processedCount = 0;
  let totalChanges = 0;
  const processedFiles = [];

  console.log(`📁 対象ファイル数: ${allFiles.length}\n`);

  for (const filePath of allFiles) {
    const result = processFile(filePath);

    if (result.processed) {
      processedCount++;
      totalChanges += result.changes;
      const relativePath = path.relative(process.cwd(), filePath);
      console.log(
        `✅ ${relativePath}: ${result.changes}箇所を置き換え${result.addedImport ? ' (logger import追加)' : ''}`
      );
      processedFiles.push(relativePath);
    }
  }

  console.log(`\n📊 処理結果:`);
  console.log(`   処理ファイル数: ${processedCount}/${allFiles.length}`);
  console.log(`   総置き換え数: ${totalChanges}箇所`);

  if (processedCount > 0) {
    console.log(`\n📋 処理済みファイル一覧:`);
    processedFiles.forEach(file => console.log(`   - ${file}`));
  }

  console.log(`\n✨ Logger移行完了！`);
  console.log(`\n次のステップ:`);
  console.log(`   1. npm run lint でエラーが解消されたか確認`);
  console.log(`   2. npm run build でビルドが成功するか確認`);
  console.log(`   3. 動作確認を実施`);
  console.log(`   4. git commit で変更をコミット`);
}

if (process.argv[1] === __filename) {
  main();
}

export { processFile, walkDirectory };
