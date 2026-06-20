FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    KORA_DOCUMENT_AI_HOST=0.0.0.0 \
    KORA_DOCUMENT_AI_PORT=8088

RUN apt-get update \
    && apt-get install -y --no-install-recommends tesseract-ocr \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt ./
RUN python -m pip install --no-cache-dir -r requirements.txt

COPY agents ./agents

EXPOSE 8088

CMD ["python", "-m", "agents.document_ai.main"]
