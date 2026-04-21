import "./globals.css";

// ページ全体のメタデータ設定
export const metadata = {
  title: "LoL カウンターピック | 対策情報アプリ",
  description:
    "League of Legends の相手チャンピオンや構成に対して有利なチャンピオン・アイテムを調べられるツール",
};

/**
 * RootLayout - アプリ全体を囲む最外殻のレイアウト
 * Next.js の app/ ディレクトリでは必須のコンポーネント
 */
export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <body className="font-body text-gold-light antialiased">{children}</body>
    </html>
  );
}
