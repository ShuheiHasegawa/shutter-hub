Skip to content
ShuheiHasegawa
shutter-hub
Repository navigation
Code
Issues
1
 (1)
Pull requests
1
 (1)
Zenhub
Actions
Projects
Wiki
Security
53
 (53)
Insights
Settings
refactor: StudioImageUploadコンポーネントの統一実装 #28
 Open
ShuheiHasegawa wants to merge 3 commits into main from refactor/27-studio-image-upload-unification  
+5,962 −715 
 Conversation 20
 Commits 3
 Checks 2
 Files changed 32
Conversation
@ShuheiHasegawa
Owner
ShuheiHasegawa
commented
1 hour ago
• 
Closes #27

作成モードと編集モードの両方に対応する単一コンポーネントにリファクタリング
コード重複を排除し保守性を向上
Summary by CodeRabbit
New Features

Sign-in can return you to the original page after authentication
Redesigned studio detail page with larger gallery, equipment badges, contact links, and refined tabs
Infinite scrolling on studio lists
Drag-and-drop image upload with live preview, reorder and main-image handling
Richer booking slot cards and clearer booking error messages
Scroll-to-top navigation label/button
UI Improvements

Bottom navigation active state refined with underline indicator
Documentation

Extensive new guides for E2E testing, test strategy, site pages, UI components, and image management
✏️ Tip: You can customize this high-level summary in your review settings.

@ShuheiHasegawa
refactor: StudioImageUploadコンポーネントの統一実装 
a9e2f00
@ShuheiHasegawa ShuheiHasegawa self-assigned this 1 hour ago
@vercel
vercel bot
commented
1 hour ago
• 
The latest updates on your projects. Learn more about Vercel for GitHub.

Project	Deployment	Review	Updated (UTC)
shutter-hub	Ready Ready	Preview, Comment	Jan 22, 2026 0:52am
@coderabbitai
coderabbitai bot
commented
1 hour ago
• 
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

@vercel vercel bot deployed to Preview 1 hour ago
coderabbitai[bot]
coderabbitai bot reviewed 1 hour ago
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
1 hour ago
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
1 hour ago
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
1 hour ago
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
1 hour ago
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
1 hour ago
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
src/components/layout/bottom-navigation.tsx
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
1 hour ago
⚠️ Potential issue | 🟠 Major

Guard can drop user‑initiated searches.
If a user triggers a new search while a load-more is in flight, isLoadingRef causes the new fetch to be skipped, and the effect won’t re-run—leaving results stale. Consider allowing non-append fetches to proceed while ignoring stale responses via a request id or cancellation.

✅ Safer request sequencing (avoid skipping fresh searches)
🤖 Prompt for AI Agents
@ShuheiHasegawa	Reply...
src/components/studio/StudiosList.tsx
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
1 hour ago
⚠️ Potential issue | 🟠 Major

Path extraction logic may be fragile and incorrect.

The path extraction assumes a specific URL structure. Line 178 extracts temp/{tempId}/{fileName} but the actual storage path is studios/temp/{tempId}/{fileName}. The download call on line 184 will likely fail.

Proposed fix
📝 Committable suggestion
🤖 Prompt for AI Agents
@ShuheiHasegawa	Reply...
@ShuheiHasegawa
fix: SonarQube指摘事項の修正
2fc3d10
@vercel vercel bot deployed to Preview 42 minutes ago
coderabbitai[bot]
coderabbitai bot reviewed 34 minutes ago
coderabbitai bot
left a comment
Actionable comments posted: 1

🤖 Fix all issues with AI agents
♻️ Duplicate comments (2)
src/app/actions/studio.ts
Comment on lines +23 to +71
/**
 * フィルタリングを適用するヘルパー関数
 */
function applyStudioFilters(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query: any,
  filters: StudioSearchFilters
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): any {
  if (filters.query) {
    query = query.or(
      `name.ilike.%${filters.query}%,address.ilike.%${filters.query}%`
    );
  }

  if (filters.prefecture && filters.prefecture !== 'all') {
    query = query.eq('prefecture', filters.prefecture);
  }

  if (filters.city) {
    query = query.eq('city', filters.city);
  }

  if (filters.min_capacity) {
    query = query.gte('max_capacity', filters.min_capacity);
  }

  if (filters.max_capacity) {
    query = query.lte('max_capacity', filters.max_capacity);
  }

  if (filters.min_hourly_rate) {
    query = query.gte('hourly_rate_min', filters.min_hourly_rate);
  }

  if (filters.max_hourly_rate) {
    query = query.lte('hourly_rate_max', filters.max_hourly_rate);
  }

  if (filters.parking_available !== undefined) {
    query = query.eq('parking_available', filters.parking_available);
  }

  if (filters.wifi_available !== undefined) {
    query = query.eq('wifi_available', filters.wifi_available);
  }

  return query;
}
@coderabbitai
coderabbitai bot
34 minutes ago
⚠️ Potential issue | 🟠 Major

🧩 Analysis chain
Expand the FilterableQuery interface to include all chained methods.

The proposed generic approach is correct, but FilterableQuery must include .in() and .order() which are used in getStudiosAction (lines 30, 38, 51). Without these, the refactored function will fail type checking.

🔧 Complete type-safe helper
📝 Committable suggestion
🤖 Prompt for AI Agents
@ShuheiHasegawa	Reply...
@ShuheiHasegawa
fix: CodeRabbitレビュー指摘事項の修正 
9caa783
@sonarqubecloud
sonarqubecloud bot
commented
11 minutes ago
Quality Gate Failed Quality Gate failed
Failed conditions
 15.8% Duplication on New Code (required ≤ 3%)

See analysis details on SonarQube Cloud

@vercel vercel bot deployed to Preview 9 minutes ago
coderabbitai[bot]
coderabbitai bot reviewed 3 minutes ago
coderabbitai bot
left a comment
Actionable comments posted: 0

Caution

Some comments are outside the diff and can’t be posted inline due to platform limitations.

⚠️ Outside diff range comments (7)
♻️ Duplicate comments (1)
🧹 Nitpick comments (2)
This branch was successfully deployed
1 active deployment
Merge info
Some checks were not successful
1 failing, 3 successful checks


failing checks
SonarCloud Code Analysis
SonarCloud Code AnalysisFailing after 1m — Quality Gate failed
successful checks
CodeRabbit
CodeRabbit — Review completed
Vercel
Vercel — Deployment has completed
Vercel Preview Comments
Vercel Preview Comments — ✅ No unresolved feedback
No conflicts with base branch
Merging can be performed automatically.

You can also merge this with the command line. 
Still in progress?
@ShuheiHasegawa


Add a comment
Comment
 
Add your comment here...
 
Remember, contributions to this repository should follow our GitHub Community Guidelines.
 ProTip! Add .patch or .diff to the end of URLs for Git’s plaintext views.
Reviewers
@coderabbitai
coderabbitai[bot]
Still in progress?
Assignees
@ShuheiHasegawa
ShuheiHasegawa
Labels
None yet
Projects
None yet
Milestone
No milestone
Development
Successfully merging this pull request may close these issues.

 [Refactor] StudioImageUploadコンポーネントの統一実装

Notifications
Customize
You’re receiving notifications because you authored the thread.
1 participant
@ShuheiHasegawa
Footer
© 2026 GitHub, Inc.
Footer navigation
Terms
Privacy
Security
Status
Community
Docs
Contact
Manage cookies
Do not share my personal information
Sign in now to use Zenhub