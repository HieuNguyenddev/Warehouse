#!/bin/sh
set -eu

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/backend"

if [ ! -f .env ]; then
  echo "Thiếu backend/.env. Tạo file từ .env.example trước khi bật Garage."
  exit 1
fi

access="$(grep -E '^GARAGE_ACCESS_KEY=' .env | tail -n 1 | cut -d= -f2- || true)"
secret="$(grep -E '^GARAGE_SECRET_KEY=' .env | tail -n 1 | cut -d= -f2- || true)"
bucket="$(grep -E '^GARAGE_BUCKET=' .env | tail -n 1 | cut -d= -f2- || true)"

example_access="GK0123456789abcdef0123456789abcd"
example_secret="0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
if ! printf '%s' "$access" | grep -Eq '^GK[0-9a-fA-F]{30}$' \
  || ! printf '%s' "$secret" | grep -Eq '^[0-9a-fA-F]{64}$' \
  || [ "$access" = "$example_access" ] \
  || [ "$secret" = "$example_secret" ] \
  || [ -z "$bucket" ]; then
  access="GK$(openssl rand -hex 15)"
  secret="$(openssl rand -hex 32)"
  bucket="warehouse"
  grep -v -E '^(GARAGE_ACCESS_KEY|GARAGE_SECRET_KEY|GARAGE_BUCKET)=' .env > .env.tmp
  printf '%s\n' \
    "GARAGE_ACCESS_KEY=${access}" \
    "GARAGE_SECRET_KEY=${secret}" \
    "GARAGE_BUCKET=${bucket}" >> .env.tmp
  mv .env.tmp .env
  chmod 600 .env
  echo "Đã ghi khóa Garage vào backend/.env."
fi

if [ ! -f garage/garage.toml ]; then
  rpc="$(openssl rand -hex 32)"
  admin="$(openssl rand -hex 24)"
  sed \
    -e "s/__RPC_SECRET__/${rpc}/" \
    -e "s/__ADMIN_TOKEN__/${admin}/" \
    garage/garage.toml.template > garage/garage.toml
  chmod 600 garage/garage.toml
  echo "Đã ghi backend/garage/garage.toml."
fi
