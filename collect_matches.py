import os
import time
import json
import random
from pathlib import Path
from typing import List, Tuple, Optional, Set

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

# まずはよく使う帯域から
RANKS = ["gold", "emerald", "diamond"]
DIVISIONS = ["I", "II", "III", "IV"]

ENTRIES_PER_DIVISION = 20
MATCHES_PER_PLAYER = 10
REQUEST_SLEEP = 0.2

SAVE_DIR = Path("data/matches")
PROGRESS_PATH = Path("data/collect_progress.json")

HEADERS = {
    "X-Riot-Token": API_KEY
}

session = requests.Session()
session.headers.update(HEADERS)


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


def ensure_dirs():
    SAVE_DIR.mkdir(parents=True, exist_ok=True)
    PROGRESS_PATH.parent.mkdir(parents=True, exist_ok=True)


def load_progress() -> dict:
    if not PROGRESS_PATH.exists():
        return {
            "savedMatchIds": [],
            "lastRunRanks": [],
            "savedCount": 0
        }

    with open(PROGRESS_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def save_progress(progress: dict):
    with open(PROGRESS_PATH, "w", encoding="utf-8") as f:
        json.dump(progress, f, ensure_ascii=False, indent=2)


def get_saved_match_ids_from_disk() -> Set[str]:
    if not SAVE_DIR.exists():
        return set()

    saved = set()
    for path in SAVE_DIR.glob("*.json"):
        saved.add(path.stem)
    return saved


# =========================
# Riot API
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
# 入口プレイヤー収集
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
# 保存
# =========================

def save_match_json(match_id: str, match_data: dict):
    path = SAVE_DIR / f"{match_id}.json"
    with open(path, "w", encoding="utf-8") as f:
        json.dump(match_data, f, ensure_ascii=False)


# =========================
# メイン
# =========================

def main():
    print("collect_matches start")
    ensure_dirs()

    progress = load_progress()
    saved_match_ids = get_saved_match_ids_from_disk()

    print(f"already saved matches on disk: {len(saved_match_ids)}")

    total_seed_players = 0
    total_puuids = 0
    total_match_ids_seen = 0
    total_new_saved = 0

    for rank in RANKS:
        print(f"\n=== collecting rank: {rank} ===")

        seed_players = collect_rank_seed_players(rank)
        print(f"[{rank}] seed players: {len(seed_players)}")
        total_seed_players += len(seed_players)

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
        total_puuids += len(puuids)

        rank_seen_match_ids = set()
        rank_new_saved = 0

        for idx, puuid in enumerate(puuids, 1):
            try:
                match_ids = get_match_ids_by_puuid(puuid, count=MATCHES_PER_PLAYER)
            except Exception as e:
                print(f"[warn] match list failed: {e}")
                continue

            for match_id in match_ids:
                total_match_ids_seen += 1

                if match_id in rank_seen_match_ids:
                    continue
                rank_seen_match_ids.add(match_id)

                if match_id in saved_match_ids:
                    continue

                try:
                    match_data = get_match(match_id)
                except Exception as e:
                    print(f"[warn] get match failed {match_id}: {e}")
                    continue

                save_match_json(match_id, match_data)
                saved_match_ids.add(match_id)
                rank_new_saved += 1
                total_new_saved += 1

                if rank_new_saved % 20 == 0:
                    print(f"[{rank}] newly saved matches: {rank_new_saved}")

            if idx % 20 == 0:
                print(
                    f"[{rank}] puuid progress {idx}/{len(puuids)} "
                    f"/ unique rank matches={len(rank_seen_match_ids)} "
                    f"/ new saved={rank_new_saved}"
                )

        print(f"[{rank}] unique match ids seen: {len(rank_seen_match_ids)}")
        print(f"[{rank}] newly saved to disk: {rank_new_saved}")

    progress["savedMatchIds"] = sorted(saved_match_ids)
    progress["lastRunRanks"] = RANKS
    progress["savedCount"] = len(saved_match_ids)
    save_progress(progress)

    print("\n=== done ===")
    print(f"total seed players: {total_seed_players}")
    print(f"total puuids: {total_puuids}")
    print(f"total raw match ids seen: {total_match_ids_seen}")
    print(f"total new saved this run: {total_new_saved}")
    print(f"total saved on disk: {len(saved_match_ids)}")
    print(f"matches dir: {SAVE_DIR}")
    print(f"progress file: {PROGRESS_PATH}")


if __name__ == "__main__":
    main()