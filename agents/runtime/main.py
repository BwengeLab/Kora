from __future__ import annotations

import os

import uvicorn


def main() -> None:
    uvicorn.run(
        "agents.runtime.service:app",
        host=os.getenv("KORA_AGENT_RUNTIME_HOST", "127.0.0.1"),
        port=int(os.getenv("KORA_AGENT_RUNTIME_PORT", "8089")),
    )


if __name__ == "__main__":
    main()
