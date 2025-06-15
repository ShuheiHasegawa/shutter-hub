import { Metadata } from 'next';
import Photobook from '@/components/photobook/Photobook';
import { samplePhotobook } from '@/constants/samplePhotobookData';

export const metadata: Metadata = {
  title: 'フォトブック | ShutterHub',
  description: '美しいフォトブックビューアーで写真を閲覧できます',
};

export default function PhotobookPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Photobook
        photobook={samplePhotobook}
        isEditable={false}
        onPhotoClick={photo => {
          console.log('Photo clicked:', photo);
        }}
      />
    </div>
  );
}
