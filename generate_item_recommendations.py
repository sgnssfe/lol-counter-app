import os
import time
import json
import random
from collections import defaultdict
from typing import Dict, List, Tuple, Optional

import requests

# =========================
# 設定
# =========================

API_KEY = os.getenv("RIOT_API_KEY", "").strip()
if not API_KEY:
    raise RuntimeError("RIOT_API_KEY が未設定です。")

PLATFORM_ROUTING = "jp1"
REGIONAL_ROUTING = "asia"

RANKED_SOLO_QUEUE = "RANKED_SOLO_5x5"
QUEUE_ID_RANKED_SOLO = 420

# 最小版ターゲット
TARGET_RANK = "gold"
TARGET_SELF_ROLE = "mid"
TARGET_SELF_CHAMPION = "yasuo"
TARGET_ENEMY_COMP = ["malphite", "vi", "ahri", "jinx", "leona"]

DIVISIONS = ["I", "II", "III", "IV"]

ENTRIES_PER_DIVISION = 20
MATCHES_PER_PLAYER = 10
REQUEST_SLEEP = 0.2

PATCH_PREFIX = None

OUTPUT_PATH = "generated_item_recommendation_result.json"

HEADERS = {
    "X-Riot-Token": API_KEY
}

session = requests.Session()
session.headers.update(HEADERS)

ROLE_KEYS = ["top", "jungle", "mid", "adc", "support"]

ROLE_POSITION_MAP = {
    "top": ["TOP"],
    "jungle": ["JUNGLE"],
    "mid": ["MIDDLE"],
    "adc": ["BOTTOM"],
    "support": ["UTILITY"],
}


# =========================
# 共通
# =========================

def riot_get(url: str, params: Optional[dict] = None):
    for attempt in range(5):
        res = session.get(url, params=params, timeout=30)

        if res.status_code == 429:
            retry_after = res.headers.get("Retry-After")
            sleep_sec = float(retry_after) if retry_after else (1.5 + attempt)
            print(f"[429] rate limit hit. sleep {sleep_sec}s -> {url}")
            time.sleep(sleep_sec)
            continue

        if 500 <= res.status_code < 600:
            sleep_sec = 1.5 + attempt
            print(f"[{res.status_code}] server error. retry in {sleep_sec}s -> {url}")
            time.sleep(sleep_sec)
            continue

        res.raise_for_status()
        time.sleep(REQUEST_SLEEP)
        return res.json()

    raise RuntimeError(f"API request failed repeatedly: {url}")


def public_get(url: str):
    res = requests.get(url, timeout=30)
    res.raise_for_status()
    return res.json()


def normalize_key(value: str) -> str:
    return "".join(ch.lower() for ch in str(value) if ch.isalnum())


def get_latest_patch_prefix() -> str:
    versions = public_get("https://ddragon.leagueoflegends.com/api/versions.json")
    latest = str(versions[0])  # 例: 15.8.1
    parts = latest.split(".")
    return f"{parts[0]}.{parts[1]}"


# =========================
# Riot API 呼び出し
# =========================

def get_entries_by_tier_division(tier: str, division: str, page: int = 1) -> List[dict]:
    url = (
        f"https://{PLATFORM_ROUTING}.api.riotgames.com"
        f"/lol/league/v4/entries/{RANKED_SOLO_QUEUE}/{tier.upper()}/{division}"
    )
    data = riot_get(url, params={"page": page})

    if not isinstance(data, list):
        return []

    print(f"[debug] {tier} {division} page={page} -> {len(data)} entries")
    return data


def get_summoner_by_id(encrypted_summoner_id: str) -> dict:
    url = (
        f"https://{PLATFORM_ROUTING}.api.riotgames.com"
        f"/lol/summoner/v4/summoners/{encrypted_summoner_id}"
    )
    return riot_get(url)


def get_match_ids_by_puuid(puuid: str, count: int = 10) -> List[str]:
    url = (
        f"https://{REGIONAL_ROUTING}.api.riotgames.com"
        f"/lol/match/v5/matches/by-puuid/{puuid}/ids"
    )
    return riot_get(
        url,
        params={
            "queue": QUEUE_ID_RANKED_SOLO,
            "start": 0,
            "count": count
        }
    )


def get_match(match_id: str) -> dict:
    url = (
        f"https://{REGIONAL_ROUTING}.api.riotgames.com"
        f"/lol/match/v5/matches/{match_id}"
    )
    return riot_get(url)


# =========================
# ロール判定
# =========================

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


def get_role_map_for_match(match: dict, patch_prefix: str) -> Optional[dict]:
    info = match.get("info", {})
    participants = info.get("participants", [])

    version = str(info.get("gameVersion", ""))
    if patch_prefix and not version.startswith(patch_prefix):
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


# =========================
# プレイヤー収集
# =========================

def collect_rank_seed_players(rank: str) -> List[Tuple[str, str]]:
    player_refs: List[Tuple[str, str]] = []

    for division in DIVISIONS:
        page = 1
        collected = 0

        while collected < ENTRIES_PER_DIVISION:
            entries = get_entries_by_tier_division(rank, division, page=page)
            if not entries:
                break

            random.shuffle(entries)

            for entry in entries:
                puuid = entry.get("puuid")
                summoner_id = entry.get("summonerId")

                if puuid:
                    player_refs.append(("puuid", puuid))
                    collected += 1
                elif summoner_id:
                    player_refs.append(("summonerId", summoner_id))
                    collected += 1

                if collected >= ENTRIES_PER_DIVISION:
                    break

            page += 1
            if page > 3:
                break

    return list(dict.fromkeys(player_refs))


# =========================
# 集計本体
# =========================

def extract_final_items_from_participant(participant: dict) -> List[int]:
    item_ids = []
    for idx in range(7):
        item_id = participant.get(f"item{idx}", 0)
        if isinstance(item_id, int) and item_id > 0:
            item_ids.append(item_id)
    return item_ids


def main():
    print("script start")

    patch_prefix = PATCH_PREFIX or get_latest_patch_prefix()
    print(f"using patch prefix: {patch_prefix}")

    seed_players = collect_rank_seed_players(TARGET_RANK)
    print(f"seed players: {len(seed_players)}")

    puuids: List[str] = []
    for idx, (ref_type, ref_value) in enumerate(seed_players, 1):
        try:
            if ref_type == "puuid":
                puuids.append(ref_value)
            else:
                summoner = get_summoner_by_id(ref_value)
                puuid = summoner.get("puuid")
                if puuid:
                    puuids.append(puuid)
        except Exception as e:
            print(f"[warn] player lookup failed: {ref_type}={ref_value} -> {e}")

        if idx % 20 == 0:
            print(f"player->puuid {idx}/{len(seed_players)}")

    puuids = list(dict.fromkeys(puuids))
    print(f"puuids: {len(puuids)}")

    seen_match_ids = set()
    matches_checked = 0
    matched_games = 0

    # item_id -> {wins, games}
    item_stats = defaultdict(lambda: {"wins": 0, "games": 0})

    target_enemy_comp = [normalize_key(ch) for ch in TARGET_ENEMY_COMP]

    for idx, puuid in enumerate(puuids, 1):
        try:
            match_ids = get_match_ids_by_puuid(puuid, count=MATCHES_PER_PLAYER)
        except Exception as e:
            print(f"[warn] match list failed: {e}")
            continue

        for match_id in match_ids:
            if match_id in seen_match_ids:
                continue
            seen_match_ids.add(match_id)

            try:
                match = get_match(match_id)
            except Exception as e:
                print(f"[warn] get match failed {match_id}: {e}")
                continue

            matches_checked += 1

            role_map = get_role_map_for_match(match, patch_prefix)
            if not role_map:
                continue

            # 自分側がどちらのteamか判定
            for team_id in [100, 200]:
                my_mid = role_map[TARGET_SELF_ROLE][team_id]
                enemy_team_id = 200 if team_id == 100 else 100

                my_champ = normalize_key(my_mid.get("championName", ""))
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

                final_items = extract_final_items_from_participant(my_mid)
                did_win = bool(my_mid.get("win", False))

                for item_id in final_items:
                    item_stats[item_id]["games"] += 1
                    if did_win:
                        item_stats[item_id]["wins"] += 1

        if idx % 20 == 0:
            print(f"puuid progress {idx}/{len(puuids)} / matches={len(seen_match_ids)} / matched_games={matched_games}")

    result_items = []
    for item_id, stats in item_stats.items():
        games = stats["games"]
        wins = stats["wins"]
        if games <= 0:
            continue

        win_rate = round((wins / games) * 100, 1)
        result_items.append({
            "itemId": item_id,
            "winRate": win_rate,
            "games": games,
        })

    result_items.sort(key=lambda x: (-x["winRate"], -x["games"], x["itemId"]))

    output = {
        "rank": TARGET_RANK,
        "selfRole": TARGET_SELF_ROLE,
        "selfChampion": TARGET_SELF_CHAMPION,
        "enemyCompKey": "_".join(target_enemy_comp),
        "matchesChecked": matches_checked,
        "matchedGames": matched_games,
        "recommendedItems": result_items[:10],
    }

    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print("file saved")
    print(f"Done -> {OUTPUT_PATH}")


if __name__ == "__main__":
    main()