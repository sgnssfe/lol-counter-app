"use client";

/**
 * CompositionSelector コンポーネント
 * 相手チームの構成タイプを複数選択できるUI
 * Props:
 *   - selected: 現在選択中の構成タイプIDの配列
 *   - onToggle: 構成タイプのオン/オフを切り替える関数 (typeId を引数に取る)
 */

// 選択できる構成タイプの定義
const COMPOSITION_TYPES = [
  {
    id: "ad",
    label: "AD多め",
    description: "物理ダメージが多い構成",
    icon: "⚔",
    color: "amber",
  },
  {
    id: "ap",
    label: "AP多め",
    description: "魔法ダメージが多い構成",
    icon: "✦",
    color: "blue",
  },
  {
    id: "cc",
    label: "CC多め",
    description: "スタン・スロウが多い構成",
    icon: "⛓",
    color: "purple",
  },
  {
    id: "heal",
    label: "回復多め",
    description: "ヒーラーや自己回復が多い構成",
    icon: "♥",
    color: "green",
  },
];

// 色のスタイルマッピング（Tailwindの動的クラスは事前定義が必要）
const COLOR_STYLES = {
  amber: {
    active: "border-yellow-500 bg-yellow-900/30 shadow-yellow-900/30",
    icon: "text-yellow-400",
    badge: "bg-yellow-500/20 text-yellow-300",
  },
  blue: {
    active: "border-blue-lol bg-blue-900/30 shadow-blue-900/30",
    icon: "text-blue-lol",
    badge: "bg-blue-500/20 text-blue-300",
  },
  purple: {
    active: "border-purple-500 bg-purple-900/30 shadow-purple-900/30",
    icon: "text-purple-400",
    badge: "bg-purple-500/20 text-purple-300",
  },
  green: {
    active: "border-green-500 bg-green-900/30 shadow-green-900/30",
    icon: "text-green-400",
    badge: "bg-green-500/20 text-green-300",
  },
};

export default function CompositionSelector({ selected, onToggle }) {
  return (
    <div className="space-y-3">
      {/* セクションラベル */}
      <div className="flex items-center gap-3">
        <div className="w-1 h-5 bg-gold" />
        <h2 className="font-display text-gold text-sm tracking-widest uppercase">
          相手の構成タイプを選択（複数可）
        </h2>
      </div>

      {/* 構成タイプボタングリッド */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {COMPOSITION_TYPES.map((type) => {
          const isSelected = selected.includes(type.id);
          const colorStyle = COLOR_STYLES[type.color];

          return (
            <button
              key={type.id}
              onClick={() => onToggle(type.id)}
              className={`
                relative p-4 rounded border text-left transition-all duration-200
                ${
                  isSelected
                    ? `${colorStyle.active} shadow-lg`
                    : "border-white/10 bg-dark-700 hover:border-white/20 hover:bg-dark-600"
                }
              `}
            >
              {/* アイコンとラベル */}
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`text-lg ${isSelected ? colorStyle.icon : "text-white/30"}`}
                >
                  {type.icon}
                </span>
                <span
                  className={`font-body font-semibold text-sm ${
                    isSelected ? "text-white" : "text-white/50"
                  }`}
                >
                  {type.label}
                </span>
              </div>

              {/* 説明文 */}
              <p className="text-xs text-white/40 font-body leading-tight">
                {type.description}
              </p>

              {/* 選択中のチェックマーク */}
              {isSelected && (
                <div
                  className={`absolute top-2 right-2 text-xs px-1.5 py-0.5 rounded ${colorStyle.badge}`}
                >
                  ✓
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
