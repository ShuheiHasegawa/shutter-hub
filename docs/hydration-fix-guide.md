# Hydrationエラー修正ガイド

## 問題の概要

Next.js SSRでHydrationエラーが発生していました：

```
Hydration failed because the server rendered HTML didn't match the client.
```

## 原因

1. **useGeolocationフック**: `typeof navigator !== 'undefined'`の判定がSSRとクライアントで異なる結果を返す
2. **LocationPermissionCheck**: ブラウザ環境依存の条件分岐がSSR時に不安定
3. **カラーシステム**: 統一されていないカラー指定

## 修正内容

### 1. useGeolocationフックの修正

#### Before（問題のあるコード）
```typescript
// SSRとクライアントで異なる結果を返す
const isSupported = typeof navigator !== 'undefined' && 'geolocation' in navigator;
```

#### After（修正済み）
```typescript
const [isSupported, setIsSupported] = useState(false);

// クライアントサイドでのみ判定
useEffect(() => {
  setIsSupported(
    typeof navigator !== 'undefined' && 'geolocation' in navigator
  );
}, []);

useEffect(() => {
  // isSupported状態を待ってから実行
  if (!isSupported) return;
  // 位置情報取得処理...
}, [isSupported, /* other deps */]);
```

### 2. InstantPhotoLandingの修正

#### Before（問題のあるコード）
```typescript
// SSR時に条件分岐が不安定
{step === 'permission' && (
  <LocationPermissionCheck />
)}
```

#### After（修正済み）
```typescript
const [isMounted, setIsMounted] = useState(false);

useEffect(() => {
  setIsMounted(true);
}, []);

// クライアントマウント完了まで待機
{!isMounted ? (
  <Card>
    <CardContent className="pt-6 text-center">
      <div className="flex items-center justify-center gap-2 py-4">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-shutter-primary border-t-transparent" />
        <span className="text-sm text-muted-foreground">読み込み中...</span>
      </div>
    </CardContent>
  </Card>
) : (
  <>
    {step === 'permission' && <LocationPermissionCheck />}
    {step === 'form' && location && <QuickRequestForm />}
    {step === 'info' && <InfoCard />}
  </>
)}
```

### 3. カラーシステムの統一

#### Before（非推奨）
```typescript
<Navigation className="text-blue-600" />
<p className="text-gray-600 dark:text-gray-300">...</p>
<span className="text-gray-500 dark:text-gray-400">...</span>
```

#### After（推奨）
```typescript
<Navigation className="text-shutter-info" />
<p className="text-muted-foreground">...</p>
<span className="text-muted-foreground">...</span>
```

## 解決パターン

### 1. ブラウザ環境チェック

```typescript
// ❌ 避ける
const isSupported = typeof window !== 'undefined';

// ✅ 推奨
const [isClient, setIsClient] = useState(false);

useEffect(() => {
  setIsClient(true);
}, []);

return isClient ? <ClientComponent /> : <ServerFallback />;
```

### 2. 条件分岐の安定化

```typescript
// ❌ 避ける - SSRで不安定
{Math.random() > 0.5 && <Component />}
{new Date().getHours() > 18 && <NightMode />}

// ✅ 推奨 - 安定した条件
const [isNight, setIsNight] = useState(false);

useEffect(() => {
  setIsNight(new Date().getHours() > 18);
}, []);

{isNight && <NightMode />}
```

### 3. セマンティックカラーの使用

```typescript
// ❌ 避ける - ダークモード指定で複雑化
className="text-gray-600 dark:text-gray-300"

// ✅ 推奨 - セマンティックカラー
className="text-muted-foreground"
```

## 予防策

### 1. SSR対応チェックリスト

- [ ] `typeof window`や`typeof navigator`の直接使用を避ける
- [ ] ブラウザ依存の処理は`useEffect`内で実行
- [ ] 初期状態はSSRとクライアントで同じ値を保つ
- [ ] `Math.random()`や`Date.now()`の直接使用を避ける

### 2. 開発時のテスト

```bash
# ビルド時にHydrationエラーをチェック
npm run build

# 開発サーバーでブラウザのConsoleを確認
npm run dev
# → Console: "Warning: Hydration failed..."が出ないことを確認
```

### 3. デバッグ方法

```typescript
// SSRとクライアントの差分をデバッグ
useEffect(() => {
  console.log('Client mounted:', { isSupported, location });
}, []);

// 条件分岐の状態をログ出力
console.log('Render state:', { step, isMounted, isSupported });
```

## 関連ファイル

- `src/hooks/useGeolocation.ts` - Geolocation API のSSR対応
- `src/components/instant/InstantPhotoLanding.tsx` - クライアントマウント待機
- `src/components/instant/LocationPermissionCheck.tsx` - カラーシステム統一
- `docs/color-system-guide.md` - カラーシステムガイド

## 参考リンク

- [React Hydration Mismatch](https://react.dev/link/hydration-mismatch)
- [Next.js SSR Best Practices](https://nextjs.org/docs/messages/react-hydration-error)
- [ShutterHub カラーシステムガイド](./color-system-guide.md) 