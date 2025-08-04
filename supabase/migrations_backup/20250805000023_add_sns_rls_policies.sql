-- SNS機能用RLSポリシー

-- sns_posts テーブルのRLS有効化
ALTER TABLE sns_posts ENABLE ROW LEVEL SECURITY;

-- 投稿の閲覧ポリシー
CREATE POLICY "sns_posts_select_policy" ON sns_posts
  FOR SELECT USING (
    visibility = 'public' OR
    user_id = auth.uid() OR
    (visibility = 'followers' AND EXISTS (
      SELECT 1 FROM follows 
      WHERE follower_id = auth.uid() AND following_id = sns_posts.user_id
    )) OR
    (visibility = 'mutual_follows' AND EXISTS (
      SELECT 1 FROM follows f1
      JOIN follows f2 ON f1.following_id = f2.follower_id AND f1.follower_id = f2.following_id
      WHERE f1.follower_id = auth.uid() AND f1.following_id = sns_posts.user_id
    ))
  );

-- 投稿の作成ポリシー
CREATE POLICY "sns_posts_insert_policy" ON sns_posts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 投稿の更新ポリシー（自分の投稿のみ）
CREATE POLICY "sns_posts_update_policy" ON sns_posts
  FOR UPDATE USING (auth.uid() = user_id);

-- 投稿の削除ポリシー（自分の投稿のみ）
CREATE POLICY "sns_posts_delete_policy" ON sns_posts
  FOR DELETE USING (auth.uid() = user_id);

-- sns_post_likes テーブルのRLS
ALTER TABLE sns_post_likes ENABLE ROW LEVEL SECURITY;

-- いいねの閲覧ポリシー（いいねした投稿が見える場合のみ）
CREATE POLICY "sns_post_likes_select_policy" ON sns_post_likes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM sns_posts p 
      WHERE p.id = sns_post_likes.post_id AND (
        p.visibility = 'public' OR
        p.user_id = auth.uid() OR
        (p.visibility = 'followers' AND EXISTS (
          SELECT 1 FROM follows 
          WHERE follower_id = auth.uid() AND following_id = p.user_id
        )) OR
        (p.visibility = 'mutual_follows' AND EXISTS (
          SELECT 1 FROM follows f1
          JOIN follows f2 ON f1.following_id = f2.follower_id AND f1.follower_id = f2.following_id
          WHERE f1.follower_id = auth.uid() AND f1.following_id = p.user_id
        ))
      )
    )
  );

-- いいねの作成ポリシー
CREATE POLICY "sns_post_likes_insert_policy" ON sns_post_likes
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM sns_posts p 
      WHERE p.id = sns_post_likes.post_id AND (
        p.visibility = 'public' OR
        p.user_id = auth.uid() OR
        (p.visibility = 'followers' AND EXISTS (
          SELECT 1 FROM follows 
          WHERE follower_id = auth.uid() AND following_id = p.user_id
        )) OR
        (p.visibility = 'mutual_follows' AND EXISTS (
          SELECT 1 FROM follows f1
          JOIN follows f2 ON f1.following_id = f2.follower_id AND f1.follower_id = f2.following_id
          WHERE f1.follower_id = auth.uid() AND f1.following_id = p.user_id
        ))
      )
    )
  );

-- いいねの削除ポリシー（自分のいいねのみ）
CREATE POLICY "sns_post_likes_delete_policy" ON sns_post_likes
  FOR DELETE USING (auth.uid() = user_id);

-- sns_post_comments テーブルのRLS
ALTER TABLE sns_post_comments ENABLE ROW LEVEL SECURITY;

-- コメントの閲覧ポリシー（コメントした投稿が見える場合のみ）
CREATE POLICY "sns_post_comments_select_policy" ON sns_post_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM sns_posts p 
      WHERE p.id = sns_post_comments.post_id AND (
        p.visibility = 'public' OR
        p.user_id = auth.uid() OR
        (p.visibility = 'followers' AND EXISTS (
          SELECT 1 FROM follows 
          WHERE follower_id = auth.uid() AND following_id = p.user_id
        )) OR
        (p.visibility = 'mutual_follows' AND EXISTS (
          SELECT 1 FROM follows f1
          JOIN follows f2 ON f1.following_id = f2.follower_id AND f1.follower_id = f2.following_id
          WHERE f1.follower_id = auth.uid() AND f1.following_id = p.user_id
        ))
      )
    )
  );

-- コメントの作成ポリシー
CREATE POLICY "sns_post_comments_insert_policy" ON sns_post_comments
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM sns_posts p 
      WHERE p.id = sns_post_comments.post_id AND (
        p.visibility = 'public' OR
        p.user_id = auth.uid() OR
        (p.visibility = 'followers' AND EXISTS (
          SELECT 1 FROM follows 
          WHERE follower_id = auth.uid() AND following_id = p.user_id
        )) OR
        (p.visibility = 'mutual_follows' AND EXISTS (
          SELECT 1 FROM follows f1
          JOIN follows f2 ON f1.following_id = f2.follower_id AND f1.follower_id = f2.following_id
          WHERE f1.follower_id = auth.uid() AND f1.following_id = p.user_id
        ))
      )
    )
  );

-- コメントの更新ポリシー（自分のコメントのみ）
CREATE POLICY "sns_post_comments_update_policy" ON sns_post_comments
  FOR UPDATE USING (auth.uid() = user_id);

-- コメントの削除ポリシー（自分のコメントのみ）
CREATE POLICY "sns_post_comments_delete_policy" ON sns_post_comments
  FOR DELETE USING (auth.uid() = user_id);

-- sns_comment_likes テーブルのRLS
ALTER TABLE sns_comment_likes ENABLE ROW LEVEL SECURITY;

-- コメントいいねの閲覧ポリシー
CREATE POLICY "sns_comment_likes_select_policy" ON sns_comment_likes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM sns_post_comments c
      JOIN sns_posts p ON c.post_id = p.id
      WHERE c.id = sns_comment_likes.comment_id AND (
        p.visibility = 'public' OR
        p.user_id = auth.uid() OR
        (p.visibility = 'followers' AND EXISTS (
          SELECT 1 FROM follows 
          WHERE follower_id = auth.uid() AND following_id = p.user_id
        )) OR
        (p.visibility = 'mutual_follows' AND EXISTS (
          SELECT 1 FROM follows f1
          JOIN follows f2 ON f1.following_id = f2.follower_id AND f1.follower_id = f2.following_id
          WHERE f1.follower_id = auth.uid() AND f1.following_id = p.user_id
        ))
      )
    )
  );

-- コメントいいねの作成ポリシー
CREATE POLICY "sns_comment_likes_insert_policy" ON sns_comment_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- コメントいいねの削除ポリシー（自分のいいねのみ）
CREATE POLICY "sns_comment_likes_delete_policy" ON sns_comment_likes
  FOR DELETE USING (auth.uid() = user_id);

-- sns_hashtags テーブルのRLS
ALTER TABLE sns_hashtags ENABLE ROW LEVEL SECURITY;

-- ハッシュタグの閲覧ポリシー（全員閲覧可能）
CREATE POLICY "sns_hashtags_select_policy" ON sns_hashtags
  FOR SELECT USING (true);

-- ハッシュタグの作成ポリシー（認証済みユーザーのみ）
CREATE POLICY "sns_hashtags_insert_policy" ON sns_hashtags
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- sns_post_hashtags テーブルのRLS
ALTER TABLE sns_post_hashtags ENABLE ROW LEVEL SECURITY;

-- 投稿ハッシュタグの閲覧ポリシー
CREATE POLICY "sns_post_hashtags_select_policy" ON sns_post_hashtags
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM sns_posts p 
      WHERE p.id = sns_post_hashtags.post_id AND (
        p.visibility = 'public' OR
        p.user_id = auth.uid() OR
        (p.visibility = 'followers' AND EXISTS (
          SELECT 1 FROM follows 
          WHERE follower_id = auth.uid() AND following_id = p.user_id
        )) OR
        (p.visibility = 'mutual_follows' AND EXISTS (
          SELECT 1 FROM follows f1
          JOIN follows f2 ON f1.following_id = f2.follower_id AND f1.follower_id = f2.following_id
          WHERE f1.follower_id = auth.uid() AND f1.following_id = p.user_id
        ))
      )
    )
  );

-- 投稿ハッシュタグの作成ポリシー（投稿者のみ）
CREATE POLICY "sns_post_hashtags_insert_policy" ON sns_post_hashtags
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM sns_posts p 
      WHERE p.id = sns_post_hashtags.post_id AND p.user_id = auth.uid()
    )
  );

-- 投稿ハッシュタグの削除ポリシー（投稿者のみ）
CREATE POLICY "sns_post_hashtags_delete_policy" ON sns_post_hashtags
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM sns_posts p 
      WHERE p.id = sns_post_hashtags.post_id AND p.user_id = auth.uid()
    )
  );

-- sns_post_mentions テーブルのRLS
ALTER TABLE sns_post_mentions ENABLE ROW LEVEL SECURITY;

-- メンションの閲覧ポリシー（投稿が見える場合または自分がメンションされた場合）
CREATE POLICY "sns_post_mentions_select_policy" ON sns_post_mentions
  FOR SELECT USING (
    mentioned_user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM sns_posts p 
      WHERE p.id = sns_post_mentions.post_id AND (
        p.visibility = 'public' OR
        p.user_id = auth.uid() OR
        (p.visibility = 'followers' AND EXISTS (
          SELECT 1 FROM follows 
          WHERE follower_id = auth.uid() AND following_id = p.user_id
        )) OR
        (p.visibility = 'mutual_follows' AND EXISTS (
          SELECT 1 FROM follows f1
          JOIN follows f2 ON f1.following_id = f2.follower_id AND f1.follower_id = f2.following_id
          WHERE f1.follower_id = auth.uid() AND f1.following_id = p.user_id
        ))
      )
    )
  );

-- メンションの作成ポリシー（投稿者のみ）
CREATE POLICY "sns_post_mentions_insert_policy" ON sns_post_mentions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM sns_posts p 
      WHERE p.id = sns_post_mentions.post_id AND p.user_id = auth.uid()
    )
  );

-- メンションの削除ポリシー（投稿者のみ）
CREATE POLICY "sns_post_mentions_delete_policy" ON sns_post_mentions
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM sns_posts p 
      WHERE p.id = sns_post_mentions.post_id AND p.user_id = auth.uid()
    )
  );

-- sns_timeline_preferences テーブルのRLS
ALTER TABLE sns_timeline_preferences ENABLE ROW LEVEL SECURITY;

-- タイムライン設定の閲覧ポリシー（自分のもののみ）
CREATE POLICY "sns_timeline_preferences_select_policy" ON sns_timeline_preferences
  FOR SELECT USING (auth.uid() = user_id);

-- タイムライン設定の作成ポリシー（自分のもののみ）
CREATE POLICY "sns_timeline_preferences_insert_policy" ON sns_timeline_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- タイムライン設定の更新ポリシー（自分のもののみ）
CREATE POLICY "sns_timeline_preferences_update_policy" ON sns_timeline_preferences
  FOR UPDATE USING (auth.uid() = user_id);

-- タイムライン設定の削除ポリシー（自分のもののみ）
CREATE POLICY "sns_timeline_preferences_delete_policy" ON sns_timeline_preferences
  FOR DELETE USING (auth.uid() = user_id); 