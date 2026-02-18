FROM python:3.14-slim as builder
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

ENV UV_COMPILE_BYTECODE=1
ENV UV_LINK_MODE=copy

# Copy dependency files
COPY pyproject.toml uv.lock ./

# Install dependencies
# Use --frozen to ensure we use the lockfile exactly
# Use --no-install-project to skip installing the project itself (we just want deps)
# Use --no-dev to skip dev dependencies
RUN uv sync --frozen --no-install-project --no-dev

FROM python:3.14-slim

WORKDIR /app

# Copy the environment from builder
COPY --from=builder /app/.venv /app/.venv

# Add venv to path
ENV PATH="/app/.venv/bin:$PATH"

COPY . .
ENV PYTHONPATH=/app

CMD ["python", "-m", "security.worker.worker"]
