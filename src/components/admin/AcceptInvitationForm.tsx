'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertTriangle } from 'lucide-react';
import { acceptAdminInvitation } from '@/app/actions/admin-system';

interface AcceptInvitationFormProps {
  invitationToken: string;
  roleName: string;
}

export function AcceptInvitationForm({
  invitationToken,
  roleName,
}: AcceptInvitationFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleAccept = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await acceptAdminInvitation(invitationToken);

      if (result.success) {
        setSuccess(true);
        // 2秒後に管理画面にリダイレクト
        setTimeout(() => {
          router.push('/admin/disputes');
        }, 2000);
      } else {
        setError(result.error || '招待の受諾に失敗しました');
      }
    } catch {
      setError('予期しないエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const handleDecline = () => {
    router.push('/dashboard');
  };

  if (success) {
    return (
      <Alert>
        <CheckCircle className="h-4 w-4" />
        <AlertDescription>
          {roleName}権限が付与されました。 管理画面に移動しています...
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-3">
        <Button onClick={handleAccept} disabled={loading} className="w-full">
          {loading ? '処理中...' : `${roleName}として参加する`}
        </Button>

        <Button
          variant="outline"
          onClick={handleDecline}
          disabled={loading}
          className="w-full"
        >
          辞退する
        </Button>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        招待を受諾することで、管理者としての責任を承諾したものとみなされます。
      </p>
    </div>
  );
}
