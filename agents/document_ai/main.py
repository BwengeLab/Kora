from __future__ import annotations

import os

import uvicorn


def main() -> None:
    uvicorn.run(
        "agents.document_ai.service:app",
        host=os.getenv("KORA_DOCUMENT_AI_HOST", "127.0.0.1"),
        port=int(os.getenv("KORA_DOCUMENT_AI_PORT", "8088")),
    )


if __name__ == "__main__":
    main()
