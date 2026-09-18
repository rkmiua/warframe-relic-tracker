#!/usr/bin/env python3
"""Warframe のレリック／Prime パーツのマスターデータを生成する。

出力: RelicVault/RelicVault/Resources/warframe_data.json

データ元:
  - https://drops.warframestat.us/data/relics.json  ... レリックごとの報酬と確率（精錬状態別）
  - https://api.warframestat.us/items/              ... vaulted 状態と Prime セットの構成パーツ

使い方:
    python3 Tools/generate_data.py            # ダウンロードして生成
    python3 Tools/generate_data.py --cache DIR  # DIR にある取得済み JSON を再利用
"""

from __future__ import annotations

import argparse
import datetime
import json
import os
import re
import sys
import urllib.request

RELIC_DROPS_URL = "https://drops.warframestat.us/data/relics.json"
ITEMS_URL = "https://api.warframestat.us/items/?only=name,vaulted,components,category,type,productCategory"

STATES = ["Intact", "Exceptional", "Flawless", "Radiant"]
STATE_KEYS = {"Intact": "intact", "Exceptional": "exceptional", "Flawless": "flawless", "Radiant": "radiant"}
TIER_ORDER = ["Lith", "Meso", "Neo", "Axi", "Vanguard"]
# Requiem レリックは中身が Requiem Mod や Kuva で、Prime パーツ集めとは別の話なので載せない
EXCLUDED_TIERS = {"Requiem"}
ROMAN = {"I": 1, "II": 2, "III": 3, "IV": 4}


def code_key(code: str):
    """A1 → A2 → ... → A10 の順に並ぶよう、英字と数字を分けて比較する。
    Requiem のローマ数字は数値に直し、ETERNA だけ末尾に置く。"""
    m = re.fullmatch(r"([A-Za-z]+)(\d+)", code)
    if m:
        return (0, m.group(1).upper(), int(m.group(2)), "")
    if code.upper() in ROMAN:
        return (0, "", ROMAN[code.upper()], "")
    return (1, "", 0, code.upper())


def fetch(url: str, cache_dir: str | None, filename: str):
    path = os.path.join(cache_dir, filename) if cache_dir else None
    if path and os.path.exists(path):
        print(f"  cache  {filename}", file=sys.stderr)
        with open(path) as f:
            return json.load(f)
    print(f"  fetch  {url}", file=sys.stderr)
    with urllib.request.urlopen(url, timeout=180) as res:
        raw = res.read()
    if path:
        os.makedirs(cache_dir, exist_ok=True)
        with open(path, "wb") as f:
            f.write(raw)
    return json.loads(raw)


def build(relic_drops, items):
    # --- Prime セット: components[].drops[].type が報酬名そのものなので、それで紐付ける ---
    sets = {}
    part_to_set = {}
    for item in items:
        name = item.get("name", "")
        comps = item.get("components")
        if not comps or "Prime" not in name:
            continue
        parts = []
        for c in comps:
            # レリックから出ないもの（Orokin Cell などの素材）は除外
            drops = c.get("drops") or []
            reward_names = {d.get("type") for d in drops if d.get("type")}
            if not reward_names:
                continue
            for reward_name in sorted(reward_names):
                parts.append({
                    "id": reward_name,
                    "name": c.get("name", reward_name),
                    "required": c.get("itemCount", 1) or 1,
                })
                part_to_set[reward_name] = name
        if not parts:
            continue
        sets[name] = {
            "id": name,
            "name": name,
            "category": item.get("category", "Misc"),
            "vaulted": bool(item.get("vaulted", False)),
            "parts": parts,
        }

    # --- レリックの vaulted 状態 ---
    relic_vaulted = {}
    for item in items:
        if item.get("category") != "Relics":
            continue
        tokens = item.get("name", "").split()
        if len(tokens) < 3 or tokens[-1] not in STATES:
            continue
        relic_vaulted[" ".join(tokens[:-1])] = bool(item.get("vaulted", False))

    # --- レリック本体: 精錬状態ごとの確率を1件にまとめる ---
    meta: dict[str, dict] = {}
    skipped = 0
    for relic in relic_drops:
        state = relic.get("state")
        # 上流データにまれに名前の無い壊れたレコードが混ざるので落とす
        if state not in STATE_KEYS or not relic.get("relicName") or not relic.get("tier"):
            skipped += 1
            continue
        if relic["tier"] in EXCLUDED_TIERS:
            continue
        relic_id = f"{relic['tier']} {relic['relicName']}"
        entry = meta.setdefault(relic_id, {
            "id": relic_id,
            "tier": relic["tier"],
            "code": relic["relicName"],
            "vaulted": relic_vaulted.get(relic_id, False),
            "rewards": {},
        })
        for reward in relic["rewards"]:
            part_id = reward["itemName"]
            slot = entry["rewards"].setdefault(part_id, {
                "partID": part_id,
                "rarity": reward.get("rarity", "Common"),
                "chance": {},
            })
            # 同じアイテムが複数スロットを占めるレリックがあるので確率は足し合わせる
            key = STATE_KEYS[state]
            slot["chance"][key] = round(slot["chance"].get(key, 0.0) + float(reward.get("chance", 0)), 2)

    if skipped:
        print(f"  ! 名前の無いレリックレコードを {skipped} 件スキップしました", file=sys.stderr)

    # --- 報酬に出てくる全パーツ（Prime セットに属さない Forma 等も含む）---
    rarity_rank = {"Rare": 0, "Uncommon": 1, "Common": 2}
    parts = {}
    for entry in meta.values():
        for slot in entry["rewards"].values():
            pid = slot["partID"]
            if pid in parts:
                continue
            set_id = part_to_set.get(pid)
            if set_id:
                short = next((p["name"] for p in sets[set_id]["parts"] if p["id"] == pid), pid)
                required = next((p["required"] for p in sets[set_id]["parts"] if p["id"] == pid), 1)
            else:
                short, required = pid, 1
            parts[pid] = {
                "id": pid,
                "name": pid,
                "shortName": short,
                "setID": set_id,
                "required": required,
            }

    # セット側は実際に報酬として存在するパーツだけに整える
    for s in sets.values():
        seen = set()
        kept = []
        for p in s["parts"]:
            if p["id"] in parts and p["id"] not in seen:
                seen.add(p["id"])
                kept.append(p["id"])
        s["partIDs"] = sorted(kept)
        del s["parts"]

    relics = []
    for entry in meta.values():
        rewards = sorted(
            entry["rewards"].values(),
            key=lambda r: (rarity_rank.get(r["rarity"], 3), r["partID"]),
        )
        relics.append({**entry, "rewards": rewards})
    relics.sort(key=lambda r: (TIER_ORDER.index(r["tier"]) if r["tier"] in TIER_ORDER else 99, *code_key(r["code"])))

    return {
        "version": 1,
        "generatedAt": datetime.date.today().isoformat(),
        "relics": relics,
        "sets": sorted((s for s in sets.values() if s["partIDs"]), key=lambda s: s["name"]),
        "parts": sorted(parts.values(), key=lambda p: p["id"]),
    }


def assign_stable_indices(parts, previous_paths):
    """パーツ番号は seed のビット位置そのものなので、一度振ったら二度と変えない。

    新しい Prime がアルファベット順で途中に割り込むと、以降の番号がずれて
    過去に共有した seed がすべて壊れる。そのため既存の出力から番号を引き継ぎ、
    初めて見るパーツだけを末尾に足す。"""
    known: dict[str, int] = {}
    for path in previous_paths:
        if not os.path.exists(path):
            continue
        try:
            with open(path) as f:
                old = json.load(f)
        except (OSError, json.JSONDecodeError):
            continue
        for p in old.get("parts", []):
            if "index" in p and p["id"] not in known:
                known[p["id"]] = p["index"]

    next_index = max(known.values(), default=-1) + 1
    added = 0
    for part in parts:
        if part["id"] in known:
            part["index"] = known[part["id"]]
        else:
            part["index"] = next_index
            next_index += 1
            added += 1
    if known:
        print(f"  パーツ番号: 既存 {len(known)} 件を引き継ぎ、新規 {added} 件を追加", file=sys.stderr)
    return known, added


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--cache", help="取得済み JSON を置くディレクトリ")
    ap.add_argument("--first-run", action="store_true",
                    help="パーツ番号を新しく振り直す（初回だけ。既存の記録はすべてずれる）")
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    ap.add_argument("--out", nargs="*", default=[
        os.path.join(root, "web", "public", "warframe_data.json"),
    ])
    args = ap.parse_args()

    print("データ取得:", file=sys.stderr)
    relic_drops = fetch(RELIC_DROPS_URL, args.cache, "relics.json")["relics"]
    items = fetch(ITEMS_URL, args.cache, "prime_meta.json")

    data = build(relic_drops, items)
    known, added = assign_stable_indices(data["parts"], args.out)

    # パーツ番号は共有データのビット位置そのもの。
    # 引き継ぎ元が見つからないまま振り直すと、すでに記録してある内容が全部ずれる。
    if not known and not args.first_run:
        print(
            "\n中止: 既存の warframe_data.json が見つからず、パーツ番号を新しく振り直すところでした。\n"
            "       このまま進めると、みんなが記録した内容がすべてずれます。\n"
            "       出力先を確認するか、本当に作り直すなら --first-run を付けてください。\n"
            f"       探した場所: {', '.join(args.out)}",
            file=sys.stderr,
        )
        return 1

    # 前回から何が変わったかを見せる
    before = {}
    for path in args.out:
        if os.path.exists(path):
            try:
                with open(path) as f:
                    before = json.load(f)
                break
            except (OSError, json.JSONDecodeError):
                pass
    if before:
        old_relics = {r["id"] for r in before.get("relics", [])}
        new_relics = {r["id"] for r in data["relics"]}
        old_sets = {s["id"] for s in before.get("sets", [])}
        new_sets = {s["id"] for s in data["sets"]}
        print("\n前回からの変化:", file=sys.stderr)
        for label, added_items, removed_items in (
            ("レリック", new_relics - old_relics, old_relics - new_relics),
            ("セット", new_sets - old_sets, old_sets - new_sets),
        ):
            if added_items:
                print(f"  + {label} {len(added_items)} 件: {', '.join(sorted(added_items)[:8])}"
                      + (" …" if len(added_items) > 8 else ""), file=sys.stderr)
            if removed_items:
                print(f"  - {label} {len(removed_items)} 件: {', '.join(sorted(removed_items)[:8])}"
                      + (" …" if len(removed_items) > 8 else ""), file=sys.stderr)
        if not (new_relics - old_relics) and not (old_relics - new_relics) \
           and not (new_sets - old_sets) and not (old_sets - new_sets):
            print("  レリックとセットに増減なし（Vaulted 状態や確率は変わっているかもしれない）", file=sys.stderr)

    print(file=sys.stderr)
    for out in args.out:
        os.makedirs(os.path.dirname(out), exist_ok=True)
        with open(out, "w") as f:
            json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
        print(f"生成: {out}  ({os.path.getsize(out)/1024:.0f} KB)", file=sys.stderr)
    print(f"  レリック {len(data['relics'])} / セット {len(data['sets'])} / パーツ {len(data['parts'])}",
          file=sys.stderr)


if __name__ == "__main__":
    sys.exit(main() or 0)
