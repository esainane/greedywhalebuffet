#!/usr/bin/env python3

import argparse
import json
import sys
from pathlib import Path
from collections import defaultdict

DEFAULT_SCRIPT = Path("static/greedy.json")
DEFAULT_NIGHTSHEET = Path("static/nightsheet.json")
DEFAULT_ID_MAPPINGS = Path("static/id_mappings.json")
DEFAULT_ROLES = Path("static/roles.json")

ALWAYS_INCLUDE = {"dusk", "dawn", "minioninfo", "demoninfo"}
KNOWN_SUFFIXES = ("_winningclub", "_wewew", "_ultimate", "_day2", "_day3", "_day4")


def load_json(path: Path):
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def canonical_id(role_id, alias_map):
    mapped = alias_map.get(role_id, role_id)
    if mapped != role_id:
        return mapped

    for suffix in KNOWN_SUFFIXES:
        if role_id.endswith(suffix):
            return role_id[: -len(suffix)]

    if role_id.endswith("_popppp") or role_id.endswith("_poppppp"):
        return role_id.split("_poppp", 1)[0]

    return role_id


def normalize_script_entries(script_raw):
    if isinstance(script_raw, list):
        return script_raw
    if isinstance(script_raw, dict):
        for key in ("characters", "script"):
            value = script_raw.get(key)
            if isinstance(value, list):
                return value
    raise ValueError(
        "Script JSON must be a list or contain a list in 'characters'/'script'."
    )


def collect_script_ids_and_names(entries):
    script_ids = set()
    script_names = {}

    for entry in entries:
        if isinstance(entry, str):
            script_ids.add(entry)
            continue

        if isinstance(entry, dict):
            role_id = entry.get("id")
            role_name = entry.get("name")
            if isinstance(role_id, str):
                script_ids.add(role_id)
                if isinstance(role_name, str):
                    script_names[role_id] = role_name

    return script_ids, script_names


def build_role_name_map(roles_raw):
    role_names = {}
    if isinstance(roles_raw, list):
        for entry in roles_raw:
            if isinstance(entry, dict):
                role_id = entry.get("id")
                role_name = entry.get("name")
                if isinstance(role_id, str) and isinstance(role_name, str):
                    role_names[role_id] = role_name
    return role_names


def build_reference_order_map(order):
    return {role_id: idx for idx, role_id in enumerate(order, start=1)}


def find_reference_index(role_id, reference_map, alias_map):
    if role_id in reference_map:
        return reference_map[role_id]

    canonical = canonical_id(role_id, alias_map)
    for candidate, index in reference_map.items():
        if canonical_id(candidate, alias_map) == canonical:
            return index

    return None


def sort_ids_alphabetically(role_ids):
    return sorted(role_ids, key=lambda value: (value.lower(), value))


def build_legacy_order(entries, reference_order, alias_map, field):
    reference_map = build_reference_order_map(reference_order)
    buckets = defaultdict(set)

    for token in ALWAYS_INCLUDE:
        idx = reference_map.get(token)
        if isinstance(idx, int) and idx > 0:
            buckets[idx].add(token)

    for entry in entries:
        role_id = None
        explicit_index = None
        has_explicit_index = False

        if isinstance(entry, str):
            role_id = entry
        elif isinstance(entry, dict):
            role_id = entry.get("id")
            if field in entry:
                has_explicit_index = True
                value = entry.get(field)
                if isinstance(value, int):
                    explicit_index = value

        if not isinstance(role_id, str):
            continue
        if role_id == "_meta":
            continue

        if has_explicit_index:
            if isinstance(explicit_index, int) and explicit_index > 0:
                buckets[explicit_index].add(role_id)
            # Explicit 0/non-int means do not include in this night order.
            continue

        idx = find_reference_index(role_id, reference_map, alias_map)
        if isinstance(idx, int) and idx > 0:
            buckets[idx].add(role_id)

    output = []
    for idx in sorted(buckets):
        output.extend(sort_ids_alphabetically(buckets[idx]))

    return output


def display_name(role_id, script_names, role_names, alias_map):
    if role_id in ALWAYS_INCLUDE:
        return role_id

    canonical = canonical_id(role_id, alias_map)

    if role_id in script_names:
        return script_names[role_id]
    if canonical in script_names:
        return script_names[canonical]
    if role_id in role_names:
        return role_names[role_id]
    if canonical in role_names:
        return role_names[canonical]

    return role_id


def main():
    parser = argparse.ArgumentParser(
        description=(
            "Print legacy _meta firstNight/otherNight arrays for a script based on a nightsheet order."
        )
    )
    parser.add_argument(
        "--script", type=Path, default=DEFAULT_SCRIPT, help="Path to script JSON"
    )
    parser.add_argument(
        "--nightsheet",
        "--nightorder",
        dest="nightsheet",
        type=Path,
        default=DEFAULT_NIGHTSHEET,
        help="Path to nightsheet/nightorder JSON",
    )
    parser.add_argument(
        "--id-mappings",
        type=Path,
        default=DEFAULT_ID_MAPPINGS,
        help="Path to id_mappings.json",
    )
    parser.add_argument(
        "--roles", type=Path, default=DEFAULT_ROLES, help="Path to roles.json"
    )
    parser.add_argument(
        "--names",
        action="store_true",
        help="Print human-readable character names instead of role IDs where possible",
    )
    args = parser.parse_args()

    nightsheet = load_json(args.nightsheet)
    script_raw = load_json(args.script)
    alias_map = load_json(args.id_mappings)
    roles_raw = load_json(args.roles)

    entries = normalize_script_entries(script_raw)
    _, script_names = collect_script_ids_and_names(entries)
    role_names = build_role_name_map(roles_raw)

    first_night = build_legacy_order(
        entries, nightsheet["firstNight"], alias_map, "firstNight"
    )
    other_night = build_legacy_order(
        entries, nightsheet["otherNight"], alias_map, "otherNight"
    )

    if args.names:
        first_night = [
            display_name(role_id, script_names, role_names, alias_map)
            for role_id in first_night
        ]
        other_night = [
            display_name(role_id, script_names, role_names, alias_map)
            for role_id in other_night
        ]

    print(
        json.dumps(
            {"firstNight": first_night, "otherNight": other_night},
            indent=2,
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    main()
