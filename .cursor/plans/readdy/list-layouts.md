### ３列グリッド
'use client';

import Link from 'next/link';
import { useState } from 'react';
import { cn } from '@/lib/utils';

export default function SessionListLayout2Client() {
  const [showFilter, setShowFilter] = useState(false);

  const sessions = [
    {
      id: 1,
      title: '【12/13開催】Malymoonミニ撮影会',
      date: '2025/12/13',
      time: '10:30〜',
      location: 'Malymoon自社スタジオ',
      capacity: '0/200名',
      price: 9000,
      status: '空きあり',
      description: 'Malymoon主催のミニ撮影会です。出演モデル: gyava、らいむ、緑豆、七海うりん',
      organizer: 'ishushushu',
      tags: ['先着順', '初心者歓迎']
    },
    {
      id: 2,
      title: '【12/14開催】プロフェッショナル撮影会',
      date: '2025/12/14',
      time: '14:00〜',
      location: '渋谷スタジオ',
      capacity: '5/150名',
      price: 12000,
      status: '空きあり',
      description: 'プロのフォトグラファーによる本格的な撮影会。ポートレートからファッションまで幅広く対応',
      organizer: 'ishushushu',
      tags: ['抽選', 'プロモデル']
    },
    {
      id: 3,
      title: '【12/15開催】クリエイティブ撮影会',
      date: '2025/12/15',
      time: '13:00〜',
      location: '表参道スタジオ',
      capacity: '8/100名',
      price: 8500,
      status: '空きあり',
      description: 'プロのフォトグラファーと一緒にクリエイティブな作品を作りませんか？',
      organizer: 'Google フォトグラファー',
      tags: ['先着順']
    },
    {
      id: 4,
      title: '【12/16開催】夜景ポートレート撮影会',
      date: '2025/12/16',
      time: '18:00〜',
      location: '六本木ヒルズ周辺',
      capacity: '3/80名',
      price: 15000,
      status: '空きあり',
      description: '東京の美しい夜景をバックにしたポートレート撮影。プロ機材の貸し出しもあります',
      organizer: 'ishushushu',
      tags: ['優先予約', 'プロモデル']
    },
    {
      id: 5,
      title: '【12/17開催】初心者向け撮影会',
      date: '2025/12/17',
      time: '11:00〜',
      location: '新宿御苑',
      capacity: '12/120名',
      price: 6000,
      status: '空きあり',
      description: 'カメラ初心者大歓迎！基本から丁寧に指導します',
      organizer: 'Photo Academy',
      tags: ['先着順', '初心者歓迎']
    },
    {
      id: 6,
      title: '【12/18開催】コスプレ撮影会',
      date: '2025/12/18',
      time: '10:00〜',
      location: '池袋スタジオ',
      capacity: '20/180名',
      price: 7500,
      status: '空きあり',
      description: 'アニメ・ゲームキャラクターのコスプレ撮影会。更衣室完備',
      organizer: 'Cosplay Studio',
      tags: ['抽選']
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-4 md:px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <i className="ri-camera-line text-white"></i>
            </div>
            <span className="font-['Pacifico'] text-xl text-gray-900">ShutterHub</span>
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">撮影会一覧 - 3列グリッド</h1>
          <button
            onClick={() => setShowFilter(!showFilter)}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg border bg-white text-gray-700 border-gray-300 hover:bg-gray-50 cursor-pointer whitespace-nowrap"
          >
            <i className="ri-filter-line w-5 h-5 flex items-center justify-center"></i>
            <span>フィルター</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {sessions.map((session) => (
            <div key={session.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
              <img
                src={`https://readdy.ai/api/search-image?query=Professional%20photography%20session%20with%20model%20and%20photographer%20in%20creative%20studio%20setting%20artistic%20lighting%20setup%20and%20modern%20equipment%20engaging%20photoshoot%20atmosphere&width=400&height=250&seq=sessionlist2${session.id}&orientation=landscape`}
                alt={session.title}
                className="w-full h-48 object-cover object-top"
              />
              <div className="p-4 md:p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="inline-block px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">
                    {session.status}
                  </span>
                  {session.tags.slice(0, 1).map(tag => (
                    <span key={tag} className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>
                <h3 className="text-base md:text-lg font-bold text-gray-900 mb-2 line-clamp-2">
                  {session.title}
                </h3>
                <div className="space-y-2 text-sm text-gray-600 mb-3">
                  <div className="flex items-center gap-2">
                    <i className="ri-calendar-line w-4 h-4 flex items-center justify-center"></i>
                    <span>{session.date}</span>
                    <i className="ri-time-line w-4 h-4 flex items-center justify-center ml-1"></i>
                    <span>{session.time}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <i className="ri-map-pin-line w-4 h-4 flex items-center justify-center"></i>
                    <span className="truncate">{session.location}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <i className="ri-group-line w-4 h-4 flex items-center justify-center"></i>
                    <span>{session.capacity}</span>
                  </div>
                </div>
                <p className="text-gray-700 text-sm mb-4 line-clamp-2">
                  {session.description}
                </p>
                <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                  <div className="text-xl font-bold text-gray-900">¥{session.price.toLocaleString()}</div>
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer text-sm whitespace-nowrap">
                    詳細を見る
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}




### テーブル
'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function SessionListLayout4Client() {
  const [sortBy, setSortBy] = useState('date');

  const sessions = [
    {
      id: 1,
      title: '【12/13開催】Malymoonミニ撮影会',
      date: '2025/12/13',
      time: '10:30〜',
      location: 'Malymoon自社スタジオ',
      capacity: 0,
      maxCapacity: 200,
      price: 9000,
      status: '空きあり',
      organizer: 'ishushushu',
      bookingType: '先着順'
    },
    {
      id: 2,
      title: '【12/14開催】プロフェッショナル撮影会',
      date: '2025/12/14',
      time: '14:00〜',
      location: '渋谷スタジオ',
      capacity: 5,
      maxCapacity: 150,
      price: 12000,
      status: '空きあり',
      organizer: 'ishushushu',
      bookingType: '抽選'
    },
    {
      id: 3,
      title: '【12/15開催】クリエイティブ撮影会',
      date: '2025/12/15',
      time: '13:00〜',
      location: '表参道スタジオ',
      capacity: 8,
      maxCapacity: 100,
      price: 8500,
      status: '空きあり',
      organizer: 'Google フォトグラファー',
      bookingType: '先着順'
    },
    {
      id: 4,
      title: '【12/16開催】夜景ポートレート撮影会',
      date: '2025/12/16',
      time: '18:00〜',
      location: '六本木ヒルズ周辺',
      capacity: 3,
      maxCapacity: 80,
      price: 15000,
      status: '空きあり',
      organizer: 'ishushushu',
      bookingType: '優先予約'
    },
    {
      id: 5,
      title: '【12/17開催】初心者向け撮影会',
      date: '2025/12/17',
      time: '11:00〜',
      location: '新宿御苑',
      capacity: 12,
      maxCapacity: 120,
      price: 6000,
      status: '空きあり',
      organizer: 'Photo Academy',
      bookingType: '先着順'
    },
    {
      id: 6,
      title: '【12/18開催】コスプレ撮影会',
      date: '2025/12/18',
      time: '10:00〜',
      location: '池袋スタジオ',
      capacity: 20,
      maxCapacity: 180,
      price: 7500,
      status: '空きあり',
      organizer: 'Cosplay Studio',
      bookingType: '抽選'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-4 md:px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <i className="ri-camera-line text-white"></i>
            </div>
            <span className="font-['Pacifico'] text-xl text-gray-900">ShutterHub</span>
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">撮影会一覧 - テーブル</h1>
          <div className="flex items-center gap-3">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 pr-8 border border-gray-300 rounded-lg text-sm cursor-pointer"
            >
              <option value="date">開催日順</option>
              <option value="price-low">料金が安い順</option>
              <option value="price-high">料金が高い順</option>
            </select>
            <button className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg border bg-white text-gray-700 border-gray-300 hover:bg-gray-50 cursor-pointer whitespace-nowrap">
              <i className="ri-filter-line w-5 h-5 flex items-center justify-center"></i>
              <span>フィルター</span>
            </button>
          </div>
        </div>

        <div className="hidden md:block bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">撮影会名</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">開催日時</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">場所</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">予約状況</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">予約方式</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">料金</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sessions.map((session) => (
                  <tr key={session.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={`https://readdy.ai/api/search-image?query=Photography%20session%20creative%20studio%20setup%20with%20professional%20lighting%20and%20equipment%20modern%20photoshoot%20environment&width=80&height=60&seq=sessionlist4${session.id}&orientation=landscape`}
                          alt={session.title}
                          className="w-16 h-12 rounded object-cover object-top"
                        />
                        <div>
                          <div className="text-sm font-medium text-gray-900 line-clamp-1">{session.title}</div>
                          <div className="text-xs text-gray-500">{session.organizer}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{session.date}</div>
                      <div className="text-xs text-gray-500">{session.time}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-[150px] truncate">{session.location}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{session.capacity}/{session.maxCapacity}名</div>
                      <span className="inline-block px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full mt-1">
                        {session.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full">
                        {session.bookingType}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-lg font-bold text-gray-900">¥{session.price.toLocaleString()}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer text-sm whitespace-nowrap">
                        詳細を見る
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="md:hidden space-y-4">
          {sessions.map((session) => (
            <div key={session.id} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex gap-3 mb-3">
                <img
                  src={`https://readdy.ai/api/search-image?query=Photography%20session%20creative%20studio%20setup%20with%20professional%20lighting%20and%20equipment%20modern%20photoshoot%20environment&width=100&height=80&seq=sessionlist4m${session.id}&orientation=landscape`}
                  alt={session.title}
                  className="w-20 h-16 rounded object-cover object-top"
                />
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-gray-900 mb-1 line-clamp-2">{session.title}</h3>
                  <div className="flex items-center gap-2">
                    <span className="inline-block px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">
                      {session.status}
                    </span>
                    <span className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full">
                      {session.bookingType}
                    </span>
                  </div>
                </div>
              </div>
              <div className="space-y-2 text-sm text-gray-600 mb-3">
                <div className="flex items-center gap-2">
                  <i className="ri-calendar-line w-4 h-4 flex items-center justify-center"></i>
                  <span>{session.date} {session.time}</span>
                </div>
                <div className="flex items-center gap-2">
                  <i className="ri-map-pin-line w-4 h-4 flex items-center justify-center"></i>
                  <span className="truncate">{session.location}</span>
                </div>
                <div className="flex items-center gap-2">
                  <i className="ri-group-line w-4 h-4 flex items-center justify-center"></i>
                  <span>{session.capacity}/{session.maxCapacity}名</span>
                </div>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                <div className="text-xl font-bold text-gray-900">¥{session.price.toLocaleString()}</div>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer text-sm whitespace-nowrap">
                  詳細を見る
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
