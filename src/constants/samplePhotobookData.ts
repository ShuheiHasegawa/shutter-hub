import { Photo, SpreadLayout, Photobook } from '@/types/photobook';
import { getTemplateById } from './layoutTemplates';

// サンプル写真データを生成
const samplePhotos: Photo[] = Array.from({ length: 30 }).map((_, index) => ({
  id: `photo-${index + 1}`,
  src: `/images/kanna/${130 + index}.jpg`,
  alt: `カンナ写真 ${index + 1}`,
}));

// サンプルの見開きレイアウトを生成
export const sampleSpreads: SpreadLayout[] = [
  {
    id: 'spread-1',
    fullSpreadTemplate: getTemplateById('spread-large'),
    photos: [
      {
        ...samplePhotos[0],
        position: getTemplateById('spread-large')?.photoPositions[0],
      },
    ],
  },
  {
    id: 'spread-2',
    leftPageTemplate: getTemplateById('single-large'),
    rightPageTemplate: getTemplateById('single-large'),
    photos: [
      {
        ...samplePhotos[1],
        position: getTemplateById('single-large')?.photoPositions[0],
      },
      {
        ...samplePhotos[2],
        position: getTemplateById('single-large')?.photoPositions[0],
      },
    ],
  },
  {
    id: 'spread-3',
    leftPageTemplate: getTemplateById('vertical-2'),
    rightPageTemplate: getTemplateById('main-2sub'),
    photos: [
      {
        ...samplePhotos[3],
        position: getTemplateById('vertical-2')?.photoPositions[0],
      },
      {
        ...samplePhotos[4],
        position: getTemplateById('vertical-2')?.photoPositions[1],
      },
      {
        ...samplePhotos[5],
        position: getTemplateById('main-2sub')?.photoPositions[0],
      },
      {
        ...samplePhotos[6],
        position: getTemplateById('main-2sub')?.photoPositions[1],
      },
      {
        ...samplePhotos[7],
        position: getTemplateById('main-2sub')?.photoPositions[2],
      },
    ],
  },
  {
    id: 'spread-4',
    leftPageTemplate: getTemplateById('grid-4'),
    rightPageTemplate: getTemplateById('horizontal-2'),
    photos: [
      {
        ...samplePhotos[8],
        position: getTemplateById('grid-4')?.photoPositions[0],
      },
      {
        ...samplePhotos[9],
        position: getTemplateById('grid-4')?.photoPositions[1],
      },
      {
        ...samplePhotos[10],
        position: getTemplateById('grid-4')?.photoPositions[2],
      },
      {
        ...samplePhotos[11],
        position: getTemplateById('grid-4')?.photoPositions[3],
      },
      {
        ...samplePhotos[12],
        position: getTemplateById('horizontal-2')?.photoPositions[0],
      },
      {
        ...samplePhotos[13],
        position: getTemplateById('horizontal-2')?.photoPositions[1],
      },
    ],
  },
  {
    id: 'spread-5',
    fullSpreadTemplate: getTemplateById('spread-main-sides'),
    photos: [
      {
        ...samplePhotos[14],
        position: getTemplateById('spread-main-sides')?.photoPositions[0],
      },
      {
        ...samplePhotos[15],
        position: getTemplateById('spread-main-sides')?.photoPositions[1],
      },
      {
        ...samplePhotos[16],
        position: getTemplateById('spread-main-sides')?.photoPositions[2],
      },
    ],
  },
  {
    id: 'spread-6',
    leftPageTemplate: getTemplateById('main-5sub'),
    rightPageTemplate: getTemplateById('premium-grid-9'),
    photos: [
      {
        ...samplePhotos[17],
        position: getTemplateById('main-5sub')?.photoPositions[0],
      },
      {
        ...samplePhotos[18],
        position: getTemplateById('main-5sub')?.photoPositions[1],
      },
      {
        ...samplePhotos[19],
        position: getTemplateById('main-5sub')?.photoPositions[2],
      },
      {
        ...samplePhotos[20],
        position: getTemplateById('main-5sub')?.photoPositions[3],
      },
      {
        ...samplePhotos[21],
        position: getTemplateById('main-5sub')?.photoPositions[4],
      },
      {
        ...samplePhotos[22],
        position: getTemplateById('main-5sub')?.photoPositions[5],
      },
      {
        ...samplePhotos[23],
        position: getTemplateById('premium-grid-9')?.photoPositions[0],
      },
      {
        ...samplePhotos[24],
        position: getTemplateById('premium-grid-9')?.photoPositions[1],
      },
      {
        ...samplePhotos[25],
        position: getTemplateById('premium-grid-9')?.photoPositions[2],
      },
      {
        ...samplePhotos[26],
        position: getTemplateById('premium-grid-9')?.photoPositions[3],
      },
      {
        ...samplePhotos[27],
        position: getTemplateById('premium-grid-9')?.photoPositions[4],
      },
      {
        ...samplePhotos[28],
        position: getTemplateById('premium-grid-9')?.photoPositions[5],
      },
      {
        ...samplePhotos[29],
        position: getTemplateById('premium-grid-9')?.photoPositions[6],
      },
      {
        ...samplePhotos[0],
        position: getTemplateById('premium-grid-9')?.photoPositions[7],
      },
      {
        ...samplePhotos[1],
        position: getTemplateById('premium-grid-9')?.photoPositions[8],
      },
    ],
  },
];

// サンプルフォトブック
export const samplePhotobook: Photobook = {
  id: 'photobook-1',
  userId: 'user-1',
  title: 'カンナ写真集サンプル',
  description: 'サンプル写真集です',
  coverPhoto: samplePhotos[0],
  spreads: sampleSpreads,
  createdAt: new Date(),
  updatedAt: new Date(),
  isPublished: true,
};
