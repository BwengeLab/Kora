from __future__ import annotations

import shutil
from pathlib import Path

from grpc_tools import protoc


ROOT = Path(__file__).resolve().parents[1]
PROTO_ROOT = ROOT / "proto"
OUT = ROOT / "gen" / "python"


def main() -> None:
    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir(parents=True, exist_ok=True)

    proto_files = sorted(str(path) for path in PROTO_ROOT.rglob("*.proto"))
    args = [
        "grpc_tools.protoc",
        f"-I{ROOT}",
        f"--python_out={OUT}",
        f"--grpc_python_out={OUT}",
        f"--descriptor_set_out={OUT / 'kora.pb'}",
        "--include_imports",
        *proto_files,
    ]
    result = protoc.main(args)
    if result != 0:
        raise SystemExit(result)
    print(f"generated {len(proto_files)} proto files into {OUT}")


if __name__ == "__main__":
    main()
