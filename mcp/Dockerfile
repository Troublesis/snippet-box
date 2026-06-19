# syntax=docker/dockerfile:1
FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim

WORKDIR /app

ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    PYTHONUNBUFFERED=1

# Resolve dependencies first so this layer caches across code changes.
COPY pyproject.toml ./
RUN uv sync --no-dev

# Application code.
COPY server.py ./

EXPOSE 8000

CMD ["uv", "run", "--no-dev", "server.py"]
