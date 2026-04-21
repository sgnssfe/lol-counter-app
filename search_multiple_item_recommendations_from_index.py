import json
from collections import defaultdict
from pathlib import Path

INDEX_PATH = Path("data/match_index.json")
OUTPUT_PATH = Path("generated_items_entry.json")

TARGET_PATCH_PREFIX = None

TARGETS = [
    {
        "rank": "gold",
        "selfRole": "mid",
        "selfChampion": "yasuo",
        "enemyComp": ["malphite", "vi", "ahri", "jinx", "leona"],
    },
    {
        "rank": "gold",
        "selfRole": "mid",
        "selfChampion": "ahri",
        "enemyComp": ["darius", "vi", "yasuo", "jinx", "nautilus"],
    },
    {
        "rank": "gold",
        "selfRole": "adc",
        "selfChampion": "jinx",
        "enemyComp": ["malphite", "vi", "ahri", "xayah", "rakan"],
    },
    {
        "rank": "emerald",
        "selfRole": "mid",
        "selfChampion": "yasuo",
        "enemyComp": ["malphite", "vi", "ahri", "jinx", "leona"],
    },
]


def normalize_key(value: str) -> str:
    return "".join(ch.lower() for ch in str(value) if ch.isalnum())


def build_reason_for_item(item_id: int) -> str:
    if item_id == 3111:
        return "CCやAPダメージが多い構成に対して安定しやすい"
    if item_id in {3033, 3123, 3165, 3075}:
        return "回復持ちがいる構成への対策として有効"
    if item_id in {3036, 6695, 3153}:
        return "前衛や耐久寄りの相手にダメージを通しやすい"
    if item_id in {3156, 3091}:
        return "APダメージへの耐久補強として噛み合いやすい"
    if item_id in {3026, 3157, 3140, 3139}:
        return "捕まった時の事故を減らしやすい"
    return "この条件で比較的高い勝率が出ている"


def deep_set(base: dict, keys: list, value):
    current = base
    for key in keys[:-1]:
        if key not in current or not isinstance(current[key], dict):
            current[key] = {}
        current = current[key]
    current[keys[-1]] = value


def analyze_target(matches: list, target: dict) -> dict:
    target_rank = target["rank"]
    target_self_role = target["selfRole"]
    target_self_champion = normalize_key(target["selfChampion"])
    target_enemy_comp = [normalize_key(x) for x in target["enemyComp"]]
    enemy_comp_key = "_".join(target_enemy_comp)

    item_stats = defaultdict(lambda: {"wins": 0, "games": 0})

    matches_checked = 0
    matched_games = 0
    skipped_patch = 0

    for match in matches:
        version = str(match.get("gameVersion", ""))
        if TARGET_PATCH_PREFIX and not version.startswith(TARGET_PATCH_PREFIX):
            skipped_patch += 1
            continue

        matches_checked += 1
        teams = match.get("teams", {})

        for team_id in ["100", "200"]:
            enemy_team_id = "200" if team_id == "100" else "100"

            my_role_data = teams.get(team_id, {}).get(target_self_role)
            if not my_role_data:
                continue

            my_champion = normalize_key(my_role_data.get("champion", ""))
            if my_champion != target_self_champion:
                continue

            enemy_comp = [
                normalize_key(teams.get(enemy_team_id, {}).get("top", {}).get("champion", "")),
                normalize_key(teams.get(enemy_team_id, {}).get("jungle", {}).get("champion", "")),
                normalize_key(teams.get(enemy_team_id, {}).get("mid", {}).get("champion", "")),
                normalize_key(teams.get(enemy_team_id, {}).get("adc", {}).get("champion", "")),
                normalize_key(teams.get(enemy_team_id, {}).get("support", {}).get("champion", "")),
            ]

            if enemy_comp != target_enemy_comp:
                continue

            matched_games += 1
            did_win = bool(my_role_data.get("win", False))
            final_items = my_role_data.get("items", [])

            for item_id in final_items:
                item_stats[item_id]["games"] += 1
                if did_win:
                    item_stats[item_id]["wins"] += 1

    ranked_items = []
    for item_id, stats in item_stats.items():
        games = stats["games"]
        wins = stats["wins"]
        if games <= 0:
            continue

        win_rate = round((wins / games) * 100, 1)
        ranked_items.append({
            "itemId": item_id,
            "winRate": win_rate,
            "games": games,
            "reason": build_reason_for_item(item_id),
        })

    ranked_items.sort(key=lambda x: (-x["winRate"], -x["games"], x["itemId"]))

    recommended_items = ranked_items[:5]
    build_order = [
        {
            "itemId": item["itemId"],
            "reason": item["reason"],
        }
        for item in ranked_items[:3]
    ]

    return {
        "rank": target_rank,
        "selfRole": target_self_role,
        "selfChampion": target_self_champion,
        "enemyCompKey": enemy_comp_key,
        "entry": {
            "recommendedItems": recommended_items,
            "buildOrder": build_order,
        },
        "meta": {
            "matchesChecked": matches_checked,
            "matchedGames": matched_games,
            "skippedPatch": skipped_patch,
        },
    }


def main():
    if not INDEX_PATH.exists():
        raise RuntimeError(f"{INDEX_PATH} が見つかりません。先に build_match_index.py を実行してください。")

    with open(INDEX_PATH, "r", encoding="utf-8") as f:
        index_data = json.load(f)

    matches = index_data.get("matches", [])

    output = {
        "items": {},
        "_meta": {
            "patchPrefix": TARGET_PATCH_PREFIX,
            "targets": [],
        },
    }

    for idx, target in enumerate(TARGETS, 1):
        print(
            f"[{idx}/{len(TARGETS)}] "
            f"{target['rank']} / {target['selfRole']} / {target['selfChampion']} / "
            f"{'_'.join(target['enemyComp'])}"
        )

        result = analyze_target(matches, target)

        deep_set(
            output["items"],
            [
                result["rank"],
                result["selfRole"],
                result["selfChampion"],
                result["enemyCompKey"],
            ],
            result["entry"],
        )

        output["_meta"]["targets"].append({
            "rank": result["rank"],
            "selfRole": result["selfRole"],
            "selfChampion": result["selfChampion"],
            "enemyCompKey": result["enemyCompKey"],
            "matchedGames": result["meta"]["matchedGames"],
            "matchesChecked": result["meta"]["matchesChecked"],
            "skippedPatch": result["meta"]["skippedPatch"],
        })

        print(f"  matchedGames = {result['meta']['matchedGames']}")

    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print("file saved")
    print(f"Done -> {OUTPUT_PATH}")


if __name__ == "__main__":
    main()