# Pythonの公式イメージをベースとして使用
FROM python:3.9-slim

# 環境変数を設定
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# 必要なパッケージをインストール
RUN apt-get update && apt-get install -y \
    curl \
    libpq-dev \
    gcc \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

# 作業ディレクトリを作成
RUN mkdir -p /app/code

# 必要なパッケージをコピー
COPY requirements.txt ./requirements.txt

# 必要なパッケージをインストール
RUN pip install --no-cache-dir -r requirements.txt

COPY ./entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

# Djangoを起動
CMD ["./entrypoint.sh"]