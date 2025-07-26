'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { User, Mail, Calendar, MapPin, Edit, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { useLocale } from 'next-intl';
import Link from 'next/link';

interface UserProfileCardProps {
  profile: {
    id: string;
    display_name: string | null;
    username?: string | null;
    email: string;
    avatar_url: string | null;
    bio: string | null;
    location: string | null;
    website: string | null;
    created_at: string;
    updated_at: string;
  };
}

export function UserProfileCard({ profile }: UserProfileCardProps) {
  const locale = useLocale();

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'PPP', {
      locale: locale === 'ja' ? ja : undefined,
    });
  };

  // プロフィール画像のキャッシュバスティング用URLを生成
  const avatarUrlWithCacheBuster = profile.avatar_url
    ? `${profile.avatar_url}?t=${profile.updated_at ? new Date(profile.updated_at).getTime() : Date.now()}`
    : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <User className="h-5 w-5" />
            プロフィール
          </span>
          <Button variant="outline" size="sm" asChild>
            <Link href="/profile/edit">
              <Edit className="h-4 w-4 mr-2" />
              編集
            </Link>
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* アバターと基本情報 */}
        <div className="flex flex-col items-center text-center space-y-4">
          <Avatar className="h-24 w-24">
            <AvatarImage src={avatarUrlWithCacheBuster || undefined} />
            <AvatarFallback className="text-lg">
              {profile.display_name ? (
                getInitials(profile.display_name)
              ) : (
                <User className="h-8 w-8" />
              )}
            </AvatarFallback>
          </Avatar>

          <div>
            <h3 className="text-xl font-semibold">
              {profile.display_name || 'ユーザー'}
            </h3>
            {profile.username && (
              <p className="text-sm text-muted-foreground mt-1">
                @{profile.username}
              </p>
            )}
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mt-1">
              <Mail className="h-3 w-3" />
              {profile.email}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3" />
              認証済み
            </Badge>
          </div>
        </div>

        <Separator />

        {/* 詳細情報 */}
        <div className="space-y-4">
          {profile.bio && (
            <div>
              <h4 className="text-sm font-medium mb-2">自己紹介</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {profile.bio}
              </p>
            </div>
          )}

          {profile.location && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{profile.location}</span>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">
              {formatDate(profile.created_at)}に参加
            </span>
          </div>

          {profile.website && (
            <div>
              <h4 className="text-sm font-medium mb-2">ウェブサイト</h4>
              <a
                href={profile.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline"
              >
                {profile.website}
              </a>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
