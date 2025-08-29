'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function ChatRedirectPage() {
  const { id } = useParams();
  const router = useRouter();

  useEffect(() => {
    // 統合メッセージページにリダイレクト
    if (id) {
      router.replace(`/messages?id=${id}`);
    } else {
      router.replace('/messages');
    }
  }, [id, router]);

  return (
    <div className="flex items-center justify-center h-screen">
      <p>リダイレクト中...</p>
    </div>
  );
}
