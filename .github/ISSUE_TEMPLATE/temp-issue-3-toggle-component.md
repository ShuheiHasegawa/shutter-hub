---
name: Toggleコンポーネントの追加とフィルターUI改善
about: Radix UIベースのToggleコンポーネント追加と撮影会リストフィルターUI改善
title: '[Feature] Toggleコンポーネントの追加とフィルターUI改善'
labels: enhancement, ui-improvement
assignees: ''
---

## 📋 概要
Radix UIベースのToggleコンポーネントを追加し、撮影会リストのフィルターUIをCheckboxからToggleに変更してUXを向上させる。

## 🎯 背景・目的
- **問題点**: Checkbox + Labelの組み合わせでは、有効/無効の視覚的フィードバックが弱い
- **目的**: Toggleボタンにより、フィルターの有効/無効を視覚的に明確に表示

## 🔍 現状の問題点
- Checkbox + Labelの組み合わせでは、有効時の視覚的フィードバックが弱い
- 「適用中:」バッジに表示されるが、フィルター自体の状態が分かりにくい
- モバイルでの操作性がやや劣る

## 💡 改善案
- Radix UIの`@radix-ui/react-toggle`を使用したToggleコンポーネントを追加
- デザインシステムのsuccessカラーを使用して、有効時の視覚的フィードバックを強化
- 「適用中:」バッジから除外し、Toggleボタン自体で状態を表現

## 📝 実装内容
- [x] `Toggle`コンポーネントの新規作成（Radix UIベース）
- [x] デザインシステムのsuccessカラー統合
- [x] 撮影会リストのフィルターUI変更（Checkbox → Toggle）
- [x] 「空きがある撮影会のみ」フィルターのToggle化
- [x] 「活動拠点で絞る」フィルターのToggle化
- [x] 「適用中:」バッジから除外

## 🔧 技術的な考慮事項
- Radix UIの`@radix-ui/react-toggle`を使用
- `cva`を使用したバリアント管理
- デザインシステムの`--success`カラーを使用
- インラインスタイルで確実に色を適用

## 🎨 UI/UX要件
- 有効時はsuccessカラー（緑系）で表示
- 無効時はデフォルトのグレー系で表示
- アイコン（CheckCircle2, MapPin）を追加して視認性を向上

## ⚠️ 破壊的変更
- [x] 破壊的変更なし（既存のフィルター機能は維持）

## ✅ 完了条件
- [x] すべてのタスクが完了
- [ ] CodeRabbitレビュー通過
- [ ] UI動作確認（有効/無効時の色変化確認）

## 📚 参考資料
- Radix UI Toggle: https://www.radix-ui.com/primitives/docs/components/toggle
- デザインシステム: `.cursor/rules/dev-rules/color-system-v2.mdc`
