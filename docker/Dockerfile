FROM python:3.11-slim AS builder
WORKDIR /app
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt || true
COPY . /app
RUN python -m compileall /app

FROM python:3.11-slim AS runtime
WORKDIR /app 
COPY --from=builder /app /app
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app
EXPOSE 8000
CMD ["python", "messaging/http_handler.py"]
