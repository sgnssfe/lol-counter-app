"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Header from "@/components/Header";
import ResultSection from "@/components/ResultSection";
import countersData from "@/data/counters.json";
import itemsData from "@/data/items.json";

function normalizeChampionKey(value = "") {
  return String(value).toLowerCase().replace(/[^a-z0-9]/g, "");
}

function getChampionByNormalizedKey(champions, key) {
  return champions.find((champion) => champion.keyNormalized === key) || null;
}

function buildEnemyCompKey(enemyTop, enemyJungle, enemyMid, enemyAdc, enemySupport) {
  const keys = [enemyTop, enemyJungle, enemyMid, enemyAdc, enemySupport].map(
    (champion) => champion?.keyNormalized || ""
  );

  if (keys.some((key) => !key)) return "";
  return keys.join("_");
}

function buildFallbackItemRecommendations({
  selfChampion,
  selfRole,
  enemyTop,
  enemyJungle,
  enemyMid,
  enemyAdc,
  enemySupport,
}) {
  const enemyTeam = [enemyTop, enemyJungle, enemyMid, enemyAdc, enemySupport].filter(Boolean);

  if (!selfChampion || !selfRole || enemyTeam.length === 0) {
    return {
      summary: [],
      recommendedItems: [],
      buildOrder: [],
      source: "fallback",
    };
  }

  const tags = {
    magic: 0,
    physical: 0,
    tank: 0,
    fighter: 0,
    assassin: 0,
    marksman: 0,
    support: 0,
    mage: 0,
    cc: 0,
    heal: 0,
  };

  const hasChampionName = (names = []) =>
    enemyTeam.some((champ) => names.includes(champ.id.toLowerCase()));

  for (const champ of enemyTeam) {
    const champTags = champ.tags || [];
    const key = champ.id.toLowerCase();

    if (champTags.includes("Mage")) tags.magic += 1;
    if (champTags.includes("Assassin")) tags.assassin += 1;
    if (champTags.includes("Marksman")) tags.marksman += 1;
    if (champTags.includes("Tank")) tags.tank += 1;
    if (champTags.includes("Fighter")) tags.fighter += 1;
    if (champTags.includes("Support")) tags.support += 1;
    if (champTags.includes("Mage")) tags.mage += 1;

    if (
      champTags.includes("Marksman") ||
      champTags.includes("Fighter") ||
      champTags.includes("Assassin")
    ) {
      tags.physical += 1;
    }

    if (
      [
        "leona",
        "nautilus",
        "thresh",
        "amumu",
        "lissandra",
        "vex",
        "annie",
        "morgana",
        "rakan",
        "rell",
        "sejuani",
        "malphite",
        "ornn",
        "maokai",
        "skarner",
        "vi",
      ].includes(key)
    ) {
      tags.cc += 1;
    }

    if (
      [
        "soraka",
        "yuumi",
        "sona",
        "nami",
        "seraphine",
        "aatrox",
        "vladimir",
        "swain",
        "warwick",
        "drmundo",
        "briar",
        "samira",
      ].includes(key)
    ) {
      tags.heal += 1;
    }
  }

  const summary = [];

  if (tags.magic >= 2) summary.push("APダメージ多め");
  if (tags.physical >= 3) summary.push("ADダメージ多め");
  if (tags.tank >= 2) summary.push("前衛多め");
  if (tags.cc >= 2) summary.push("CC多め");
  if (tags.assassin >= 2) summary.push("アサシン多め");
  if (tags.heal >= 1) summary.push("回復持ちあり");
  if (tags.marksman >= 2) summary.push("継続火力高め");

  const recommendedItems = [];

  const pushItem = (name, reason, priority) => {
    recommendedItems.push({ name, reason, priority });
  };

  if (tags.cc >= 2 || tags.magic >= 2) {
    pushItem(
      "マーキュリーブーツ",
      "CCやAPダメージが多い構成に対して安定しやすい",
      100
    );
  }

  if (tags.heal >= 1) {
    pushItem(
      "重傷アイテム",
      "回復持ちがいるため、早めに回復阻害を用意したい",
      95
    );
  }

  if (tags.tank >= 2) {
    pushItem(
      "対タンク火力アイテム",
      "前衛が多く、耐久を抜くための装備優先度が高い",
      90
    );
  }

  if (tags.assassin >= 2) {
    pushItem(
      "防御系アイテム",
      "バーストを受けやすい構成なので生存重視が有効",
      88
    );
  }

  if (tags.physical >= 3) {
    pushItem(
      "AR系防御アイテム",
      "物理ダメージが多いのでアーマーの価値が高い",
      85
    );
  }

  if (
    tags.magic >= 2 &&
    !recommendedItems.some((item) => item.name === "マーキュリーブーツ")
  ) {
    pushItem(
      "MR系防御アイテム",
      "魔法ダメージが多く、魔法耐性を持つと安定しやすい",
      84
    );
  }

  if (
    tags.marksman >= 2 ||
    hasChampionName(["jinx", "kogmaw", "vayne", "zeri"])
  ) {
    pushItem(
      "接近・継続戦対策アイテム",
      "継続火力が高い相手が多く、長く戦える装備が欲しい",
      82
    );
  }

  if (selfRole === "adc" || selfRole === "mid") {
    pushItem(
      "汎用火力アイテム",
      "自分の主力火力を落としすぎない範囲でバランスよく組みたい",
      70
    );
  } else {
    pushItem(
      "耐久寄り汎用アイテム",
      "役割遂行のために前に出やすいビルドが安定しやすい",
      70
    );
  }

  recommendedItems.sort((a, b) => b.priority - a.priority);

  const buildOrder = recommendedItems.slice(0, 3).map((item, index) => ({
    name: `${index + 1}. ${item.name}`,
    reason: item.reason,
  }));

  return {
    summary,
    recommendedItems: recommendedItems.map((item) => ({
      name: item.name,
      reason: item.reason,
    })),
    buildOrder,
    source: "fallback",
  };
}

export default function HomePage() {
  const MIN_GAMES_FOR_RECOMMENDED = 1000;

  const rankOptions = [
    { id: "iron", label: "Iron" },
    { id: "bronze", label: "Bronze" },
    { id: "silver", label: "Silver" },
    { id: "gold", label: "Gold" },
    { id: "platinum", label: "Platinum" },
    { id: "emerald", label: "Emerald" },
    { id: "diamond", label: "Diamond" },
    { id: "master", label: "Master" },
    { id: "grandmaster", label: "Grandmaster" },
    { id: "challenger", label: "Challenger" },
  ];

  const roleOptions = [
    { id: "top", label: "Top" },
    { id: "jungle", label: "Jungle" },
    { id: "mid", label: "Mid" },
    { id: "adc", label: "ADC" },
    { id: "support", label: "Support" },
  ];

  const sortOptions = [
    { id: "recommended", label: "おすすめ順" },
    { id: "winrate", label: "勝率順" },
  ];

  const [activeTab, setActiveTab] = useState("counter");

  const [selectedRank, setSelectedRank] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [selectedChampion, setSelectedChampion] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showAllCounters, setShowAllCounters] = useState(false);
  const [sortMode, setSortMode] = useState("recommended");

  const [itemRank, setItemRank] = useState("");
  const [itemSelfRole, setItemSelfRole] = useState("");
  const [selfChampionKey, setSelfChampionKey] = useState("");
  const [enemyTopKey, setEnemyTopKey] = useState("");
  const [enemyJungleKey, setEnemyJungleKey] = useState("");
  const [enemyMidKey, setEnemyMidKey] = useState("");
  const [enemyAdcKey, setEnemyAdcKey] = useState("");
  const [enemySupportKey, setEnemySupportKey] = useState("");

  const [selfSearchTerm, setSelfSearchTerm] = useState("");
  const [enemyTopSearchTerm, setEnemyTopSearchTerm] = useState("");
  const [enemyJungleSearchTerm, setEnemyJungleSearchTerm] = useState("");
  const [enemyMidSearchTerm, setEnemyMidSearchTerm] = useState("");
  const [enemyAdcSearchTerm, setEnemyAdcSearchTerm] = useState("");
  const [enemySupportSearchTerm, setEnemySupportSearchTerm] = useState("");

  const [champions, setChampions] = useState([]);
  const [itemMap, setItemMap] = useState({});
  const [championVersion, setChampionVersion] = useState("");
  const [loadingChampions, setLoadingChampions] = useState(true);
  const [championLoadError, setChampionLoadError] = useState("");

  const resultSectionRef = useRef(null);

  useEffect(() => {
    let isMounted = true;

    async function loadGameData() {
      setLoadingChampions(true);
      setChampionLoadError("");

      try {
        const versionsResponse = await fetch(
          "https://ddragon.leagueoflegends.com/api/versions.json"
        );
        if (!versionsResponse.ok) {
          throw new Error("バージョン情報の取得に失敗しました。");
        }

        const versions = await versionsResponse.json();
        const latestVersion = versions?.[0];
        if (!latestVersion) {
          throw new Error("最新バージョンが見つかりませんでした。");
        }

        setChampionVersion(latestVersion);

        let championDataResponse = await fetch(
          `https://ddragon.leagueoflegends.com/cdn/${latestVersion}/data/ja_JP/champion.json`
        );
        if (!championDataResponse.ok) {
          championDataResponse = await fetch(
            `https://ddragon.leagueoflegends.com/cdn/${latestVersion}/data/en_US/champion.json`
          );
        }
        if (!championDataResponse.ok) {
          throw new Error("チャンピオン一覧の取得に失敗しました。");
        }

        let itemDataResponse = await fetch(
          `https://ddragon.leagueoflegends.com/cdn/${latestVersion}/data/ja_JP/item.json`
        );
        if (!itemDataResponse.ok) {
          itemDataResponse = await fetch(
            `https://ddragon.leagueoflegends.com/cdn/${latestVersion}/data/en_US/item.json`
          );
        }
        if (!itemDataResponse.ok) {
          throw new Error("アイテム一覧の取得に失敗しました。");
        }

        const championPayload = await championDataResponse.json();
        const itemPayload = await itemDataResponse.json();

        const championList = Object.values(championPayload.data || {})
          .map((champion) => ({
            id: champion.id,
            keyNormalized: normalizeChampionKey(champion.id),
            name: champion.name,
            tags: champion.tags || [],
            imageUrl: `https://ddragon.leagueoflegends.com/cdn/${latestVersion}/img/champion/${champion.image.full}`,
          }))
          .sort((a, b) => a.name.localeCompare(b.name, "ja"));

        const nextItemMap = {};
        Object.entries(itemPayload.data || {}).forEach(([itemId, item]) => {
          nextItemMap[String(itemId)] = {
            id: String(itemId),
            name: item.name,
            imageUrl: `https://ddragon.leagueoflegends.com/cdn/${latestVersion}/img/item/${itemId}.png`,
          };
        });

        if (isMounted) {
          setChampions(championList);
          setItemMap(nextItemMap);
        }
      } catch (error) {
        if (isMounted) {
          setChampionLoadError(error.message || "読み込みに失敗しました。");
        }
      } finally {
        if (isMounted) {
          setLoadingChampions(false);
        }
      }
    }

    loadGameData();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (activeTab !== "counter") return;
    if (!selectedChampion) return;

    const timer = setTimeout(() => {
      resultSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 150);

    return () => clearTimeout(timer);
  }, [selectedChampion, activeTab]);

  const counterFilteredChampions = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    if (!keyword) return champions;

    return champions.filter((champion) => {
      return (
        champion.name.toLowerCase().includes(keyword) ||
        champion.id.toLowerCase().includes(keyword)
      );
    });
  }, [champions, searchTerm]);

  const selectedChampionData = useMemo(() => {
    return getChampionByNormalizedKey(champions, selectedChampion);
  }, [champions, selectedChampion]);

  const selectedChampionName = selectedChampionData?.name || "";

  const selectedMatchup = useMemo(() => {
    if (!selectedRank || !selectedRole || !selectedChampion) return null;

    const rankMatchups = countersData.matchups?.[selectedRank];
    if (!rankMatchups) return null;

    const roleMatchups = rankMatchups?.[selectedRole];
    if (!roleMatchups) return null;

    const matchedEntry = Object.entries(roleMatchups).find(([enemyKey]) => {
      return normalizeChampionKey(enemyKey) === selectedChampion;
    });

    return matchedEntry ? matchedEntry[1] : null;
  }, [selectedRank, selectedRole, selectedChampion]);

  const allRecommendedChampionItems = useMemo(() => {
    if (!selectedMatchup?.recommendedChampions) return [];

    return selectedMatchup.recommendedChampions.map((recommended) => {
      const found = champions.find(
        (champion) =>
          champion.keyNormalized === normalizeChampionKey(recommended.id)
      );

      const games =
        typeof recommended.games === "number" ? recommended.games : 0;

      return {
        id: recommended.id,
        name: found ? found.name : recommended.id,
        imageUrl: found ? found.imageUrl : "",
        winRate: recommended.winRate,
        games,
        lowSample: games > 0 && games < MIN_GAMES_FOR_RECOMMENDED,
        reason: `対${selectedChampionName}勝率 ${recommended.winRate.toFixed(1)}%`,
      };
    });
  }, [selectedMatchup, champions, selectedChampionName]);

  const sortedRecommendedChampionItems = useMemo(() => {
    if (!allRecommendedChampionItems.length) return [];

    if (sortMode === "recommended") {
      const aboveThreshold = allRecommendedChampionItems
        .filter((item) => item.games >= MIN_GAMES_FOR_RECOMMENDED)
        .sort((a, b) => {
          if (b.winRate !== a.winRate) return b.winRate - a.winRate;
          return b.games - a.games;
        });

      const belowThreshold = allRecommendedChampionItems
        .filter((item) => item.games < MIN_GAMES_FOR_RECOMMENDED)
        .sort((a, b) => {
          if (b.winRate !== a.winRate) return b.winRate - a.winRate;
          return b.games - a.games;
        });

      return [...aboveThreshold, ...belowThreshold];
    }

    return [...allRecommendedChampionItems].sort((a, b) => {
      if (b.winRate !== a.winRate) return b.winRate - a.winRate;
      return b.games - a.games;
    });
  }, [allRecommendedChampionItems, sortMode]);

  const visibleRecommendedChampionItems = useMemo(() => {
    if (showAllCounters) return sortedRecommendedChampionItems;
    return sortedRecommendedChampionItems.slice(0, 20);
  }, [sortedRecommendedChampionItems, showAllCounters]);

  const selfChampion = useMemo(
    () => getChampionByNormalizedKey(champions, selfChampionKey),
    [champions, selfChampionKey]
  );
  const enemyTop = useMemo(
    () => getChampionByNormalizedKey(champions, enemyTopKey),
    [champions, enemyTopKey]
  );
  const enemyJungle = useMemo(
    () => getChampionByNormalizedKey(champions, enemyJungleKey),
    [champions, enemyJungleKey]
  );
  const enemyMid = useMemo(
    () => getChampionByNormalizedKey(champions, enemyMidKey),
    [champions, enemyMidKey]
  );
  const enemyAdc = useMemo(
    () => getChampionByNormalizedKey(champions, enemyAdcKey),
    [champions, enemyAdcKey]
  );
  const enemySupport = useMemo(
    () => getChampionByNormalizedKey(champions, enemySupportKey),
    [champions, enemySupportKey]
  );

  const itemDataResult = useMemo(() => {
    if (
      !itemRank ||
      !itemSelfRole ||
      !selfChampion ||
      !enemyTop ||
      !enemyJungle ||
      !enemyMid ||
      !enemyAdc ||
      !enemySupport
    ) {
      return null;
    }

    const compKey = buildEnemyCompKey(
      enemyTop,
      enemyJungle,
      enemyMid,
      enemyAdc,
      enemySupport
    );

    if (!compKey) return null;

    return (
      itemsData.items?.[itemRank]?.[itemSelfRole]?.[selfChampion.keyNormalized]?.[compKey] ||
      null
    );
  }, [
    itemRank,
    itemSelfRole,
    selfChampion,
    enemyTop,
    enemyJungle,
    enemyMid,
    enemyAdc,
    enemySupport,
  ]);

  const fallbackItemResult = useMemo(() => {
    return buildFallbackItemRecommendations({
      selfChampion,
      selfRole: itemSelfRole,
      enemyTop,
      enemyJungle,
      enemyMid,
      enemyAdc,
      enemySupport,
    });
  }, [
    selfChampion,
    itemSelfRole,
    enemyTop,
    enemyJungle,
    enemyMid,
    enemyAdc,
    enemySupport,
  ]);

  const itemTabResult = useMemo(() => {
    if (itemDataResult) {
      return {
        summary: [],
        recommendedItems: (itemDataResult.recommendedItems || []).map((item) => {
          const lookup = item.itemId ? itemMap[String(item.itemId)] : null;
          return {
            itemId: item.itemId,
            name: lookup?.name || item.name || `item ${item.itemId}`,
            imageUrl: lookup?.imageUrl || "",
            winRate: item.winRate,
            games: item.games,
            reason: item.reason,
          };
        }),
        buildOrder: (itemDataResult.buildOrder || []).map((item) => {
          const lookup = item.itemId ? itemMap[String(item.itemId)] : null;
          return {
            itemId: item.itemId,
            name: lookup?.name || item.name || `item ${item.itemId}`,
            imageUrl: lookup?.imageUrl || "",
            reason: item.reason,
          };
        }),
        source: "data",
      };
    }

    return fallbackItemResult;
  }, [itemDataResult, fallbackItemResult, itemMap]);

  const canShowItemResult =
    itemRank &&
    itemSelfRole &&
    selfChampion &&
    enemyTop &&
    enemyJungle &&
    enemyMid &&
    enemyAdc &&
    enemySupport;

  function renderCounterChampionPicker() {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {counterFilteredChampions.map((champion) => {
          const isSelected = selectedChampion === champion.keyNormalized;

          return (
            <button
              key={champion.id}
              onClick={() => {
                setSelectedChampion(isSelected ? "" : champion.keyNormalized);
                setShowAllCounters(false);
              }}
              className={`p-3 rounded-lg border text-sm transition-all duration-200 ${
                isSelected
                  ? "border-gold bg-dark-700 text-gold"
                  : "border-white/10 bg-dark-700 text-white/70 hover:border-gold/40 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-3 text-left">
                <img
                  src={champion.imageUrl}
                  alt={champion.name}
                  className="w-12 h-12 rounded object-cover border border-white/10 shrink-0"
                />
                <div className="min-w-0">
                  <div className="font-medium break-words">{champion.name}</div>
                  <div className="text-xs text-white/35 mt-1 break-all">
                    {champion.id}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    );
  }

  function renderItemChampionPicker({
    title,
    selectedKey,
    onSelect,
    helperText,
    searchTerm,
    onSearchChange,
  }) {
    const keyword = (searchTerm || "").trim().toLowerCase();

    const localFilteredChampions = !keyword
      ? champions
      : champions.filter((champion) => {
          return (
            champion.name.toLowerCase().includes(keyword) ||
            champion.id.toLowerCase().includes(keyword)
          );
        });

    const selectedChampionOnly = champions.filter(
      (champion) => champion.keyNormalized === selectedKey
    );

    const displayChampions = selectedKey
      ? selectedChampionOnly
      : localFilteredChampions;

    return (
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-1 h-5 bg-gold" />
          <h3 className="font-display text-gold text-sm tracking-widest uppercase">
            {title}
          </h3>
        </div>

        {helperText ? (
          <p className="text-xs text-white/40">{helperText}</p>
        ) : null}

        <div className="flex gap-2">
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={`${title}を検索`}
            disabled={!!selectedKey}
            className="w-full rounded-lg border border-white/10 bg-dark-700 px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-gold/60 disabled:opacity-50"
          />

          {selectedKey ? (
            <button
              onClick={() => {
                onSelect("");
                onSearchChange("");
              }}
              className="px-4 py-3 rounded-lg border border-white/10 bg-dark-700 text-sm text-white/70 hover:border-gold/40 hover:text-white whitespace-nowrap"
            >
              解除
            </button>
          ) : null}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {displayChampions.map((champion) => {
            const isSelected = selectedKey === champion.keyNormalized;

            return (
              <button
                key={`${title}-${champion.id}`}
                onClick={() => {
                  if (isSelected) {
                    onSelect("");
                    onSearchChange("");
                  } else {
                    onSelect(champion.keyNormalized);
                    onSearchChange(champion.name);
                  }
                }}
                className={`p-3 rounded-lg border text-sm transition-all duration-200 ${
                  isSelected
                    ? "border-gold bg-dark-700 text-gold"
                    : "border-white/10 bg-dark-700 text-white/70 hover:border-gold/40 hover:text-white"
                }`}
              >
                <div className="flex items-center gap-3 text-left">
                  <img
                    src={champion.imageUrl}
                    alt={champion.name}
                    className="w-12 h-12 rounded object-cover border border-white/10 shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="font-medium break-words">{champion.name}</div>
                    <div className="text-xs text-white/35 mt-1 break-all">
                      {champion.id}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-dark-900 text-white">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        <Header />

        <section className="bg-dark-800 border border-white/10 rounded-xl p-6 space-y-6">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveTab("counter")}
              className={`px-4 py-2 rounded border text-sm transition-all duration-200 ${
                activeTab === "counter"
                  ? "border-gold bg-dark-700 text-gold"
                  : "border-white/10 bg-dark-700 text-white/70 hover:border-gold/40 hover:text-white"
              }`}
            >
              対面カウンター
            </button>
            <button
              onClick={() => setActiveTab("items")}
              className={`px-4 py-2 rounded border text-sm transition-all duration-200 ${
                activeTab === "items"
                  ? "border-gold bg-dark-700 text-gold"
                  : "border-white/10 bg-dark-700 text-white/70 hover:border-gold/40 hover:text-white"
              }`}
            >
              アイテム提案
            </button>
          </div>

          {activeTab === "counter" ? (
            <div className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-1 h-5 bg-gold" />
                  <h2 className="font-display text-gold text-sm tracking-widest uppercase">
                    ランク帯を選択
                  </h2>
                </div>

                <div className="flex flex-wrap gap-2">
                  {rankOptions.map((rank) => {
                    const isActive = selectedRank === rank.id;

                    return (
                      <button
                        key={rank.id}
                        onClick={() => {
                          setSelectedRank(rank.id);
                          setSelectedRole("");
                          setSelectedChampion("");
                          setShowAllCounters(false);
                        }}
                        className={`px-4 py-2 rounded border text-sm transition-all duration-200 ${
                          isActive
                            ? "border-gold bg-dark-700 text-gold"
                            : "border-white/10 bg-dark-700 text-white/70 hover:border-gold/40 hover:text-white"
                        }`}
                      >
                        {rank.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-1 h-5 bg-gold" />
                  <h2 className="font-display text-gold text-sm tracking-widest uppercase">
                    相手ロールを選択
                  </h2>
                </div>

                {!selectedRank ? (
                  <p className="text-sm text-white/50">
                    先にランク帯を選んでください。
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {roleOptions.map((role) => {
                      const isActive = selectedRole === role.id;

                      return (
                        <button
                          key={role.id}
                          onClick={() => {
                            setSelectedRole(role.id);
                            setSelectedChampion("");
                            setShowAllCounters(false);
                          }}
                          className={`px-4 py-2 rounded border text-sm transition-all duration-200 ${
                            isActive
                              ? "border-gold bg-dark-700 text-gold"
                              : "border-white/10 bg-dark-700 text-white/70 hover:border-gold/40 hover:text-white"
                          }`}
                        >
                          {role.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-1 h-5 bg-gold" />
                  <h2 className="font-display text-gold text-sm tracking-widest uppercase">
                    相手チャンピオンを選択
                  </h2>
                </div>

                {!selectedRole ? (
                  <p className="text-sm text-white/50">
                    先に相手ロールを選んでください。
                  </p>
                ) : loadingChampions ? (
                  <p className="text-sm text-white/50">
                    読み込み中です。
                  </p>
                ) : championLoadError ? (
                  <p className="text-sm text-red-300">{championLoadError}</p>
                ) : (
                  <>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-xs text-white/40">
                        ランク帯: <span className="text-gold">{selectedRank}</span>
                        {" / "}
                        ロール: <span className="text-gold">{selectedRole}</span>
                        {championVersion ? (
                          <>
                            {" / "}Data Dragon:{" "}
                            <span className="text-gold">{championVersion}</span>
                          </>
                        ) : null}
                      </p>

                      <p className="text-xs text-white/40">
                        表示件数: {counterFilteredChampions.length}体
                      </p>
                    </div>

                    <div>
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                        placeholder="チャンピオン名で検索"
                        className="w-full rounded-lg border border-white/10 bg-dark-700 px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-gold/60"
                      />
                    </div>

                    {renderCounterChampionPicker()}
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-1 h-5 bg-gold" />
                  <h2 className="font-display text-gold text-sm tracking-widest uppercase">
                    ランク帯を選択
                  </h2>
                </div>

                <div className="flex flex-wrap gap-2">
                  {rankOptions.map((rank) => {
                    const isActive = itemRank === rank.id;

                    return (
                      <button
                        key={`item-rank-${rank.id}`}
                        onClick={() => setItemRank(rank.id)}
                        className={`px-4 py-2 rounded border text-sm transition-all duration-200 ${
                          isActive
                            ? "border-gold bg-dark-700 text-gold"
                            : "border-white/10 bg-dark-700 text-white/70 hover:border-gold/40 hover:text-white"
                        }`}
                      >
                        {rank.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-1 h-5 bg-gold" />
                  <h2 className="font-display text-gold text-sm tracking-widest uppercase">
                    自分のロールを選択
                  </h2>
                </div>

                {!itemRank ? (
                  <p className="text-sm text-white/50">
                    先にランク帯を選んでください。
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {roleOptions.map((role) => {
                      const isActive = itemSelfRole === role.id;

                      return (
                        <button
                          key={`item-role-${role.id}`}
                          onClick={() => {
                            setItemSelfRole(role.id);
                            setSelfChampionKey("");
                            setSelfSearchTerm("");
                          }}
                          className={`px-4 py-2 rounded border text-sm transition-all duration-200 ${
                            isActive
                              ? "border-gold bg-dark-700 text-gold"
                              : "border-white/10 bg-dark-700 text-white/70 hover:border-gold/40 hover:text-white"
                          }`}
                        >
                          {role.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {loadingChampions ? (
                <p className="text-sm text-white/50">読み込み中です。</p>
              ) : championLoadError ? (
                <p className="text-sm text-red-300">{championLoadError}</p>
              ) : !itemSelfRole ? (
                <p className="text-sm text-white/50">
                  先に自分のロールを選んでください。
                </p>
              ) : (
                <>
                  {renderItemChampionPicker({
                    title: "自分のチャンピオン",
                    selectedKey: selfChampionKey,
                    onSelect: setSelfChampionKey,
                    helperText: "自分が使うチャンピオンを選択",
                    searchTerm: selfSearchTerm,
                    onSearchChange: setSelfSearchTerm,
                  })}

                  {renderItemChampionPicker({
                    title: "敵 Top",
                    selectedKey: enemyTopKey,
                    onSelect: setEnemyTopKey,
                    searchTerm: enemyTopSearchTerm,
                    onSearchChange: setEnemyTopSearchTerm,
                  })}

                  {renderItemChampionPicker({
                    title: "敵 Jungle",
                    selectedKey: enemyJungleKey,
                    onSelect: setEnemyJungleKey,
                    searchTerm: enemyJungleSearchTerm,
                    onSearchChange: setEnemyJungleSearchTerm,
                  })}

                  {renderItemChampionPicker({
                    title: "敵 Mid",
                    selectedKey: enemyMidKey,
                    onSelect: setEnemyMidKey,
                    searchTerm: enemyMidSearchTerm,
                    onSearchChange: setEnemyMidSearchTerm,
                  })}

                  {renderItemChampionPicker({
                    title: "敵 ADC",
                    selectedKey: enemyAdcKey,
                    onSelect: setEnemyAdcKey,
                    searchTerm: enemyAdcSearchTerm,
                    onSearchChange: setEnemyAdcSearchTerm,
                  })}

                  {renderItemChampionPicker({
                    title: "敵 Support",
                    selectedKey: enemySupportKey,
                    onSelect: setEnemySupportKey,
                    searchTerm: enemySupportSearchTerm,
                    onSearchChange: setEnemySupportSearchTerm,
                  })}
                </>
              )}
            </div>
          )}
        </section>

        {activeTab === "counter" ? (
          <section
            ref={resultSectionRef}
            className="bg-dark-800 border border-white/10 rounded-xl p-6 space-y-6"
          >
            <div className="flex items-center gap-3">
              <div className="w-1 h-5 bg-gold" />
              <h2 className="font-display text-gold text-sm tracking-widest uppercase">
                結果
              </h2>
            </div>

            {!selectedRank || !selectedRole || !selectedChampion ? (
              <p className="text-sm text-white/50">
                ランク帯・相手ロール・相手チャンピオンを選ぶと結果が表示されます。
              </p>
            ) : !selectedMatchup ? (
              <div className="space-y-2">
                <p className="text-sm text-white/80">
                  <span className="text-gold">{selectedRank}</span>
                  {" / "}
                  <span className="text-gold">{selectedRole}</span>
                  {" / "}
                  <span className="text-gold">
                    {selectedChampionName || selectedChampion}
                  </span>
                  {" "}のデータはまだありません。
                </p>
                <p className="text-xs text-white/40">
                  counters.json にこの組み合わせを追加すると表示できます。
                </p>
              </div>
            ) : (
              <div className="space-y-8">
                <div className="text-sm text-white/80 flex items-center gap-3">
                  {selectedChampionData?.imageUrl ? (
                    <img
                      src={selectedChampionData.imageUrl}
                      alt={selectedChampionName}
                      className="w-10 h-10 rounded object-cover border border-white/10"
                    />
                  ) : null}

                  <div>
                    ランク帯: <span className="text-gold">{selectedRank}</span>
                    {" / "}
                    相手ロール: <span className="text-gold">{selectedRole}</span>
                    {" / "}
                    相手チャンピオン:{" "}
                    <span className="text-gold">
                      {selectedChampionName || selectedChampion}
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-2">
                      <p className="text-sm text-white/50">
                        おすすめ表示件数:{" "}
                        <span className="text-gold">
                          {showAllCounters
                            ? sortedRecommendedChampionItems.length
                            : Math.min(sortedRecommendedChampionItems.length, 20)}
                        </span>
                        {" / "}
                        {sortedRecommendedChampionItems.length}
                      </p>
                      <p className="text-xs text-white/35">
                        おすすめ順は試合数 {MIN_GAMES_FOR_RECOMMENDED.toLocaleString()} 以上を優先表示
                      </p>
                    </div>

                    <div className="flex flex-col gap-3 sm:items-end">
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex flex-col gap-1">
                          <span className="text-xs text-white/35">並び順</span>
                          <div className="flex flex-wrap gap-2">
                            {sortOptions.map((option) => {
                              const isActive = sortMode === option.id;

                              return (
                                <button
                                  key={option.id}
                                  onClick={() => setSortMode(option.id)}
                                  className={`px-3 py-2 rounded border text-sm ${
                                    isActive
                                      ? "border-gold bg-dark-700 text-gold"
                                      : "border-white/10 bg-dark-700 text-white/60 hover:border-gold/40 hover:text-white"
                                  }`}
                                >
                                  {option.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div className="hidden sm:block w-px h-12 bg-white/10" />

                        <div className="flex flex-col gap-1">
                          <span className="text-xs text-white/35">表示数</span>
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => setShowAllCounters(false)}
                              className={`px-3 py-2 rounded border text-sm ${
                                !showAllCounters
                                  ? "border-gold bg-dark-700 text-gold"
                                  : "border-white/10 bg-dark-700 text-white/60 hover:border-gold/40 hover:text-white"
                              }`}
                            >
                              上位20件
                            </button>
                            <button
                              onClick={() => setShowAllCounters(true)}
                              className={`px-3 py-2 rounded border text-sm ${
                                showAllCounters
                                  ? "border-gold bg-dark-700 text-gold"
                                  : "border-white/10 bg-dark-700 text-white/60 hover:border-gold/40 hover:text-white"
                              }`}
                            >
                              すべて表示
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <ResultSection
                    title="おすすめチャンピオン"
                    items={visibleRecommendedChampionItems}
                  />
                </div>
              </div>
            )}
          </section>
        ) : (
          <section className="bg-dark-800 border border-white/10 rounded-xl p-6 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-1 h-5 bg-gold" />
              <h2 className="font-display text-gold text-sm tracking-widest uppercase">
                アイテム提案結果
              </h2>
            </div>

            {!canShowItemResult ? (
              <p className="text-sm text-white/50">
                ランク帯・自分ロール・自分のチャンピオン・敵5体を選ぶとアイテム提案が表示されます。
              </p>
            ) : (
              <div className="space-y-8">
                <div className="space-y-2">
                  <p className="text-sm text-white/80">
                    ランク帯: <span className="text-gold">{itemRank}</span>
                  </p>
                  <p className="text-sm text-white/80">
                    自分ロール: <span className="text-gold">{itemSelfRole}</span>
                  </p>
                  <p className="text-sm text-white/80">
                    自分: <span className="text-gold">{selfChampion?.name}</span>
                  </p>
                  <p className="text-sm text-white/80">
                    敵構成:{" "}
                    <span className="text-gold">
                      {enemyTop?.name} / {enemyJungle?.name} / {enemyMid?.name} / {enemyAdc?.name} / {enemySupport?.name}
                    </span>
                  </p>
                  <p className="text-xs text-white/35">
                    {itemTabResult.source === "data"
                      ? "items.json に登録された構成一致データを表示中"
                      : "構成一致データがないため簡易提案を表示中"}
                  </p>
                </div>

                {itemTabResult.summary.length > 0 ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-1 h-5 bg-gold" />
                      <h3 className="font-display text-gold text-sm tracking-widest uppercase">
                        構成分析
                      </h3>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {itemTabResult.summary.map((tag) => (
                        <span
                          key={tag}
                          className="px-3 py-2 rounded border border-white/10 bg-dark-700 text-sm text-white/80"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}

                <ResultSection
                  title="おすすめアイテム"
                  items={itemTabResult.recommendedItems}
                />

                <ResultSection
                  title="おすすめビルド順"
                  items={itemTabResult.buildOrder}
                />
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}