# Frontend

Admin React. Bản production chỉ lấy cấu hình từ `frontend/.env.production`. `vite.config.js` không nhận `VITE_API_BASE_URL` hay `VITE_TURNSTILE_SITE_KEY` từ shell, Docker hay `backend/.env`. File này nằm trong `frontend/.gitignore`, nên `git pull` không tạo lại sau khi file đã được gỡ khỏi Git.

Build production dừng khi file thiếu, khi API không phải `https` trên tên miền công khai, khi URL chứa tài khoản hoặc mật khẩu, hoặc khi Site Key không phải khóa Cloudflare dạng `0x`. Khóa thử `1x` bị từ chối.

## Tạo `.env.production` trên VPS

Từ máy đang dùng, SSH vào VPS rồi đứng đúng thư mục frontend:

```bash
ssh -p 22 root@103.183.120.48
cd /root/Documents/Warehouse/frontend
pwd
ls -l .env.production || true
```

- `ssh -p 22 root@103.183.120.48` mở shell trên VPS. Các lệnh sau chạy trên VPS.
- `cd /root/Documents/Warehouse/frontend` vào thư mục có `Dockerfile` và `vite.config.js`.
- `pwd` phải in `/root/Documents/Warehouse/frontend`.
- `ls -l .env.production` báo không có file thì tạo mới. File đã có thì sửa tay. Lệnh `>` bên dưới xóa nội dung cũ, chỉ chạy khi file chưa có.

Tạo file khi chưa có. Thay `SITE_KEY_TU_CLOUDFLARE` bằng **Site Key** dạng `0x` của widget Turnstile cho hostname `admin.minhhieudev.id.vn`. Các bước tạo widget nằm ở `backend/README.MD`. **Secret Key** ghi vào `TURNSTILE_SECRET_KEY` trong `backend/.env`, không ghi vào file này.

```bash
umask 077
test -f .env.production || printf '%s\n' \
  'VITE_API_BASE_URL=link API' \
  'VITE_TURNSTILE_SITE_KEY=SITE_KEY_TU_CLOUDFLARE' > .env.production
chmod 600 .env.production
grep -c '^VITE_API_BASE_URL=link API$' .env.production
grep -c '^VITE_TURNSTILE_SITE_KEY=0x' .env.production
```

- Hai dòng không có khoảng trắng hai bên dấu `=`, không bọc dấu nháy.
- `VITE_API_BASE_URL` là địa chỉ API mà trình duyệt admin gọi.
- `VITE_TURNSTILE_SITE_KEY` là khóa site công khai, gắn vào form đăng nhập lúc build.
- `chmod 600` để chỉ user hiện tại đọc được file.
- Mỗi `grep -c` phải in `1`.
- Không `git add .env.production`.

Sửa file xong thì build lại image frontend. Vite nhúng hai giá trị vào JavaScript lúc build. Container đang chạy không đọc lại file.

```bash
cd /root/Documents/Warehouse/backend
sudo docker compose up -d --build frontend
sudo docker compose ps frontend
```

- Lệnh chạy ở thư mục có `docker-compose.yml`. Context build là `../frontend`, nên `.env.production` vừa tạo được copy vào lúc build.
- `docker compose ps frontend` phải thấy service `frontend` là `running`.

