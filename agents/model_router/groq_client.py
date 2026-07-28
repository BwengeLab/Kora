from __future__ import annotations

from dataclasses import dataclass
import json
import os
from typing import Any
from urllib import error, request


DEFAULT_BASE_URL = "https://api.groq.com/openai/v1"
DEFAULT_MODEL = "llama-3.3-70b-versatile"


class GroqError(RuntimeError):
    """Raised when Groq cannot return a valid model response."""


@dataclass(frozen=True)
class GroqResponse:
    text: str
    model: str
    prompt_tokens: int
    completion_tokens: int


class GroqClient:
    def __init__(
        self,
        api_key: str | None = None,
        model: str | None = None,
        base_url: str | None = None,
        timeout_seconds: float = 30,
    ) -> None:
        self.api_key = (api_key or os.getenv("GROQ_API_KEY", "")).strip()
        self.model = (model or os.getenv("GROQ_MODEL", DEFAULT_MODEL)).strip()
        self.base_url = (base_url or os.getenv("GROQ_BASE_URL", DEFAULT_BASE_URL)).rstrip("/")
        self.timeout_seconds = timeout_seconds
        if not self.api_key:
            raise ValueError("GROQ_API_KEY is required")
        if not self.model:
            raise ValueError("GROQ_MODEL is required")

    def generate(self, system_prompt: str, user_prompt: str) -> GroqResponse:
        if not system_prompt.strip() or not user_prompt.strip():
            raise ValueError("system and user prompts are required")
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "temperature": 0.1,
            "n": 1,
        }
        req = request.Request(
            f"{self.base_url}/chat/completions",
            data=json.dumps(payload).encode("utf-8"),
            method="POST",
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
                "User-Agent": "Kora-Agent-Runtime/1.0",
            },
        )
        try:
            with request.urlopen(req, timeout=self.timeout_seconds) as response:
                body = json.loads(response.read().decode("utf-8"))
        except error.HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")[:500]
            raise GroqError(f"Groq returned HTTP {exc.code}: {detail}") from exc
        except (error.URLError, TimeoutError, json.JSONDecodeError) as exc:
            raise GroqError(f"Groq request failed: {exc}") from exc
        return self._parse(body)

    @staticmethod
    def _parse(body: dict[str, Any]) -> GroqResponse:
        try:
            text = body["choices"][0]["message"]["content"]
            model = body["model"]
        except (KeyError, IndexError, TypeError) as exc:
            raise GroqError("Groq response is missing completion content") from exc
        if not isinstance(text, str) or not text.strip():
            raise GroqError("Groq response contains empty completion content")
        usage = body.get("usage") or {}
        return GroqResponse(
            text=text.strip(),
            model=str(model),
            prompt_tokens=int(usage.get("prompt_tokens", 0)),
            completion_tokens=int(usage.get("completion_tokens", 0)),
        )

