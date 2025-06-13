-- バランスの取れた撮影会テストデータ（修正版）
-- 既存ユーザーを使用して外部キー制約エラーを回避

-- 現在日付を基準とした撮影会データの挿入
DO $$
DECLARE
    organizer_id uuid;
    session_id uuid;
BEGIN
    -- 既存のユーザーIDを取得（最初に見つかったユーザーを使用）
    SELECT id INTO organizer_id FROM profiles LIMIT 1;
    
    -- ユーザーが存在しない場合はエラーメッセージを表示
    IF organizer_id IS NULL THEN
        RAISE EXCEPTION 'No existing users found. Please create a user account first through the application.';
    END IF;

    -- 1. 過去の撮影会（2週間前〜1週間前）
    INSERT INTO photo_sessions (
        id, organizer_id, title, description, location, start_time, end_time,
        max_participants, current_participants, price_per_person, booking_type,
        is_published, created_at, updated_at
    ) VALUES 
    (
        gen_random_uuid(), organizer_id,
        '春のポートレート撮影会（終了）',
        '桜が美しい季節のポートレート撮影会でした。プロのカメラマンと一緒に素敵な写真を撮影しました。',
        '新宿御苑',
        (CURRENT_TIMESTAMP - INTERVAL '10 days')::timestamp,
        (CURRENT_TIMESTAMP - INTERVAL '10 days' + INTERVAL '3 hours')::timestamp,
        8, 8, 3500, 'first_come', true,
        (CURRENT_TIMESTAMP - INTERVAL '14 days')::timestamp,
        (CURRENT_TIMESTAMP - INTERVAL '10 days')::timestamp
    ),
    (
        gen_random_uuid(), organizer_id,
        'ストリート写真ワークショップ（終了）',
        '渋谷の街を歩きながらストリート写真のテクニックを学ぶワークショップでした。',
        '渋谷センター街',
        (CURRENT_TIMESTAMP - INTERVAL '8 days')::timestamp,
        (CURRENT_TIMESTAMP - INTERVAL '8 days' + INTERVAL '4 hours')::timestamp,
        6, 5, 4000, 'first_come', true,
        (CURRENT_TIMESTAMP - INTERVAL '12 days')::timestamp,
        (CURRENT_TIMESTAMP - INTERVAL '8 days')::timestamp
    );

    -- 2. 現在進行中・直近の撮影会（今日〜3日以内）
    INSERT INTO photo_sessions (
        id, organizer_id, title, description, location, start_time, end_time,
        max_participants, current_participants, price_per_person, booking_type,
        is_published, created_at, updated_at
    ) VALUES 
    (
        gen_random_uuid(), organizer_id,
        '夕日ポートレート撮影会',
        '黄金時間を活用した美しい夕日ポートレート撮影会。初心者からプロまで歓迎です。',
        'お台場海浜公園',
        (CURRENT_TIMESTAMP + INTERVAL '1 day' + INTERVAL '6 hours')::timestamp,
        (CURRENT_TIMESTAMP + INTERVAL '1 day' + INTERVAL '9 hours')::timestamp,
        10, 7, 5000, 'first_come', true,
        (CURRENT_TIMESTAMP - INTERVAL '5 days')::timestamp,
        CURRENT_TIMESTAMP
    ),
    (
        gen_random_uuid(), organizer_id,
        'コスプレ撮影会【満席】',
        '人気のコスプレ撮影会です。プロのライティング機材を使用した本格的な撮影が可能です。',
        'TFTホール',
        (CURRENT_TIMESTAMP + INTERVAL '2 days' + INTERVAL '2 hours')::timestamp,
        (CURRENT_TIMESTAMP + INTERVAL '2 days' + INTERVAL '8 hours')::timestamp,
        12, 12, 6000, 'lottery', true,
        (CURRENT_TIMESTAMP - INTERVAL '7 days')::timestamp,
        CURRENT_TIMESTAMP
    );

    -- 3. 近日開催予定の撮影会（1週間以内）
    INSERT INTO photo_sessions (
        id, organizer_id, title, description, location, start_time, end_time,
        max_participants, current_participants, price_per_person, booking_type,
        is_published, created_at, updated_at
    ) VALUES 
    (
        gen_random_uuid(), organizer_id,
        '初心者向けカメラ講座',
        'カメラの基本から撮影テクニックまで、初心者の方にも分かりやすく解説します。',
        '新宿カメラスタジオ',
        (CURRENT_TIMESTAMP + INTERVAL '4 days' + INTERVAL '10 hours')::timestamp,
        (CURRENT_TIMESTAMP + INTERVAL '4 days' + INTERVAL '13 hours')::timestamp,
        15, 8, 2500, 'first_come', true,
        (CURRENT_TIMESTAMP - INTERVAL '3 days')::timestamp,
        CURRENT_TIMESTAMP
    ),
    (
        gen_random_uuid(), organizer_id,
        'モデル体験撮影会',
        'プロのカメラマンとモデル体験ができる撮影会です。ポージングのコツも学べます。',
        '原宿スタジオ',
        (CURRENT_TIMESTAMP + INTERVAL '6 days' + INTERVAL '14 hours')::timestamp,
        (CURRENT_TIMESTAMP + INTERVAL '6 days' + INTERVAL '17 hours')::timestamp,
        8, 3, 7500, 'priority', true,
        (CURRENT_TIMESTAMP - INTERVAL '2 days')::timestamp,
        CURRENT_TIMESTAMP
    );

    -- 4. 来週以降の撮影会（1-4週間後）
    INSERT INTO photo_sessions (
        id, organizer_id, title, description, location, start_time, end_time,
        max_participants, current_participants, price_per_person, booking_type,
        is_published, created_at, updated_at
    ) VALUES 
    (
        gen_random_uuid(), organizer_id,
        '桜満開！春のポートレート撮影会',
        '満開の桜をバックにした春らしいポートレート撮影会。和装での参加も大歓迎です。',
        '上野恩賜公園',
        (CURRENT_TIMESTAMP + INTERVAL '10 days' + INTERVAL '9 hours')::timestamp,
        (CURRENT_TIMESTAMP + INTERVAL '10 days' + INTERVAL '15 hours')::timestamp,
        20, 5, 4500, 'lottery', true,
        (CURRENT_TIMESTAMP - INTERVAL '1 day')::timestamp,
        CURRENT_TIMESTAMP
    ),
    (
        gen_random_uuid(), organizer_id,
        'プロ向けライティング講座',
        'プロフェッショナル向けの高度なライティングテクニックを学ぶ講座です。',
        '品川スタジオ',
        (CURRENT_TIMESTAMP + INTERVAL '14 days' + INTERVAL '11 hours')::timestamp,
        (CURRENT_TIMESTAMP + INTERVAL '14 days' + INTERVAL '18 hours')::timestamp,
        6, 2, 15000, 'admin_lottery', true,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    (
        gen_random_uuid(), organizer_id,
        '夜景ポートレート撮影会',
        '東京の美しい夜景をバックにしたポートレート撮影。三脚・ライティング機材完備。',
        '六本木ヒルズ',
        (CURRENT_TIMESTAMP + INTERVAL '18 days' + INTERVAL '19 hours')::timestamp,
        (CURRENT_TIMESTAMP + INTERVAL '18 days' + INTERVAL '22 hours')::timestamp,
        12, 0, 8000, 'first_come', true,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    (
        gen_random_uuid(), organizer_id,
        '無料体験撮影会',
        'ShutterHub初心者向けの無料体験撮影会です。気軽にご参加ください！',
        '代々木公園',
        (CURRENT_TIMESTAMP + INTERVAL '21 days' + INTERVAL '13 hours')::timestamp,
        (CURRENT_TIMESTAMP + INTERVAL '21 days' + INTERVAL '16 hours')::timestamp,
        25, 12, 0, 'first_come', true,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    );

    -- 5. 遠い未来の撮影会（1-2ヶ月後）
    INSERT INTO photo_sessions (
        id, organizer_id, title, description, location, start_time, end_time,
        max_participants, current_participants, price_per_person, booking_type,
        is_published, created_at, updated_at
    ) VALUES 
    (
        gen_random_uuid(), organizer_id,
        '夏フェス風撮影会',
        '夏らしい爽やかな撮影会。カジュアルな服装でお気軽にご参加ください。',
        'お台場ビーチ',
        (CURRENT_TIMESTAMP + INTERVAL '35 days' + INTERVAL '15 hours')::timestamp,
        (CURRENT_TIMESTAMP + INTERVAL '35 days' + INTERVAL '18 hours')::timestamp,
        30, 8, 3000, 'lottery', true,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    (
        gen_random_uuid(), organizer_id,
        'プレミアム撮影会【VIP限定】',
        'プレミアム会員限定の特別撮影会。豪華スタジオでの本格撮影をお楽しみください。',
        '銀座プレミアムスタジオ',
        (CURRENT_TIMESTAMP + INTERVAL '42 days' + INTERVAL '12 hours')::timestamp,
        (CURRENT_TIMESTAMP + INTERVAL '42 days' + INTERVAL '17 hours')::timestamp,
        5, 1, 25000, 'priority', true,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    );

    -- 6. 未公開（下書き）の撮影会
    INSERT INTO photo_sessions (
        id, organizer_id, title, description, location, start_time, end_time,
        max_participants, current_participants, price_per_person, booking_type,
        is_published, created_at, updated_at
    ) VALUES 
    (
        gen_random_uuid(), organizer_id,
        '秋の紅葉撮影会（準備中）',
        '紅葉シーズンの美しい撮影会を企画中です。詳細は後日発表予定です。',
        '新宿御苑',
        (CURRENT_TIMESTAMP + INTERVAL '28 days' + INTERVAL '10 hours')::timestamp,
        (CURRENT_TIMESTAMP + INTERVAL '28 days' + INTERVAL '16 hours')::timestamp,
        15, 0, 5500, 'first_come', false,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    );

    -- 成功メッセージ
    RAISE NOTICE 'Successfully created 13 balanced photo session test data records using organizer_id: %', organizer_id;

END $$; 