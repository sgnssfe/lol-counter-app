/**
 * Header コンポーネント
 * ページ上部のタイトルエリアを表示する
 * LoL のゲームっぽいデザインで装飾
 */
export default function Header() {
  return (
    <header className="relative text-center py-10 px-4 overflow-hidden">
      {/* 背景の装飾ライン */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-full h-px bg-gradient-to-r from-transparent via-gold/30 to-transparent" />
      </div>

      {/* サブタイトル */}
      <p className="text-blue-lol text-xs tracking-[0.3em] uppercase mb-2 font-body font-semibold">
        League of Legends
      </p>

      {/* メインタイトル */}
      <h1 className="font-display text-3xl md:text-5xl text-gold-light tracking-wider drop-shadow-lg">
        Counter{" "}
        <span className="text-gold">
          Pick
        </span>{" "}
        Guide
      </h1>

      {/* タイトル下の装飾 */}
      <div className="flex items-center justify-center gap-3 mt-3">
        <div className="h-px w-16 bg-gradient-to-r from-transparent to-gold/60" />
        <div className="w-1.5 h-1.5 bg-gold rotate-45" />
        <p className="text-gold-light/50 text-sm font-body tracking-widest">
          相手構成への対策を素早く確認
        </p>
        <div className="w-1.5 h-1.5 bg-gold rotate-45" />
        <div className="h-px w-16 bg-gradient-to-l from-transparent to-gold/60" />
      </div>
    </header>
  );
}
