# Stage 1: download rembg model separately (cached layer)
FROM python:3.11-slim AS model-downloader

RUN pip install --no-cache-dir rembg==2.0.59 onnxruntime

RUN python -c "from rembg import new_session; new_session('u2net')"

# Stage 2: final image
FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy pre-downloaded model from stage 1
COPY --from=model-downloader /root/.u2net /root/.u2net

COPY . .

EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
