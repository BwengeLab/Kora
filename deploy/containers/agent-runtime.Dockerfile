FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    KORA_AGENT_RUNTIME_HOST=0.0.0.0 \
    KORA_AGENT_RUNTIME_PORT=8089

WORKDIR /app
COPY requirements.txt ./
RUN python -m pip install --no-cache-dir -r requirements.txt
COPY agents ./agents
COPY testdata/labels ./testdata/labels

EXPOSE 8089
CMD ["python", "-m", "agents.runtime.main"]
