FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    HF_HOME=/models

WORKDIR /app

# CPU build of PyTorch first (the default build pulls several GB of GPU libraries).
COPY requirements.txt .
RUN pip install --extra-index-url https://download.pytorch.org/whl/cpu torch \
    && pip install -r requirements.txt

# Download the embedding model at build time so the first search is not slow.
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('intfloat/multilingual-e5-small', device='cpu')"

COPY . .

EXPOSE 8000
HEALTHCHECK CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1

# The API key is NOT baked into the image: pass ANTHROPIC_API_KEY at run time.
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000"]
