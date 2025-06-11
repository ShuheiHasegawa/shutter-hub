-- Phase 6: SNS投稿システムのRLSポリシー設定

-- RLSを有効にする
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE hashtags ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_hashtags ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE timeline_preferences ENABLE ROW LEVEL SECURITY;

-- 投稿（posts）のRLSポリシー

-- 投稿を表示する権限
CREATE POLICY "投稿の表示権限" ON posts
FOR SELECT USING (
  CASE visibility
    WHEN 'public' THEN TRUE
    WHEN 'followers' THEN (
      user_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM follows f 
        WHERE f.follower_id = auth.uid() 
        AND f.following_id = posts.user_id 
        AND f.status = 'accepted'
      )
    )
    WHEN 'mutual_follows' THEN (
      user_id = auth.uid() OR
      are_users_mutual_followers(auth.uid(), posts.user_id)
    )
    WHEN 'private' THEN user_id = auth.uid()
    ELSE FALSE
  END
);

-- 投稿を作成する権限
CREATE POLICY "投稿の作成権限" ON posts
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 投稿を更新する権限（自分の投稿のみ）
CREATE POLICY "投稿の更新権限" ON posts
FOR UPDATE USING (auth.uid() = user_id);

-- 投稿を削除する権限（自分の投稿のみ）
CREATE POLICY "投稿の削除権限" ON posts
FOR DELETE USING (auth.uid() = user_id);

-- いいね（post_likes）のRLSポリシー

-- いいねを表示する権限
CREATE POLICY "いいねの表示権限" ON post_likes
FOR SELECT USING (
  -- 投稿が見える場合はいいねも見える
  EXISTS (
    SELECT 1 FROM posts p 
    WHERE p.id = post_likes.post_id 
    AND (
      CASE p.visibility
        WHEN 'public' THEN TRUE
        WHEN 'followers' THEN (
          p.user_id = auth.uid() OR
          EXISTS (
            SELECT 1 FROM follows f 
            WHERE f.follower_id = auth.uid() 
            AND f.following_id = p.user_id 
            AND f.status = 'accepted'
          )
        )
        WHEN 'mutual_follows' THEN (
          p.user_id = auth.uid() OR
          are_users_mutual_followers(auth.uid(), p.user_id)
        )
        WHEN 'private' THEN p.user_id = auth.uid()
        ELSE FALSE
      END
    )
  )
);

-- いいねを作成する権限
CREATE POLICY "いいねの作成権限" ON post_likes
FOR INSERT WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM posts p 
    WHERE p.id = post_likes.post_id 
    AND (
      CASE p.visibility
        WHEN 'public' THEN TRUE
        WHEN 'followers' THEN (
          p.user_id = auth.uid() OR
          EXISTS (
            SELECT 1 FROM follows f 
            WHERE f.follower_id = auth.uid() 
            AND f.following_id = p.user_id 
            AND f.status = 'accepted'
          )
        )
        WHEN 'mutual_follows' THEN (
          p.user_id = auth.uid() OR
          are_users_mutual_followers(auth.uid(), p.user_id)
        )
        WHEN 'private' THEN p.user_id = auth.uid()
        ELSE FALSE
      END
    )
  )
);

-- いいねを削除する権限（自分のいいねのみ）
CREATE POLICY "いいねの削除権限" ON post_likes
FOR DELETE USING (auth.uid() = user_id);

-- コメント（post_comments）のRLSポリシー

-- コメントを表示する権限
CREATE POLICY "コメントの表示権限" ON post_comments
FOR SELECT USING (
  -- 投稿が見える場合はコメントも見える
  EXISTS (
    SELECT 1 FROM posts p 
    WHERE p.id = post_comments.post_id 
    AND (
      CASE p.visibility
        WHEN 'public' THEN TRUE
        WHEN 'followers' THEN (
          p.user_id = auth.uid() OR
          EXISTS (
            SELECT 1 FROM follows f 
            WHERE f.follower_id = auth.uid() 
            AND f.following_id = p.user_id 
            AND f.status = 'accepted'
          )
        )
        WHEN 'mutual_follows' THEN (
          p.user_id = auth.uid() OR
          are_users_mutual_followers(auth.uid(), p.user_id)
        )
        WHEN 'private' THEN p.user_id = auth.uid()
        ELSE FALSE
      END
    )
  )
);

-- コメントを作成する権限
CREATE POLICY "コメントの作成権限" ON post_comments
FOR INSERT WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM posts p 
    WHERE p.id = post_comments.post_id 
    AND (
      CASE p.visibility
        WHEN 'public' THEN TRUE
        WHEN 'followers' THEN (
          p.user_id = auth.uid() OR
          EXISTS (
            SELECT 1 FROM follows f 
            WHERE f.follower_id = auth.uid() 
            AND f.following_id = p.user_id 
            AND f.status = 'accepted'
          )
        )
        WHEN 'mutual_follows' THEN (
          p.user_id = auth.uid() OR
          are_users_mutual_followers(auth.uid(), p.user_id)
        )
        WHEN 'private' THEN p.user_id = auth.uid()
        ELSE FALSE
      END
    )
  )
);

-- コメントを更新する権限（自分のコメントのみ）
CREATE POLICY "コメントの更新権限" ON post_comments
FOR UPDATE USING (auth.uid() = user_id);

-- コメントを削除する権限（自分のコメントまたは投稿者）
CREATE POLICY "コメントの削除権限" ON post_comments
FOR DELETE USING (
  auth.uid() = user_id OR
  EXISTS (
    SELECT 1 FROM posts p 
    WHERE p.id = post_comments.post_id 
    AND p.user_id = auth.uid()
  )
);

-- コメントのいいね（comment_likes）のRLSポリシー

-- コメントのいいねを表示する権限
CREATE POLICY "コメントのいいねの表示権限" ON comment_likes
FOR SELECT USING (
  -- コメントが見える場合はいいねも見える
  EXISTS (
    SELECT 1 FROM post_comments pc
    JOIN posts p ON p.id = pc.post_id
    WHERE pc.id = comment_likes.comment_id 
    AND (
      CASE p.visibility
        WHEN 'public' THEN TRUE
        WHEN 'followers' THEN (
          p.user_id = auth.uid() OR
          EXISTS (
            SELECT 1 FROM follows f 
            WHERE f.follower_id = auth.uid() 
            AND f.following_id = p.user_id 
            AND f.status = 'accepted'
          )
        )
        WHEN 'mutual_follows' THEN (
          p.user_id = auth.uid() OR
          are_users_mutual_followers(auth.uid(), p.user_id)
        )
        WHEN 'private' THEN p.user_id = auth.uid()
        ELSE FALSE
      END
    )
  )
);

-- コメントのいいねを作成する権限
CREATE POLICY "コメントのいいねの作成権限" ON comment_likes
FOR INSERT WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM post_comments pc
    JOIN posts p ON p.id = pc.post_id
    WHERE pc.id = comment_likes.comment_id 
    AND (
      CASE p.visibility
        WHEN 'public' THEN TRUE
        WHEN 'followers' THEN (
          p.user_id = auth.uid() OR
          EXISTS (
            SELECT 1 FROM follows f 
            WHERE f.follower_id = auth.uid() 
            AND f.following_id = p.user_id 
            AND f.status = 'accepted'
          )
        )
        WHEN 'mutual_follows' THEN (
          p.user_id = auth.uid() OR
          are_users_mutual_followers(auth.uid(), p.user_id)
        )
        WHEN 'private' THEN p.user_id = auth.uid()
        ELSE FALSE
      END
    )
  )
);

-- コメントのいいねを削除する権限（自分のいいねのみ）
CREATE POLICY "コメントのいいねの削除権限" ON comment_likes
FOR DELETE USING (auth.uid() = user_id);

-- ハッシュタグ（hashtags）のRLSポリシー

-- ハッシュタグを表示する権限（全て表示）
CREATE POLICY "ハッシュタグの表示権限" ON hashtags
FOR SELECT USING (TRUE);

-- ハッシュタグを作成する権限（認証ユーザーのみ）
CREATE POLICY "ハッシュタグの作成権限" ON hashtags
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 投稿ハッシュタグ関連（post_hashtags）のRLSポリシー

-- 投稿ハッシュタグの表示権限
CREATE POLICY "投稿ハッシュタグの表示権限" ON post_hashtags
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM posts p 
    WHERE p.id = post_hashtags.post_id 
    AND (
      CASE p.visibility
        WHEN 'public' THEN TRUE
        WHEN 'followers' THEN (
          p.user_id = auth.uid() OR
          EXISTS (
            SELECT 1 FROM follows f 
            WHERE f.follower_id = auth.uid() 
            AND f.following_id = p.user_id 
            AND f.status = 'accepted'
          )
        )
        WHEN 'mutual_follows' THEN (
          p.user_id = auth.uid() OR
          are_users_mutual_followers(auth.uid(), p.user_id)
        )
        WHEN 'private' THEN p.user_id = auth.uid()
        ELSE FALSE
      END
    )
  )
);

-- 投稿ハッシュタグの作成権限（自分の投稿のみ）
CREATE POLICY "投稿ハッシュタグの作成権限" ON post_hashtags
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM posts p 
    WHERE p.id = post_hashtags.post_id 
    AND p.user_id = auth.uid()
  )
);

-- 投稿ハッシュタグの削除権限（自分の投稿のみ）
CREATE POLICY "投稿ハッシュタグの削除権限" ON post_hashtags
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM posts p 
    WHERE p.id = post_hashtags.post_id 
    AND p.user_id = auth.uid()
  )
);

-- メンション（post_mentions）のRLSポリシー

-- メンションの表示権限
CREATE POLICY "メンションの表示権限" ON post_mentions
FOR SELECT USING (
  mentioned_user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM posts p 
    WHERE p.id = post_mentions.post_id 
    AND (
      CASE p.visibility
        WHEN 'public' THEN TRUE
        WHEN 'followers' THEN (
          p.user_id = auth.uid() OR
          EXISTS (
            SELECT 1 FROM follows f 
            WHERE f.follower_id = auth.uid() 
            AND f.following_id = p.user_id 
            AND f.status = 'accepted'
          )
        )
        WHEN 'mutual_follows' THEN (
          p.user_id = auth.uid() OR
          are_users_mutual_followers(auth.uid(), p.user_id)
        )
        WHEN 'private' THEN p.user_id = auth.uid()
        ELSE FALSE
      END
    )
  )
);

-- メンションの作成権限（自分の投稿のみ）
CREATE POLICY "メンションの作成権限" ON post_mentions
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM posts p 
    WHERE p.id = post_mentions.post_id 
    AND p.user_id = auth.uid()
  )
);

-- メンションの削除権限（自分の投稿のみ）
CREATE POLICY "メンションの削除権限" ON post_mentions
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM posts p 
    WHERE p.id = post_mentions.post_id 
    AND p.user_id = auth.uid()
  )
);

-- タイムライン設定（timeline_preferences）のRLSポリシー

-- タイムライン設定の表示権限（自分のみ）
CREATE POLICY "タイムライン設定の表示権限" ON timeline_preferences
FOR SELECT USING (user_id = auth.uid());

-- タイムライン設定の作成権限（自分のみ）
CREATE POLICY "タイムライン設定の作成権限" ON timeline_preferences
FOR INSERT WITH CHECK (user_id = auth.uid());

-- タイムライン設定の更新権限（自分のみ）
CREATE POLICY "タイムライン設定の更新権限" ON timeline_preferences
FOR UPDATE USING (user_id = auth.uid());

-- タイムライン設定の削除権限（自分のみ）
CREATE POLICY "タイムライン設定の削除権限" ON timeline_preferences
FOR DELETE USING (user_id = auth.uid());

COMMENT ON TABLE posts IS 'SNS投稿（つぶやき・写真投稿）';
COMMENT ON TABLE post_likes IS '投稿へのいいね';
COMMENT ON TABLE post_comments IS '投稿のコメント';
COMMENT ON TABLE comment_likes IS 'コメントへのいいね';
COMMENT ON TABLE hashtags IS 'ハッシュタグマスター';
COMMENT ON TABLE post_hashtags IS '投稿とハッシュタグの関連';
COMMENT ON TABLE post_mentions IS '投稿でのメンション';
COMMENT ON TABLE timeline_preferences IS 'タイムライン設定'; 