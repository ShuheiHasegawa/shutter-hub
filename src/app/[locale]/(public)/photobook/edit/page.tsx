import { Metadata } from 'next';
import Photobook from '@/components/photobook/Photobook';
import { samplePhotobook } from '@/constants/samplePhotobookData';

export const metadata: Metadata = {
  title: 'フォトブック編集 | ShutterHub',
  description: 'あなたの写真を美しいフォトブックに編集しましょう',
};

export default function PhotobookEditPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          フォトブック編集
        </h1>
        <p className="text-gray-600 dark:text-gray-300">
          写真を配置して、あなただけのフォトブックを作成しましょう
        </p>
      </div>

      <Photobook photobook={samplePhotobook} isEditable={true} />
    </div>
  );
}
