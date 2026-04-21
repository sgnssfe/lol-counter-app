import json
from collections import defaultdict
from pathlib import Path

INDEX_PATH = Path("data/match_index.json")
OUTPUT_PATH = Path("generated_items_entry.json")

TARGET_RANK = "gold"
TARGET_SELF_ROLE = "mid"
TARGET_SELF_CHAMPION = "yasuo"
TARGET_ENEMY_COMP = ["malphite", "vi", "ahri", "jinx", "leona"]
TARGET_PATCH_PREFIX = None


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


def main():
    if not INDEX_PATH.exists():
        raise RuntimeError(f"{INDEX_PATH} が見つかりません。先に build_match_index.py を実行してください。")

    with open(INDEX_PATH, "r", encoding="utf-8") as f:
        index_data = json.load(f)

    matches = index_data.get("matches", [])
    target_enemy_comp = [normalize_key(x) for x in TARGET_ENEMY_COMP]
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

            my_role_data = teams.get(team_id, {}).get(TARGET_SELF_ROLE)
            if not my_role_data:
                continue

            my_champion = normalize_key(my_role_data.get("champion", ""))
            if my_champion != TARGET_SELF_CHAMPION:
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

    output = {
        "items": {
            TARGET_RANK: {
                TARGET_SELF_ROLE: {
                    TARGET_SELF_CHAMPION: {
                        enemy_comp_key: {
                            "recommendedItems": recommended_items,
                            "buildOrder": build_order,
                        }
                    }
                }
            }
        },
        "_meta": {
            "selfRole": TARGET_SELF_ROLE,
            "selfChampion": TARGET_SELF_CHAMPION,
            "enemyCompKey": enemy_comp_key,
            "patchPrefix": TARGET_PATCH_PREFIX,
            "matchesChecked": matches_checked,
            "matchedGames": matched_games,
            "skippedPatch": skipped_patch,
        }
    }

    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print("file saved")
    print(f"Done -> {OUTPUT_PATH}")
    print(f"matchedGames = {matched_games}")


if __name__ == "__main__":
    main()