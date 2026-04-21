import json
from collections import defaultdict
from pathlib import Path
from typing import Dict, List, Optional

MATCHES_DIR = Path("data/matches")
OUTPUT_PATH = Path("generated_items_entry.json")

TARGET_RANK = "gold"
TARGET_SELF_ROLE = "mid"
TARGET_SELF_CHAMPION = "yasuo"
TARGET_ENEMY_COMP = ["malphite", "vi", "ahri", "jinx", "leona"]

PATCH_PREFIX = None
ROLE_KEYS = ["top", "jungle", "mid", "adc", "support"]


def normalize_key(value: str) -> str:
    return "".join(ch.lower() for ch in str(value) if ch.isalnum())


def extract_final_items_from_participant(participant: dict) -> List[int]:
    item_ids = []
    for idx in range(7):
        item_id = participant.get(f"item{idx}", 0)
        if isinstance(item_id, int) and item_id > 0:
            item_ids.append(item_id)
    return item_ids


def is_role_player(p: dict, role_key: str) -> bool:
    team_pos = str(p.get("teamPosition", "")).upper()
    individual_pos = str(p.get("individualPosition", "")).upper()
    lane = str(p.get("lane", "")).upper()
    role = str(p.get("role", "")).upper()

    if role_key == "top":
        return team_pos == "TOP" or individual_pos == "TOP" or lane == "TOP"

    if role_key == "jungle":
        return team_pos == "JUNGLE" or individual_pos == "JUNGLE" or lane == "JUNGLE"

    if role_key == "mid":
        return team_pos == "MIDDLE" or individual_pos == "MIDDLE" or lane == "MIDDLE"

    if role_key == "adc":
        return (
            team_pos == "BOTTOM"
            or individual_pos == "BOTTOM"
            or (lane == "BOTTOM" and role == "DUO_CARRY")
            or role == "DUO_CARRY"
        )

    if role_key == "support":
        return (
            team_pos == "UTILITY"
            or individual_pos == "UTILITY"
            or (lane == "BOTTOM" and role == "DUO_SUPPORT")
            or role == "DUO_SUPPORT"
        )

    return False


def pick_one_role_player(participants: List[dict], team_id: int, role_key: str) -> Optional[dict]:
    candidates = [
        p for p in participants
        if p.get("teamId") == team_id and is_role_player(p, role_key)
    ]
    if not candidates:
        return None
    return sorted(candidates, key=lambda p: p.get("participantId", 999))[0]


def get_role_map_for_match(match: dict) -> Optional[dict]:
    info = match.get("info", {})
    participants = info.get("participants", [])

    version = str(info.get("gameVersion", ""))
    if PATCH_PREFIX and not version.startswith(PATCH_PREFIX):
        return None

    role_map = {}

    for role_key in ROLE_KEYS:
        p100 = pick_one_role_player(participants, 100, role_key)
        p200 = pick_one_role_player(participants, 200, role_key)

        if not p100 or not p200:
            return None

        role_map[role_key] = {
            100: p100,
            200: p200,
        }

    return role_map


def build_reason_for_item(item_id: int) -> str:
    boots_merc = 3111
    mortal_reminder = 3033
    ldr = 3036
    maw = 3156
    ga = 3026
    zhonyas = 3157
    qss = 3140
    mercurial = 3139
    bork = 3153
    wit_end = 3091
    serpents = 6695
    executioners = 3123
    thornmail = 3075
    morello = 3165

    if item_id == boots_merc:
        return "CCやAPダメージが多い構成に対して安定しやすい"
    if item_id in {mortal_reminder, executioners, thornmail, morello}:
        return "回復持ちがいる構成への対策として有効"
    if item_id in {ldr, bork, serpents}:
        return "前衛や耐久寄りの相手にダメージを通しやすい"
    if item_id in {maw, wit_end}:
        return "APダメージへの耐久補強として噛み合いやすい"
    if item_id in {ga, zhonyas, qss, mercurial}:
        return "捕まった時の事故を減らしやすい"
    return "この条件で比較的高い勝率が出ている"


def main():
    if not MATCHES_DIR.exists():
        raise RuntimeError(f"{MATCHES_DIR} が見つかりません。先に collect_matches.py を実行してください。")

    target_enemy_comp = [normalize_key(ch) for ch in TARGET_ENEMY_COMP]
    enemy_comp_key = "_".join(target_enemy_comp)

    item_stats = defaultdict(lambda: {"wins": 0, "games": 0})

    files = sorted(MATCHES_DIR.glob("*.json"))
    total_files = len(files)

    matches_checked = 0
    matched_games = 0
    skipped_no_role_map = 0
    skipped_patch = 0

    print(f"scan start: {total_files} files")

    for idx, path in enumerate(files, 1):
        try:
            with open(path, "r", encoding="utf-8") as f:
                match = json.load(f)
        except Exception as e:
            print(f"[warn] failed to read {path.name}: {e}")
            continue

        info = match.get("info", {})
        version = str(info.get("gameVersion", ""))

        if PATCH_PREFIX and not version.startswith(PATCH_PREFIX):
            skipped_patch += 1
            continue

        matches_checked += 1

        role_map = get_role_map_for_match(match)
        if not role_map:
            skipped_no_role_map += 1
            continue

        for team_id in [100, 200]:
            my_player = role_map[TARGET_SELF_ROLE][team_id]
            enemy_team_id = 200 if team_id == 100 else 100

            my_champ = normalize_key(my_player.get("championName", ""))
            if my_champ != TARGET_SELF_CHAMPION:
                continue

            enemy_comp = [
                normalize_key(role_map["top"][enemy_team_id].get("championName", "")),
                normalize_key(role_map["jungle"][enemy_team_id].get("championName", "")),
                normalize_key(role_map["mid"][enemy_team_id].get("championName", "")),
                normalize_key(role_map["adc"][enemy_team_id].get("championName", "")),
                normalize_key(role_map["support"][enemy_team_id].get("championName", "")),
            ]

            if enemy_comp != target_enemy_comp:
                continue

            matched_games += 1
            final_items = extract_final_items_from_participant(my_player)
            did_win = bool(my_player.get("win", False))

            for item_id in final_items:
                item_stats[item_id]["games"] += 1
                if did_win:
                    item_stats[item_id]["wins"] += 1

        if idx % 200 == 0:
            print(
                f"progress {idx}/{total_files} "
                f"/ matches_checked={matches_checked} "
                f"/ matched_games={matched_games}"
            )

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
            "matchesChecked": matches_checked,
            "matchedGames": matched_games,
            "skippedNoRoleMap": skipped_no_role_map,
            "skippedPatch": skipped_patch,
            "patchPrefix": PATCH_PREFIX,
        }
    }

    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print("file saved")
    print(f"Done -> {OUTPUT_PATH}")
    print(f"matchedGames = {matched_games}")


if __name__ == "__main__":
    main()