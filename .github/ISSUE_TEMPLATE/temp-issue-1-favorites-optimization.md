---
name: お気に入り機能の最適化
about: SWRを使用した一括取得によるお気に入り機能のパフォーマンス改善
title: '[Refactor] お気に入り機能の最適化（SWR一括取得）'
labels: refactor, performance
assignees: ''
---

## 📋 概要
お気に入り機能を個別取得から一括取得に変更し、SWRによるキャッシュ管理を実装してパフォーマンスを改善する。

## 🎯 背景・目的
- **問題点**: 各お気に入りボタンが個別にAPIを呼び出し、リスト表示時に大量のリクエストが発生
- **目的**: 一括取得とSWRキャッシュにより、API呼び出し回数を削減し、UXを向上

## 🔍 現状の問題点
- `FavoriteHeartButton`が各コンポーネントで個別に`checkFavoriteStatusAction`を呼び出し
- リスト表示時にN件のアイテムに対してN回のAPI呼び出しが発生
- ページ遷移時に毎回再取得が発生し、無駄なリクエストが発生

## 💡 改善案
- `useFavoriteStates`フックを新規作成し、SWRを使用した一括取得を実装
- `FavoriteHeartButton`をリファクタリングし、`useFavoriteStates`経由で状態を受け取る
- 楽観的更新を実装し、即座にUIを更新

## 📝 実装内容
- [x] `useFavoriteStates`フックの新規作成（SWRを使用）
- [x] `FavoriteHeartButton`のリファクタリング（個別取得から一括取得へ）
- [x] `PhotoSessionList`での`useFavoriteStates`使用
- [x] `favorites.ts`でのrevalidatePath削除（楽観的更新のため）
- [x] スタジオリストでの`useFavoriteStates`統合

## 🔧 技術的な考慮事項
- SWRの`dedupingInterval`を10秒に設定し、重複リクエストを防止
- `keepPreviousData: true`により、ページ遷移時も前のデータを保持
- 楽観的更新により、即座にUIを更新してからサーバーと同期

## ⚠️ 破壊的変更
- [x] 破壊的変更なし（既存のAPIは維持）

## ✅ 完了条件
- [x] すべてのタスクが完了
- [ ] CodeRabbitレビュー通過
- [ ] パフォーマンステスト通過（API呼び出し回数の削減確認）

## 📚 参考資料
- SWR公式ドキュメント: https://swr.vercel.app/
- 楽観的更新パターン: https://swr.vercel.app/docs/mutation#optimistic-updates
