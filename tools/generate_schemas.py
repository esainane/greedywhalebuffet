#!/usr/bin/env python3

import argparse
import json
from pathlib import Path
from typing import Any

DEFAULT_SCRIPT_SCHEMA = Path("schemas/script-schema.json")
DEFAULT_ROLES_SCHEMA = Path("schemas/roles-schema.json")
DEFAULT_JINX_SCHEMA = Path("schemas/jinx-schema.json")

type Schema = dict[str, Any]


def load_json(path: Path) -> Schema:
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def dump_json(path: Path, payload: Schema) -> None:
    with path.open("w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2, ensure_ascii=False)
        f.write("\n")


def get_character_schema(script_schema: Schema) -> Schema:
    one_of = script_schema["items"]["oneOf"]
    for candidate in one_of:
        if (
            isinstance(candidate, dict)
            and candidate.get("type") == "object"
            and candidate.get("title") == "Script Character"
        ):
            return candidate

    raise ValueError("Could not find Script Character schema in script-schema.json")


def build_roles_schema(script_schema: Schema) -> Schema:
    character_schema = get_character_schema(script_schema)
    return {
        "$schema": script_schema["$schema"],
        "type": "array",
        "default": script_schema.get("default", []),
        "title": "Blood on the Clocktower Extra Characters",
        "minItems": 1,
        "maxItems": script_schema.get("maxItems", 201),
        "items": {"oneOf": [character_schema]},
    }


def build_jinx_schema(script_schema: Schema) -> Schema:
    character_schema = get_character_schema(script_schema)
    character_props = character_schema["properties"]
    id_schema = character_props["id"]
    jinxes_schema = character_props["jinxes"]

    return {
        "$schema": script_schema["$schema"],
        "type": "array",
        "default": [],
        "title": "Blood on the Clocktower Supplementary Script Jinxes",
        "minItems": 0,
        "maxItems": script_schema.get("maxItems", 201),
        "items": {
            "oneOf": [
                {
                    "type": "object",
                    "title": "Script Character",
                    "required": ["id", "jinx"],
                    "additionalProperties": False,
                    "properties": {
                        "id": id_schema,
                        "jinx": jinxes_schema,
                    },
                    "examples": [
                        {
                            "id": "alhadikhia",
                            "jinx": [
                                {
                                    "id": "mastermind",
                                    "reason": "If the Al-Hadikhia dies by execution, and the Mastermind is alive, the Al-Hadikhia chooses 3 good players tonight: if all 3 choose to live, evil wins. Otherwise, good wins.",
                                },
                                {
                                    "id": "princess",
                                    "reason": "If the Princess nominated & executed a player on their 1st day, no one dies to the Al-Hadikhia tonight.",
                                },
                            ],
                        }
                    ],
                }
            ]
        },
    }


def main() -> None:
    parser = argparse.ArgumentParser(
        description=(
            "Generate roles and jinx schemas from the canonical script schema snapshot."
        )
    )
    parser.add_argument(
        "--script-schema",
        type=Path,
        default=DEFAULT_SCRIPT_SCHEMA,
        help="Path to source script-schema.json",
    )
    parser.add_argument(
        "--roles-schema",
        type=Path,
        default=DEFAULT_ROLES_SCHEMA,
        help="Path to output roles-schema.json",
    )
    parser.add_argument(
        "--jinx-schema",
        type=Path,
        default=DEFAULT_JINX_SCHEMA,
        help="Path to output jinx-schema.json",
    )
    args = parser.parse_args()

    script_schema = load_json(args.script_schema)
    roles_schema = build_roles_schema(script_schema)
    jinx_schema = build_jinx_schema(script_schema)

    dump_json(args.roles_schema, roles_schema)
    dump_json(args.jinx_schema, jinx_schema)


if __name__ == "__main__":
    main()
