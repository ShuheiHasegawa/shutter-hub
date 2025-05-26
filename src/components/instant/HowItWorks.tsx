export function HowItWorks() {
  return (
    <div className="container mx-auto px-4">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          使い方はとても簡単
        </h2>
        <p className="text-gray-600">3ステップで素敵な写真を撮影できます</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl font-bold text-blue-600">1</span>
          </div>
          <h3 className="text-xl font-semibold mb-2">位置情報を許可</h3>
          <p className="text-gray-600">
            現在地から近くのカメラマンを検索します
          </p>
        </div>

        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl font-bold text-green-600">2</span>
          </div>
          <h3 className="text-xl font-semibold mb-2">撮影を依頼</h3>
          <p className="text-gray-600">
            撮影タイプと予算を選んでリクエスト送信
          </p>
        </div>

        <div className="text-center">
          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl font-bold text-purple-600">3</span>
          </div>
          <h3 className="text-xl font-semibold mb-2">撮影完了</h3>
          <p className="text-gray-600">プロの撮影で素敵な思い出を残します</p>
        </div>
      </div>
    </div>
  );
}
