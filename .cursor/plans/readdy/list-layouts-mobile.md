'use client';

import { useState } from 'react';
import Link from 'next/link';

const sessions = [
  {
    id: 1,
    title: '桜の季節 春の撮影会',
    date: '2024年4月15日',
    time: '10:00 - 16:00',
    location: '上野公園',
    price: '¥8,000',
    participants: '12/20',
    category: 'ポートレート',
    status: 'available',
    image: 'https://readdy.ai/api/search-image?query=Beautiful%20Japanese%20woman%20model%20posing%20elegantly%20in%20a%20cherry%20blossom%20park%20during%20spring%20season%20with%20soft%20pink%20petals%20falling%20around%20her%20wearing%20a%20flowing%20pastel%20dress%20natural%20daylight%20photography%20professional%20portrait%20session%20dreamy%20atmosphere%20bokeh%20background%20romantic%20setting&width=400&height=300&seq=mobile1&orientation=landscape',
    photographer: '山田太郎',
    rating: 4.8
  },
  {
    id: 2,
    title: '夜景ポートレート撮影',
    date: '2024年4月20日',
    time: '18:00 - 21:00',
    location: '東京タワー周辺',
    price: '¥12,000',
    participants: '8/15',
    category: 'ポートレート',
    status: 'available',
    image: 'https://readdy.ai/api/search-image?query=Elegant%20Asian%20female%20model%20posing%20confidently%20in%20front%20of%20illuminated%20Tokyo%20Tower%20at%20night%20with%20city%20lights%20bokeh%20background%20wearing%20stylish%20evening%20outfit%20professional%20night%20portrait%20photography%20urban%20glamour%20cinematic%20lighting%20vibrant%20colors&width=400&height=300&seq=mobile2&orientation=landscape',
    photographer: '佐藤花子',
    rating: 4.9
  },
  {
    id: 3,
    title: 'カフェでのライフスタイル撮影',
    date: '2024年4月22日',
    time: '13:00 - 17:00',
    location: '代官山カフェ',
    price: '¥6,500',
    participants: '15/20',
    category: 'ライフスタイル',
    status: 'available',
    image: 'https://readdy.ai/api/search-image?query=Stylish%20young%20Asian%20woman%20enjoying%20coffee%20in%20a%20modern%20minimalist%20cafe%20with%20natural%20window%20light%20cozy%20atmosphere%20lifestyle%20photography%20candid%20moment%20warm%20tones%20professional%20portrait%20session%20trendy%20interior%20design%20aesthetic%20setting&width=400&height=300&seq=mobile3&orientation=landscape',
    photographer: '鈴木一郎',
    rating: 4.7
  },
  {
    id: 4,
    title: 'ビーチサンセット撮影会',
    date: '2024年4月25日',
    time: '16:00 - 19:00',
    location: '湘南海岸',
    price: '¥9,500',
    participants: '10/18',
    category: 'ポートレート',
    status: 'available',
    image: 'https://readdy.ai/api/search-image?query=Beautiful%20Asian%20model%20walking%20gracefully%20on%20sandy%20beach%20during%20golden%20hour%20sunset%20with%20ocean%20waves%20in%20background%20wearing%20flowing%20white%20summer%20dress%20warm%20orange%20and%20pink%20sky%20professional%20beach%20portrait%20photography%20romantic%20dreamy%20atmosphere&width=400&height=300&seq=mobile4&orientation=landscape',
    photographer: '田中美咲',
    rating: 4.8
  },
  {
    id: 5,
    title: '都会のストリートスナップ',
    date: '2024年4月28日',
    time: '14:00 - 18:00',
    location: '渋谷・原宿',
    price: '¥7,000',
    participants: '18/25',
    category: 'ストリート',
    status: 'available',
    image: 'https://readdy.ai/api/search-image?query=Fashionable%20young%20Asian%20woman%20posing%20confidently%20in%20trendy%20Shibuya%20street%20with%20colorful%20urban%20background%20modern%20street%20fashion%20photography%20vibrant%20city%20atmosphere%20natural%20daylight%20professional%20portrait%20session%20dynamic%20composition%20contemporary%20style&width=400&height=300&seq=mobile5&orientation=landscape',
    photographer: '高橋健太',
    rating: 4.6
  },
  {
    id: 6,
    title: '和装スタジオ撮影',
    date: '2024年5月1日',
    time: '10:00 - 15:00',
    location: '京都スタジオ',
    price: '¥15,000',
    participants: '5/10',
    category: 'スタジオ',
    status: 'available',
    image: 'https://readdy.ai/api/search-image?query=Elegant%20Japanese%20woman%20wearing%20traditional%20kimono%20in%20authentic%20Kyoto%20style%20studio%20with%20traditional%20Japanese%20interior%20design%20professional%20portrait%20photography%20cultural%20beauty%20soft%20lighting%20refined%20atmosphere%20classic%20composition%20timeless%20elegance&width=400&height=300&seq=mobile6&orientation=landscape',
    photographer: '伊藤さくら',
    rating: 5.0
  },
  {
    id: 7,
    title: '雨の日アンブレラ撮影',
    date: '2024年5月5日',
    time: '11:00 - 15:00',
    location: '表参道',
    price: '¥8,500',
    participants: '14/20',
    category: 'ポートレート',
    status: 'available',
    image: 'https://readdy.ai/api/search-image?query=Beautiful%20Asian%20model%20holding%20colorful%20umbrella%20in%20rainy%20urban%20street%20with%20reflections%20on%20wet%20pavement%20artistic%20rain%20photography%20moody%20atmosphere%20professional%20portrait%20session%20creative%20composition%20cinematic%20lighting%20romantic%20rainy%20day%20aesthetic&width=400&height=300&seq=mobile7&orientation=landscape',
    photographer: '中村雄介',
    rating: 4.7
  },
  {
    id: 8,
    title: 'フラワーガーデン撮影会',
    date: '2024年5月8日',
    time: '09:00 - 13:00',
    location: '横浜イングリッシュガーデン',
    price: '¥7,500',
    participants: '16/22',
    category: 'ポートレート',
    status: 'available',
    image: 'https://readdy.ai/api/search-image?query=Graceful%20Asian%20woman%20posing%20among%20colorful%20blooming%20flowers%20in%20beautiful%20English%20garden%20with%20vibrant%20roses%20and%20greenery%20natural%20daylight%20photography%20professional%20portrait%20session%20romantic%20floral%20setting%20soft%20pastel%20colors%20dreamy%20atmosphere&width=400&height=300&seq=mobile8&orientation=landscape',
    photographer: '小林愛',
    rating: 4.9
  }
];

type ViewMode = 'compact' | 'list' | 'grid';

export default function MobileUnifiedClient() {
  const [viewMode, setViewMode] = useState<ViewMode>('compact');
  const [selectedCategory, setSelectedCategory] = useState('すべて');
  const [showFavorites, setShowFavorites] = useState(false);
  const [sortBy, setSortBy] = useState('date');

  const categories = ['すべて', 'ポートレート', 'ライフスタイル', 'ストリート', 'スタジオ'];

  const filteredSessions = sessions.filter(session => 
    selectedCategory === 'すべて' || session.category === selectedCategory
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-blue-50">
      <div className="sticky top-0 z-50 bg-white shadow-md">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <Link href="/" className="text-gray-600">
              <i className="ri-arrow-left-line w-6 h-6 flex items-center justify-center text-xl"></i>
            </Link>
            <h1 className="text-lg font-bold text-gray-900">撮影会一覧</h1>
            <button className="text-gray-600">
              <i className="ri-search-line w-6 h-6 flex items-center justify-center text-xl"></i>
            </button>
          </div>

          <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                  selectedCategory === category
                    ? 'bg-teal-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between bg-gray-50 rounded-lg p-2">
            <div className="flex gap-1">
              <button
                onClick={() => setViewMode('compact')}
                className={`p-2 rounded-md transition-all ${
                  viewMode === 'compact'
                    ? 'bg-white text-teal-600 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <i className="ri-layout-row-line w-5 h-5 flex items-center justify-center text-lg"></i>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-md transition-all ${
                  viewMode === 'list'
                    ? 'bg-white text-teal-600 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <i className="ri-list-check w-5 h-5 flex items-center justify-center text-lg"></i>
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-md transition-all ${
                  viewMode === 'grid'
                    ? 'bg-white text-teal-600 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <i className="ri-grid-line w-5 h-5 flex items-center justify-center text-lg"></i>
              </button>
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="text-sm text-gray-700 bg-transparent border-none focus:outline-none pr-8"
            >
              <option value="date">日付順</option>
              <option value="price">料金順</option>
              <option value="popular">人気順</option>
            </select>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 pb-24">
        {viewMode === 'compact' && (
          <div className="space-y-3">
            {filteredSessions.map((session) => (
              <Link
                key={session.id}
                href={`/studio/${session.id}/layout1`}
                className="flex gap-3 bg-white rounded-xl shadow-sm hover:shadow-md transition-all p-3"
              >
                <div className="relative w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden">
                  <img
                    src={session.image}
                    alt={session.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-1 right-1 bg-teal-600 text-white text-xs px-2 py-0.5 rounded-full">
                    {session.category}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 text-sm mb-1 line-clamp-2">
                    {session.title}
                  </h3>
                  <div className="flex items-center gap-1 text-xs text-gray-600 mb-1">
                    <i className="ri-calendar-line w-3 h-3 flex items-center justify-center"></i>
                    <span>{session.date}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-600 mb-2">
                    <i className="ri-map-pin-line w-3 h-3 flex items-center justify-center"></i>
                    <span className="truncate">{session.location}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-teal-600 font-bold text-sm">{session.price}</span>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <i className="ri-user-line w-3 h-3 flex items-center justify-center"></i>
                      <span>{session.participants}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {viewMode === 'list' && (
          <div className="space-y-2">
            {filteredSessions.map((session) => (
              <Link
                key={session.id}
                href={`/studio/${session.id}/layout1`}
                className="block bg-white rounded-lg shadow-sm hover:shadow-md transition-all p-4"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 text-sm mb-1">
                      {session.title}
                    </h3>
                    <span className="inline-block bg-teal-100 text-teal-700 text-xs px-2 py-0.5 rounded-full">
                      {session.category}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-yellow-500 text-xs">
                    <i className="ri-star-fill w-3 h-3 flex items-center justify-center"></i>
                    <span className="text-gray-700 font-medium">{session.rating}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mb-3">
                  <div className="flex items-center gap-1">
                    <i className="ri-calendar-line w-4 h-4 flex items-center justify-center"></i>
                    <span>{session.date}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <i className="ri-time-line w-4 h-4 flex items-center justify-center"></i>
                    <span>{session.time}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <i className="ri-map-pin-line w-4 h-4 flex items-center justify-center"></i>
                    <span>{session.location}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <i className="ri-user-line w-4 h-4 flex items-center justify-center"></i>
                    <span>{session.participants}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <i className="ri-camera-line w-4 h-4 flex items-center justify-center"></i>
                    <span>{session.photographer}</span>
                  </div>
                  <span className="text-teal-600 font-bold text-sm">{session.price}</span>
                </div>
              </Link>
            ))}
          </div>
        )}

        {viewMode === 'grid' && (
          <div className="grid grid-cols-2 gap-3">
            {filteredSessions.map((session) => (
              <Link
                key={session.id}
                href={`/studio/${session.id}/layout1`}
                className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all overflow-hidden"
              >
                <div className="relative h-40">
                  <img
                    src={session.image}
                    alt={session.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm text-teal-600 text-xs px-2 py-1 rounded-full font-medium">
                    {session.category}
                  </div>
                  <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/60 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-full">
                    <i className="ri-star-fill w-3 h-3 flex items-center justify-center text-yellow-400"></i>
                    <span>{session.rating}</span>
                  </div>
                </div>
                <div className="p-3">
                  <h3 className="font-semibold text-gray-900 text-sm mb-2 line-clamp-2 min-h-[2.5rem]">
                    {session.title}
                  </h3>
                  <div className="flex items-center gap-1 text-xs text-gray-600 mb-1">
                    <i className="ri-calendar-line w-3 h-3 flex items-center justify-center"></i>
                    <span className="truncate">{session.date}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-600 mb-3">
                    <i className="ri-map-pin-line w-3 h-3 flex items-center justify-center"></i>
                    <span className="truncate">{session.location}</span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <span className="text-teal-600 font-bold text-sm">{session.price}</span>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <i className="ri-user-line w-3 h-3 flex items-center justify-center"></i>
                      <span>{session.participants}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 flex gap-2">
        <button
          onClick={() => setShowFavorites(!showFavorites)}
          className={`flex-1 py-3 rounded-lg font-medium transition-all whitespace-nowrap ${
            showFavorites
              ? 'bg-teal-600 text-white shadow-md'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <i className="ri-heart-line w-5 h-5 flex items-center justify-center text-lg inline-block mr-1"></i>
          お気に入り
        </button>
        <button className="flex-1 bg-teal-600 text-white py-3 rounded-lg font-medium hover:bg-teal-700 transition-all shadow-md whitespace-nowrap">
          <i className="ri-bookmark-line w-5 h-5 flex items-center justify-center text-lg inline-block mr-1"></i>
          予約済み
        </button>
      </div>
    </div>
  );
}
