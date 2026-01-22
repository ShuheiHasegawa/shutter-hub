coderabbitai bot
commented
44 minutes ago
• 
Note

Currently processing new changes in this PR. This may take a few minutes, please wait...

 _______________________________________________
< Finding your faults 10 times faster than Mom. >
 -----------------------------------------------
  \
   \   (\__/)
       (•ㅅ•)
       / 　 づ
✏️ Tip: You can disable in-progress messages and the fortune message in your review settings.

Tip

You can customize the tone of the review comments and chat replies.
Warning

.coderabbit.yaml has a parsing error
The CodeRabbit configuration file in this repository has a parsing error and default settings were used instead. Please fix the error(s) in the configuration file. You can initialize chat with CodeRabbit to get help with the configuration file.

💥 Parsing errors (1)
⚙️ Configuration instructions
📝 Walkthrough
🚥 Pre-merge checks | ✅ 3 | ❌ 2
✨ Finishing touches
Thanks for using CodeRabbit! It's free for OSS, and your support helps us grow. If you like it, consider giving us a shout-out.

❤️ Share
Comment @coderabbitai help to get the list of available commands and usage tips.

@sonarqubecloud
sonarqubecloud bot
commented
43 minutes ago
Quality Gate Failed Quality Gate failed
Failed conditions
 1 Security Hotspot
 16.2% Duplication on New Code (required ≤ 3%)

See analysis details on SonarQube Cloud

@vercel vercel bot deployed to Preview 42 minutes ago
coderabbitai[bot]
coderabbitai bot reviewed 38 minutes ago
coderabbitai bot
left a comment
Actionable comments posted: 14

Caution

Some comments are outside the diff and can’t be posted inline due to platform limitations.

⚠️ Outside diff range comments (5)
🤖 Fix all issues with AI agents
🧹 Nitpick comments (11)
docs/e2e-tests/booking-first-come-test-spec.md
Comment on lines +44 to +45
  - http://localhost:8888/ja/photo-sessions/create/organizer

@coderabbitai
coderabbitai bot
38 minutes ago
⚠️ Potential issue | 🟡 Minor

Bare URL should be formatted as a markdown link.

Per markdownlint, bare URLs should be properly formatted.

Proposed fix
🧰 Tools
🤖 Prompt for AI Agents
@ShuheiHasegawa	Reply...
scripts/seed/reset-and-seed-all.ts
Comment on lines +67 to +175
async function seedStudios() {
  console.log('🚀 スタジオシードデータ投入開始...');
  console.log(`📊 投入予定データ件数: ${studioSeedData.length}件`);

  // テストユーザーを取得（created_by用）
  const { data: testUsers, error: userError } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_type', 'organizer')
    .limit(1);

  if (userError || !testUsers || testUsers.length === 0) {
    console.error('❌ テストユーザーの取得に失敗しました:', userError?.message);
    console.log('💡 organizerタイプのユーザーが存在することを確認してください');
    process.exit(1);
  }

  const createdBy = testUsers[0].id;
  console.log(`✅ 作成者ID: ${createdBy}`);

  // バッチ処理でデータ投入（一度に100件ずつ）
  const batchSize = 100;
  let successCount = 0;
  let errorCount = 0;
  const errors: Array<{ name: string; error: string }> = [];

  for (let i = 0; i < studioSeedData.length; i += batchSize) {
    const batch = studioSeedData.slice(i, i + batchSize);
    console.log(
      `\n📦 バッチ ${Math.floor(i / batchSize) + 1}/${Math.ceil(studioSeedData.length / batchSize)} を処理中...`
    );

    const insertData = batch.map((studio, index) => {
      // location_hashの重複を避けるため、座標を微調整
      const latOffset = (index % 1000) * 0.0001;
      const lngOffset = (index % 1000) * 0.0001;

      return {
        name: studio.name,
        description: studio.description,
        address: studio.address,
        prefecture: studio.prefecture,
        city: studio.city,
        access_info: studio.access_info,
        phone: studio.phone,
        email: studio.email,
        website_url: studio.website_url,
        latitude: studio.latitude + latOffset,
        longitude: studio.longitude + lngOffset,
        total_area: studio.total_area,
        max_capacity: studio.max_capacity,
        parking_available: studio.parking_available,
        wifi_available: studio.wifi_available,
        business_hours: studio.business_hours,
        regular_holidays: studio.regular_holidays,
        hourly_rate_min: studio.hourly_rate_min,
        hourly_rate_max: studio.hourly_rate_max,
        normalized_name: studio.name.toLowerCase(),
        normalized_address: studio.address.toLowerCase(),
        created_by: createdBy,
        verification_status: 'verified' as const,
      };
    });

    const { data, error } = await supabase
      .from('studios')
      .insert(insertData)
      .select('id, name');

    if (error) {
      console.error(
        `❌ バッチ ${Math.floor(i / batchSize) + 1} の投入に失敗:`,
        error.message
      );
      errorCount += batch.length;
      batch.forEach(studio => {
        errors.push({ name: studio.name, error: error.message });
      });
    } else {
      successCount += data?.length || 0;
      console.log(`✅ ${data?.length || 0}件のスタジオを投入しました`);
    }
  }

  // 結果サマリー
  console.log('\n' + '='.repeat(50));
  console.log('📊 投入結果サマリー');
  console.log('='.repeat(50));
  console.log(`✅ 成功: ${successCount}件`);
  console.log(`❌ 失敗: ${errorCount}件`);

  if (errors.length > 0) {
    console.log('\n❌ エラー詳細:');
    errors.slice(0, 10).forEach(({ name, error }) => {
      console.log(`  - ${name}: ${error}`);
    });
    if (errors.length > 10) {
      console.log(`  ... 他 ${errors.length - 10}件のエラー`);
    }
  }

  // 最終確認
  const { count } = await supabase
    .from('studios')
    .select('*', { count: 'exact', head: true });

  console.log(`\n📈 現在のスタジオ総数: ${count}件`);
  console.log('🎉 シードデータ投入完了！');
}
@coderabbitai
coderabbitai bot
38 minutes ago
🛠️ Refactor suggestion | 🟠 Major

Significant code duplication with seed.ts.

The seedStudios() function here is nearly identical to the one in scripts/seed/studios/seed.ts. This violates the DRY principle and makes maintenance harder—any bug fix or improvement needs to be applied in both places.

Consider extracting the shared logic into a common module that both scripts can import.

Example extraction
🤖 Prompt for AI Agents
@ShuheiHasegawa	Reply...
scripts/seed/reset-and-seed-all.ts
Comment on lines +99 to +102
    const insertData = batch.map((studio, index) => {
      // location_hashの重複を避けるため、座標を微調整
      const latOffset = (index % 1000) * 0.0001;
      const lngOffset = (index % 1000) * 0.0001;
@coderabbitai
coderabbitai bot
38 minutes ago
⚠️ Potential issue | 🟠 Major

Same location offset bug as in seed.ts.

This has the same issue where index is batch-local instead of global, potentially causing location_hash collisions across batches.

Proposed fix
📝 Committable suggestion
🤖 Prompt for AI Agents
@ShuheiHasegawa	Reply...
scripts/seed/studios/data.ts
Comment on lines +816 to +821
        phone: `0${3 + (areaIndex % 3)}-${1000 + i * 100}-${2000 + i * 50}`,
        email: `info@${studioName
          .toLowerCase()
          .replace(/\s+/g, '')
          .replace(/スタジオ|フォト|撮影/g, '')}.com`,
        website_url: `https://${studioName.toLowerCase().replace(/\s+/g, '')}.com`,
@coderabbitai
coderabbitai bot
38 minutes ago
⚠️ Potential issue | 🟡 Minor

Generated email addresses may be invalid.

The email generation logic removes Japanese characters but may produce unusual results. For example, a studio name like "池袋スタジオ2" would become info@池袋2.com after removing only specific Japanese words, keeping other characters that are invalid in email addresses.

Suggested improvement
🤖 Prompt for AI Agents
@ShuheiHasegawa	Reply...
scripts/seed/studios/generate-sql.ts
Comment on lines +1 to +13
/**
 * スタジオシードデータをSQL INSERT文に変換するスクリプト
 */

import { allStudioSeedData } from './data';

// テストユーザーID（organizer）
const CREATED_BY = '33cf6da6-9572-4473-aa10-1cc8eeaf258d'; // プロフィールから取得したorganizer ID

function escapeSqlString(str: string | undefined | null): string {
  if (!str) return 'NULL';
  return `'${str.replace(/'/g, "''")}'`;
}
@coderabbitai
coderabbitai bot
38 minutes ago
⚠️ Potential issue | 🟡 Minor

Hardcoded user ID may cause foreign key constraint failures.

The CREATED_BY UUID is hardcoded, but if this user doesn't exist in the database when the generated SQL is executed, the INSERT will fail due to foreign key constraints.

Consider either:

Adding a comment explaining this dependency
Generating SQL that first verifies the user exists
Using a placeholder that can be replaced at execution time
🤖 Prompt for AI Agents
@ShuheiHasegawa	Reply...
4 hidden conversations
Load more…
src/app/[locale]/users/search/page.tsx
Comment on lines +145 to +150
        <PageTitleHeader
          title="ユーザー検索"
          description="フォロワーやフォロー中のユーザーと新しい会話を開始します"
          icon={<Users className="h-5 w-5" />}
          backButton={{ href: '/messages', variant: 'outline' }}
        />
@coderabbitai
coderabbitai bot
38 minutes ago
⚠️ Potential issue | 🟠 Major

PageTitleHeader の文言は next-intl の翻訳キーに置き換えてください。

Line 146-147 の日本語ハードコードは src/app/**/* の多言語化ルールに抵触します。

♻️ 修正案
As per coding guidelines, all user-facing text in `src/app/**/*` must use next-intl translation keys.
🤖 Prompt for AI Agents
@ShuheiHasegawa	Reply...
src/components/layout/bottom-navigation.tsx
Comment on lines +320 to +329
                'flex flex-col items-center justify-center gap-0.5 transition-colors min-w-0 relative',
                isActive
                  ? 'text-shutter-primary'
                  ? 'text-surface-accent'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {/* アクティブ時の下部下線 */}
              {isActive && (
                <div className="absolute bottom-0 left-1/4 -translate-x-1/4 w-1/2 h-0.5 surface-accent" />
              )}
@coderabbitai
coderabbitai bot
38 minutes ago
⚠️ Potential issue | 🟡 Minor

Fix underline color class so the active indicator actually renders.

Line 328 uses surface-accent without a Tailwind prefix, so the underline may be invisible if your token expects bg-surface-accent.

🔧 Proposed fix
📝 Committable suggestion
🤖 Prompt for AI Agents
@ShuheiHasegawa	Reply...
src/components/studio/StudiosList.tsx
Outdated
Comment on lines 68 to 76
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;

    try {
      if (!append) setLoading(true);
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
@coderabbitai
coderabbitai bot
38 minutes ago
⚠️ Potential issue | 🟠 Major

Guard can drop user‑initiated searches.
If a user triggers a new search while a load-more is in flight, isLoadingRef causes the new fetch to be skipped, and the effect won’t re-run—leaving results stale. Consider allowing non-append fetches to proceed while ignoring stale responses via a request id or cancellation.

✅ Safer request sequencing (avoid skipping fresh searches)
🤖 Prompt for AI Agents
@ShuheiHasegawa	Reply...
src/components/studio/StudiosList.tsx
Comment on lines +350 to +358
      {/* リフレッシュ中のインジケーター */}
      {loading && studios.length > 0 && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50">
          <div className="bg-surface-primary text-surface-primary-text px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">更新中...</span>
          </div>
        </div>
      )}
@coderabbitai
coderabbitai bot
38 minutes ago
⚠️ Potential issue | 🟡 Minor

Localize the refresh label.
The “更新中...” string bypasses next-intl. Please route it through t(...) to keep i18n consistent.

🌐 Suggested i18n adjustment
🤖 Prompt for AI Agents
@ShuheiHasegawa	Reply...
src/lib/storage/studio-images.ts
Comment on lines +174 to +184
    // URLからパスを抽出
    const url = new URL(imageUrl);
    const pathParts = url.pathname.split('/');
    const fileName = pathParts[pathParts.length - 1];
    const tempPath = pathParts.slice(pathParts.length - 3).join('/'); // temp/{tempId}/{fileName}
    const newPath = `studios/${studioId}/${fileName}`;

    // ファイルをコピー
    const { data: fileData, error: readError } = await supabase.storage
      .from(BUCKET_NAME)
      .download(tempPath);
@coderabbitai
coderabbitai bot
38 minutes ago
⚠️ Potential issue | 🟠 Major

Path extraction logic may be fragile and incorrect.

The path extraction assumes a specific URL structure. Line 178 extracts temp/{tempId}/{fileName} but the actual storage path is studios/temp/{tempId}/{fileName}. The download call on line 184 will likely fail.

Proposed fix
📝 Committable suggestion
🤖 Prompt for AI Agents
@ShuheiHasegawa	Reply...
