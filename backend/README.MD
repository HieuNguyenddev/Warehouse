# Backend — Role Management API

API ASP.NET Core .NET 10 trong thư mục này. Dữ liệu nằm ở PostgreSQL 16, database `RoleManagementDb`. Khi khởi động, API tự chạy migration và tạo bảng `Roles`.

| | Máy thật | VPS |
| --- | --- | --- |
| Cách chạy | .NET SDK + PostgreSQL | Docker Compose |
| API | `http://localhost:5252` | `https://api.minhhieudev.id.vn` |
| PostgreSQL | `localhost:5432` | trong Docker, cổng `5432` trên host |
| Ollama | `http://127.0.0.1:11434` | container `ollama`, mô hình `qwen2.5:0.5b` |
| Swagger | `http://localhost:5252/swagger` | `https://api.minhhieudev.id.vn/swagger` |

User PostgreSQL là `postgres`. Mật khẩu database, khóa ký JWT và mật khẩu tài khoản admin không nằm trong git. Máy thật và VPS cùng đặt các giá trị đó trong file `backend/.env`. `dotnet run` đọc file này khi đứng trong thư mục `backend`. Docker Compose đưa các biến trong file vào container.

Thư mục mã nguồn:

```text
backend/
  Program.cs
  docker-compose.yml
  Data/            AppDbContext
  Modules/Roles/
    Controllers/   nhận HTTP
    Services/      kiểm tra tên trùng, chuẩn hóa dữ liệu
    Repositories/  đọc ghi PostgreSQL
    DTOs/          dữ liệu vào và ra
    Entities/      bảng Roles
```

## 1. Chạy trên máy thật

Máy phát triển cần .NET SDK 10 và PostgreSQL 16. API chạy bằng `dotnet run`, không cần Nginx.

### 1.1. Cài .NET SDK 10

macOS:

```bash
brew install dotnet@10
dotnet --version
```

- `brew install dotnet@10` cài SDK 10. Project khai báo `net10.0` trong `RoleManagement.Api.csproj`, SDK thấp hơn sẽ không build được.
- `dotnet --version` phải in số bắt đầu bằng `10.`.

Ubuntu:

```bash
wget https://packages.microsoft.com/config/ubuntu/24.04/packages-microsoft-prod.deb -O packages-microsoft-prod.deb
sudo dpkg -i packages-microsoft-prod.deb
rm packages-microsoft-prod.deb
sudo apt update
sudo apt install -y dotnet-sdk-10.0
dotnet --version
```

- `wget` tải kho gói Microsoft cho Ubuntu 24.04.
- `sudo dpkg -i` đăng ký kho đó.
- `sudo apt install -y dotnet-sdk-10.0` cài SDK. `-y` không hỏi lại.

### 1.2. Chạy PostgreSQL

Đứng trong thư mục `backend` (nơi có `docker-compose.yml`). Chỉ bật database, không bật Nginx:

```bash
cd backend
cp .env.example .env
docker compose up -d postgres
docker compose ps postgres
```

- `cp .env.example .env` tạo file bí mật cục bộ. Sửa `POSTGRES_PASSWORD`, `JWT_KEY` và `SEED_PASSWORD`. `JWT_KEY` là chuỗi tự gõ, dài ít nhất 32 ký tự. File `.env` bị git bỏ qua.
- Database đã tạo từ trước thì `POSTGRES_PASSWORD` phải đúng mật khẩu cũ của volume `postgres-data`. Đổi mật khẩu trong `.env` không đổi mật khẩu bên trong volume đã có.
- `docker compose up -d postgres` tạo container `postgres:16-alpine`, database `RoleManagementDb`, user `postgres`, và mở cổng `5432` ra máy thật.
- `docker compose ps postgres` phải thấy trạng thái `running` và health `healthy`.

Chưa có Docker thì cài PostgreSQL 16 bằng trình cài của hệ điều hành, tạo database `RoleManagementDb` và user `postgres`. `appsettings.json` chỉ giữ host, cổng, database và username. Mật khẩu đặt ở bước sau.

### 1.3. Chạy API

```bash
cd backend
dotnet restore
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Host=localhost;Port=5432;Database=RoleManagementDb;Username=postgres;Password=YOUR_PASSWORD"
dotnet run --launch-profile http
```

- `dotnet restore` tải NuGet (EF Core, Npgsql, Swagger).
- `dotnet user-secrets set` ghi chuỗi kết nối, gồm mật khẩu database, vào kho user secrets của máy. Kho này nằm ngoài repository. Thay `YOUR_PASSWORD` bằng mật khẩu PostgreSQL. Profile Development đọc secret này và ghi đè `appsettings.json`.
- `JWT_KEY` và `SEED_PASSWORD` không đặt bằng user secrets. API đọc hai giá trị đó từ `backend/.env`.
- `dotnet run --launch-profile http` build và chạy. Profile `http` trong `Properties/launchSettings.json` lắng nghe `http://localhost:5252` và đặt `ASPNETCORE_ENVIRONMENT=Development`.
- Lần chạy đầu kết nối PostgreSQL, tạo bảng, rồi tạo vai trò `Admin` và tài khoản trong `SEED_USERNAME` nếu tên đó chưa có. Mật khẩu lúc tạo là `SEED_PASSWORD`. Tài khoản đã có thì file `.env` không đổi mật khẩu đang lưu trong database. Giữ terminal này mở. `Ctrl+C` thì API dừng.

Kiểm tra đăng nhập. Thay `MAT_KHAU_ADMIN` bằng `SEED_PASSWORD` trong `.env`:

```bash
curl -s http://localhost:5252/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"MAT_KHAU_ADMIN"}'
```

- JSON có `token` nghĩa là khóa JWT và tài khoản admin đã dùng được.
- `GET /api/roles` không kèm token trả **401**.
- Swagger: mở `http://localhost:5252/swagger`, bấm **Authorize**, dán token.

Tạo một vai trò:

```bash
curl -X POST http://localhost:5252/api/roles \
  -H 'Content-Type: application/json' \
  -d '{"name":"Admin","description":"Quản trị hệ thống"}'
```

- `201` và JSON có `id` là đã ghi vào PostgreSQL. Gửi lại cùng tên thì `409` vì tên không được trùng.

### 1.4. Dừng trên máy thật

`Ctrl+C` trong terminal đang chạy `dotnet run`, rồi tắt database nếu không dùng nữa:

```bash
cd backend
docker compose stop postgres
```

- `docker compose stop postgres` dừng container nhưng giữ volume `postgres-data`, nên dữ liệu còn khi bật lại.

## 2. Cài trên VPS Ubuntu 24.04

Máy đích: 1 CPU, 2 GB RAM, 25 GB đĩa. API không mở cổng `8080` ra internet. Nginx trong Compose nhận `80` và `443`. Ollama và Garage chỉ nói chuyện trong mạng Docker.

Thư mục trên VPS: `/root/Documents/Warehouse`. Compose nằm ở `/root/Documents/Warehouse/backend`.

Trần RAM lúc chạy: API 192 MB, PostgreSQL 96 MB, Garage 64 MB, Ollama 640 MB, frontend 24 MB, Nginx 16 MB. Cộng lại khoảng 1 GB, phần còn lại của 2 GB dành cho Ubuntu. Mỗi trần đi kèm `memswap_limit` bằng đúng trần đó, nên container không chiếm swap. Swap 1 GB của máy chỉ dùng khi build image. `qwen2.5:0.5b` lúc trả lời chiếm khoảng 452 MB và được nhả sau 60 giây. Ngữ cảnh 1024 token, một luồng, một lượt. File mô hình 397 MB. Log mỗi container tối đa hai file, mỗi file 10 MB. Container tự chạy lại sau reboot. `ollama-pull` chạy một lần rồi thoát.

### 2.1. Cài Docker

SSH vào VPS bằng user có `sudo`:

```bash
ssh -p 22 root@103.183.120.48
sudo apt update
sudo apt install -y ca-certificates curl git openssl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo systemctl enable --now docker
docker compose version
df -h /
```

- Khối lệnh thêm kho Docker chính thức rồi cài Engine và plugin Compose.
- `docker compose version` in được số phiên bản thì dùng `docker compose`, không dùng `docker-compose`.
- `df -h /` phải còn ít nhất 8 GB trống trước lần build đầu. Image SDK .NET và image Ollama chiếm phần lớn chỗ đó.

Mở SSH, HTTP và HTTPS. Không mở `5432` và `11434` bằng UFW.

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
sudo ufw status
```

Compose vẫn gắn cổng `5432` của PostgreSQL ra host để máy development nối database. Docker chèn luật riêng, nên UFW không chặn cổng này. Chỉ giữ cổng đó khi cần DBeaver hoặc `dotnet run` từ xa.

### 2.2. Thêm 1 GB swap

Làm một lần nếu `swapon --show` chưa có dòng nào. Swap giữ máy sống lúc build image và lúc nạp mô hình.

```bash
sudo fallocate -l 1G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
free -h
```

- `free -h` phải thấy Swap khoảng 1,0 Gi.
- Máy đã cài Ollama bằng systemd thì tắt dịch vụ đó: `sudo systemctl disable --now ollama`.

### 2.3. Lấy mã nguồn

```bash
sudo mkdir -p /root/Documents/Warehouse
sudo git clone https://github.com/HieuNguyenddev/Warehouse.git /root/Documents/Warehouse
cd /root/Documents/Warehouse/backend
pwd
```

- `pwd` phải in `/root/Documents/Warehouse/backend`.
- Frontend nằm cạnh `backend`. Compose build giao diện từ thư mục đó.
- Thư mục đã clone rồi thì `cd /root/Documents/Warehouse && sudo git pull --ff-only`.

### 2.4. Tạo `backend/.env`

Đứng trong `/root/Documents/Warehouse/backend`. File này không đưa vào git.

Database đã chạy từ trước thì lấy đúng mật khẩu volume hiện tại:

```bash
docker compose exec postgres printenv POSTGRES_PASSWORD
```

Container chưa có thì tự chọn một mật khẩu dài và bỏ qua lệnh trên.

Tạo file khi chưa có. Hai chỗ `MAT_KHAU_DANG_DUNG` phải giống nhau. `JWT_KEY` tự gõ, dài ít nhất 32 ký tự, không có khoảng trắng.

```bash
cd /root/Documents/Warehouse/backend
umask 077
test -f .env || printf '%s\n' \
  'POSTGRES_PASSWORD=MAT_KHAU_DANG_DUNG' \
  'JWT_KEY=KHOA_TU_DAT_IT_NHAT_32_KY_TU' \
  'SEED_USERNAME=Admin' \
  'SEED_PASSWORD=Admin@123' \
  'CONNECTION_STRING=Host=postgres;Port=5432;Database=RoleManagementDb;Username=postgres;Password=MAT_KHAU_DANG_DUNG' \
  'TURNSTILE_SECRET_KEY=' > .env
chmod 600 .env
```

File đã có chỉ với `POSTGRES_PASSWORD` thì thêm dòng còn thiếu, không xóa dòng cũ:

```bash
umask 077
grep -q '^JWT_KEY=.' .env || printf '%s\n' 'JWT_KEY=KHOA_TU_DAT_IT_NHAT_32_KY_TU' >> .env
grep -q '^SEED_USERNAME=.' .env || printf '%s\n' 'SEED_USERNAME=Admin' >> .env
grep -q '^SEED_PASSWORD=.' .env || printf '%s\n' 'SEED_PASSWORD=Admin@123' >> .env
grep -q '^CONNECTION_STRING=Host=postgres;' .env || printf '%s\n' "CONNECTION_STRING=Host=postgres;Port=5432;Database=RoleManagementDb;Username=postgres;Password=$(grep -E '^POSTGRES_PASSWORD=' .env | tail -n 1 | cut -d= -f2-)" >> .env
grep -q '^TURNSTILE_SECRET_KEY=' .env || printf '%s\n' 'TURNSTILE_SECRET_KEY=' >> .env
chmod 600 .env
```

| Biến | Ý nghĩa |
| --- | --- |
| `POSTGRES_PASSWORD` | Mật khẩu user `postgres`. Phải khớp volume `postgres-data` đang có |
| `JWT_KEY` | Khóa ký JWT, ít nhất 32 ký tự |
| `SEED_USERNAME` | Tên đăng nhập tạo lúc khởi động. Bỏ dòng thì Compose dùng `admin` |
| `SEED_PASSWORD` | Mật khẩu lúc tạo tài khoản đó lần đầu. Không ghi đè mật khẩu đã lưu |
| `CONNECTION_STRING` | Chuỗi trong Docker. Host là `postgres`, mật khẩu trùng `POSTGRES_PASSWORD` |
| `CONNECTION_STRING_DEVELOPMENT` | Chỉ khi `dotnet run` trên máy development. Container trên VPS không đọc dòng này |
| `TURNSTILE_SECRET_KEY` | Secret Cloudflare. Để trống thì API bỏ qua bước kiểm tra |
| `OLLAMA_URL` | Để trống. Compose dùng `http://ollama:11434` |
| `OLLAMA_MODEL` | Để trống. Compose dùng `qwen2.5:0.5b` |

Site Key và Secret Key lấy ở [dash.cloudflare.com](https://dash.cloudflare.com/), mục **Turnstile**, **Add Widget**. Hostname là `admin.minhhieudev.id.vn`, mode **Managed**. Site Key ghi vào `frontend/.env.production`. Secret Key ghi vào `TURNSTILE_SECRET_KEY`. Cách tạo file frontend nằm ở `frontend/README.MD`.

Sinh khóa Garage và `garage/garage.toml` nếu chưa có:

```bash
bash /root/Documents/Warehouse/scripts/ensure-garage.sh
```

- Script ghi `GARAGE_ACCESS_KEY`, `GARAGE_SECRET_KEY`, `GARAGE_BUCKET=warehouse` khi thiếu hoặc còn giá trị mẫu.
- `garage/garage.toml` không đưa vào git. Ảnh và tệp đi vào bucket `warehouse`. Cổng S3 không mở ra internet.

Kiểm tra mà không in bí mật:

```bash
ls -l .env
grep -c '^POSTGRES_PASSWORD=.' .env
grep -c '^JWT_KEY=.' .env
grep -c '^SEED_PASSWORD=.' .env
grep -c '^CONNECTION_STRING=Host=postgres;' .env
grep -c '^GARAGE_ACCESS_KEY=GK' .env
test -f garage/garage.toml && echo garage_toml_ok
```

- `ls -l .env` phải thấy `-rw-------`.
- Mỗi `grep -c` phải in `1`.
- Dòng cuối phải in `garage_toml_ok`.

### 2.5. Dựng stack

```bash
cd /root/Documents/Warehouse/backend
sudo docker compose up -d --build
sudo docker compose ps
sudo docker compose exec -T ollama ollama list
sudo docker compose exec -T api printenv Ollama__BaseUrl Ollama__Model
sudo docker builder prune -f
```

- Lần đầu kéo image và build API, frontend. `ollama-pull` tải `qwen2.5:0.5b` rồi thoát mã 0. API chỉ chạy sau PostgreSQL, Garage và bước kéo mô hình.
- `docker compose ps` phải thấy `api`, `frontend`, `nginx`, `ollama` là `running`, `postgres` và `garage` là `healthy`, `ollama-pull` là `exited`.
- `ollama list` phải có `qwen2.5:0.5b`.
- `printenv` phải in `http://ollama:11434` và `qwen2.5:0.5b`.
- `docker builder prune -f` xóa cache build để đĩa 25 GB không đầy sau vài lần deploy.

Đăng nhập qua Nginx khi DNS và chứng chỉ đã có. Thay `MAT_KHAU_ADMIN` bằng `SEED_PASSWORD`, hoặc bằng mật khẩu đã đổi trong giao diện nếu tài khoản tạo từ trước.

```bash
curl -s https://api.minhhieudev.id.vn/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"Admin","password":"MAT_KHAU_ADMIN"}'
```

- JSON có `token` nghĩa là API đang phục vụ.
- `GET /api/roles` không kèm `Authorization: Bearer <token>` trả **401**.
- Chưa có chứng chỉ thì gọi `http://IP-VPS` với header `Host: api.minhhieudev.id.vn`.
- Mở `https://admin.minhhieudev.id.vn`, đăng nhập, vào **Trợ lý**. Ô mô hình là `qwen2.5:0.5b`.

Xem log khi một service không lên:

```bash
cd /root/Documents/Warehouse/backend
sudo docker compose logs api --tail 80
sudo docker compose logs postgres --tail 40
sudo docker compose logs ollama-pull --tail 40
sudo docker stats --no-stream
```

- Ollama lúc trả lời nằm quanh 452 MB và dưới trần 640 MB. `free -h` lúc đó vẫn còn RAM trống. Sau 60 giây không hỏi, mô hình được nhả.

Đổi mật khẩu database: sửa trong PostgreSQL rồi sửa `.env`. Chỉ sửa file thì API không vào được volume cũ.

```bash
cd /root/Documents/Warehouse/backend
docker compose exec postgres psql -U postgres -d RoleManagementDb -c "ALTER USER postgres PASSWORD 'MAT_KHAU_MOI';"
umask 077
grep -v -E '^(POSTGRES_PASSWORD|CONNECTION_STRING)=' .env > .env.tmp
printf '%s\n' \
  'POSTGRES_PASSWORD=MAT_KHAU_MOI' \
  'CONNECTION_STRING=Host=postgres;Port=5432;Database=RoleManagementDb;Username=postgres;Password=MAT_KHAU_MOI' >> .env.tmp
mv .env.tmp .env
chmod 600 .env
docker compose up -d --force-recreate --no-deps api
```

Đổi `JWT_KEY` xong cũng tạo lại container API. Token cũ hết hiệu lực. Tài khoản admin đã có thì `SEED_PASSWORD` mới không đổi mật khẩu trong database.

### 2.6. Cập nhật sau commit mới

```bash
cd /root/Documents/Warehouse
sudo git pull --ff-only
cd backend
sudo docker compose up -d --build
sudo docker compose up -d --force-recreate --no-deps nginx
sudo docker compose exec -T nginx nginx -t
sudo docker compose exec -T nginx nginx -s reload
sudo docker builder prune -f
```

- `git pull --ff-only` chỉ cập nhật khi không có commit local lệch nhánh.
- `docker compose up -d --build` build lại image đổi mã nguồn. Mô hình đã nằm trong volume `ollama-data` thì `ollama-pull` thoát nhanh.
- `--force-recreate --no-deps nginx` đọc `nginx/default.conf` mới. `nginx -s reload` nạp cấu hình trong container. Không dùng `systemctl reload nginx` vì host không cài Nginx.

GitHub Actions làm các bước này khi đẩy nhánh `main`. Secret `DEPLOY_PATH` là `/root/Documents/Warehouse/backend`. DNS, chứng chỉ và khóa SSH nằm ở `README.MD` thư mục gốc.

### 2.7. Dừng stack

```bash
cd /root/Documents/Warehouse/backend
sudo docker compose down
```

- `docker compose down` tắt container. Volume `postgres-data`, `garage-meta`, `garage-data` và `ollama-data` vẫn giữ database, tệp và mô hình. Thêm `-v` xóa các volume đó.

## 3. Đường dẫn API

| Phương thức | Đường dẫn | Kết quả |
| --- | --- | --- |
| `GET` | `/api/roles` | Danh sách vai trò |
| `GET` | `/api/roles/{id}` | Một vai trò, `404` nếu không có |
| `POST` | `/api/roles` | Tạo mới, body `{ "name", "description" }`. `409` nếu tên trùng |
| `PUT` | `/api/roles/{id}` | Sửa tên và mô tả |
| `DELETE` | `/api/roles/{id}` | `204` khi xóa xong |

`name` bắt buộc, tối đa 50 ký tự. `description` tối đa 250 ký tự.

| Phương thức | Đường dẫn | Kết quả |
| --- | --- | --- |
| `GET` | `/api/chat/models` | `{ configured, defaultModel, models, notice }`. Cần token Admin. Ollama không chạy thì danh sách lỗi kết nối |
| `POST` | `/api/chat/messages` | Body `{ "model", "messages": [{ "role": "user"\|"assistant", "content" }] }`. Trả `{ reply, model }` |

`messages` từ 1 đến 20 lượt. Mỗi `content` tối đa 4000 ký tự. Lượt cuối phải là `user`. API gửi Ollama tối đa 2 lượt gần nhất, mỗi lượt cắt còn 500 ký tự, ngữ cảnh 1024 token, câu trả lời tối đa 256 token. Trình duyệt không gọi Ollama trực tiếp.

## 4. Chatbot với Ollama

Trang **Trợ lý** gửi câu hỏi tới API. API gọi Ollama tại `POST /api/chat`. Ollama không cần khóa API.

| Biến | Ý nghĩa |
| --- | --- |
| `OLLAMA_URL` | Gốc của Ollama, không có `/api` ở cuối. Máy development để trống hoặc ghi `http://127.0.0.1:11434`. Compose trên VPS để trống để dùng `http://ollama:11434` |
| `OLLAMA_MODEL` | Tên trong `ollama list`. Để trống thì API chọn `qwen2.5:0.5b` nếu máy đã pull mô hình đó. VPS 1 CPU / 2 GB RAM / 25 GB đĩa dùng đúng tên này |

Để trống `OLLAMA_MODEL`, API chọn mô hình chat đã có theo thứ tự `qwen2.5:0.5b`, `qwen3:0.6b`, `qwen3:1.7b`, `qwen3:4b`, `qwen3:8b`. Bỏ qua mô hình embedding.

### 4.1. Máy development

Ollama nghe cổng `11434`. macOS:

```bash
brew install ollama
brew services start ollama
ollama pull qwen2.5:0.5b
ollama list
curl -s http://127.0.0.1:11434/api/tags
```

- `ollama list` đã có `qwen2.5:0.5b` thì không cần pull lại.
- Muốn cố định mô hình, thêm `OLLAMA_URL=http://127.0.0.1:11434` và `OLLAMA_MODEL=qwen2.5:0.5b` vào `backend/.env`, rồi khởi động lại API.

```bash
./scripts/run-backend.sh
```

Frontend: `cd frontend && npm install && npm run dev`. Đăng nhập, mở **Trợ lý**, gửi một câu.

### 4.2. VPS

Cài máy Ubuntu 24.04 theo mục 2. Compose tự kéo `qwen2.5:0.5b` và giới hạn Ollama ở 640 MB. Trên VPS để trống `OLLAMA_URL` và `OLLAMA_MODEL`.

- **Không kết nối được Ollama**: `docker compose ps` không thấy `ollama` đang chạy, hoặc `.env` ghi `127.0.0.1`.
- **Ollama chưa có mô hình chat**: `sudo docker compose up -d --build` để `ollama-pull` chạy lại. Container đó phải thoát mã 0.
- **Ollama từ chối câu trả lời**: `sudo docker compose exec -T ollama ollama list` không có đúng tên trong `OLLAMA_MODEL`.
