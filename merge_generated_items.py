import json
from pathlib import Path
from copy import deepcopy

GENERATED_PATH = Path("generated_items_entry.json")
ITEMS_PATH = Path("src/data/items.json")


def is_effectively_empty_entry(value) -> bool:
    """
    items.json の末端エントリが空かどうかを判定する。
    空とみなす条件:
      - dict である
      - recommendedItems が空配列 or 未存在
      - buildOrder が空配列 or 未存在
    """
    if not isinstance(value, dict):
        return False

    has_recommended = "recommendedItems" in value
    has_build_order = "buildOrder" in value

    recommended_items = value.get("recommendedItems", [])
    build_order = value.get("buildOrder", [])

    if has_recommended or has_build_order:
        return (not recommended_items) and (not build_order)

    return False


def deep_merge_preserving_non_empty(base: dict, new_data: dict, path="root") -> dict:
    """
    new_data の内容で base を再帰的に上書き・追加するが、
    末端エントリが空データなら既存値を維持する。
    """
    result = deepcopy(base)

    for key, value in new_data.items():
        current_path = f"{path}.{key}"

        if (
            key in result
            and isinstance(result[key], dict)
            and isinstance(value, dict)
        ):
            # 末端エントリ同士なら空上書きを防ぐ
            if is_effectively_empty_entry(value):
                print(f"[skip empty] {current_path}")
                continue

            result[key] = deep_merge_preserving_non_empty(
                result[key], value, path=current_path
            )
        else:
            # 既存があり、新しい値が空エントリなら上書きしない
            if is_effectively_empty_entry(value):
                print(f"[skip empty] {current_path}")
                continue

            result[key] = deepcopy(value)
            print(f"[merged] {current_path}")

    return result


def main():
    if not GENERATED_PATH.exists():
        raise FileNotFoundError(f"{GENERATED_PATH} が見つかりません。")

    if not ITEMS_PATH.exists():
        raise FileNotFoundError(f"{ITEMS_PATH} が見つかりません。")

    with open(GENERATED_PATH, "r", encoding="utf-8") as f:
        generated = json.load(f)

    with open(ITEMS_PATH, "r", encoding="utf-8") as f:
        items = json.load(f)

    generated_items = generated.get("items")
    if not isinstance(generated_items, dict):
        raise ValueError("generated_items_entry.json に 'items' オブジェクトがありません。")

    if "items" not in items or not isinstance(items["items"], dict):
        items["items"] = {}

    items["items"] = deep_merge_preserving_non_empty(items["items"], generated_items)

    with open(ITEMS_PATH, "w", encoding="utf-8") as f:
        json.dump(items, f, ensure_ascii=False, indent=2)

    print("merge complete")
    print(f"updated -> {ITEMS_PATH}")


if __name__ == "__main__":
    main()