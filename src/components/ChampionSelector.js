"use client";

import { useMemo, useState } from "react";

/**
 * ChampionSelector コンポーネント
 * 相手チャンピオンを1体選択するUI
 * ロールごとに絞り込みできる版
 */
export default function ChampionSelector({ champions, selected, onSelect }) {
  const roleOptions = [
    { id: "all", label: "すべて" },
    { id: "top", label: "Top" },
    { id: "jungle", label: "Jungle" },
    { id: "mid", label: "Mid" },
    { id: "adc", label: "ADC" },
    { id: "support", label: "Support" },
  ];

  const [selectedRole, setSelectedRole] = useState("all");

  const filteredChampions = useMemo(() => {
    if (selectedRole === "all") {
      return champions;
    }
    return champions.filter((champ) => champ.role === selectedRole);
  }, [champions, selectedRole]);

  const selectedChampionData = champions.find((c) => c.id === selected);

  return (
    <div className="space-y-4">
      {/* セクションラベル */}
      <div className="flex items-center gap-3">
        <div className="w-1 h-5 bg-gold" />
        <h2 className="font-display text-gold text-sm tracking-widest uppercase">
          相手チャンピオンを選択
        </h2>
      </div>

      {/* ロール選択 */}
      <div className="space-y-2">
        <p className="text-xs text-white/50">ロールで絞り込み</p>
        <div className="flex flex-wrap gap-2">
          {roleOptions.map((role) => {
            const isActive = selectedRole === role.id;

            return (
              <button
                key={role.id}
                onClick={() => setSelectedRole(role.id)}
                className={`
                  px-3 py-1.5 rounded text-xs border transition-all duration-200
                  ${
                    isActive
                      ? "border-gold bg-dark-600 text-gold shadow-gold-sm"
                      : "border-white/10 bg-dark-700 text-white/60 hover:border-gold/40 hover:text-white"
                  }
                `}
              >
                {role.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* チャンピオン一覧グリッド */}
      <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-10 gap-2">
        {filteredChampions.map((champ) => {
          const isSelected = selected === champ.id;

          return (
            <button
              key={champ.id}
              onClick={() => {
                onSelect(isSelected ? null : champ.id);
              }}
              className={`
                relative group flex flex-col items-center p-2 rounded
                border transition-all duration-200 cursor-pointer
                ${
                  isSelected
                    ? "border-gold bg-dark-600 shadow-gold-sm"
                    : "border-white/10 bg-dark-700 hover:border-gold/50 hover:bg-dark-600"
                }
              `}
            >
              <div
                className={`
                  w-10 h-10 rounded flex items-center justify-center
                  text-sm font-display font-semibold mb-1 transition-colors
                  ${
                    isSelected
                      ? "bg-gold text-dark-900"
                      : "bg-dark-800 text-gold/70 group-hover:text-gold"
                  }
                `}
              >
                {champ.name.charAt(0)}
              </div>

              <span
                className={`
                  text-xs text-center leading-tight transition-colors
                  ${isSelected ? "text-gold-light" : "text-white/50 group-hover:text-white/80"}
                `}
              >
                {champ.name}
              </span>

              {isSelected && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-gold rounded-full border border-dark-900" />
              )}
            </button>
          );
        })}
      </div>

      {/* 件数表示 */}
      <p className="text-xs text-white/30">
        表示中: {filteredChampions.length}体
      </p>

      {/* 選択中の表示 */}
      {selectedChampionData && (
        <p className="text-xs text-gold/70 font-body">
          選択中：{" "}
          <span className="text-gold font-semibold">
            {selectedChampionData.name}
          </span>
          {" "}({selectedChampionData.role})
          {"　"}
          <button
            onClick={() => onSelect(null)}
            className="text-white/30 hover:text-white/60 underline"
          >
            解除
          </button>
        </p>
      )}
    </div>
  );
}