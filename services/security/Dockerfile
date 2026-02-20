FROM python:3.14-slim as builder
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

ENV UV_COMPILE_BYTECODE=1
ENV UV_LINK_MODE=copy

COPY pyproject.toml uv.lock ./

RUN uv sync --frozen --no-install-project --no-dev --no-cache

FROM python:3.14-slim

WORKDIR /app

# Copy the environment from builder
COPY --from=builder /app/.venv /app/.venv

# Add venv to path
ENV PATH="/app/.venv/bin:$PATH"

COPY . .
ENV PYTHONPATH=/app

CMD ["python", "-m", "security.worker.worker"]
