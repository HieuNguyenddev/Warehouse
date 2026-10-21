#!/usr/bin/env bash
set -euo pipefail

kind="${1:-}"
token="${TELEGRAM_BOT_TOKEN:-}"
chat="${TELEGRAM_CHAT_ID:-}"

if [ -z "$token" ] || [ -z "$chat" ]; then
  echo "Chưa có TELEGRAM_BOT_TOKEN hoặc TELEGRAM_CHAT_ID. Bỏ qua thông báo Telegram."
  exit 0
fi

repo="${GITHUB_REPOSITORY:-unknown}"
branch="${GITHUB_REF_NAME:-main}"
commit="${GITHUB_SHA:-unknown}"
commit_short="${commit:0:7}"
website="${DEPLOY_WEBSITE_URL:-https://admin.minhhieudev.id.vn}"
error="${DEPLOY_ERROR:-Deploy thất bại. Xem log GitHub Actions.}"

html_escape() {
  printf '%s' "$1" | sed 's/&/\&amp;/g; s/</\&lt;/g; s/>/\&gt;/g'
}

repo_html="$(html_escape "$repo")"
branch_html="$(html_escape "$branch")"
commit_html="$(html_escape "$commit_short")"
website_html="$(html_escape "$website")"
error_html="$(html_escape "$(printf '%s' "$error" | tr '\n' ' ' | cut -c1-400)")"

case "$kind" in
  start)
    text="$(printf 'Bắt đầu deploy website\nRepository: <code>%s</code>\nBranch: <code>%s</code>\nCommit: <code>%s</code>' \
      "$repo_html" "$branch_html" "$commit_html")"
    ;;
  success)
    text="$(printf 'Deploy thành công\nRepository: <code>%s</code>\nBranch: <code>%s</code>\nWebsite: <code>%s</code>' \
      "$repo_html" "$branch_html" "$website_html")"
    ;;
  failure)
    text="$(printf 'Deploy thất bại\nRepository: <code>%s</code>\nBranch: <code>%s</code>\nCommit: <code>%s</code>\nError: <code>%s</code>' \
      "$repo_html" "$branch_html" "$commit_html" "$error_html")"
    ;;
  *)
    echo "Cách dùng: notify-telegram.sh start|success|failure"
    exit 0
    ;;
esac

http_code="$(curl -sS --max-time 20 -o /tmp/telegram-notify.json -w '%{http_code}' \
  -X POST "https://api.telegram.org/bot${token}/sendMessage" \
  --data-urlencode "chat_id=${chat}" \
  --data-urlencode "parse_mode=HTML" \
  --data-urlencode "text=${text}" || true)"

if [ "$http_code" != "200" ]; then
  echo "Telegram trả HTTP ${http_code}. Deploy vẫn tiếp tục."
  exit 0
fi

echo "Đã gửi Telegram: ${kind}"
