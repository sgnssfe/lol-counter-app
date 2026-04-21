import json
from pathlib import Path
from typing import Dict, List, Optional

MATCHES_DIR = Path("data/matches")
OUTPUT_PATH = Path("data/match_index.json")

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


def build_role_map(match: dict) -> Optional[dict]:
    participants = match.get("info", {}).get("participants", [])

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


def build_entry_for_match(match: dict) -> Optional[dict]:
    metadata = match.get("metadata", {})
    info = match.get("info", {})
    match_id = metadata.get("matchId")

    if not match_id:
        return None

    role_map = build_role_map(match)
    if not role_map:
        return None

    entry = {
        "matchId": match_id,
        "gameVersion": info.get("gameVersion", ""),
        "queueId": info.get("queueId"),
        "teams": {
            "100": {},
            "200": {},
        },
    }

    for team_id in [100, 200]:
        team_key = str(team_id)

        for role_key in ROLE_KEYS:
            participant = role_map[role_key][team_id]

            entry["teams"][team_key][role_key] = {
                "champion": normalize_key(participant.get("championName", "")),
                "championName": participant.get("championName", ""),
                "win": bool(participant.get("win", False)),
                "items": extract_final_items_from_participant(participant),
                "participantId": participant.get("participantId"),
            }

    return entry


def main():
    if not MATCHES_DIR.exists():
        raise RuntimeError(f"{MATCHES_DIR} が見つかりません。先に collect_matches.py を実行してください。")

    files = sorted(MATCHES_DIR.glob("*.json"))
    total_files = len(files)

    print(f"index build start: {total_files} files")

    index_entries = []
    skipped = 0

    for idx, path in enumerate(files, 1):
        try:
            with open(path, "r", encoding="utf-8") as f:
                match = json.load(f)
        except Exception as e:
            skipped += 1
            print(f"[warn] failed to read {path.name}: {e}")
            continue

        entry = build_entry_for_match(match)
        if not entry:
            skipped += 1
            continue

        index_entries.append(entry)

        if idx % 200 == 0:
            print(f"progress {idx}/{total_files} / indexed={len(index_entries)} / skipped={skipped}")

    output = {
        "matches": index_entries,
        "_meta": {
            "sourceDir": str(MATCHES_DIR),
            "totalFiles": total_files,
            "indexed": len(index_entries),
            "skipped": skipped,
        },
    }

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print("file saved")
    print(f"Done -> {OUTPUT_PATH}")
    print(f"indexed = {len(index_entries)}")
    print(f"skipped = {skipped}")


if __name__ == "__main__":
    main()