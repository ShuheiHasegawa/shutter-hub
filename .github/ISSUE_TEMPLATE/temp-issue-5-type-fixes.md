---
name: 型エラー修正
about: TypeScript型エラーの修正
title: '[Fix] TypeScript型エラーの修正'
labels: bug
assignees: ''
---

## 📋 概要
TypeScript型エラーの修正（null許容型の追加、joinクエリ結果の型処理など）。

## 🎯 背景・目的
- TypeScript型チェックで検出された型エラーを修正
- 型安全性の向上

## 📝 実装内容
- [x] `admin-lottery.ts`: photo_sessionのjoinクエリ結果の型処理を修正
- [x] `AdminLotterySelection.tsx`: cheki_unsigned_count/cheki_signed_countのnull許容型対応
- [x] `PriorityTicketManagement.tsx`: usernameのnull許容型対応
- [x] `JointSessionForm.tsx`: photoSessionIdプロパティの追加

## ✅ 完了条件
- [x] すべてのタスクが完了
- [ ] TypeScript型チェック通過
- [ ] CodeRabbitレビュー通過
