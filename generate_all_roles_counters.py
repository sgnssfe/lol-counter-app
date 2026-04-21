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

RANKS = ["gold", "emerald"]
DIVISIONS = ["I", "II", "III", "IV"]

ENTRIES_PER_DIVISION = 5
MATCHES_PER_PLAYER = 3
REQUEST_SLEEP = 0.2

# None の場合は自動で最新パッチを使う
PATCH_PREFIX = None

OUTPUT_PATH = "src/data/counters.generated.all_roles.json"

HEADERS = {
    "X-Riot-Token": API_KEY
}

session = requests.Session()
session.headers.update(HEADERS)

ROLE_KEYS = ["top", "jungle", "mid", "adc", "support"]


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


def normalize_champion_key(value: str) -> str:
    return "".join(ch.lower() for ch in str(value) if ch.isalnum())


def get_latest_patch_prefix() -> str:
    versions = public_get("https://ddragon.leagueoflegends.com/api/versions.json")
    if not versions:
        raise RuntimeError("Data Dragon のバージョン取得に失敗しました。")

    latest = str(versions[0])  # 例: 15.8.1
    parts = latest.split(".")
    if len(parts) < 2:
        raise RuntimeError(f"想定外のバージョン形式です: {latest}")

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
        print(f"[warn] unexpected response for {tier} {division} page={page}: {type(data)}")
        return []

    print(f"[debug] {tier} {division} page={page} -> {len(data)} entries")
    return data


def get_master_plus_entries(tier: str) -> List[dict]:
    url = (
        f"https://{PLATFORM_ROUTING}.api.riotgames.com"
        f"/lol/league/v4/{tier.lower()}leagues/by-queue/{RANKED_SOLO_QUEUE}"
    )
    data = riot_get(url)
    return data.get("entries", [])


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
        return (
            team_pos == "TOP"
            or individual_pos == "TOP"
            or lane == "TOP"
        )

    if role_key == "jungle":
        return (
            team_pos == "JUNGLE"
            or individual_pos == "JUNGLE"
            or lane == "JUNGLE"
        )

    if role_key == "mid":
        return (
            team_pos == "MIDDLE"
            or individual_pos == "MIDDLE"
            or lane == "MIDDLE"
        )

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


def infer_role_matchups(match: dict, patch_prefix: str) -> List[Tuple[str, str, str, bool]]:
    """
    return:
      [
        (role_key, enemy_champion_key, my_champion_key, my_side_won),
        ...
      ]
    """
    info = match.get("info", {})
    participants = info.get("participants", [])

    version = str(info.get("gameVersion", ""))
    if patch_prefix and not version.startswith(patch_prefix):
        return []

    inferred = []

    for role_key in ROLE_KEYS:
        team100_player = pick_one_role_player(participants, 100, role_key)
        team200_player = pick_one_role_player(participants, 200, role_key)

        if not team100_player or not team200_player:
            continue

        champ_100 = normalize_champion_key(team100_player.get("championName", ""))
        champ_200 = normalize_champion_key(team200_player.get("championName", ""))

        if not champ_100 or not champ_200:
            continue

        win_100 = bool(team100_player.get("win", False))
        win_200 = bool(team200_player.get("win", False))

        inferred.append((role_key, champ_200, champ_100, win_100))
        inferred.append((role_key, champ_100, champ_200, win_200))

    return inferred


# =========================
# 集計用の入口プレイヤー収集
# =========================

def collect_rank_seed_players(rank: str) -> List[Tuple[str, str]]:
    player_refs: List[Tuple[str, str]] = []

    if rank in {"master", "grandmaster", "challenger"}:
        entries = get_master_plus_entries(rank)
        random.shuffle(entries)
        entries = entries[:max(ENTRIES_PER_DIVISION, 50)]

        for entry in entries:
            puuid = entry.get("puuid")
            summoner_id = entry.get("summonerId")

            if puuid:
                player_refs.append(("puuid", puuid))
            elif summoner_id:
                player_refs.append(("summonerId", summoner_id))

        return list(dict.fromkeys(player_refs))

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

def aggregate_all_roles_counters_for_rank(rank: str, patch_prefix: str) -> Dict[str, dict]:
    print(f"\n=== collecting rank: {rank} ===")

    seed_players = collect_rank_seed_players(rank)
    print(f"[{rank}] seed players: {len(seed_players)}")

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
            print(f"[{rank}] player->puuid {idx}/{len(seed_players)}")

    puuids = list(dict.fromkeys(puuids))
    print(f"[{rank}] puuids: {len(puuids)}")

    # stats[role][enemy][my] = {"wins": x, "games": y}
    stats = defaultdict(
        lambda: defaultdict(
            lambda: defaultdict(lambda: {"wins": 0, "games": 0})
        )
    )

    seen_match_ids = set()
    matches_checked = 0
    role_matchups_found = defaultdict(int)

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
            inferred = infer_role_matchups(match, patch_prefix)

            for role_key, enemy_role_champ, my_role_champ, my_side_won in inferred:
                role_matchups_found[role_key] += 1
                stats[role_key][enemy_role_champ][my_role_champ]["games"] += 1
                if my_side_won:
                    stats[role_key][enemy_role_champ][my_role_champ]["wins"] += 1

        if idx % 20 == 0:
            print(f"[{rank}] puuid progress {idx}/{len(puuids)} / matches={len(seen_match_ids)}")

    result_for_rank = {}

    for role_key in ROLE_KEYS:
        result_for_rank[role_key] = {}

        for enemy_role_champ, my_candidates in stats[role_key].items():
            recommended = []

            for my_role_champ, s in my_candidates.items():
                games = s["games"]
                wins = s["wins"]

                if games <= 0:
                    continue

                win_rate = round((wins / games) * 100, 1)
                recommended.append({
                    "id": my_role_champ,
                    "winRate": win_rate,
                    "games": games
                })

            recommended.sort(key=lambda x: (-x["winRate"], -x["games"], x["id"]))

            result_for_rank[role_key][enemy_role_champ] = {
                "recommendedChampions": recommended,
                "recommendedItems": []
            }

    print(f"[{rank}] matches checked: {matches_checked}")
    for role_key in ROLE_KEYS:
        print(f"[{rank}] {role_key} matchups found: {role_matchups_found[role_key]}")
        print(f"[{rank}] unique enemy {role_key}: {len(result_for_rank[role_key])}")

    return result_for_rank


def main():
    print("script start")

    patch_prefix = PATCH_PREFIX or get_latest_patch_prefix()
    print(f"using latest patch prefix: {patch_prefix}")

    output = {"matchups": {}}

    for rank in RANKS:
        rank_data = aggregate_all_roles_counters_for_rank(rank, patch_prefix)
        output["matchups"][rank] = rank_data
        print(rank, "done")

    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print("file saved")
    print(f"Done -> {OUTPUT_PATH}")


if __name__ == "__main__":
    main()