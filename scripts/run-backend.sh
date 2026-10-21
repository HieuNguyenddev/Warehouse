#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
backend="$root/backend"
cd "$backend"

read_env() {
  local key="$1"
  local line value
  line="$(grep -E "^${key}=" .env | tail -n 1 || true)"
  value="${line#*=}"
  value="${value#"${value%%[![:space:]]*}"}"
  value="${value%"${value##*[![:space:]]}"}"
  value="${value%\"}"
  value="${value#\"}"
  printf '%s' "$value"
}

if [ "${1:-}" = "stop" ]; then
  docker compose stop postgres
  echo "Đã dừng PostgreSQL. Dữ liệu vẫn nằm trong volume postgres-data."
  exit 0
fi

if [ ! -f .env ]; then
  cp .env.example .env
  chmod 600 .env
  echo "Đã tạo backend/.env từ .env.example."
  echo "Sửa POSTGRES_PASSWORD, JWT_KEY (ít nhất 32 ký tự) và SEED_PASSWORD, rồi chạy lại: ./scripts/run-backend.sh"
  exit 1
fi

password="$(read_env POSTGRES_PASSWORD)"
jwt="$(read_env JWT_KEY)"
seed_password="$(read_env SEED_PASSWORD)"
development_connection="$(read_env CONNECTION_STRING_DEVELOPMENT)"

if [ -z "$password" ] || [ "$password" = "choose-a-long-password" ]; then
  echo "Đặt POSTGRES_PASSWORD trong backend/.env. Mật khẩu này dùng cho container PostgreSQL."
  exit 1
fi

if [ -z "$jwt" ] || [ "$jwt" = "replace-with-at-least-32-random-characters" ] || [ "${#jwt}" -lt 32 ]; then
  echo "Đặt JWT_KEY trong backend/.env, chuỗi tự gõ dài ít nhất 32 ký tự."
  exit 1
fi

if [ -z "$seed_password" ] || [ "$seed_password" = "choose-a-long-admin-password" ]; then
  echo "Đặt SEED_PASSWORD trong backend/.env. Đây là mật khẩu admin lúc tạo tài khoản lần đầu."
  exit 1
fi

if [ -z "$development_connection" ]; then
  docker compose up -d postgres
else
  echo "Máy development dùng CONNECTION_STRING_DEVELOPMENT, không bật PostgreSQL local."
fi

if [ -z "$development_connection" ]; then
  healthy=""
  for _ in $(seq 1 30); do
    cid="$(docker compose ps -q postgres || true)"
    if [ -n "$cid" ]; then
      healthy="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{end}}' "$cid" 2>/dev/null || true)"
    fi
    if [ "$healthy" = "healthy" ]; then
      break
    fi
    sleep 2
  done

  if [ "$healthy" != "healthy" ]; then
    echo "PostgreSQL chưa healthy. Xem log: docker compose logs postgres --tail 40"
    exit 1
  fi

  development_connection="Host=localhost;Port=5432;Database=RoleManagementDb;Username=postgres;Password=${password}"
fi

dotnet restore
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "$development_connection"
echo "API: http://localhost:5252    Swagger: http://localhost:5252/swagger"
exec dotnet run --launch-profile http
