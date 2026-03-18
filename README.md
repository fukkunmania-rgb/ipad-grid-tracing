# グリッド模写練習アプリ

iPad Safari / Apple Pencil対応のグリッド模写練習用Webアプリケーションです。

## 機能

- **左右2ペイン構成**
  - 左ペイン：参考画像の表示とグリッド重ね表示
  - 右ペイン：HTML Canvas上での描画

- **描画機能**
  - Apple Pencil / Pointer Events対応
  - 低遅延描画
  - ペン、消しゴムツール
  - Undo / Redo / Clear
  - PNG保存

- **比較機能**
  - 参考画像をキャンバス上に半透明オーバーレイ
  - 透明度スライダー調整
  - ON/OFF切り替え

- **グリッド機能**
  - 左右同じ分割数のグリッド表示
  - 分割数変更（2, 4, 6, 8）
  - グリッドON/OFF

## 技術スタック

- React 19
- TypeScript
- Vite
- HTML5 Canvas API
- Pointer Events API

## 開発

```bash
# 依存関係インストール
npm install

# 開発サーバー起動（iPadからアクセス可能）
npm run dev

# ビルド
npm run build
```

## iPadでの使用方法

1. PCで開発サーバーを起動
2. 同じWiFiに接続されたiPadでブラウザを開く
3. PCのIPアドレス:5173 にアクセス
   （例: http://192.168.1.100:5173）

## 横持ち推奨

本アプリはiPad横持ち（ランドスケープ）を前提に設計されています。
縦持ちの場合は画面回転を促すメッセージが表示されます。

## Apple Pencil対応

- Apple Pencilの筆圧感知に対応
- 低遅延描画（desynchronized canvas hint）
- palm rejection対応（touch-action: none）
